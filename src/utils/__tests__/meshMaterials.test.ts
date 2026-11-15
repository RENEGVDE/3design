import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { applyDefaultWhiteToMesh, applyMatEntryToMesh } from '../meshMaterials';
import { DEFAULT_WHITE_HEX } from '../textures';

function createTestMesh() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial();
  return new THREE.Mesh(geo, mat);
}

describe('meshMaterials', () => {
  it('applies default white material and xray state', () => {
    const mesh = createTestMesh();
    applyDefaultWhiteToMesh(mesh, false);
    const mat = mesh.material as THREE.MeshStandardMaterial;

    expect(mat.color.getHexString()).toBe(new THREE.Color(DEFAULT_WHITE_HEX).getHexString());
    expect(mat.transparent).toBe(false);
    expect(mat.opacity).toBe(1.0);
    expect(mat.depthWrite).toBe(true);
    expect(mat.userData.assignedMatId).toBeNull();

    applyDefaultWhiteToMesh(mesh, true);
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeCloseTo(0.28);
    expect(mat.depthWrite).toBe(false);
  });

  it('applies material entry color, finish, and texture transforms', () => {
    const mesh = createTestMesh();
    const tex = new THREE.Texture();

    applyMatEntryToMesh(
      mesh,
      {
        id: 'mat-oak',
        colorHex: '#b48a5a',
        finishIdx: 2, // gloss
        scale: 0.5,
        rotate90: true,
        texture: tex
      },
      false
    );

    const mat = mesh.material as THREE.MeshStandardMaterial;
    expect(mat.color.getHexString()).toBe('b48a5a');
    expect(mat.map).toBe(tex);
    expect(tex.repeat.x).toBeCloseTo(2.0);
    expect(tex.rotation).toBeCloseTo(Math.PI / 2);
    expect(mat.roughness).toBeCloseTo(0.09);
    expect(mat.metalness).toBeCloseTo(0.12);
    expect(mat.userData.assignedMatId).toBe('mat-oak');
  });

  it('handles glass finish transparency and xray override', () => {
    const mesh = createTestMesh();
    applyMatEntryToMesh(
      mesh,
      {
        id: 'mat-glass',
        colorHex: '#d0e8f2',
        finishIdx: 3 // glass
      },
      false
    );

    const mat = mesh.material as THREE.MeshStandardMaterial;
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeCloseTo(0.6);
    expect(mat.depthWrite).toBe(false);

    applyMatEntryToMesh(mesh, { id: 'mat-glass', finishIdx: 3 }, true);
    expect(mat.opacity).toBeCloseTo(0.25);
  });
});

