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
 * Computes the 4x4 transformation matrix in `innerGroup` meter-space
 * for a given sub-mesh and mechanism type at progress `rawProgress` (0..1).
 */
export function computeMechMatrixInModelSpace(mesh, mechType, rawProgress, baseDimsCm) {
  const mat = new THREE.Matrix4();
  if (!mechType || mechType === 'none' || rawProgress <= 0.0002) {
    return mat; // Identity
  }

  const eased = easeInOutCubic(Math.max(0, Math.min(1, rawProgress)));
  const boxM = mesh.userData.boxM;
  if (!boxM) return mat;

  const { min, max, size, center } = boxM;
  const orientZ = size.z > size.x * 1.55;
  // Outwards opening direction:
  // For front-facing panels (!orientZ): the front face of the kitchen is towards +Z, so opening is into the room (+Z, outSign = 1)
  // For side-facing panels (orientZ): opens towards the side (+X if on right, -X if on left)
  const outSign = orientZ
    ? center.x >= 0
      ? 1
      : -1
    : 1;

  if (mechType === 'drawer' || mechType === 'drawer_back') {
    const dirSign = mechType === 'drawer_back' ? -outSign : outSign;
    const depthM = (orientZ ? baseDimsCm.w : baseDimsCm.d) * 0.01;
    const slideDist = Math.max(0.24, Math.min(0.48, depthM * 0.72));
    const dx = orientZ ? slideDist * dirSign * eased : 0;
    const dz = orientZ ? 0 : slideDist * dirSign * eased;
    mat.makeTranslation(dx, 0, dz);
    return mat;
  }

  let pivot = new THREE.Vector3();
  let axis = new THREE.Vector3(0, 1, 0);
  let angleDeg = 0;

  if (mechType === 'door_left') {
    if (!orientZ) {
      pivot.set(min.x, center.y, outSign > 0 ? max.z : min.z);
      axis.set(0, 1, 0);
      angleDeg = -90 * outSign * eased;
    } else {
      pivot.set(outSign > 0 ? max.x : min.x, center.y, min.z);
      axis.set(0, 1, 0);
      angleDeg = 90 * outSign * eased;
    }
  } else if (mechType === 'door_right') {
    if (!orientZ) {
      pivot.set(max.x, center.y, outSign > 0 ? max.z : min.z);
      axis.set(0, 1, 0);
      angleDeg = 90 * outSign * eased;
    } else {
      pivot.set(outSign > 0 ? max.x : min.x, center.y, max.z);
      axis.set(0, 1, 0);
      angleDeg = -90 * outSign * eased;
    }
  } else if (mechType === 'flap_up') {
    if (!orientZ) {
      pivot.set(center.x, max.y, outSign > 0 ? max.z : min.z);
      axis.set(1, 0, 0);
      angleDeg = -95 * outSign * eased;
    } else {
      pivot.set(outSign > 0 ? max.x : min.x, max.y, center.z);
      axis.set(0, 0, 1);
      angleDeg = 95 * outSign * eased;
    }
  } else if (mechType === 'flap_down') {
    if (!orientZ) {
      pivot.set(center.x, min.y, outSign > 0 ? max.z : min.z);
      axis.set(1, 0, 0);
      angleDeg = 85 * outSign * eased;
    } else {
      pivot.set(outSign > 0 ? max.x : min.x, min.y, center.z);
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

  for (let j = 0; j < meshes.length; j++) {
    const spJ = subParts[j];
    if (spJ && spJ.mechType && spJ.mechType !== 'none') continue;
    const meshJ = meshes[j];
    const bJ = meshJ?.userData?.boxM;
    if (!bJ) continue;

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

      // Geometric attachment: small handle or edge strip touching front/edges of facade `idx`
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

      // If `idx` is a drawer, also attach inner drawer box panels directly behind the drawer front
      if (
        (subParts[idx].mechType === 'drawer' ||
          subParts[idx].mechType === 'drawer_back') &&
        bJ.min.x >= bI.min.x - 0.015 &&
        bJ.max.x <= bI.max.x + 0.015 &&
        bJ.min.y >= bI.min.y - 0.02 &&
        bJ.max.y <= bI.max.y + 0.02 &&
        bJ.size.y <= bI.size.y * 1.15 &&
        bJ.size.x <= bI.size.x * 1.05
      ) {
        followerOf[j] = idx;
        break;
      }
    }
  }

  return followerOf;
}

/**
 * Applies the current mechanism transforms to all meshes of an imported `.glb` entry.
 */
export function updateGlbMechanismsIn3D(parsedEntry, subParts) {
  if (!parsedEntry || !parsedEntry.meshes || !subParts) return;
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
        baseDimsCm
      );
    }
  }

  const finalWorld = new THREE.Matrix4();
  const finalLocal = new THREE.Matrix4();

  for (let i = 0; i < meshes.length; i++) {
    const m = meshes[i];
    if (!m || !m.userData.restMatrixWorld) continue;

    const leaderIdx =
      activeMatrices[i] !== undefined
        ? i
        : followerOf[i] !== undefined
        ? followerOf[i]
        : null;

    if (leaderIdx !== null && activeMatrices[leaderIdx]) {
      finalWorld.multiplyMatrices(
        activeMatrices[leaderIdx],
        m.userData.restMatrixWorld
      );
      finalLocal.multiplyMatrices(m.userData.parentInvMatrixWorld, finalWorld);
      finalLocal.decompose(m.position, m.quaternion, m.scale);
    } else {
      m.position.copy(m.userData.restPos);
      m.quaternion.copy(m.userData.restQuat);
      m.scale.copy(m.userData.restScale);
    }
  }
}

/**
 * Smart CAD & Name Heuristic Auto-Detector for Furniture Doors, Flaps & Drawers in `.glb`
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

export function autoDetectGlbMechanisms(meshes, subPartsMeta, baseDimsCm) {
  const modelW = (baseDimsCm?.w || 60) * 0.01;
  const modelH = (baseDimsCm?.h || 80) * 0.01;
  const modelD = (baseDimsCm?.d || 55) * 0.01;

  // Candidate front facade panels
  const candidates = [];

  for (let i = 0; i < meshes.length; i++) {
    const m = meshes[i];
    const sp = subPartsMeta[i];
    const b = m.userData.boxM;
    if (!b || !sp) continue;

    const fullName = `${m.name || ''} ${m.parent?.name || ''} ${sp.name || ''}`.toLowerCase();

    // 0. Skip non-facades explicitly (internal drawer boxes, shelves, plinths, countertops)
    if (/дно|бок|задн|цокол|soclu|plinth|стенк|polita|polite|blat/i.test(fullName)) continue;
    if (b.max.y <= 0.14 && (b.size.x >= 0.8 || b.size.z >= 0.8)) continue; // plinth at floor

    // 1. Explicit Mechanism Keywords
    let forced = null;
    if (/drawer|sertar|ящик|tandem/i.test(fullName)) {
      forced = 'drawer';
    } else if (/aventos|lift|flap_up|ridicare/i.test(fullName)) {
      forced = 'flap_up';
    } else if (/oven|cuptor|dishwasher|flap_down|rabat/i.test(fullName)) {
      forced = 'flap_down';
    } else if (/door_l|usa_st|дверь_л/i.test(fullName)) {
      forced = 'door_left';
    } else if (/door_r|usa_dr|дверь_п/i.test(fullName)) {
      forced = 'door_right';
    }

    // 2. Facade name keyword: "Фронтальная", "Фасад", "Usa", "Door", "Front", etc.
    const isNamedFacade = /фронтал|front|фасад|facade|fasad|fațad|двер|door|u[sș]a/i.test(fullName);

    // 3. Geometric slab checks:
    // Normal Z (facing front/back): thin in Z (11mm - 45mm), wide in X (>= 15cm), tall in Y (>= 9cm)
    const isSlabZ = b.size.z >= 0.011 && b.size.z <= 0.048 && b.size.x >= 0.15 && b.size.y >= 0.09;
    // Normal X (facing sideways on peninsula or island): thin in X (11mm - 45mm), wide in Z (>= 15cm), tall in Y (>= 9cm)
    const isSlabX = b.size.x >= 0.011 && b.size.x <= 0.048 && b.size.z >= 0.15 && b.size.y >= 0.09;

    if (!forced && !isNamedFacade) {
      if (!isSlabZ && !isSlabX) continue;
      // Exclude deep corpus walls (depth >= 30cm and height >= 60cm)
      if (isSlabZ && b.size.x < 0.20 && b.size.y >= 0.60) continue;
      if (isSlabX && b.size.z >= 0.30 && b.size.y >= 0.60) continue;
    } else {
      if (!isSlabZ && !isSlabX && !forced) continue;
    }

    const facingX = isSlabX && (!isSlabZ || b.size.z > b.size.x);
    candidates.push({ idx: i, forced, box: b, facingX });
  }

  const updated = subPartsMeta.map((sp) => ({
    ...sp,
    mechType: 'none',
    isOpen: false
  }));

  for (const cand of candidates) {
    const { idx, forced, box, facingX } = cand;
    if (forced) {
      updated[idx].mechType = forced;
      continue;
    }

    const w = facingX ? box.size.z : box.size.x;
    const h = box.size.y;

    // Drawer heuristic: height <= 38cm and width >= 28cm, in lower half of kitchen (Y <= 1.15m)
    if (h <= 0.38 && w >= 0.28 && box.center.y <= Math.min(1.15, modelH * 0.75)) {
      updated[idx].mechType = 'drawer';
      continue;
    }

    // Upper Lift-Flap (Aventos) heuristic: wide horizontal door in upper half
    if (w >= h * 1.35 && h <= 0.55 && box.center.y >= modelH * 0.55 && modelH >= 0.65) {
      updated[idx].mechType = 'flap_up';
      continue;
    }

    // Hinged Door (Left vs Right):
    // Check if there is a sibling door at the same Y height
    const sibling = candidates.find(
      (other) =>
        other.idx !== idx &&
        other.facingX === facingX &&
        Math.abs(other.box.center.y - box.center.y) < 0.08 &&
        Math.abs(other.box.size.y - box.size.y) < 0.08 &&
        (facingX
          ? Math.abs(other.box.center.x - box.center.x) < 0.05
          : Math.abs(other.box.center.z - box.center.z) < 0.05)
    );

    if (facingX) {
      if (sibling) {
        updated[idx].mechType =
          box.center.z <= sibling.box.center.z ? 'door_left' : 'door_right';
      } else {
        updated[idx].mechType = 'door_right';
      }
    } else {
      if (sibling) {
        updated[idx].mechType =
          box.center.x <= sibling.box.center.x ? 'door_left' : 'door_right';
      } else {
        updated[idx].mechType = box.center.x <= 0 ? 'door_left' : 'door_right';
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
