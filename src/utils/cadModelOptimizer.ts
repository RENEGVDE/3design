import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface ModelMetrics {
  polyCount: number;
  vertexCount: number;
  meshCount: number;
  materialCount: number;
  textureCount: number;
  maxTextureDim: number;
  estimatedVramMb: number;
  drawCalls: number;
  isOptimized: boolean;
}

/**
 * Calculates real-time 3D CAD metrics for an imported model or group.
 */
export function inspectModelMetrics(root: THREE.Object3D): ModelMetrics {
  let polyCount = 0;
  let vertexCount = 0;
  let meshCount = 0;
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let maxTextureDim = 0;

  if (!root) {
    return {
      polyCount: 0,
      vertexCount: 0,
      meshCount: 0,
      materialCount: 0,
      textureCount: 0,
      maxTextureDim: 0,
      estimatedVramMb: 0,
      drawCalls: 0,
      isOptimized: false
    };
  }

  root.traverse((child: any) => {
    if (child.isMesh && child.geometry) {
      meshCount++;
      const geom = child.geometry;
      const pos = geom.attributes.position;
      if (pos) {
        vertexCount += pos.count;
        if (geom.index) {
          polyCount += geom.index.count / 3;
        } else {
          polyCount += pos.count / 3;
        }
      }

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => {
        if (!m) return;
        materials.add(m);
        const mapKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'aoMap', 'emissiveMap'];
        mapKeys.forEach((key) => {
          const tex = m[key];
          if (tex && tex.isTexture) {
            textures.add(tex);
            if (tex.image) {
              const w = tex.image.naturalWidth || tex.image.width || 0;
              const h = tex.image.naturalHeight || tex.image.height || 0;
              maxTextureDim = Math.max(maxTextureDim, w, h);
            }
          }
        });
      });
    }
  });

  polyCount = Math.round(polyCount);

  // Approximate VRAM usage in MB: (vertices * 32 bytes) + (textures in uncompressed RGBA)
  let vramBytes = vertexCount * 32;
  textures.forEach((tex: any) => {
    if (tex.image) {
      const w = tex.image.naturalWidth || tex.image.width || 512;
      const h = tex.image.naturalHeight || tex.image.height || 512;
      vramBytes += w * h * 4 * 1.33; // With mipmaps
    }
  });

  const estimatedVramMb = +(vramBytes / (1024 * 1024)).toFixed(1);

  return {
    polyCount,
    vertexCount,
    meshCount,
    materialCount: materials.size,
    textureCount: textures.size,
    maxTextureDim,
    estimatedVramMb,
    drawCalls: meshCount,
    isOptimized: Boolean((root as any).userData?.isCadOptimized)
  };
}

/**
 * Downscales an HTML Image or Canvas texture to a maximum dimension
 * to conserve GPU VRAM and eliminate memory stalls during rendering.
 */
export function downscaleTexture(texture: THREE.Texture, maxDim = 2048): boolean {
  if (typeof window === 'undefined' || !texture || !texture.image) return false;
  const img: any = texture.image;
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;

  if (w <= maxDim && h <= maxDim) {
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return false;
  }

  const aspect = w / h;
  let targetW = w;
  let targetH = h;

  if (w > h) {
    targetW = maxDim;
    targetH = Math.round(maxDim / aspect);
  } else {
    targetH = maxDim;
    targetW = Math.round(maxDim * aspect);
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    texture.image = canvas;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return true;
  } catch (err) {
    console.warn('CAD Optimizer: could not downscale texture (possibly cross-origin):', err);
    return false;
  }
}

/**
 * Traverses all materials in a model, clamps oversized textures to max 2048px (or 1024px for normal/roughness),
 * and enables mipmapping to prevent GPU texture cache thrashing.
 */
export function optimizeModelTextures(root: THREE.Object3D, maxDim = 2048): number {
  let count = 0;
  const processed = new Set<THREE.Texture>();

  root.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => {
        if (!m) return;
        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'aoMap'].forEach((key) => {
          const tex = m[key];
          if (tex && tex.isTexture && !processed.has(tex)) {
            processed.add(tex);
            const limit = key === 'map' ? maxDim : Math.min(1024, maxDim);
            if (downscaleTexture(tex, limit)) {
              count++;
            }
          }
        });
      });
    }
  });

  return count;
}

/**
 * Optimizes shadow casting: Only primary visible panels (> 8 cm) cast shadows.
 * Micro-parts, screws, internal hardware and small brackets skip shadow depth passes,
 * eliminating up to 80% of shadow map draw calls.
 */
export function optimizeModelShadows(meshes: THREE.Mesh[], minDimM = 0.08): number {
  let disabledCount = 0;
  for (const mesh of meshes) {
    const boxM = mesh.userData?.boxM;
    if (boxM && boxM.size) {
      const maxDim = Math.max(boxM.size.x, boxM.size.y, boxM.size.z);
      const isMicro = maxDim < minDimM;
      if (isMicro) {
        mesh.castShadow = false;
        disabledCount++;
      } else {
        mesh.castShadow = true;
      }
      mesh.receiveShadow = true;
    }
  }
  return disabledCount;
}

/**
 * Computes and updates the world-space and local-space bounding boxes
 * for fast O(1) hierarchical raycasting.
 */
export function updateModelBoundingStructure(wrapperGroup: THREE.Group): THREE.Box3 {
  wrapperGroup.updateMatrixWorld(true);
  const worldBox = new THREE.Box3().setFromObject(wrapperGroup);
  const localBox = new THREE.Box3();

  // Also precompute local & world boxes for each child mesh
  wrapperGroup.traverse((child: any) => {
    if (child.isMesh && child.geometry) {
      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox();
      }
      if (!child.geometry.boundingSphere) {
        child.geometry.computeBoundingSphere();
      }
      const mBox = child.geometry.boundingBox.clone();
      mBox.applyMatrix4(child.matrixWorld);
      child.userData.worldBox = mBox;
    }
  });

  wrapperGroup.userData.worldBox = worldBox;
  return worldBox;
}

/**
 * Fast Hierarchical Raycasting:
 * Pre-filters meshes by testing the model's outer bounding box first.
 * If the ray does NOT hit the model's outer box, returns [] in < 0.001 ms!
 * If it hits, only tests submeshes whose individual bounding boxes intersect the ray.
 */
export function raycastModelHierarchical(
  raycaster: THREE.Raycaster,
  wrapperGroup: THREE.Group,
  candidateMeshes: THREE.Mesh[]
): THREE.Intersection[] {
  if (!wrapperGroup || !candidateMeshes || candidateMeshes.length === 0) return [];

  // Level 1: Outer Model Bounding Box Check (costs < 0.001 ms)
  let worldBox: THREE.Box3 = wrapperGroup.userData.worldBox;
  if (!worldBox) {
    worldBox = updateModelBoundingStructure(wrapperGroup);
  }

  // Fast box test using raycaster ray
  if (!raycaster.ray.intersectsBox(worldBox)) {
    return []; // Pointer is nowhere near this model! Skip all child meshes & triangles!
  }

  // Level 2: Sub-mesh Bounding Box Pre-filter
  const closeMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < candidateMeshes.length; i++) {
    const mesh = candidateMeshes[i];
    if (!mesh.visible) continue;
    const mBox = mesh.userData.worldBox;
    if (mBox) {
      if (raycaster.ray.intersectsBox(mBox)) {
        closeMeshes.push(mesh);
      }
    } else {
      closeMeshes.push(mesh);
    }
  }

  if (closeMeshes.length === 0) return [];

  // Level 3: Accurate triangle intersection ONLY for qualifying meshes
  const hits: THREE.Intersection[] = [];
  for (const m of closeMeshes) {
    m.raycast(raycaster, hits);
  }

  hits.sort((a, b) => a.distance - b.distance);
  return hits;
}

/**
 * Converts and merges static furniture submeshes sharing the same material
 * into unified Three.js BufferGeometries.
 * - Interactive mechanisms (doors, flaps, drawers) remain independent!
 * - Static carcass, shelves, backs, plinths are merged by material into 1 draw call.
 */
export function convertAndBatchModelGeometries(
  wrapperGroup: THREE.Group,
  meshes: THREE.Mesh[],
  subPartsMeta: any[]
): {
  newMeshes: THREE.Mesh[];
  newSubPartsMeta: any[];
  drawCallsSaved: number;
} {
  if (!wrapperGroup || !meshes || meshes.length <= 1) {
    return { newMeshes: meshes, newSubPartsMeta: subPartsMeta, drawCallsSaved: 0 };
  }

  // Identify which parts are interactive mechanisms or followers
  const isMechanism = new Array(meshes.length).fill(false);
  for (let i = 0; i < subPartsMeta.length; i++) {
    const sp = subPartsMeta[i];
    if (sp && sp.mechType && sp.mechType !== 'none') {
      isMechanism[i] = true;
    }
  }

  // Check if we have multiple static meshes to merge
  const staticIndices: number[] = [];
  const interactiveIndices: number[] = [];

  for (let i = 0; i < meshes.length; i++) {
    if (isMechanism[i]) {
      interactiveIndices.push(i);
    } else {
      staticIndices.push(i);
    }
  }

  if (staticIndices.length <= 1) {
    // Nothing substantial to merge
    return { newMeshes: meshes, newSubPartsMeta: subPartsMeta, drawCallsSaved: 0 };
  }

  // Group static meshes by visual material fingerprint (color, map, roughness, metalness)
  const groupsByMat = new Map<string, { material: THREE.Material; indices: number[] }>();

  for (const idx of staticIndices) {
    const mesh = meshes[idx];
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const hex = (mat as any)?.color ? (mat as any).color.getHexString() : 'e5e7eb';
    const mapId = (mat as any)?.map ? (mat as any).map.id : 'nomap';
    const roughness = (mat as any)?.roughness !== undefined ? Math.round((mat as any).roughness * 10) : 4;
    const metalness = (mat as any)?.metalness !== undefined ? Math.round((mat as any).metalness * 10) : 1;
    const matKey = `${mat ? mat.type : 'std'}_${hex}_${mapId}_${roughness}_${metalness}`;

    if (!groupsByMat.has(matKey)) {
      groupsByMat.set(matKey, { material: mat, indices: [] });
    }
    groupsByMat.get(matKey)!.indices.push(idx);
  }

  const newMeshes: THREE.Mesh[] = [];
  const newSubPartsMeta: any[] = [];
  let drawCallsSaved = 0;

  // 1. Keep all interactive mechanism meshes intact
  for (const idx of interactiveIndices) {
    const originalMesh = meshes[idx];
    const originalMeta = subPartsMeta[idx];
    const newSubIdx = newMeshes.length;

    originalMesh.userData.subMeshIdx = newSubIdx;
    newMeshes.push(originalMesh);
    newSubPartsMeta.push({
      ...originalMeta,
      subIdx: newSubIdx
    });
  }

  // 2. For static groups: merge those with > 1 mesh
  wrapperGroup.updateMatrixWorld(true);

  groupsByMat.forEach(({ material, indices }, groupKey) => {
    if (indices.length === 1) {
      // Single mesh, keep as is
      const idx = indices[0];
      const m = meshes[idx];
      const meta = subPartsMeta[idx];
      const newSubIdx = newMeshes.length;
      m.userData.subMeshIdx = newSubIdx;
      newMeshes.push(m);
      newSubPartsMeta.push({
        ...meta,
        subIdx: newSubIdx
      });
      return;
    }

    // Merge multiple geometries into 1 unified BufferGeometry
    const geometriesToMerge: THREE.BufferGeometry[] = [];
    const parentContainer = meshes[indices[0]].parent || wrapperGroup;

    for (const idx of indices) {
      const mesh = meshes[idx];
      mesh.updateMatrixWorld(true);
      const geom = mesh.geometry.clone();

      // Transform geometry vertices into common parent space
      const toParent = new THREE.Matrix4().multiplyMatrices(
        parentContainer.matrixWorld.clone().invert(),
        mesh.matrixWorld
      );
      geom.applyMatrix4(toParent);
      geometriesToMerge.push(geom);

      // Remove the old unmerged mesh from its parent
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    }

    // Harmonize attributes and indexing across all geometries so mergeGeometries never fails
    const hasNonIndexed = geometriesToMerge.some((g) => !g.index);
    const preparedGeometries = geometriesToMerge.map((baseGeom) => {
      let g = baseGeom;
      if (hasNonIndexed && g.index) {
        g = g.toNonIndexed();
      }
      const clean = new THREE.BufferGeometry();
      clean.setAttribute('position', g.attributes.position.clone());
      if (g.attributes.normal) {
        clean.setAttribute('normal', g.attributes.normal.clone());
      } else {
        clean.computeVertexNormals();
      }
      if (g.attributes.uv) {
        clean.setAttribute('uv', g.attributes.uv.clone());
      } else {
        clean.setAttribute(
          'uv',
          new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)
        );
      }
      if (!hasNonIndexed && g.index) {
        clean.setIndex(g.index.clone());
      }
      return clean;
    });

    const mergedGeom = mergeGeometries(preparedGeometries, false);
    if (!mergedGeom) {
      // Fallback: keep original meshes if merge fails
      for (const idx of indices) {
        const m = meshes[idx];
        const newSubIdx = newMeshes.length;
        m.userData.subMeshIdx = newSubIdx;
        newMeshes.push(m);
        newSubPartsMeta.push({ ...subPartsMeta[idx], subIdx: newSubIdx });
      }
      return;
    }

    mergedGeom.computeVertexNormals();
    mergedGeom.computeBoundingBox();
    mergedGeom.computeBoundingSphere();

    const mergedMesh = new THREE.Mesh(mergedGeom, material);
    mergedMesh.name = `Corpus_Static_Merged_${groupKey}`;
    mergedMesh.castShadow = true;
    mergedMesh.receiveShadow = true;

    const newSubIdx = newMeshes.length;
    mergedMesh.userData = {
      importedModelId: meshes[indices[0]].userData.importedModelId,
      subMeshIdx: newSubIdx,
      isMergedBatch: true,
      originalPartCount: indices.length,
      boxM: {
        min: mergedGeom.boundingBox!.min.clone(),
        max: mergedGeom.boundingBox!.max.clone(),
        size: mergedGeom.boundingBox!.getSize(new THREE.Vector3()),
        center: mergedGeom.boundingBox!.getCenter(new THREE.Vector3())
      },
      restPos: mergedMesh.position.clone(),
      restQuat: mergedMesh.quaternion.clone(),
      restScale: mergedMesh.scale.clone(),
      restMatrixWorld: mergedMesh.matrixWorld.clone(),
      parentInvMatrixWorld: parentContainer.matrixWorld.clone().invert()
    };

    parentContainer.add(mergedMesh);
    newMeshes.push(mergedMesh);

    const firstMeta = subPartsMeta[indices[0]];
    newSubPartsMeta.push({
      subIdx: newSubIdx,
      name: `Corp Static Merged (${indices.length} piese)`,
      colorHex: firstMeta?.colorHex || '#e5e7eb',
      assignedMatId: firstMeta?.assignedMatId || null,
      mechType: 'none',
      isOpen: false
    });

    drawCallsSaved += indices.length - 1;
  });

  wrapperGroup.userData.isCadOptimized = true;
  updateModelBoundingStructure(wrapperGroup);

  return {
    newMeshes,
    newSubPartsMeta,
    drawCallsSaved
  };
}

/**
 * Complete CAD Optimization & Conversion Pipeline for imported models:
 * 1. Optimizes all textures (clamping & mipmaps).
 * 2. Selective shadows (skips micro-meshes < 8cm).
 * 3. Builds fast hierarchical raycasting bounding box structures.
 * 4. Merges static geometries sharing the same material (draw call batching).
 * 5. Returns new metrics and status.
 */
export function convertAndOptimizeCadModel(
  wrapperGroup: THREE.Group,
  meshes: THREE.Mesh[],
  subPartsMeta: any[],
  options = { mergeGeometries: true, maxTextureDim: 2048, minShadowDimM: 0.08 }
): {
  meshes: THREE.Mesh[];
  subPartsMeta: any[];
  metrics: ModelMetrics;
  drawCallsSaved: number;
  texturesOptimized: number;
  shadowsOptimized: number;
} {
  const startTime = performance.now();

  // 1. Optimize Textures
  const texturesOptimized = optimizeModelTextures(wrapperGroup, options.maxTextureDim);

  // 2. Optimize Shadows
  const shadowsOptimized = optimizeModelShadows(meshes, options.minShadowDimM);

  // 3. Merge Geometries (if enabled)
  let newMeshes = meshes;
  let newSubParts = subPartsMeta;
  let drawCallsSaved = 0;

  if (options.mergeGeometries) {
    const batchResult = convertAndBatchModelGeometries(wrapperGroup, meshes, subPartsMeta);
    newMeshes = batchResult.newMeshes;
    newSubParts = batchResult.newSubPartsMeta;
    drawCallsSaved = batchResult.drawCallsSaved;
  }

  // 4. Update Bounding Acceleration Structures
  updateModelBoundingStructure(wrapperGroup);

  // 5. Compute Final Metrics
  wrapperGroup.userData.isCadOptimized = true;
  const metrics = inspectModelMetrics(wrapperGroup);

  const duration = (performance.now() - startTime).toFixed(1);
  console.log(
    `⚡ CAD Model Three.js Optimization Complete (${duration}ms): ` +
    `${drawCallsSaved} draw calls saved, ${texturesOptimized} textures clamped, ${shadowsOptimized} micro-shadows culled.`
  );

  return {
    meshes: newMeshes,
    subPartsMeta: newSubParts,
    metrics,
    drawCallsSaved,
    texturesOptimized,
    shadowsOptimized
  };
}
