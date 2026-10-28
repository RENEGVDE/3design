import * as THREE from 'three';
import { fmtCm } from '../i18n/translations.js';

const labelTexCache = new Map();

export function createDimLabelSprite(text, theme = 'amber', scaleFactor = 1.0) {
  const key = `${text}|${theme}`;
  let entry = labelTexCache.get(key);
  if (!entry) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 36;
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const textW = Math.ceil(ctx.measureText(text).width);
    const padX = 28;
    const w = Math.max(120, textW + padX * 2);
    const h = 68;
    canvas.width = w;
    canvas.height = h;

    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    let bg = 'rgba(15, 18, 24, 0.92)';
    let border = '#f59e0b';
    let fg = '#fde68a';
    if (theme === 'cyan') { border = '#38bdf8'; fg = '#e0f2fe'; }
    else if (theme === 'green') { border = '#34d399'; fg = '#d1fae5'; }
    else if (theme === 'rose') { border = '#f43f5e'; fg = '#ffe4e6'; bg = 'rgba(28, 12, 18, 0.94)'; }

    const r = 16;
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
    ctx.lineWidth = 3.5;
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

export function addCadDimLine(parent, p1, p2, text, theme = 'amber', tickDir = new THREE.Vector3(0, 1, 0), tickLen = 0.035, scaleFactor = 1.0) {
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
  const pts = [
    p1, p2,
    p1.clone().sub(t), p1.clone().add(t),
    p2.clone().sub(t), p2.clone().add(t)
  ];
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

export function buildStaticDimensions(staticDimsGroup) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const RIGHT = V(1, 0, 0);
  const FWD = V(0, 0, 1);

  // 1. Overall Width along Back Wall (365.4 cm)
  addCadDimLine(staticDimsGroup, V(0.0, 2.79, 0.35), V(3.654, 2.79, 0.35), '365.4 cm', 'amber', UP, 0.045, 1.15);

  // 2. Overall Total Height (267.2 cm)
  addCadDimLine(staticDimsGroup, V(-0.14, 0.0, 0.62), V(-0.14, 2.672, 0.62), '267.2 cm', 'green', RIGHT, 0.045, 1.15);

  // 3. Overall Total Depth including Left Return & Sideboard (329.8 cm)
  addCadDimLine(staticDimsGroup, V(-0.15, 0.04, 0.0), V(-0.15, 0.04, 3.298), '329.8 cm', 'cyan', RIGHT, 0.045, 1.15);

  // 4. Upper Wall Cabinets Breakdown (Left -> Right)
  const yUp = 2.70;
  const zUp = 0.56;
  addCadDimLine(staticDimsGroup, V(0.0,   yUp, zUp), V(0.32,  yUp, zUp), '32 cm',   'cyan', UP, 0.03, 0.88);
  addCadDimLine(staticDimsGroup, V(0.32,  yUp, zUp), V(1.185, yUp, zUp), '86.5 cm', 'cyan', UP, 0.03, 0.92);
  addCadDimLine(staticDimsGroup, V(1.185, yUp, zUp), V(1.785, yUp, zUp), '60 cm',   'cyan', UP, 0.03, 0.90);
  addCadDimLine(staticDimsGroup, V(1.785, yUp, zUp), V(2.454, yUp, zUp), '66.9 cm', 'cyan', UP, 0.03, 0.92);
  addCadDimLine(staticDimsGroup, V(2.454, yUp, zUp), V(3.054, yUp, zUp), '60 cm',   'cyan', UP, 0.03, 0.90);
  addCadDimLine(staticDimsGroup, V(3.054, yUp, zUp), V(3.654, yUp, zUp), '60 cm',   'cyan', UP, 0.03, 0.90);

  // 5. Base Cabinets Width Breakdown along Floor Front
  const yBot = 0.03;
  const zBot = 0.68;
  addCadDimLine(staticDimsGroup, V(0.60,  yBot, zBot), V(1.20,  yBot, zBot), '60 cm',   'amber', UP, 0.03, 0.92);
  addCadDimLine(staticDimsGroup, V(1.20,  yBot, zBot), V(1.80,  yBot, zBot), '60 cm',   'amber', UP, 0.03, 0.92);
  addCadDimLine(staticDimsGroup, V(1.80,  yBot, zBot), V(2.454, yBot, zBot), '65.4 cm', 'amber', UP, 0.03, 0.92);

  // 6. Vertical Heights Breakdown
  addCadDimLine(staticDimsGroup, V(2.49, 0.0,   0.64), V(2.49, 0.898, 0.64), '89.8 cm',  'green', RIGHT, 0.03, 0.95);
  addCadDimLine(staticDimsGroup, V(2.49, 0.898, 0.64), V(2.49, 1.44,  0.64), '54.2 cm',  'green', RIGHT, 0.03, 0.95);
  addCadDimLine(staticDimsGroup, V(2.49, 1.44,  0.64), V(2.49, 2.672, 0.64), '123.2 cm', 'green', RIGHT, 0.03, 0.95);

  // 7. Right Peninsula & Glass Sideboard Dimensions
  addCadDimLine(staticDimsGroup, V(3.72, 0.92, 0.60),  V(3.72, 0.92, 2.138), '153.8 cm', 'cyan',  RIGHT, 0.035, 1.0);
  addCadDimLine(staticDimsGroup, V(3.72, 2.70, 2.138), V(3.72, 2.70, 3.298), '116 cm',   'amber', UP,    0.035, 1.0);
  addCadDimLine(staticDimsGroup, V(3.04, 0.92, 2.138), V(3.67, 0.92, 2.138), '63 cm',    'cyan',  FWD,   0.03,  0.92);
}

export function renderPartDimensions3D({
  partId,
  interactiveMap,
  partDimsGroup
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
  boxHelper.material.depthTest = false;
  boxHelper.material.transparent = true;
  boxHelper.material.opacity = 0.7;
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

export function createPinMarker(pos, colorHex = 0xf43f5e) {
  const geo = new THREE.SphereGeometry(0.016, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: colorHex, depthTest: false });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(pos);
  m.renderOrder = 999;
  m.raycast = () => {};
  return m;
}
