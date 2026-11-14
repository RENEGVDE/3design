import * as THREE from 'three';

export interface SnapModelRecord {
  id: string;
  name: string;
}

export interface SnapMapEntry {
  wrapperGroup: THREE.Object3D;
}

export interface MagneticSnapResult {
  position: [number, number, number];
  info: string;
}

/**
 * Computes magnetic snapping for a moving model against all other models in the scene
 */
export function calculateMagneticSnap(
  movingModelId: string,
  importedModels: SnapModelRecord[],
  importedMap: Record<string, SnapMapEntry>,
  snapThresholdM = 0.055
): MagneticSnapResult | null {
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

