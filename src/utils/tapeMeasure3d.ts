import * as THREE from 'three';

export type TapeSnapType = 'vertex' | 'edge' | 'surface';

export interface TapeSnapResult {
  point: THREE.Vector3;
  snapType: TapeSnapType;
}

export interface TapeMeasurement {
  labelStr: string;
  distCm: number;
  distMm: number;
  dxCm: number;
  dyCm: number;
  dzCm: number;
}

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _edgeLine = new THREE.Line3();
const _edgeClosest = new THREE.Vector3();

/**
 * Finds the best snapped 3D point on a raycast hit:
 * 1. Vertex (corner) snap if within `vertexThresholdM`
 * 2. Edge snap if within `edgeThresholdM`
 * 3. Exact surface hit point otherwise
 */
export function resolveTapeSnapPoint(
  hit: THREE.Intersection,
  vertexThresholdM = 0.035,
  edgeThresholdM = 0.025
): TapeSnapResult {
  const fallback: TapeSnapResult = {
    point: hit.point.clone(),
    snapType: 'surface'
  };

  const mesh = hit.object as THREE.Mesh;
  if (!mesh?.isMesh || !hit.face || !mesh.geometry) {
    return fallback;
  }

  const posAttr = mesh.geometry.getAttribute('position');
  if (!posAttr) return fallback;

  mesh.updateWorldMatrix(true, false);

  _vA.fromBufferAttribute(posAttr, hit.face.a).applyMatrix4(mesh.matrixWorld);
  _vB.fromBufferAttribute(posAttr, hit.face.b).applyMatrix4(mesh.matrixWorld);
  _vC.fromBufferAttribute(posAttr, hit.face.c).applyMatrix4(mesh.matrixWorld);

  const verts = [_vA, _vB, _vC];
  let bestVertexDist = vertexThresholdM;
  let bestVertex: THREE.Vector3 | null = null;

  for (const v of verts) {
    const d = hit.point.distanceTo(v);
    if (d <= bestVertexDist) {
      bestVertexDist = d;
      bestVertex = v.clone();
    }
  }

  if (bestVertex) {
    return { point: bestVertex, snapType: 'vertex' };
  }

  const edges: [THREE.Vector3, THREE.Vector3][] = [
    [_vA, _vB],
    [_vB, _vC],
    [_vC, _vA]
  ];
  let bestEdgeDist = edgeThresholdM;
  let bestEdgePt: THREE.Vector3 | null = null;

  for (const [start, end] of edges) {
    _edgeLine.set(start, end);
    _edgeLine.closestPointToPoint(hit.point, true, _edgeClosest);
    const d = hit.point.distanceTo(_edgeClosest);
    if (d <= bestEdgeDist) {
      bestEdgeDist = d;
      bestEdgePt = _edgeClosest.clone();
    }
  }

  if (bestEdgePt) {
    return { point: bestEdgePt, snapType: 'edge' };
  }

  return fallback;
}

const SNAP_COLORS: Record<TapeSnapType, number> = {
  vertex: 0xf59e0b,
  edge: 0x38bdf8,
  surface: 0xf43f5e
};

export function createTapeSnapIndicator(): THREE.Group {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 999;

  const coreGeo = new THREE.SphereGeometry(0.011, 14, 14);
  const coreMat = new THREE.MeshBasicMaterial({
    color: SNAP_COLORS.surface,
    depthTest: false,
    transparent: true,
    opacity: 0.95
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.name = 'snapCore';
  core.renderOrder = 999;
  core.raycast = () => {};

  const ringGeo = new THREE.RingGeometry(0.018, 0.025, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: SNAP_COLORS.surface,
    side: THREE.DoubleSide,
    depthTest: false,
    transparent: true,
    opacity: 0.85
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.name = 'snapRing';
  ring.renderOrder = 999;
  ring.raycast = () => {};

  group.add(core);
  group.add(ring);
  return group;
}

export function updateTapeSnapIndicator(
  indicator: THREE.Group | null,
  snap: TapeSnapResult | null,
  camera?: THREE.Camera
): void {
  if (!indicator) return;
  if (!snap) {
    indicator.visible = false;
    return;
  }

  indicator.visible = true;
  indicator.position.copy(snap.point);
  if (camera) {
    indicator.quaternion.copy(camera.quaternion);
  }

  const color = SNAP_COLORS[snap.snapType];
  const scale = snap.snapType === 'vertex' ? 1.25 : snap.snapType === 'edge' ? 1.05 : 0.85;
  indicator.scale.setScalar(scale);

  const core = indicator.getObjectByName('snapCore') as THREE.Mesh | undefined;
  const ring = indicator.getObjectByName('snapRing') as THREE.Mesh | undefined;
  if (core) (core.material as THREE.MeshBasicMaterial).color.setHex(color);
  if (ring) (ring.material as THREE.MeshBasicMaterial).color.setHex(color);
}

