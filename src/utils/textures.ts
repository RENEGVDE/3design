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
  overview: { pos: [-1.8, 2.6, 4.2], target: [1.8, 1.0, 1.8] },
  front:    { pos: [1.8, 1.2, 4.8],  target: [1.8, 1.1, 1.8] },
  side:     { pos: [5.2, 1.2, 1.8],  target: [1.8, 1.1, 1.8] },
  top:      { pos: [1.8, 6.5, 1.8],  target: [1.8, 0.0, 1.8] }
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
