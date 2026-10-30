import * as THREE from 'three';

/**
 * Calculates Axis-Aligned Bounding Box (AABB) in world coordinates for a model entry
 */
export function getModelAABB(modelEntry) {
  if (!modelEntry || !modelEntry.wrapperGroup) return null;
  const box = new THREE.Box3().setFromObject(modelEntry.wrapperGroup);
  return box;
}

/**
 * Computes magnetic snapping for a moving model against all other models in the scene
 * @param {string} movingModelId - ID of the model currently being moved
 * @param {Array} importedModels - List of all model records
 * @param {Object} importedMap - Three.js object wrappers
 * @param {number} snapThresholdM - Distance threshold in meters (default 0.05m / 5cm)
 * @returns {Object|null} - Snapped position [x, y, z] and snap details
 */
export function calculateMagneticSnap(movingModelId, importedModels, importedMap, snapThresholdM = 0.055) {
  const movingEntry = importedMap[movingModelId];
  if (!movingEntry) return null;

  const movingBox = new THREE.Box3().setFromObject(movingEntry.wrapperGroup);
  if (movingBox.isEmpty()) return null;

  const currentPos = movingEntry.wrapperGroup.position.clone();
  let snappedX = currentPos.x;
  let snappedY = Math.max(0, currentPos.y);
  let snappedZ = currentPos.z;

  const snappedInfo = [];

  // 1. Floor snap (Y = 0)
  if (Math.abs(movingBox.min.y) < snapThresholdM) {
    snappedY = Math.max(0, currentPos.y - movingBox.min.y);
    snappedInfo.push('Podea (Y=0)');
  }

  // 2. Neighbor model snapping
  for (const model of importedModels) {
    if (model.id === movingModelId) continue;
    const otherEntry = importedMap[model.id];
    if (!otherEntry) continue;

    const otherBox = new THREE.Box3().setFromObject(otherEntry.wrapperGroup);
    if (otherBox.isEmpty()) continue;

    // A. X-Axis Snapping (Flush left-to-right)
    const diffLeftToRight = Math.abs(movingBox.min.x - otherBox.max.x);
    if (diffLeftToRight < snapThresholdM) {
      const deltaX = otherBox.max.x - movingBox.min.x;
      snappedX = currentPos.x + deltaX;
      snappedInfo.push(`Aliniat dreapta: "${model.name}"`);
    }

    const diffRightToLeft = Math.abs(movingBox.max.x - otherBox.min.x);
    if (diffRightToLeft < snapThresholdM) {
      const deltaX = otherBox.min.x - movingBox.max.x;
      snappedX = currentPos.x + deltaX;
      snappedInfo.push(`Aliniat stânga: "${model.name}"`);
    }

    // B. Y-Axis Snapping (Stacking on top)
    const diffBottomToTop = Math.abs(movingBox.min.y - otherBox.max.y);
    if (diffBottomToTop < snapThresholdM) {
      const deltaY = otherBox.max.y - movingBox.min.y;
      snappedY = currentPos.y + deltaY;
      snappedInfo.push(`Așezat peste: "${model.name}"`);
    }

    // C. Z-Axis Snapping (Depth alignment)
    const diffBackToBack = Math.abs(movingBox.min.z - otherBox.min.z);
    if (diffBackToBack < snapThresholdM) {
      const deltaZ = otherBox.min.z - movingBox.min.z;
      snappedZ = currentPos.z + deltaZ;
      snappedInfo.push(`Aliniat spate: "${model.name}"`);
    }

    const diffFrontToFront = Math.abs(movingBox.max.z - otherBox.max.z);
    if (diffFrontToFront < snapThresholdM) {
      const deltaZ = otherBox.max.z - movingBox.max.z;
      snappedZ = currentPos.z + deltaZ;
      snappedInfo.push(`Aliniat față: "${model.name}"`);
    }
  }

  return {
    position: [
      Math.round(snappedX * 1000) / 1000,
      Math.round(Math.max(0, snappedY) * 1000) / 1000,
      Math.round(snappedZ * 1000) / 1000
    ],
    info: snappedInfo.join(' • ')
  };
}

/**
 * 1-Click Discrete Alignment tool
 */
export function alignModelDirectly(targetId, direction, importedModels, importedMap) {
  const targetEntry = importedMap[targetId];
  if (!targetEntry) return null;

  const targetBox = new THREE.Box3().setFromObject(targetEntry.wrapperGroup);
  const currentPos = targetEntry.wrapperGroup.position.clone();

  if (direction === 'floor') {
    const deltaY = -targetBox.min.y;
    return [currentPos.x, Math.max(0, currentPos.y + deltaY), currentPos.z];
  }

  // Find closest neighbor
  let closestNeighbor = null;
  let minDist = Infinity;

  for (const m of importedModels) {
    if (m.id === targetId) continue;
    const entry = importedMap[m.id];
    if (!entry) continue;
    const box = new THREE.Box3().setFromObject(entry.wrapperGroup);
    const dist = targetBox.getCenter(new THREE.Vector3()).distanceTo(box.getCenter(new THREE.Vector3()));
    if (dist < minDist) {
      minDist = dist;
      closestNeighbor = { model: m, box, entry };
    }
  }

  if (!closestNeighbor) return null;

  const nBox = closestNeighbor.box;

  if (direction === 'snap_right_of_neighbor') {
    const deltaX = nBox.max.x - targetBox.min.x;
    const deltaZ = nBox.min.z - targetBox.min.z;
    const deltaY = nBox.min.y - targetBox.min.y;
    return [
      Math.round((currentPos.x + deltaX) * 1000) / 1000,
      Math.round(Math.max(0, currentPos.y + deltaY) * 1000) / 1000,
      Math.round((currentPos.z + deltaZ) * 1000) / 1000
    ];
  }

  if (direction === 'snap_left_of_neighbor') {
    const deltaX = nBox.min.x - targetBox.max.x;
    const deltaZ = nBox.min.z - targetBox.min.z;
    const deltaY = nBox.min.y - targetBox.min.y;
    return [
      Math.round((currentPos.x + deltaX) * 1000) / 1000,
      Math.round(Math.max(0, currentPos.y + deltaY) * 1000) / 1000,
      Math.round((currentPos.z + deltaZ) * 1000) / 1000
    ];
  }

  if (direction === 'stack_on_neighbor') {
    const deltaY = nBox.max.y - targetBox.min.y;
    const deltaX = nBox.min.x - targetBox.min.x;
    const deltaZ = nBox.min.z - targetBox.min.z;
    return [
      Math.round((currentPos.x + deltaX) * 1000) / 1000,
      Math.round(Math.max(0, currentPos.y + deltaY) * 1000) / 1000,
      Math.round((currentPos.z + deltaZ) * 1000) / 1000
    ];
  }

  return null;
}

