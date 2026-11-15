import * as THREE from 'three';
import { DEFAULT_WHITE_HEX, FINISH_MODES } from './textures';

export interface MaterialLibraryEntry {
  id: string;
  colorHex?: string;
  finishIdx?: number;
  scale?: number;
  rotate90?: boolean;
  texture?: THREE.Texture | null;
}

export function applyDefaultWhiteToMesh(
  mesh: THREE.Object3D | null | undefined,
  isXray = false
) {
  if (!mesh || !('material' in mesh) || !mesh.material) return;
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.color.set(DEFAULT_WHITE_HEX);
  mat.map = null;
  mat.roughness = 0.42;
  mat.metalness = 0.02;
  mat.transparent = Boolean(isXray);
  mat.opacity = isXray ? 0.28 : 1.0;
  mat.depthWrite = !isXray;
  mat.userData.assignedMatId = null;
  mat.needsUpdate = true;
}

export function applyMatEntryToMesh(
  mesh: THREE.Object3D | null | undefined,
  matEntry: MaterialLibraryEntry | null | undefined,
  isXray = false
) {
  if (!mesh || !('material' in mesh) || !mesh.material) return;
  if (!matEntry) {
    applyDefaultWhiteToMesh(mesh, isXray);
    return;
  }

  const mat = mesh.material as THREE.MeshStandardMaterial;
  const fin = FINISH_MODES[matEntry.finishIdx ?? 0] || FINISH_MODES[0];

  if (matEntry.texture) {
    const rep = 1.0 / Math.max(0.15, matEntry.scale ?? 1.0);
    matEntry.texture.repeat.set(rep, rep);
    matEntry.texture.rotation = matEntry.rotate90 ? Math.PI / 2 : 0;
    matEntry.texture.needsUpdate = true;
  }

  mat.color.set(matEntry.colorHex || '#ffffff');
  mat.map = matEntry.texture || null;
  mat.roughness = fin.roughness;
  mat.metalness = fin.metalness;

  if (fin.transparent) {
    mat.transparent = true;
    mat.opacity = isXray ? 0.25 : fin.opacity;
    mat.depthWrite = false;
  } else {
    mat.transparent = Boolean(isXray);
    mat.opacity = isXray ? 0.28 : 1.0;
    mat.depthWrite = !isXray;
  }

  mat.userData.assignedMatId = matEntry.id;
  mat.needsUpdate = true;
}
