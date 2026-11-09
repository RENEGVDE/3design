import * as THREE from 'three';
import { fmtCm } from '../i18n/translations';

const labelTexCache = new Map<string, { tex: THREE.CanvasTexture; aspect: number }>();

export function createDimLabelSprite(text: string, theme = 'amber', scaleFactor = 1.0): THREE.Sprite {
  const key = `${text}|${theme}`;
  let entry = labelTexCache.get(key);
  if (!entry) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const fontSize = 34;
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const textW = Math.ceil(ctx.measureText(text).width);
    const padX = 24;
    const w = Math.max(120, textW + padX * 2);
    const h = 64;
    canvas.width = w;
    canvas.height = h;

    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    let bg = 'rgba(15, 23, 42, 0.94)';
    let border = '#f59e0b';
    let fg = '#fde68a';
    if (theme === 'cyan') { border = '#38bdf8'; fg = '#e0f2fe'; }
    else if (theme === 'green') { border = '#34d399'; fg = '#d1fae5'; }
    else if (theme === 'rose') { border = '#f43f5e'; fg = '#ffe4e6'; bg = 'rgba(28, 12, 18, 0.96)'; }

    const r = 14;
    ctx.beginPath();
    ctx.moveTo(r, 3);
    ctx.lineTo(w - r, 3);
    ctx.quadraticCurveTo(w - 3, 3, w - 3, r);
    ctx.lineTo(w - 3, h - r);
    ctx.quadraticCurveTo(w - 3, h - 3, w - r, h - 3);
    ctx.lineTo(r, h - 3);
    ctx.quadraticCurveTo(3, h - 3, 3, h - r);
    ctx.lineTo(3, r);
    ctx.quadraticCurveTo(3, 3, r, 3);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = border;
    ctx.stroke();

    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 1);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    entry = { tex, aspect: w / h };
    labelTexCache.set(key, entry);
  }

  const mat = new THREE.SpriteMaterial({
    map: entry.tex,
    depthTest: false,
    depthWrite: false,
    transparent: true
  });
  const sprite = new THREE.Sprite(mat);
  const baseH = 0.082 * scaleFactor;
  sprite.scale.set(baseH * entry.aspect, baseH, 1);
  sprite.renderOrder = 999;
  sprite.raycast = () => {};
  return sprite;
}

export function addCadDimLine(
  parent: THREE.Group,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  text: string,
  theme = 'amber',
  tickDir = new THREE.Vector3(0, 1, 0),
  tickLen = 0.035,
  scaleFactor = 1.0,
  extOrigin1?: THREE.Vector3,
  extOrigin2?: THREE.Vector3
) {
  let hex = 0xf59e0b;
  if (theme === 'cyan') hex = 0x38bdf8;
  else if (theme === 'green') hex = 0x34d399;
  else if (theme === 'rose') hex = 0xf43f5e;

  const lineMat = new THREE.LineBasicMaterial({
    color: hex,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.92
  });

  const t = tickDir.clone().normalize().multiplyScalar(tickLen);
  const pts: THREE.Vector3[] = [
    p1, p2,
    p1.clone().sub(t), p1.clone().add(t),
    p2.clone().sub(t), p2.clone().add(t)
  ];

  // Optional extension lines from object corners to dimension line
  if (extOrigin1) {
    pts.push(extOrigin1.clone(), p1.clone().add(t.clone().multiplyScalar(0.5)));
  }
  if (extOrigin2) {
    pts.push(extOrigin2.clone(), p2.clone().add(t.clone().multiplyScalar(0.5)));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const segs = new THREE.LineSegments(geo, lineMat);
  segs.renderOrder = 998;
  segs.raycast = () => {};
  parent.add(segs);

  const mid = p1.clone().add(p2).multiplyScalar(0.5);
  const sprite = createDimLabelSprite(text, theme, scaleFactor);
  sprite.position.copy(mid);
  parent.add(sprite);
}

/**
 * Render real dynamic CAD dimensions directly on all 3D furniture models in scene.
 * Measures the exact bounding box in world space directly on the object!
 */
export function renderDynamicSceneDimensions(
  dimsGroup: THREE.Group,
  importedModels: any[] = [],
  selectedModelId: string | null = null,
  importedMap: Record<string, any> = {},
  fallbackMeshes: THREE.Mesh[] = []
) {
  if (!dimsGroup) return;

  // Clear previous dimensions
  while (dimsGroup.children.length > 0) {
    const c = dimsGroup.children[0];
    dimsGroup.remove(c);
  }

  // 1. Process imported furniture models
  if (importedModels && importedModels.length > 0) {
    importedModels.forEach((model) => {
      const entry = importedMap[model.id];
      if (!entry || !entry.wrapperGroup || !entry.wrapperGroup.visible) return;

      entry.wrapperGroup.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(entry.wrapperGroup);
      if (box.isEmpty() || !isFinite(box.min.x)) return;

      const size = new THREE.Vector3();
      box.getSize(size);

      const wCm = Math.round(size.x * 1000) / 10;
      const hCm = Math.round(size.y * 1000) / 10;
      const dCm = Math.round(size.z * 1000) / 10;

      const isSelected = model.id === selectedModelId;
      const pad = isSelected ? 0.06 : 0.04;
      const scaleFactor = isSelected ? 1.05 : 0.95;

      const themeW = isSelected ? 'amber' : 'amber';
      const themeH = isSelected ? 'green' : 'green';
      const themeD = isSelected ? 'cyan' : 'cyan';

      // Visual bounding box wireframe outline
      const boxHelper = new THREE.Box3Helper(box, new THREE.Color(isSelected ? 0x38bdf8 : 0x64748b));
      const helperMat = boxHelper.material as THREE.LineBasicMaterial;
      helperMat.depthTest = false;
      helperMat.transparent = true;
      helperMat.opacity = isSelected ? 0.6 : 0.25;
      boxHelper.renderOrder = 995;
      boxHelper.raycast = () => {};
      dimsGroup.add(boxHelper);

      // 1. Width Dimension (Along X axis - in front of cabinet)
      const p1W = new THREE.Vector3(box.min.x, box.max.y + pad, box.max.z + pad);
      const p2W = new THREE.Vector3(box.max.x, box.max.y + pad, box.max.z + pad);
      addCadDimLine(
        dimsGroup,
        p1W,
        p2W,
        `L: ${fmtCm(wCm)} cm`,
        themeW,
        new THREE.Vector3(0, 1, 0),
        0.035,
        scaleFactor,
        new THREE.Vector3(box.min.x, box.max.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z)
      );

      // 2. Height Dimension (Along Y axis - right front edge)
      const p1H = new THREE.Vector3(box.max.x + pad, box.min.y, box.max.z + pad);
      const p2H = new THREE.Vector3(box.max.x + pad, box.max.y, box.max.z + pad);
      addCadDimLine(
        dimsGroup,
        p1H,
        p2H,
        `H: ${fmtCm(hCm)} cm`,
        themeH,
        new THREE.Vector3(1, 0, 0),
        0.035,
        scaleFactor,
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z)
      );

      // 3. Depth Dimension (Along Z axis - right lateral edge)
      if (dCm > 3.0) {
        const p1D = new THREE.Vector3(box.max.x + pad, box.min.y, box.min.z);
        const p2D = new THREE.Vector3(box.max.x + pad, box.min.y, box.max.z);
        addCadDimLine(
          dimsGroup,
          p1D,
          p2D,
          `A: ${fmtCm(dCm)} cm`,
          themeD,
          new THREE.Vector3(1, 0, 0),
          0.035,
          scaleFactor,
          new THREE.Vector3(box.max.x, box.min.y, box.min.z),
          new THREE.Vector3(box.max.x, box.min.y, box.max.z)
        );
      }
    });
    return;
  }

  // 2. Fallback: Measure native kitchen meshes if no external GLB models imported
  if (fallbackMeshes && fallbackMeshes.length > 0) {
    const box = new THREE.Box3();
    for (const m of fallbackMeshes) {
      if (m.visible) {
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
        box.union(b);
      }
    }
    if (!box.isEmpty() && isFinite(box.min.x)) {
      const size = new THREE.Vector3();
      box.getSize(size);
      const wCm = Math.round(size.x * 1000) / 10;
      const hCm = Math.round(size.y * 1000) / 10;
      const dCm = Math.round(size.z * 1000) / 10;
      const pad = 0.05;

      const p1W = new THREE.Vector3(box.min.x, box.max.y + pad, box.max.z + pad);
      const p2W = new THREE.Vector3(box.max.x, box.max.y + pad, box.max.z + pad);
      addCadDimLine(dimsGroup, p1W, p2W, `L: ${fmtCm(wCm)} cm`, 'amber', new THREE.Vector3(0, 1, 0), 0.035, 1.0);

      const p1H = new THREE.Vector3(box.max.x + pad, box.min.y, box.max.z + pad);
      const p2H = new THREE.Vector3(box.max.x + pad, box.max.y, box.max.z + pad);
      addCadDimLine(dimsGroup, p1H, p2H, `H: ${fmtCm(hCm)} cm`, 'green', new THREE.Vector3(1, 0, 0), 0.035, 1.0);

      if (dCm > 3.0) {
        const p1D = new THREE.Vector3(box.max.x + pad, box.min.y, box.min.z);
        const p2D = new THREE.Vector3(box.max.x + pad, box.min.y, box.max.z);
        addCadDimLine(dimsGroup, p1D, p2D, `A: ${fmtCm(dCm)} cm`, 'cyan', new THREE.Vector3(1, 0, 0), 0.035, 1.0);
      }
    }
  }
}

// Backward compatibility alias: redirects to dynamic rendering
export function buildStaticDimensions(staticDimsGroup: THREE.Group) {
  while (staticDimsGroup.children.length > 0) {
    staticDimsGroup.remove(staticDimsGroup.children[0]);
  }
}

export function renderPartDimensions3D({
  partId,
  interactiveMap,
  partDimsGroup
}: {
  partId: string | null;
  interactiveMap: Record<string, any>;
  partDimsGroup: THREE.Group;
}) {
  while (partDimsGroup.children.length > 0) {
    partDimsGroup.remove(partDimsGroup.children[0]);
  }
  if (!partId || !interactiveMap[partId]) return null;

  const item = interactiveMap[partId];
  item.outer.updateWorldMatrix(true, true);

  const box = new THREE.Box3();
  for (const m of item.meshes) {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox.clone();
    b.applyMatrix4(m.matrixWorld);
    box.union(b);
  }
  if (box.isEmpty()) return null;

  const boxHelper = new THREE.Box3Helper(box, 0x38bdf8);
  const boxMat = boxHelper.material as THREE.LineBasicMaterial;
  boxMat.depthTest = false;
  boxMat.transparent = true;
  boxMat.opacity = 0.7;
  boxHelper.renderOrder = 996;
  boxHelper.raycast = () => {};
  partDimsGroup.add(boxHelper);

  const { w, h, d, orientZ } = item.dimsCm;
  const wStr = `${fmtCm(w)} cm`;
  const hStr = `${fmtCm(h)} cm`;
  const dStr = `${fmtCm(d)} cm`;

  const pad = 0.04;
  if (!orientZ) {
    const zFront = box.max.z + pad;
    addCadDimLine(
      partDimsGroup,
      new THREE.Vector3(box.min.x, box.max.y + pad, zFront),
      new THREE.Vector3(box.max.x, box.max.y + pad, zFront),
      wStr, 'amber', new THREE.Vector3(0, 1, 0), 0.028, 0.92
    );
    addCadDimLine(
      partDimsGroup,
      new THREE.Vector3(box.max.x + pad, box.min.y, zFront),
      new THREE.Vector3(box.max.x + pad, box.max.y, zFront),
      hStr, 'green', new THREE.Vector3(1, 0, 0), 0.028, 0.92
    );
    if (d > 2.5) {
      addCadDimLine(
        partDimsGroup,
        new THREE.Vector3(box.min.x - pad, box.min.y, box.min.z),
        new THREE.Vector3(box.min.x - pad, box.min.y, box.max.z),
        dStr, 'cyan', new THREE.Vector3(1, 0, 0), 0.028, 0.90
      );
    }
  } else {
    const xFront = (item.spec.category === 'peninsula_door') ? (box.min.x - pad) : (box.max.x + pad);
    addCadDimLine(
      partDimsGroup,
      new THREE.Vector3(xFront, box.max.y + pad, box.min.z),
      new THREE.Vector3(xFront, box.max.y + pad, box.max.z),
      wStr, 'amber', new THREE.Vector3(0, 1, 0), 0.028, 0.92
    );
    addCadDimLine(
      partDimsGroup,
      new THREE.Vector3(xFront, box.min.y, box.max.z + pad),
      new THREE.Vector3(xFront, box.max.y, box.max.z + pad),
      hStr, 'green', new THREE.Vector3(0, 0, 1), 0.028, 0.92
    );
  }

  return item;
}

export function createPinMarker(pos: THREE.Vector3, colorHex = 0xf43f5e): THREE.Group {
  const group = new THREE.Group();

  // Outer sphere
  const geo = new THREE.SphereGeometry(0.02, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: colorHex, depthTest: false });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 999;
  m.raycast = () => {};
  group.add(m);

  // Inner bright core
  const coreGeo = new THREE.SphereGeometry(0.009, 12, 12);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.renderOrder = 1000;
  core.raycast = () => {};
  group.add(core);

  group.position.copy(pos);
  group.renderOrder = 999;
  group.raycast = () => {};
  return group;
}
