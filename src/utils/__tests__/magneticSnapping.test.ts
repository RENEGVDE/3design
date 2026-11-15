import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { calculateMagneticSnap } from '../magneticSnapping';

function makeBoxGroup(x: number, y: number, z: number, w = 0.6, h = 0.8, d = 0.6): THREE.Group {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  mesh.position.set(0, h / 2, 0);
  group.add(mesh);
  group.position.set(x, y, z);
  group.updateMatrixWorld(true);
  return group;
}

describe('magneticSnapping', () => {
  it('snaps moving model to floor Y=0 when close to ground', () => {
    const m1 = makeBoxGroup(0, 0.02, 0);
    const res = calculateMagneticSnap(
      'm1',
      [{ id: 'm1', name: 'Cabinet 1' }],
      { m1: { wrapperGroup: m1 } },
      0.055
    );
    expect(res).not.toBeNull();
    expect(res!.position[1]).toBe(0);
  });

  it('snaps moving model flush next to neighbor on X and Z axes', () => {
    const neighbor = makeBoxGroup(0, 0, 0, 0.6, 0.8, 0.6); // X: [-0.3, 0.3], Z: [-0.3, 0.3]
    const moving = makeBoxGroup(0.62, 0, 0.02, 0.6, 0.8, 0.6); // min.x = 0.32 (within 0.055 of 0.3)

    const res = calculateMagneticSnap(
      'moving',
      [
        { id: 'neighbor', name: 'Base 60' },
        { id: 'moving', name: 'Base 60 B' }
      ],
      {
        neighbor: { wrapperGroup: neighbor },
        moving: { wrapperGroup: moving }
      },
      0.055
    );

    expect(res).not.toBeNull();
    expect(res!.position[0]).toBeCloseTo(0.6, 3);
    expect(res!.position[2]).toBeCloseTo(0, 3);
    expect(res!.info).toContain('Base 60');
  });
});

