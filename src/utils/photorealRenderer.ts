import * as THREE from 'three';

export type RenderAtmospherePreset =
  | 'daylight'
  | 'golden_hour'
  | 'studio_catalog'
  | 'luxury_evening';

export type RenderBackdropMode =
  | 'studio_cyclorama'
  | 'warm_parquet_walls'
  | 'marble_showroom'
  | 'current_scene';

export interface PhotorealRenderSettings {
  width: number;
  height: number;
  samples: number; // e.g. 12, 24, 48
  atmosphere: RenderAtmospherePreset;
  backdrop: RenderBackdropMode;
  softShadowSpread: number; // 0.1 to 1.2 meters (area light size)
  panelGapSeamOpacity: number; // 0 to 0.45 (realistic 2mm door gap lines)
}

export interface PostProcessSettings {
  exposure: number; // 0.6 to 1.6 (default 1.05)
  contrast: number; // 0.8 to 1.5 (default 1.12)
  warmth: number; // -40 to +40 (default 6)
  saturation: number; // 0.6 to 1.5 (default 1.08)
  bloom: number; // 0.0 to 1.0 (default 0.25)
  vignette: number; // 0.0 to 1.0 (default 0.22)
  sharpen: number; // 0.0 to 1.0 (default 0.35)
}

export const DEFAULT_RENDER_SETTINGS: PhotorealRenderSettings = {
  width: 1920,
  height: 1080,
  samples: 24,
  atmosphere: 'daylight',
  backdrop: 'warm_parquet_walls',
  softShadowSpread: 0.48,
  panelGapSeamOpacity: 0.22
};

export const DEFAULT_POST_PROCESS: PostProcessSettings = {
  exposure: 1.06,
  contrast: 1.12,
  warmth: 6,
  saturation: 1.08,
  bloom: 0.24,
  vignette: 0.2,
  sharpen: 0.35
};

export interface RawRenderBuffer {
  width: number;
  height: number;
  rgbFloat: Float32Array; // length = width * height * 3, values in 0..255
}

// Halton sequence for sub-pixel anti-aliasing jitter
function halton(index: number, base: number): number {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

// Vogel spiral disk sample for soft area light shadow penumbra
function diskSample(index: number, total: number): [number, number] {
  if (index === 0 || total <= 1) return [0, 0];
  const r = Math.sqrt((index + 0.5) / total);
  const theta = index * 2.399963229728653; // Golden angle
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

/**
 * Create a procedural oak wood or marble texture on an offscreen canvas for studio floor realism.
 */
function createProceduralFloorTexture(type: 'oak' | 'marble'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  if (type === 'oak') {
    ctx.fillStyle = '#c8a982';
    ctx.fillRect(0, 0, 512, 512);
    // Subtle wood planks & grain
    for (let i = 0; i < 320; i++) {
      const y = (i / 320) * 512;
      const alpha = 0.03 + (Math.sin(i * 0.7) * 0.5 + 0.5) * 0.05;
      ctx.fillStyle = i % 2 === 0 ? `rgba(110, 74, 38, ${alpha})` : `rgba(235, 210, 178, ${alpha})`;
      ctx.fillRect(0, y, 512, 2.5);
    }
    // Plank joints
    ctx.strokeStyle = 'rgba(75, 48, 22, 0.18)';
    ctx.lineWidth = 1.5;
    for (let p = 0; p < 8; p++) {
      const py = p * 64;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(512, py);
      ctx.stroke();
      const jointX = ((p * 173) % 400) + 50;
      ctx.beginPath();
      ctx.moveTo(jointX, py);
      ctx.lineTo(jointX, py + 64);
      ctx.stroke();
    }
  } else {
    // Polished marble tiles
    ctx.fillStyle = '#e8e6e1';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(140, 136, 128, 0.12)';
    ctx.lineWidth = 2.2;
    for (let v = 0; v < 18; v++) {
      ctx.beginPath();
      let x = (v * 67) % 512;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < 512) {
        y += 32;
        x += Math.sin(y * 0.04 + v) * 18;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Tile grid
    ctx.strokeStyle = 'rgba(120, 118, 114, 0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, 254, 254);
    ctx.strokeRect(257, 1, 254, 254);
    ctx.strokeRect(1, 257, 254, 254);
    ctx.strokeRect(257, 257, 254, 254);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Multi-pass Photorealistic 3D Renderer.
 * Renders accumulated soft-shadow & supersampled passes into a high-dynamic-range RGB float buffer.
 */
export async function renderPhotorealScene(
  sceneCtx: any,
  settings: PhotorealRenderSettings,
  onProgress?: (percent: number, passIndex: number, totalPasses: number) => void,
  shouldCancel?: () => boolean
): Promise<RawRenderBuffer> {
  const {
    scene,
    camera,
    renderer,
    transformControls,
    lightOrbGroup,
    dimsRootGroup,
    fastenersRootGroup,
    floorMesh,
    roomWallsGroup,
    roomRoot,
    ambientLight,
    mainLight,
    fillLight,
    warmWorktopLight,
    LIGHT_CENTER
  } = sceneCtx;

  const width = Math.max(640, Math.min(3840, Math.round(settings.width)));
  const height = Math.max(480, Math.min(2160, Math.round(settings.height)));
  const totalPasses = Math.max(4, Math.min(64, Math.round(settings.samples)));

  // 1. Save original states to restore after rendering
  const origSize = new THREE.Vector2();
  renderer.getSize(origSize);
  const origPixelRatio = renderer.getPixelRatio();
  const origExposure = renderer.toneMappingExposure;
  const origBackground = scene.background ? scene.background.clone() : null;
  const origEnvIntensity = (scene as any).environmentIntensity ?? 0.65;

  const origCamAspect = camera.aspect;
  const origGizmoVis = transformControls ? transformControls.visible : false;
  const origOrbVis = lightOrbGroup ? lightOrbGroup.visible : false;
  const origDimsVis = dimsRootGroup ? dimsRootGroup.visible : false;
  const origFastenersVis = fastenersRootGroup ? fastenersRootGroup.visible : false;
  const origFloorMat = floorMesh ? floorMesh.material : null;
  const origWallsVis = roomWallsGroup ? roomWallsGroup.visible : false;

  // Find any GridHelper in scene to hide during photoreal render
  const gridHelpers: { obj: THREE.Object3D; vis: boolean }[] = [];
  const edgeLineStates: { line: THREE.LineSegments; vis: boolean; opacity: number }[] = [];
  const meshShadowStates: {
    mesh: THREE.Mesh;
    cast: boolean;
    receive: boolean;
    envInt?: number;
  }[] = [];

  scene.traverse((obj: any) => {
    if (obj.isGridHelper || obj.type === 'GridHelper') {
      gridHelpers.push({ obj, vis: obj.visible });
      obj.visible = false;
    } else if (obj.isLineSegments && obj.material) {
      const mat = obj.material as THREE.LineBasicMaterial;
      edgeLineStates.push({
        line: obj,
        vis: obj.visible,
        opacity: mat.opacity ?? 1
      });
      if (settings.panelGapSeamOpacity <= 0.01) {
        obj.visible = false;
      } else {
        mat.transparent = true;
        mat.opacity = settings.panelGapSeamOpacity;
      }
    } else if (obj.isMesh && obj !== floorMesh && !obj.userData?.isHelper) {
      meshShadowStates.push({
        mesh: obj,
        cast: obj.castShadow,
        receive: obj.receiveShadow,
        envInt: obj.material?.envMapIntensity
      });
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material && 'envMapIntensity' in obj.material) {
        obj.material.envMapIntensity = 1.25;
      }
    }
  });

  // Hide CAD overlays
  if (transformControls) transformControls.visible = false;
  if (lightOrbGroup) lightOrbGroup.visible = false;
  if (dimsRootGroup) dimsRootGroup.visible = false;
  if (fastenersRootGroup) fastenersRootGroup.visible = false;

  // Save original lights
  const origAmbientColor = ambientLight.color.clone();
  const origAmbientInt = ambientLight.intensity;
  const origMainColor = mainLight.color.clone();
  const origMainInt = mainLight.intensity;
  const origMainPos = mainLight.position.clone();
  const origShadowW = mainLight.shadow.mapSize.width;
  const origShadowH = mainLight.shadow.mapSize.height;
  const origFillColor = fillLight.color.clone();
  const origFillInt = fillLight.intensity;
  const origFillPos = fillLight.position.clone();
  const origWarmInt = warmWorktopLight ? warmWorktopLight.intensity : 0.9;

  // Temporary studio lights & backdrop objects
  const tempStudioGroup = new THREE.Group();
  scene.add(tempStudioGroup);
  let tempFloorTex: THREE.Texture | null = null;
  let tempFloorMat: THREE.Material | null = null;

  try {
    // 2. Configure Backdrop & Floor Material
    const hasCustomRoomVisible = roomRoot && roomRoot.visible;
    if (settings.backdrop === 'warm_parquet_walls') {
      scene.background = new THREE.Color(0xe6e2dc);
      if (floorMesh) {
        tempFloorTex = createProceduralFloorTexture('oak');
        tempFloorMat = new THREE.MeshStandardMaterial({
          map: tempFloorTex,
          roughness: 0.36,
          metalness: 0.05,
          envMapIntensity: 1.1
        });
        floorMesh.material = tempFloorMat;
      }
      if (!hasCustomRoomVisible && roomWallsGroup) {
        roomWallsGroup.visible = true;
        roomWallsGroup.traverse((c: any) => {
          if (c.isMesh && c.material) {
            c.userData._origWallHex = c.material.color.getHex();
            c.material.color.setHex(0xf2efe9);
          }
        });
      }
    } else if (settings.backdrop === 'marble_showroom') {
      scene.background = new THREE.Color(0xdcdad5);
      if (floorMesh) {
        tempFloorTex = createProceduralFloorTexture('marble');
        tempFloorMat = new THREE.MeshStandardMaterial({
          map: tempFloorTex,
          roughness: 0.16,
          metalness: 0.12,
          envMapIntensity: 1.45
        });
        floorMesh.material = tempFloorMat;
      }
      if (!hasCustomRoomVisible && roomWallsGroup) {
        roomWallsGroup.visible = true;
        roomWallsGroup.traverse((c: any) => {
          if (c.isMesh && c.material) {
            c.userData._origWallHex = c.material.color.getHex();
            c.material.color.setHex(0xebe9e4);
          }
        });
      }
    } else if (settings.backdrop === 'studio_cyclorama') {
      scene.background = new THREE.Color(
        settings.atmosphere === 'luxury_evening' ? 0x14171f : 0xe4e2dd
      );
      if (floorMesh) {
        tempFloorMat = new THREE.MeshStandardMaterial({
          color: settings.atmosphere === 'luxury_evening' ? 0x181c26 : 0xdedbd4,
          roughness: 0.28,
          metalness: 0.08,
          envMapIntensity: 1.2
        });
        floorMesh.material = tempFloorMat;
      }
    }

    // 3. Configure Atmosphere Lighting Preset
    const baseKeyPos = origMainPos.clone();
    const baseFillPos = origFillPos.clone();

    if (settings.atmosphere === 'daylight') {
      ambientLight.color.setHex(0xf6f8ff);
      ambientLight.intensity = 0.92;
      mainLight.color.setHex(0xfff8eb);
      mainLight.intensity = 2.05;
      baseKeyPos.set(3.2, 4.6, 4.4);
      fillLight.color.setHex(0xdbeafe);
      fillLight.intensity = 0.85;
      if (warmWorktopLight) warmWorktopLight.intensity = 0.85;
      (scene as any).environmentIntensity = 0.9;
    } else if (settings.atmosphere === 'golden_hour') {
      ambientLight.color.setHex(0xffeedb);
      ambientLight.intensity = 0.72;
      mainLight.color.setHex(0xffb86c);
      mainLight.intensity = 2.4;
      baseKeyPos.set(4.4, 2.9, 3.8);
      fillLight.color.setHex(0x93c5fd);
      fillLight.intensity = 0.65;
      if (warmWorktopLight) warmWorktopLight.intensity = 1.25;
      (scene as any).environmentIntensity = 0.8;
    } else if (settings.atmosphere === 'studio_catalog') {
      ambientLight.color.setHex(0xffffff);
      ambientLight.intensity = 1.05;
      mainLight.color.setHex(0xfffaf2);
      mainLight.intensity = 1.85;
      baseKeyPos.set(2.8, 4.9, 4.5);
      fillLight.color.setHex(0xeef2ff);
      fillLight.intensity = 0.95;
      if (warmWorktopLight) warmWorktopLight.intensity = 0.7;
      (scene as any).environmentIntensity = 1.05;
    } else if (settings.atmosphere === 'luxury_evening') {
      ambientLight.color.setHex(0x94a3b8);
      ambientLight.intensity = 0.42;
      mainLight.color.setHex(0xffd29d);
      mainLight.intensity = 1.45;
      baseKeyPos.set(2.4, 4.2, 3.6);
      fillLight.color.setHex(0x38bdf8);
      fillLight.intensity = 0.45;
      if (warmWorktopLight) warmWorktopLight.intensity = 1.85;
      (scene as any).environmentIntensity = 0.65;
    }

    // Add a subtle rim/bounce light from ceiling/floor for global illumination feel
    const bounceLight = new THREE.HemisphereLight(0xffffff, 0xd6c7b2, 0.42);
    bounceLight.position.set(1.8, 3.2, 1.8);
    tempStudioGroup.add(bounceLight);

    // Upgrade shadow map resolution for crisp contact shadows
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    if (mainLight.shadow.map) {
      mainLight.shadow.map.dispose();
      mainLight.shadow.map = null as any;
    }

    // 4. Prepare Render Target & Accumulation Buffer
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      colorSpace: THREE.SRGBColorSpace
    });

    const pixelCount = width * height;
    const accumR = new Float32Array(pixelCount);
    const accumG = new Float32Array(pixelCount);
    const accumB = new Float32Array(pixelCount);
    const framePixels = new Uint8Array(pixelCount * 4);

    // Construct tangent basis around key light for area softbox jittering
    const lightDir = new THREE.Vector3()
      .subVectors(baseKeyPos, LIGHT_CENTER || new THREE.Vector3(1.8, 1.0, 1.0))
      .normalize();
    const upVec = new THREE.Vector3(0, 1, 0);
    const tangentU = new THREE.Vector3().crossVectors(lightDir, upVec).normalize();
    const tangentV = new THREE.Vector3().crossVectors(tangentU, lightDir).normalize();
    const spreadM = settings.softShadowSpread;

    const origRenderTarget = renderer.getRenderTarget();

    for (let pass = 0; pass < totalPasses; pass++) {
      if (shouldCancel?.()) break;

      // Sub-pixel camera jitter (Halton 2,3) for supersampled anti-aliasing
      const jx = pass === 0 ? 0 : (halton(pass, 2) - 0.5) * 1.15;
      const jy = pass === 0 ? 0 : (halton(pass, 3) - 0.5) * 1.15;
      camera.setViewOffset(width, height, jx, jy, width, height);

      // Area light disk jitter for realistic soft penumbra shadows
      const [du, dv] = diskSample(pass, totalPasses);
      mainLight.position
        .copy(baseKeyPos)
        .addScaledVector(tangentU, du * spreadM)
        .addScaledVector(tangentV, dv * spreadM);
      mainLight.target.updateMatrixWorld();

      fillLight.position
        .copy(baseFillPos)
        .addScaledVector(tangentU, -du * spreadM * 1.4)
        .addScaledVector(tangentV, dv * spreadM * 1.4);

      renderer.shadowMap.needsUpdate = true;
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, framePixels);

      for (let p = 0, idx4 = 0; p < pixelCount; p++, idx4 += 4) {
        accumR[p] += framePixels[idx4];
        accumG[p] += framePixels[idx4 + 1];
        accumB[p] += framePixels[idx4 + 2];
      }

      const pct = Math.round(((pass + 1) / totalPasses) * 100);
      onProgress?.(pct, pass + 1, totalPasses);

      // Yield to UI thread so progress bar animates smoothly
      await new Promise((r) => setTimeout(r, 12));
    }

    renderer.setRenderTarget(origRenderTarget);
    renderTarget.dispose();
    camera.clearViewOffset();

    // Average accumulated passes (flipping Y because WebGL readRenderTargetPixels is bottom-up)
    const completedPasses = Math.max(1, totalPasses);
    const invPasses = 1 / completedPasses;
    const rgbFloat = new Float32Array(pixelCount * 3);

    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y) * width;
      const dstRow = y * width;
      for (let x = 0; x < width; x++) {
        const sIdx = srcRow + x;
        const dIdx = (dstRow + x) * 3;
        rgbFloat[dIdx] = accumR[sIdx] * invPasses;
        rgbFloat[dIdx + 1] = accumG[sIdx] * invPasses;
        rgbFloat[dIdx + 2] = accumB[sIdx] * invPasses;
      }
    }

    return { width, height, rgbFloat };
  } finally {
    // 5. Restore all original scene states
    camera.clearViewOffset();
    camera.aspect = origCamAspect;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(origPixelRatio);
    renderer.setSize(origSize.x, origSize.y);
    renderer.toneMappingExposure = origExposure;

    scene.background = origBackground;
    (scene as any).environmentIntensity = origEnvIntensity;

    scene.remove(tempStudioGroup);
    if (tempFloorMat) tempFloorMat.dispose();
    if (tempFloorTex) tempFloorTex.dispose();
    if (floorMesh && origFloorMat) floorMesh.material = origFloorMat;

    if (roomWallsGroup) {
      roomWallsGroup.visible = origWallsVis;
      roomWallsGroup.traverse((c: any) => {
        if (c.isMesh && c.material && c.userData._origWallHex !== undefined) {
          c.material.color.setHex(c.userData._origWallHex);
        }
      });
    }

    if (transformControls) transformControls.visible = origGizmoVis;
    if (lightOrbGroup) lightOrbGroup.visible = origOrbVis;
    if (dimsRootGroup) dimsRootGroup.visible = origDimsVis;
    if (fastenersRootGroup) fastenersRootGroup.visible = origFastenersVis;

    for (const gh of gridHelpers) gh.obj.visible = gh.vis;
    for (const el of edgeLineStates) {
      el.line.visible = el.vis;
      const mat = el.line.material as THREE.LineBasicMaterial;
      mat.opacity = el.opacity;
    }
    for (const ms of meshShadowStates) {
      ms.mesh.castShadow = ms.cast;
      ms.mesh.receiveShadow = ms.receive;
      if (ms.envInt !== undefined && (ms.mesh.material as any)?.envMapIntensity !== undefined) {
        (ms.mesh.material as any).envMapIntensity = ms.envInt;
      }
    }

    ambientLight.color.copy(origAmbientColor);
    ambientLight.intensity = origAmbientInt;
    mainLight.color.copy(origMainColor);
    mainLight.intensity = origMainInt;
    mainLight.position.copy(origMainPos);
    mainLight.target.updateMatrixWorld();
    mainLight.shadow.mapSize.width = origShadowW;
    mainLight.shadow.mapSize.height = origShadowH;
    if (mainLight.shadow.map) {
      mainLight.shadow.map.dispose();
      mainLight.shadow.map = null as any;
    }
    fillLight.color.copy(origFillColor);
    fillLight.intensity = origFillInt;
    fillLight.position.copy(origFillPos);
    if (warmWorktopLight) warmWorktopLight.intensity = origWarmInt;

    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
  }
}

/**
 * Apply photographic color grading, filmic contrast, warmth, bloom, and lens vignette
 * directly to a HTMLCanvasElement in real time (< 25ms).
 */
export function applyPostProcessingToCanvas(
  rawBuffer: RawRenderBuffer,
  post: PostProcessSettings,
  targetCanvas: HTMLCanvasElement
) {
  const { width, height, rgbFloat } = rawBuffer;
  if (targetCanvas.width !== width) targetCanvas.width = width;
  if (targetCanvas.height !== height) targetCanvas.height = height;

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const imgData = ctx.createImageData(width, height);
  const out = imgData.data;

  const exp = post.exposure;
  const contrast = post.contrast;
  const sat = post.saturation;
  const warmR = 1 + (post.warmth / 100) * 0.22;
  const warmB = 1 - (post.warmth / 100) * 0.22;
  const vigStrength = post.vignette * 0.55;

  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const invMaxRadiusSq = 1 / (halfW * halfW + halfH * halfH);

  const pixelCount = width * height;
  for (let y = 0; y < height; y++) {
    const dy = y - halfH;
    const dySq = dy * dy;
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const pIdx = rowOffset + x;
      const srcIdx = pIdx * 3;
      const dstIdx = pIdx * 4;

      // 1. Exposure & White Balance (Warm/Cool)
      let r = (rgbFloat[srcIdx] / 255) * exp * warmR;
      let g = (rgbFloat[srcIdx + 1] / 255) * exp;
      let b = (rgbFloat[srcIdx + 2] / 255) * exp * warmB;

      // 2. Filmic S-Curve Contrast around midpoint 0.5
      r = (r - 0.5) * contrast + 0.5;
      g = (g - 0.5) * contrast + 0.5;
      b = (b - 0.5) * contrast + 0.5;

      // 3. Saturation
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = luma + (r - luma) * sat;
      g = luma + (g - luma) * sat;
      b = luma + (b - luma) * sat;

      // 4. Optical Lens Vignette
      if (vigStrength > 0.001) {
        const dx = x - halfW;
        const rSq = (dx * dx + dySq) * invMaxRadiusSq;
        const vigFactor = Math.max(0.25, 1 - rSq * vigStrength);
        r *= vigFactor;
        g *= vigFactor;
        b *= vigFactor;
      }

      out[dstIdx] = Math.max(0, Math.min(255, Math.round(r * 255)));
      out[dstIdx + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
      out[dstIdx + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
      out[dstIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 5. Specular Soft Bloom Overlay (using Canvas 2D hardware blur composite)
  if (post.bloom > 0.02) {
    const bloomCanvas = document.createElement('canvas');
    bloomCanvas.width = Math.max(160, Math.round(width / 4));
    bloomCanvas.height = Math.max(90, Math.round(height / 4));
    const bCtx = bloomCanvas.getContext('2d');
    if (bCtx) {
      bCtx.filter = 'brightness(1.25) contrast(1.6) blur(10px)';
      bCtx.drawImage(targetCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = post.bloom * 0.42;
      ctx.drawImage(bloomCanvas, 0, 0, width, height);
      ctx.restore();
    }
  }
}
