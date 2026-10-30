import * as THREE from 'three';

export const DEFAULT_WHITE_HEX = '#f4f4f2';

export const FINISH_MODES = [
  { key: 'matte', roughness: 0.42, metalness: 0.02, transparent: false, opacity: 1.0, i18nKey: 'finishMatte' },
  { key: 'satin', roughness: 0.25, metalness: 0.06, transparent: false, opacity: 1.0, i18nKey: 'finishSatin' },
  { key: 'gloss', roughness: 0.09, metalness: 0.12, transparent: false, opacity: 1.0, i18nKey: 'finishGloss' },
  { key: 'glass', roughness: 0.08, metalness: 0.18, transparent: true,  opacity: 0.60, i18nKey: 'finishGlass' }
];

export const LIGHT_POS_PRESETS = {
  front_right:  { angleDeg: 32,   heightM: 4.8, distM: 4.5 },
  front_left:   { angleDeg: -42,  heightM: 4.5, distM: 4.5 },
  ceiling:      { angleDeg: 0,    heightM: 6.0, distM: 1.5 },
  window:       { angleDeg: 95,   heightM: 3.2, distM: 5.0 },
  low_dramatic: { angleDeg: -65,  heightM: 1.6, distM: 4.2 }
};

export const CAM_PRESETS = {
  overview:  { pos: [-1.65, 2.35, 4.65], target: [1.85, 1.10, 1.05] },
  front:     { pos: [1.55, 1.38, 3.85],  target: [1.55, 1.22, 0.40] },
  cooking:   { pos: [2.05, 1.15, 2.15],  target: [2.10, 0.55, 0.45] },
  peninsula: { pos: [1.35, 1.35, 2.25],  target: [3.45, 0.60, 1.65] },
  sideboard: { pos: [2.65, 1.45, 1.35],  target: [3.34, 1.15, 2.70] },
  left:      { pos: [2.35, 1.40, 1.65],  target: [0.15, 1.25, 1.05] },
  top:       { pos: [1.85, 6.20, 1.55],  target: [1.85, 0.50, 1.45] }
};

export function kelvinToColor(k) {
  const cWarm = new THREE.Color(0xffbe73);    // 2700K
  const cNeutral = new THREE.Color(0xfff5e4); // 4000K
  const cCool = new THREE.Color(0xd4eaff);    // 6500K
  if (k <= 4000) {
    const t = Math.max(0, Math.min(1, (k - 2700) / (4000 - 2700)));
    return cWarm.clone().lerp(cNeutral, t);
  } else {
    const t = Math.max(0, Math.min(1, (k - 4000) / (6500 - 4000)));
    return cNeutral.clone().lerp(cCool, t);
  }
}

export function createOvenDisplayTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#08090c';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#222630';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 248, 56);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('12:45  180°C', 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTextureFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve(null);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 512, 512);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.center.set(0.5, 0.5);
      tex.anisotropy = 4;
      resolve(tex);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export function buildDefaultMaterialsTable(displayTex) {
  return [
    new THREE.MeshStandardMaterial({ color: DEFAULT_WHITE_HEX, roughness: 0.42, metalness: 0.02 }), // 0: Carcass
    new THREE.MeshStandardMaterial({ color: DEFAULT_WHITE_HEX, roughness: 0.42, metalness: 0.02 }), // 1: Facades
    new THREE.MeshStandardMaterial({ color: DEFAULT_WHITE_HEX, roughness: 0.42, metalness: 0.02 }), // 2: Countertop
    new THREE.MeshStandardMaterial({ color: DEFAULT_WHITE_HEX, roughness: 0.42, metalness: 0.02 }), // 3: Vitrine / Wood
    new THREE.MeshStandardMaterial({ color: 0xbec4cc, roughness: 0.28, metalness: 0.85 }), // 4: Brushed Steel
    new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.15, metalness: 0.65 }), // 5: Dark Appliance Glass
    new THREE.MeshStandardMaterial({ color: DEFAULT_WHITE_HEX, roughness: 0.42, metalness: 0.02 }), // 6: Plinth
    new THREE.MeshStandardMaterial({ color: DEFAULT_WHITE_HEX, roughness: 0.42, metalness: 0.02 }), // 7: Light panel
    new THREE.MeshStandardMaterial({ color: DEFAULT_WHITE_HEX, roughness: 0.42, metalness: 0.02 }), // 8: Panel
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: displayTex, emissive: 0x38bdf8, emissiveMap: displayTex, emissiveIntensity: 0.65, roughness: 0.2 }), // 9: Oven LED
    new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.10, metalness: 0.25 }), // 10: Induction Hob Glass
    new THREE.MeshStandardMaterial({ color: 0xd4d8dd, roughness: 0.22, metalness: 0.90 }), // 11: Chrome Faucet
    new THREE.MeshStandardMaterial({ color: 0x22252b, roughness: 0.45, metalness: 0.50 }), // 12: Dark Hardware
    new THREE.MeshStandardMaterial({ color: 0x9fa6b0, roughness: 0.30, metalness: 0.82 }), // 13: Sink Inox
    new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.35, metalness: 0.75 }), // 14: Anodized Frame
    new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.40, metalness: 0.30 }), // 15: Dark Gasket
    new THREE.MeshStandardMaterial({ color: DEFAULT_WHITE_HEX, roughness: 0.08, metalness: 0.18, transparent: true, opacity: 0.60, depthWrite: false }) // 16: Vitrine Glass
  ];
}
