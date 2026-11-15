import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  resolveTapeSnapPoint,
  applyTapeAxisLock,
  createTapeSnapIndicator,
  updateTapeSnapIndicator
} from '../tapeMeasure3d';

function makePlaneHit(hitX: number, hitY: number, hitZ = 0): THREE.Intersection {
  const geo = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  mesh.updateMatrixWorld(true);

  return {
    distance: 1,
    point: new THREE.Vector3(hitX, hitY, hitZ),
    object: mesh,
    face: { a: 0, b: 1, c: 2, normal: new THREE.Vector3(0, 0, 1), materialIndex: 0 }
  };
}

describe('tapeMeasure3d', () => {
  it('snaps to nearest vertex when within threshold', () => {
    const hit = makePlaneHit(0.015, 0.01, 0);
    const res = resolveTapeSnapPoint(hit, 0.035, 0.025);
    expect(res.snapType).toBe('vertex');
    expect(res.point.x).toBeCloseTo(0, 5);
    expect(res.point.y).toBeCloseTo(0, 5);
    expect(res.point.z).toBeCloseTo(0, 5);
  });

  it('snaps to edge when away from vertices but close to an edge', () => {
    const hit = makePlaneHit(0.5, 0.015, 0);
    const res = resolveTapeSnapPoint(hit, 0.035, 0.025);
    expect(res.snapType).toBe('edge');
    expect(res.point.x).toBeCloseTo(0.5, 5);
    expect(res.point.y).toBeCloseTo(0, 5);
  });

  it('falls back to surface hit when far from vertices and edges', () => {
    const hit = makePlaneHit(0.3, 0.3, 0);
    const res = resolveTapeSnapPoint(hit, 0.035, 0.025);
    expect(res.snapType).toBe('surface');
    expect(res.point.x).toBeCloseTo(0.3, 5);
    expect(res.point.y).toBeCloseTo(0.3, 5);
  });

  it('locks onto dominant orthogonal axis with applyTapeAxisLock', () => {
    const ptA = new THREE.Vector3(1, 2, 3);

    const lockX = applyTapeAxisLock(ptA, new THREE.Vector3(2.4, 2.2, 3.1));
    expect(lockX.axis).toBe('X');
    expect(lockX.point.toArray()).toEqual([2.4, 2, 3]);

    const lockY = applyTapeAxisLock(ptA, new THREE.Vector3(1.1, 3.8, 3.1));
    expect(lockY.axis).toBe('Y');
    expect(lockY.point.toArray()).toEqual([1, 3.8, 3]);

    const lockZ = applyTapeAxisLock(ptA, new THREE.Vector3(1.1, 2.1, 0.2));
    expect(lockZ.axis).toBe('Z');
    expect(lockZ.point.toArray()).toEqual([1, 2, 0.2]);
  });

  it('toggles visibility and position on snap indicator', () => {
    const indicator = createTapeSnapIndicator();
    expect(indicator.visible).toBe(false);

    updateTapeSnapIndicator(indicator, {
      point: new THREE.Vector3(1.2, 0.5, 0.8),
      snapType: 'vertex'
    });
    expect(indicator.visible).toBe(true);
    expect(indicator.position.x).toBeCloseTo(1.2, 5);

    updateTapeSnapIndicator(indicator, null);
    expect(indicator.visible).toBe(false);
  });
});

