import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import {
  inspectModelMetrics,
  optimizeModelTextures,
  optimizeModelShadows,
  updateModelBoundingStructure,
  convertAndBatchModelGeometries
} from './cadModelOptimizer';

let sharedGltfLoader = null;

function getGltfLoader() {
  if (!sharedGltfLoader) {
    sharedGltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      'https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/'
    );
    sharedGltfLoader.setDRACOLoader(dracoLoader);
  }
  return sharedGltfLoader;
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function ensureBoxProjectedUVs(geom) {
  if (!geom || geom.attributes.uv) return;
  const posAttr = geom.attributes.position;
  if (!posAttr) return;
  if (!geom.attributes.normal) {
    geom.computeVertexNormals();
  }
  const normAttr = geom.attributes.normal;
  const count = posAttr.count;
  const uvArr = new Float32Array(count * 2);

  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  const span = Math.max(
    bb ? bb.max.x - bb.min.x : 1,
    bb ? bb.max.y - bb.min.y : 1,
    bb ? bb.max.z - bb.min.z : 1,
    0.001
  );
  const uvScale = span > 20 ? 0.002 : 2.0;

  for (let i = 0; i < count; i++) {
    const px = posAttr.getX(i) * uvScale;
    const py = posAttr.getY(i) * uvScale;
    const pz = posAttr.getZ(i) * uvScale;
    const nx = normAttr ? Math.abs(normAttr.getX(i)) : 0;
    const ny = normAttr ? Math.abs(normAttr.getY(i)) : 1;
    const nz = normAttr ? Math.abs(normAttr.getZ(i)) : 0;

    if (ny > nx && ny > nz) {
      uvArr[i * 2] = px;
      uvArr[i * 2 + 1] = pz;
    } else if (nx > nz) {
      uvArr[i * 2] = pz;
      uvArr[i * 2 + 1] = py;
    } else {
      uvArr[i * 2] = px;
      uvArr[i * 2 + 1] = py;
    }
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Computes the custom local part edit matrix (scale, rotation, offset) in `wrapperGroup` meter-space
 * around the part's original bounding box center.
 */
export function computeSubPartEditMatrix(mesh, sp) {
  const mat = new THREE.Matrix4();
  if (!sp || !mesh?.userData?.boxM) return mat;

  const hasScale =
    Array.isArray(sp.customScale) &&
    (Math.abs((sp.customScale[0] ?? 1) - 1) > 0.0005 ||
      Math.abs((sp.customScale[1] ?? 1) - 1) > 0.0005 ||
      Math.abs((sp.customScale[2] ?? 1) - 1) > 0.0005);
  const hasRot =
    Array.isArray(sp.customRotDeg) &&
    (Math.abs(sp.customRotDeg[0] || 0) > 0.05 ||
      Math.abs(sp.customRotDeg[1] || 0) > 0.05 ||
      Math.abs(sp.customRotDeg[2] || 0) > 0.05);
  const hasOffset =
    Array.isArray(sp.customOffset) &&
    (Math.abs(sp.customOffset[0] || 0) > 0.0002 ||
      Math.abs(sp.customOffset[1] || 0) > 0.0002 ||
      Math.abs(sp.customOffset[2] || 0) > 0.0002);

  if (!hasScale && !hasRot && !hasOffset) return mat;

  const c = mesh.userData.boxM.center;
  const sx = hasScale ? Math.max(0.02, Number(sp.customScale[0]) || 1) : 1;
  const sy = hasScale ? Math.max(0.02, Number(sp.customScale[1]) || 1) : 1;
  const sz = hasScale ? Math.max(0.02, Number(sp.customScale[2]) || 1) : 1;

  const rx = hasRot ? THREE.MathUtils.degToRad(Number(sp.customRotDeg[0]) || 0) : 0;
  const ry = hasRot ? THREE.MathUtils.degToRad(Number(sp.customRotDeg[1]) || 0) : 0;
  const rz = hasRot ? THREE.MathUtils.degToRad(Number(sp.customRotDeg[2]) || 0) : 0;

  const dx = hasOffset ? Number(sp.customOffset[0]) || 0 : 0;
  const dy = hasOffset ? Number(sp.customOffset[1]) || 0 : 0;
  const dz = hasOffset ? Number(sp.customOffset[2]) || 0 : 0;

  const tToOrigin = new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z);
  const scaleMat = new THREE.Matrix4().makeScale(sx, sy, sz);
  const rotMat = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
  const tBack = new THREE.Matrix4().makeTranslation(c.x + dx, c.y + dy, c.z + dz);

  mat.multiplyMatrices(tBack, rotMat).multiply(scaleMat).multiply(tToOrigin);
  return mat;
}

/**
 * Determines the outward room normal (+1 or -1) for a panel along Z or X
 * by checking which side of the panel contains the cabinet's interior panels.
 */
function detectOutwardSign(mesh, allMeshes, orientZ, effCenter) {
  if (Array.isArray(allMeshes) && allMeshes.length > 1 && mesh?.userData?.boxM) {
    const b = mesh.userData.boxM;
    let negCount = 0;
    let posCount = 0;
    for (const other of allMeshes) {
      if (!other || other === mesh || !other.visible || !other.userData?.boxM) continue;
      const ob = other.userData.boxM;
      const overlapY = Math.min(b.max.y, ob.max.y) - Math.max(b.min.y, ob.min.y);
      if (overlapY < 0.05) continue;

      if (!orientZ) {
        const overlapX = Math.min(b.max.x, ob.max.x) - Math.max(b.min.x, ob.min.x);
        if (overlapX < 0.05) continue;
        const dz = ob.center.z - b.center.z;
        if (dz < -0.02 && dz > -0.75) negCount++;
        else if (dz > 0.02 && dz < 0.75) posCount++;
      } else {
        const overlapZ = Math.min(b.max.z, ob.max.z) - Math.max(b.min.z, ob.min.z);
        if (overlapZ < 0.05) continue;
        const dx = ob.center.x - b.center.x;
        if (dx < -0.02 && dx > -0.75) negCount++;
        else if (dx > 0.02 && dx < 0.75) posCount++;
      }
    }
    if (negCount !== posCount) {
      // If cabinet interior is on the negative side (negCount > posCount), outward is +1
      return negCount > posCount ? 1 : -1;
    }
  }
  if (orientZ) {
    return effCenter.x >= 0 ? -1 : 1;
  }
  return 1;
}

/**
 * Computes the 4x4 transformation matrix in `innerGroup` meter-space
 * for a given sub-mesh and mechanism type at progress `rawProgress` (0..1).
 */
export function computeMechMatrixInModelSpace(
  mesh,
  mechType,
  rawProgress,
  baseDimsCm,
  spMeta?: any,
  allMeshes?: any[]
) {
  const mat = new THREE.Matrix4();
  if (!mechType || mechType === 'none' || rawProgress <= 0.0002) {
    return mat; // Identity
  }

  const eased = easeInOutCubic(Math.max(0, Math.min(1, rawProgress)));
  const userOverridden = Boolean(spMeta?.userOverriddenMech);

  // 1. Exact CAD Animation Transformation (from native CAD Anim & hardware data, unless overridden by user)
  if (!userOverridden && mesh.userData && mesh.userData.cadAnim) {
    const { animType, axisStart, axisEnd } = mesh.userData.cadAnim;
    if (Array.isArray(axisStart) && Array.isArray(axisEnd)) {
      const p0 = new THREE.Vector3(axisStart[0], axisStart[1], axisStart[2]);
      const p1 = new THREE.Vector3(axisEnd[0], axisEnd[1], axisEnd[2]);

      if (animType === 2) {
        // Translation along slide vector (AxisEnd - AxisStart)
        const delta = p1.clone().sub(p0).multiplyScalar(eased);
        mat.makeTranslation(delta.x, delta.y, delta.z);
        return mat;
      } else if (animType === 1) {
        // Rotation around 3D axis line through p0 towards p1
        const axis = p1.clone().sub(p0);
        const len = axis.length();
        if (len > 0.0001) {
          axis.normalize();
          const isHorizontal = Math.abs(axis.y) < 0.3;
          const maxDeg = isHorizontal ? 95 : 90;
          const angleRad = THREE.MathUtils.degToRad(maxDeg * eased);

          const tToOrigin = new THREE.Matrix4().makeTranslation(-p0.x, -p0.y, -p0.z);
          const rotMat = new THREE.Matrix4().makeRotationAxis(axis, angleRad);
          const tBack = new THREE.Matrix4().makeTranslation(p0.x, p0.y, p0.z);

          mat.multiplyMatrices(tBack, rotMat).multiply(tToOrigin);
          return mat;
        }
      }
    }
  }

  // 2. Geometric hinge/slide computation for user-assigned mechanisms or generic GLB models
  const boxM = mesh.userData.boxM;
  if (!boxM) return mat;

  const sx = Array.isArray(spMeta?.customScale) ? Math.max(0.02, Number(spMeta.customScale[0]) || 1) : 1;
  const sy = Array.isArray(spMeta?.customScale) ? Math.max(0.02, Number(spMeta.customScale[1]) || 1) : 1;
  const sz = Array.isArray(spMeta?.customScale) ? Math.max(0.02, Number(spMeta.customScale[2]) || 1) : 1;
  const ox = Array.isArray(spMeta?.customOffset) ? Number(spMeta.customOffset[0]) || 0 : 0;
  const oy = Array.isArray(spMeta?.customOffset) ? Number(spMeta.customOffset[1]) || 0 : 0;
  const oz = Array.isArray(spMeta?.customOffset) ? Number(spMeta.customOffset[2]) || 0 : 0;

  const center = new THREE.Vector3(boxM.center.x + ox, boxM.center.y + oy, boxM.center.z + oz);
  const size = new THREE.Vector3(boxM.size.x * sx, boxM.size.y * sy, boxM.size.z * sz);
  const min = new THREE.Vector3(center.x - size.x * 0.5, center.y - size.y * 0.5, center.z - size.z * 0.5);
  const max = new THREE.Vector3(center.x + size.x * 0.5, center.y + size.y * 0.5, center.z + size.z * 0.5);

  const orientZ = size.z > size.x * 1.45;
  const outSign = detectOutwardSign(mesh, allMeshes, orientZ, center);
  const roomDirZ = !orientZ ? outSign : 1;

  if (mechType === 'drawer' || mechType === 'drawer_back') {
    const dirSign = mechType === 'drawer_back' ? -outSign : outSign;
    const slideDist = 0.40;
    const dx = orientZ ? slideDist * dirSign * eased : 0;
    const dz = orientZ ? 0 : slideDist * dirSign * eased;
    mat.makeTranslation(dx, 0, dz);
    return mat;
  }

  const pivot = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 1, 0);
  let angleDeg = 0;

  if (mechType === 'door_left') {
    if (!orientZ) {
      pivot.set(min.x, center.y, center.z);
      axis.set(0, 1, 0);
      angleDeg = -90 * roomDirZ * eased;
    } else {
      pivot.set(outSign > 0 ? min.x : max.x, center.y, min.z);
      axis.set(0, 1, 0);
      angleDeg = 90 * outSign * eased;
    }
  } else if (mechType === 'door_right') {
    if (!orientZ) {
      pivot.set(max.x, center.y, center.z);
      axis.set(0, 1, 0);
      angleDeg = 90 * roomDirZ * eased;
    } else {
      pivot.set(outSign > 0 ? min.x : max.x, center.y, max.z);
      axis.set(0, 1, 0);
      angleDeg = -90 * outSign * eased;
    }
  } else if (mechType === 'flap_up') {
    if (!orientZ) {
      pivot.set(center.x, max.y, center.z);
      axis.set(1, 0, 0);
      angleDeg = -95 * roomDirZ * eased;
    } else {
      pivot.set(outSign > 0 ? min.x : max.x, max.y, center.z);
      axis.set(0, 0, 1);
      angleDeg = 95 * outSign * eased;
    }
  } else if (mechType === 'flap_down') {
    if (!orientZ) {
      pivot.set(center.x, min.y, center.z);
      axis.set(1, 0, 0);
      angleDeg = 85 * roomDirZ * eased;
    } else {
      pivot.set(outSign > 0 ? min.x : max.x, min.y, center.z);
      axis.set(0, 0, 1);
      angleDeg = -85 * outSign * eased;
    }
  }

  const tToOrigin = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);
  const rotMat = new THREE.Matrix4().makeRotationAxis(
    axis,
    THREE.MathUtils.degToRad(angleDeg)
  );
  const tBack = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z);

  mat.multiplyMatrices(tBack, rotMat).multiply(tToOrigin);
  return mat;
}

/**
 * Links small hardware/handle/edge-banding meshes or inner drawer boxes
 * to the main facade mesh they touch so they move together when opened.
 */
export function buildFollowerMap(meshes, subParts) {
  const followerOf = {};
  const activeIndices = [];

  for (let i = 0; i < subParts.length; i++) {
    if (subParts[i] && subParts[i].mechType && subParts[i].mechType !== 'none') {
      activeIndices.push(i);
    }
  }
  if (activeIndices.length === 0) return followerOf;

  // 1. Direct CAD Anim Block ID matching (highest priority, 100% deterministic)
  for (let j = 0; j < meshes.length; j++) {
    const meshJ = meshes[j];
    const bIdJ = meshJ?.userData?.cadAnimBlockId || meshJ?.userData?.cadAnim?.blockId;
    if (!bIdJ) continue;

    for (const idx of activeIndices) {
      const meshI = meshes[idx];
      const bIdI = meshI?.userData?.cadAnimBlockId || meshI?.userData?.cadAnim?.blockId;
      if (bIdI && bIdI === bIdJ && idx !== j) {
        followerOf[j] = idx;
        break;
      }
    }
  }

  // 2. Geometric follower matching for generic GLBs or handles
  for (let j = 0; j < meshes.length; j++) {
    if (followerOf[j] !== undefined) continue;
    const spJ = subParts[j];
    if (spJ && spJ.mechType && spJ.mechType !== 'none') continue;
    const meshJ = meshes[j];
    const bJ = meshJ?.userData?.boxM;
    if (!bJ) continue;

    const fullNameJ = `${meshJ.name || ''} ${meshJ.parent?.name || ''} ${spJ?.name || ''}`.toLowerCase();
    // Exclude corpus panels, shelves, plinths from following
    if (/горизонтальн|вертикальн|полка|polita|blat|цокол|soclu|plinth|стенк/i.test(fullNameJ)) {
      continue;
    }

    const volJ = bJ.size.x * bJ.size.y * bJ.size.z;

    for (const idx of activeIndices) {
      const meshI = meshes[idx];
      const bI = meshI?.userData?.boxM;
      if (!bI) continue;
      const volI = bI.size.x * bI.size.y * bI.size.z;

      // Same CAD parent group (if that parent group only has a few parts, e.g. Door + Handle)
      if (
        meshJ.parent &&
        meshJ.parent === meshI.parent &&
        meshI.parent.name &&
        !/scene|root/i.test(meshI.parent.name) &&
        meshI.parent.children.length <= 12
      ) {
        followerOf[j] = idx;
        break;
      }

      // Handle or small trim attached to facade
      const margin = 0.045; // 4.5 cm tolerance for handles
      const insideXY =
        bJ.min.x >= bI.min.x - 0.02 &&
        bJ.max.x <= bI.max.x + 0.02 &&
        bJ.min.y >= bI.min.y - 0.02 &&
        bJ.max.y <= bI.max.y + 0.02;
      const nearZ =
        bJ.min.z >= bI.min.z - margin && bJ.max.z <= bI.max.z + margin;

      if (insideXY && nearZ && volJ <= volI * 0.85) {
        followerOf[j] = idx;
        break;
      }

      // If drawer front, attach drawer box internal panels (bottom, back, sides)
      if (
        (subParts[idx].mechType === 'drawer' ||
          subParts[idx].mechType === 'drawer_back') &&
        /дно|бок|задн|box|runner|rail/i.test(fullNameJ) &&
        bJ.min.x >= bI.min.x - 0.02 &&
        bJ.max.x <= bI.max.x + 0.02 &&
        bJ.min.y >= bI.min.y - 0.02 &&
        bJ.max.y <= bI.max.y + 0.02
      ) {
        followerOf[j] = idx;
        break;
      }
    }
  }

  return followerOf;
}

/**
 * Ensures any user-duplicated or newly added panels (`sp.isCustomAdded`) are created in 3D
 * inside `parsedEntry.customPartsGroup` and registered in `parsedEntry.meshes`.
 */
export function ensureCustomSubPartMeshes(parsedEntry, subParts, ctx?: any) {
  if (!parsedEntry || !parsedEntry.wrapperGroup || !Array.isArray(subParts)) return;
  if (!parsedEntry.customPartsGroup) {
    const cpg = new THREE.Group();
    cpg.name = 'custom_added_parts';
    parsedEntry.wrapperGroup.add(cpg);
    parsedEntry.customPartsGroup = cpg;
  }

  let addedNew = false;
  for (let i = 0; i < subParts.length; i++) {
    const sp = subParts[i];
    if (!sp || !sp.isCustomAdded) continue;
    if (parsedEntry.meshes[i]) continue;

    let newMesh: THREE.Mesh | null = null;

    if (
      typeof sp.sourceSubIdx === 'number' &&
      parsedEntry.meshes[sp.sourceSubIdx]
    ) {
      const src = parsedEntry.meshes[sp.sourceSubIdx];
      const geom = src.geometry.clone();
      const mat = src.material ? src.material.clone() : new THREE.MeshStandardMaterial({ color: sp.colorHex || '#f4f4f2', roughness: 0.45, metalness: 0.05 });
      newMesh = new THREE.Mesh(geom, mat);
      newMesh.name = sp.name || `${src.name || 'Piesa'}_copie`;
      newMesh.castShadow = true;
      newMesh.receiveShadow = true;

      const restMW = src.userData.restMatrixWorld
        ? src.userData.restMatrixWorld.clone()
        : new THREE.Matrix4();
      const rPos = new THREE.Vector3();
      const rQuat = new THREE.Quaternion();
      const rScale = new THREE.Vector3(1, 1, 1);
      restMW.decompose(rPos, rQuat, rScale);

      newMesh.position.copy(rPos);
      newMesh.quaternion.copy(rQuat);
      newMesh.scale.copy(rScale);

      const srcBox = src.userData.boxM;
      newMesh.userData = {
        boxM: srcBox
          ? {
              min: srcBox.min.clone(),
              max: srcBox.max.clone(),
              size: srcBox.size.clone(),
              center: srcBox.center.clone()
            }
          : {
              min: new THREE.Vector3(-0.2, 0, -0.2),
              max: new THREE.Vector3(0.2, 0.5, 0.2),
              size: new THREE.Vector3(0.4, 0.5, 0.4),
              center: new THREE.Vector3(0, 0.25, 0)
            },
        restMatrixWorld: restMW,
        parentInvMatrixWorld: new THREE.Matrix4(),
        restPos: rPos,
        restQuat: rQuat,
        restScale: rScale,
        mechProgress: sp.isOpen ? 1 : 0,
        mechTarget: sp.isOpen ? 1 : 0,
        originalGlbMaterial: mat.clone(),
        importedModelId: parsedEntry.id,
        subMeshIdx: i,
        isCustomAdded: true
      };
    } else {
      const dimsM = Array.isArray(sp.customDimsM) ? sp.customDimsM : [0.6, 0.72, 0.018];
      const wM = Math.max(0.005, Number(dimsM[0]) || 0.6);
      const hM = Math.max(0.005, Number(dimsM[1]) || 0.72);
      const dM = Math.max(0.005, Number(dimsM[2]) || 0.018);

      const geom = new THREE.BoxGeometry(wM, hM, dM);
      ensureBoxProjectedUVs(geom);
      geom.computeBoundingBox();
      geom.computeBoundingSphere();

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(sp.colorHex || '#f4f4f2'),
        roughness: 0.45,
        metalness: 0.05
      });

      newMesh = new THREE.Mesh(geom, mat);
      newMesh.name = sp.name || `Panou_Nou_${i + 1}`;
      newMesh.castShadow = true;
      newMesh.receiveShadow = true;

      const initCenter = Array.isArray(sp.initialCenterM)
        ? new THREE.Vector3(
            Number(sp.initialCenterM[0]) || 0,
            Number(sp.initialCenterM[1]) || hM * 0.5,
            Number(sp.initialCenterM[2]) || 0
          )
        : new THREE.Vector3(0, Math.max(0.4, hM * 0.5), 0);

      const restMW = new THREE.Matrix4().makeTranslation(
        initCenter.x,
        initCenter.y,
        initCenter.z
      );
      const rPos = initCenter.clone();
      const rQuat = new THREE.Quaternion();
      const rScale = new THREE.Vector3(1, 1, 1);

      newMesh.position.copy(rPos);
      newMesh.quaternion.copy(rQuat);
      newMesh.scale.copy(rScale);

      const bSize = new THREE.Vector3(wM, hM, dM);
      const bMin = new THREE.Vector3(
        initCenter.x - wM * 0.5,
        initCenter.y - hM * 0.5,
        initCenter.z - dM * 0.5
      );
      const bMax = new THREE.Vector3(
        initCenter.x + wM * 0.5,
        initCenter.y + hM * 0.5,
        initCenter.z + dM * 0.5
      );

      newMesh.userData = {
        boxM: {
          min: bMin,
          max: bMax,
          size: bSize,
          center: initCenter.clone()
        },
        restMatrixWorld: restMW,
        parentInvMatrixWorld: new THREE.Matrix4(),
        restPos: rPos,
        restQuat: rQuat,
        restScale: rScale,
        mechProgress: sp.isOpen ? 1 : 0,
        mechTarget: sp.isOpen ? 1 : 0,
        originalGlbMaterial: mat.clone(),
        importedModelId: parsedEntry.id,
        subMeshIdx: i,
        isCustomAdded: true
      };
    }

    if (newMesh) {
      parsedEntry.customPartsGroup.add(newMesh);
      parsedEntry.meshes[i] = newMesh;
      if (ctx) {
        if (Array.isArray(ctx.importedMeshes) && !ctx.importedMeshes.includes(newMesh)) {
          ctx.importedMeshes.push(newMesh);
        }
        if (Array.isArray(ctx.paintableMeshes) && !ctx.paintableMeshes.includes(newMesh)) {
          ctx.paintableMeshes.push(newMesh);
        }
      }
      addedNew = true;
    }
  }

  if (addedNew) {
    updateModelBoundingStructure(parsedEntry.wrapperGroup);
  }
}

/**
 * Applies the current mechanism transforms and per-part edits (delete, resize, move, rotate)
 * to all meshes of an imported `.glb`/`.b3d` entry.
 */
export function updateGlbMechanismsIn3D(parsedEntry, subParts, ctx?: any) {
  if (!parsedEntry || !parsedEntry.meshes || !subParts) return;
  ensureCustomSubPartMeshes(parsedEntry, subParts, ctx);

  const { meshes, baseDimsCm } = parsedEntry;
  if (!parsedEntry._cachedFollowerOf || parsedEntry._cachedSubPartsMeta !== subParts) {
    parsedEntry._cachedFollowerOf = buildFollowerMap(meshes, subParts);
    parsedEntry._cachedSubPartsMeta = subParts;
  }
  const followerOf = parsedEntry._cachedFollowerOf;

  const activeMatrices = {};
  for (let i = 0; i < meshes.length; i++) {
    const sp = subParts[i];
    const m = meshes[i];
    if (!m || !m.userData.restMatrixWorld) continue;

    m.visible = !Boolean(sp?.deleted);
    if (!m.visible) continue;

    if (sp && sp.mechType && sp.mechType !== 'none') {
      const prog = typeof m.userData.mechProgress === 'number'
        ? m.userData.mechProgress
        : sp.isOpen
        ? 1
        : 0;
      activeMatrices[i] = computeMechMatrixInModelSpace(
        m,
        sp.mechType,
        prog,
        baseDimsCm,
        sp,
        meshes
      );
    }
  }

  const modRestWorld = new THREE.Matrix4();
  const finalWorld = new THREE.Matrix4();
  const finalLocal = new THREE.Matrix4();

  for (let i = 0; i < meshes.length; i++) {
    const m = meshes[i];
    if (!m || !m.userData.restMatrixWorld || !m.visible) continue;
    const sp = subParts[i];

    const editMat = computeSubPartEditMatrix(m, sp);
    modRestWorld.multiplyMatrices(editMat, m.userData.restMatrixWorld);

    const leaderIdx =
      activeMatrices[i] !== undefined
        ? i
        : followerOf[i] !== undefined
        ? followerOf[i]
        : null;

    if (leaderIdx !== null && activeMatrices[leaderIdx]) {
      finalWorld.multiplyMatrices(activeMatrices[leaderIdx], modRestWorld);
      finalLocal.multiplyMatrices(m.userData.parentInvMatrixWorld, finalWorld);
      finalLocal.decompose(m.position, m.quaternion, m.scale);
    } else {
      finalLocal.multiplyMatrices(m.userData.parentInvMatrixWorld, modRestWorld);
      finalLocal.decompose(m.position, m.quaternion, m.scale);
    }
  }
}

/**
 * Disposes 3D resources of an imported model hierarchy
 */
export function disposeModelHierarchy(root: any, ctx?: any) {
  if (!root) return;
  if (typeof root === 'string' && ctx && ctx.importedMap && ctx.importedMap[root]) {
    const entry = ctx.importedMap[root];
    if (ctx.transformControls && ctx.transformControls.object === entry.wrapperGroup) {
      ctx.transformControls.detach();
      ctx.transformControls.visible = false;
    }
    if (entry.wrapperGroup) {
      disposeModelHierarchy(entry.wrapperGroup);
      if (ctx.importedRootGroup) ctx.importedRootGroup.remove(entry.wrapperGroup);
    }
    return;
  }
  if (root.traverse) {
    root.traverse((child: any) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => {
          if (!m) return;
          if (m.map) m.map.dispose();
          if (m.normalMap) m.normalMap.dispose();
          if (m.roughnessMap) m.roughnessMap.dispose();
          if (m.metalnessMap) m.metalnessMap.dispose();
          m.dispose();
        });
        if (child.userData && child.userData.originalGlbMaterial) {
          const om = child.userData.originalGlbMaterial;
          if (om.map) om.map.dispose();
          om.dispose();
        }
      }
    });
  }
}

/**
 * Extracts opening mechanisms strictly from embedded CAD file data
 * (`Anim` blocks, physical hinges `Петля`, and physical drawer runners `Quadro`/`ArciTech`/`Направляющая`),
 * without guessing by panel name.
 */
export function autoDetectGlbMechanisms(meshes, subPartsMeta, baseDimsCm) {
  const updated = subPartsMeta.map((sp) => ({
    ...sp,
    mechType: 'none',
    isOpen: false
  }));

  for (let i = 0; i < meshes.length; i++) {
    const m = meshes[i];
    if (m && m.userData && m.userData.cadAnim) {
      const ca = m.userData.cadAnim;
      if (ca.isLeader) {
        if (ca.animType === 2) {
          updated[i].mechType = 'drawer';
        } else if (ca.animType === 1) {
          const as = ca.axisStart;
          const ae = ca.axisEnd;
          if (Array.isArray(as) && Array.isArray(ae)) {
            const dy = ae[1] - as[1];
            const absDy = Math.abs(dy);
            const dx = Math.abs(ae[0] - as[0]);
            const dz = Math.abs(ae[2] - as[2]);
            if (absDy < 0.25 && (dx > 0.15 || dz > 0.15)) {
              const centerY = m.userData.boxM ? m.userData.boxM.center.y : m.position.y;
              updated[i].mechType = as[1] < centerY ? 'flap_down' : 'flap_up';
            } else {
              updated[i].mechType = dy < 0 ? 'door_left' : 'door_right';
            }
          }
        }
      } else {
        updated[i].mechType = 'none'; // follower part inside the same CAD block
      }
    }
  }

  return updated;
}

export function loadGlbModelFromBuffer(arrayBuffer, modelId, modelName) {
  return new Promise((resolve, reject) => {
    const loader = getGltfLoader();
    loader.parse(
      arrayBuffer,
      '',
      (gltf) => {
        const rawRoot = gltf.scene || gltf.scenes[0];
        if (!rawRoot) {
          reject(new Error('Invalid GLB: no scene found'));
          return;
        }

        rawRoot.updateMatrixWorld(true);
        const rawBox = new THREE.Box3().setFromObject(rawRoot);
        const rawSize = new THREE.Vector3();
        const rawCenter = new THREE.Vector3();
        rawBox.getSize(rawSize);
        rawBox.getCenter(rawCenter);

        const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.0001);
        let unitFactor = 1.0;
        if (maxDim >= 500) {
          // Model coordinates are in millimeters (e.g. 600mm to 4500mm) -> convert to meters
          unitFactor = 0.001;
        } else if (maxDim >= 20 && maxDim < 500) {
          // Model coordinates are in centimeters (e.g. 60cm to 450cm) -> convert to meters
          unitFactor = 0.01;
        } else {
          // Model coordinates are already in meters (< 20m)
          unitFactor = 1.0;
        }

        const innerGroup = new THREE.Group();
        innerGroup.scale.set(unitFactor, unitFactor, unitFactor);
        rawRoot.position.set(
          -rawCenter.x,
          -rawBox.min.y,
          -rawCenter.z
        );
        innerGroup.add(rawRoot);

        const wrapperGroup = new THREE.Group();
        wrapperGroup.name = `imported_glb_${modelId}`;
        wrapperGroup.add(innerGroup);

        // Compute rest matrices in innerGroup meter space (while wrapperGroup is at identity)
        wrapperGroup.updateMatrixWorld(true);

        const baseDimsCm = {
          w: Math.max(0.5, rawSize.x * unitFactor * 100),
          h: Math.max(0.5, rawSize.y * unitFactor * 100),
          d: Math.max(0.5, rawSize.z * unitFactor * 100)
        };

        let meshes = [];
        let subPartsMeta = [];
        let subIdx = 0;

        rawRoot.traverse((child) => {
          if (child.isMesh) {
            ensureBoxProjectedUVs(child.geometry);
            child.castShadow = true;
            child.receiveShadow = true;

            // Precompute bounding box & sphere for O(1) frustum culling & raycast acceleration
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
            const geomBox = child.geometry.boundingBox
              ? child.geometry.boundingBox.clone()
              : new THREE.Box3();
            geomBox.applyMatrix4(child.matrixWorld);

            const bSize = new THREE.Vector3();
            const bCenter = new THREE.Vector3();
            geomBox.getSize(bSize);
            geomBox.getCenter(bCenter);

            child.userData.boxM = {
              min: geomBox.min.clone(),
              max: geomBox.max.clone(),
              size: bSize,
              center: bCenter
            };
            child.userData.restMatrixWorld = child.matrixWorld.clone();
            child.userData.parentInvMatrixWorld = child.parent
              ? child.parent.matrixWorld.clone().invert()
              : new THREE.Matrix4();
            child.userData.restPos = child.position.clone();
            child.userData.restQuat = child.quaternion.clone();
            child.userData.restScale = child.scale.clone();
            child.userData.mechProgress = 0;
            child.userData.mechTarget = 0;

            const origMat = Array.isArray(child.material)
              ? child.material[0]
              : child.material;

            const isOpaque =
              !origMat ||
              (!origMat.transparent &&
                (typeof origMat.opacity !== 'number' || origMat.opacity >= 0.99));

            const stdMat = new THREE.MeshStandardMaterial({
              color:
                origMat && origMat.color
                  ? origMat.color.clone()
                  : new THREE.Color('#e5e7eb'),
              map: origMat && origMat.map ? origMat.map : null,
              roughness:
                origMat && typeof origMat.roughness === 'number'
                  ? Math.max(0.1, origMat.roughness)
                  : 0.45,
              metalness:
                origMat && typeof origMat.metalness === 'number'
                  ? Math.min(0.9, origMat.metalness)
                  : 0.05,
              transparent: !isOpaque,
              opacity: isOpaque ? 1.0 : (origMat.opacity ?? 1.0),
              depthWrite: isOpaque,
              side: THREE.FrontSide
            });

            const backupMat = stdMat.clone();
            child.material = stdMat;
            child.userData.originalGlbMaterial = backupMat;
            child.userData.importedModelId = modelId;
            child.userData.subMeshIdx = subIdx;

            const partLabel =
              child.name ||
              (origMat && origMat.name) ||
              `Partea #${subIdx + 1}`;
            const hexColor = '#' + stdMat.color.getHexString();

            subPartsMeta.push({
              subIdx,
              name: partLabel.slice(0, 28),
              colorHex: hexColor,
              assignedMatId: null,
              mechType: 'none',
              isOpen: false
            });

            meshes.push(child);
            subIdx++;
          }
        });

        // Auto-detect furniture mechanisms (doors, drawers, lift flaps) on initial load
        subPartsMeta = autoDetectGlbMechanisms(meshes, subPartsMeta, baseDimsCm);

        // Three.js CAD Performance Optimizations:
        // 1. Clamp oversized textures to 1536px max & enable mipmaps to prevent VRAM memory stalls
        optimizeModelTextures(rawRoot, 1536);

        // 2. Selective shadows: cull micro-hardware (< 8cm) from shadow map depth passes
        optimizeModelShadows(meshes, 0.08);

        // 3. Keep all CAD furniture parts distinct on initial load so each panel
        // remains individually selectable, clickable for click-to-paint, and listed in tree.
        // Users can optimize draw calls anytime via the "⚡⚡ Convertește & Optimizează Three.js" button.

        // 4. Setup O(1) Hierarchical Bounding Box Raycast Acceleration
        updateModelBoundingStructure(wrapperGroup);

        // 5. Calculate initial CAD performance metrics
        const metrics = inspectModelMetrics(wrapperGroup);

        // Native glTF animations support (if embedded in .glb)
        const animations = Array.isArray(gltf.animations) ? gltf.animations : [];
        let mixer = null;
        const animActions = [];
        if (animations.length > 0) {
          mixer = new THREE.AnimationMixer(rawRoot);
          for (const clip of animations) {
            const action = mixer.clipAction(clip);
            action.clampWhenFinished = true;
            action.loop = THREE.LoopOnce;
            animActions.push(action);
          }
        }

        resolve({
          id: modelId,
          name: modelName,
          wrapperGroup,
          meshes,
          baseDimsCm,
          subPartsMeta,
          hasNativeAnimations: animations.length > 0,
          mixer,
          animActions,
          nativeAnimOpen: false,
          metrics
        });
      },
      (err) => reject(err)
    );
  });
}
