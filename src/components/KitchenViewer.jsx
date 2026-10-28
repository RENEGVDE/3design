'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import {
  I18N,
  fmtCm,
  getSpecTitle,
  formatPartDimsText
} from '../i18n/translations.js';
import { writePersistedData, readPersistedData } from '../utils/storage.js';
import {
  DEFAULT_WHITE_HEX,
  FINISH_MODES,
  CAM_PRESETS,
  kelvinToColor,
  createOvenDisplayTexture,
  createTextureFromDataUrl,
  buildDefaultMaterialsTable
} from '../utils/textures.js';
import {
  addCadDimLine,
  buildStaticDimensions,
  renderPartDimensions3D,
  createPinMarker
} from '../utils/dimensions3d.js';

import TopBar from './TopBar.jsx';
import DimensionToolbar from './DimensionToolbar.jsx';
import CameraPresetsBar from './CameraPresetsBar.jsx';
import MaterialStudioSection from './MaterialStudioSection.jsx';
import LightingStudioSection from './LightingStudioSection.jsx';
import InteractivePartsSection from './InteractivePartsSection.jsx';

const INITIAL_WHITE_MAT = {
  id: 'mat_default_white',
  name: 'Alb (Default)',
  type: 'color',
  colorHex: DEFAULT_WHITE_HEX,
  dataUrl: null,
  thumbCss: DEFAULT_WHITE_HEX,
  texture: null,
  scale: 1.0,
  rotate90: false,
  finishIdx: 0
};

const INITIAL_LIGHT_STATE = {
  kelvin: 4000,
  mainPct: 100,
  ambientPct: 100,
  angleDeg: 32,
  heightM: 4.8,
  distM: 4.5
};

function decodeBase64(b64, TypedArr) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TypedArr(bytes.buffer);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function KitchenViewer() {
  const canvasContainerRef = useRef(null);
  const sceneRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ro');
  const [panelOpen, setPanelOpen] = useState(true);
  const [specs, setSpecs] = useState([]);
  const [partsMeta, setPartsMeta] = useState({});

  const [materials, setMaterials] = useState([INITIAL_WHITE_MAT]);
  const [activeMatId, setActiveMatId] = useState('mat_default_white');
  const [paintModeActive, setPaintModeActive] = useState(false);

  const [xrayActive, setXrayActive] = useState(false);
  const [countertopHidden, setCountertopHidden] = useState(false);
  const [edgesVisible, setEdgesVisible] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);

  const [dimsEnabled, setDimsEnabled] = useState(false);
  const [dimMode, setDimMode] = useState('all');
  const [activeDimInfo, setActiveDimInfo] = useState(null);
  const [tapeHasPointA, setTapeHasPointA] = useState(false);
  const [tapeMeasurement, setTapeMeasurement] = useState(null);

  const [lightState, setLightState] = useState(INITIAL_LIGHT_STATE);
  const [showLightOrb, setShowLightOrb] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    dims: '',
    sub: ''
  });

  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg('');
    }, 2200);
  }, []);

  // Keep latest state in a ref for Three.js event handlers & persistence
  const stateRef = useRef({
    lang,
    materials,
    activeMatId,
    paintModeActive,
    xrayActive,
    dimsEnabled,
    dimMode,
    lightState
  });
  useEffect(() => {
    stateRef.current = {
      lang,
      materials,
      activeMatId,
      paintModeActive,
      xrayActive,
      dimsEnabled,
      dimMode,
      lightState
    };
  }, [
    lang,
    materials,
    activeMatId,
    paintModeActive,
    xrayActive,
    dimsEnabled,
    dimMode,
    lightState
  ]);

  const syncPartsMetaToReact = useCallback(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const nextMeta = {};
    for (const spec of ctx.payload.specs) {
      const item = ctx.interactiveMap[spec.id];
      if (item) {
        nextMeta[spec.id] = {
          isOpen: item.isOpen,
          assignedMatId: item.assignedMatId,
          dimsCm: item.dimsCm
        };
      }
    }
    setPartsMeta(nextMeta);
  }, []);

  const persistWorkspace = useCallback(
    (overrides = {}) => {
      const ctx = sceneRef.current;
      if (!ctx || ctx.isRestoring) return;

      const curLang = overrides.lang ?? stateRef.current.lang;
      const curMats = overrides.materials ?? stateRef.current.materials;
      const curActiveId = overrides.activeMatId ?? stateRef.current.activeMatId;
      const curLight = overrides.lightState ?? stateRef.current.lightState;

      const serializedMats = curMats.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        colorHex: m.colorHex,
        dataUrl: m.dataUrl || null,
        thumbCss: m.thumbCss,
        scale: m.scale,
        rotate90: m.rotate90,
        finishIdx: m.finishIdx
      }));

      const partAssignments = {};
      const openParts = {};
      for (const spec of ctx.payload.specs) {
        const item = ctx.interactiveMap[spec.id];
        if (item) {
          if (item.assignedMatId) partAssignments[spec.id] = item.assignedMatId;
          if (item.isOpen) openParts[spec.id] = true;
        }
      }

      writePersistedData({
        version: 1,
        lang: curLang,
        activeCustomMatId: curActiveId,
        materials: serializedMats,
        partAssignments,
        staticZoneAssignments: { ...ctx.staticZoneAssignments },
        openParts,
        lightState: { ...curLight }
      });
    },
    []
  );

  // Mesh Material Helper Functions
  const applyDefaultWhiteToMesh = useCallback((mesh, isXray) => {
    if (!mesh || !mesh.material) return;
    mesh.material.color.set(DEFAULT_WHITE_HEX);
    mesh.material.map = null;
    mesh.material.roughness = 0.42;
    mesh.material.metalness = 0.02;
    mesh.material.transparent = Boolean(isXray);
    mesh.material.opacity = isXray ? 0.28 : 1.0;
    mesh.material.depthWrite = !isXray;
    mesh.material.userData.assignedMatId = null;
    mesh.material.needsUpdate = true;
  }, []);

  const applyMatEntryToMesh = useCallback(
    (mesh, matEntry, isXray) => {
      if (!mesh || !mesh.material) return;
      if (!matEntry) {
        applyDefaultWhiteToMesh(mesh, isXray);
        return;
      }
      const fin = FINISH_MODES[matEntry.finishIdx] || FINISH_MODES[0];
      if (matEntry.texture) {
        const rep = 1.0 / Math.max(0.15, matEntry.scale);
        matEntry.texture.repeat.set(rep, rep);
        matEntry.texture.rotation = matEntry.rotate90 ? Math.PI / 2 : 0;
        matEntry.texture.needsUpdate = true;
      }

      mesh.material.color.set(matEntry.colorHex || '#ffffff');
      mesh.material.map = matEntry.texture || null;
      mesh.material.roughness = fin.roughness;
      mesh.material.metalness = fin.metalness;

      if (fin.transparent) {
        mesh.material.transparent = true;
        mesh.material.opacity = isXray ? 0.25 : fin.opacity;
        mesh.material.depthWrite = false;
      } else {
        mesh.material.transparent = Boolean(isXray);
        mesh.material.opacity = isXray ? 0.28 : 1.0;
        mesh.material.depthWrite = !isXray;
      }
      mesh.material.userData.assignedMatId = matEntry.id;
      mesh.material.needsUpdate = true;
    },
    [applyDefaultWhiteToMesh]
  );

  const update3DDimensionsDisplay = useCallback((partId) => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.selectedPartId = partId;
    if (!stateRef.current.dimsEnabled || stateRef.current.dimMode === 'tape') return;

    const item = renderPartDimensions3D({
      partId,
      interactiveMap: ctx.interactiveMap,
      partDimsGroup: ctx.partDimsGroup
    });

    if (item) {
      setActiveDimInfo({
        title: getSpecTitle(item.spec, stateRef.current.lang),
        w: item.dimsCm.w,
        h: item.dimsCm.h,
        d: item.dimsCm.d
      });
    } else {
      setActiveDimInfo(null);
    }
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    let disposed = false;
    let animFrameId = null;

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setPanelOpen(false);
    }

    async function initScene() {
      const res = await fetch('/data/kitchen-payload.json');
      const payload = await res.json();
      if (disposed) return;

      const container = canvasContainerRef.current;
      if (!container) return;
      container.innerHTML = '';

      const isMobile =
        window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x121419);

      const isPortrait = window.innerHeight > window.innerWidth;
      const camera = new THREE.PerspectiveCamera(
        isPortrait ? 52 : 42,
        window.innerWidth / window.innerHeight,
        0.05,
        50
      );

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.75 : 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      container.appendChild(renderer.domElement);

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04
      ).texture;
      scene.environmentIntensity = 0.65;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.maxPolarAngle = Math.PI / 2 + 0.03;
      controls.minDistance = 0.5;
      controls.maxDistance = 12;
      controls.rotateSpeed = isMobile ? 0.65 : 0.85;
      controls.panSpeed = isMobile ? 0.75 : 0.9;
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };

      // Studio Lighting
      const LIGHT_CENTER = new THREE.Vector3(1.85, 1.15, 1.05);
      const ambientLight = new THREE.AmbientLight(0xfff5e4, 0.85);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xfff5e4, 1.65);
      mainLight.position.set(2.5, 4.8, 4.2);
      mainLight.target.position.copy(LIGHT_CENTER);
      scene.add(mainLight.target);
      mainLight.castShadow = true;
      const shadowRes = isMobile ? 1024 : 2048;
      mainLight.shadow.mapSize.width = shadowRes;
      mainLight.shadow.mapSize.height = shadowRes;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 16;
      const d = 4.2;
      mainLight.shadow.camera.left = -d;
      mainLight.shadow.camera.right = d;
      mainLight.shadow.camera.top = d;
      mainLight.shadow.camera.bottom = -d;
      mainLight.shadow.bias = -0.0005;
      scene.add(mainLight);

      const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.65);
      fillLight.position.set(-3.5, 3.0, 2.5);
      scene.add(fillLight);

      const warmWorktopLight = new THREE.PointLight(0xffdca8, 0.9, 3.5);
      warmWorktopLight.position.set(1.5, 1.42, 0.35);
      scene.add(warmWorktopLight);

      // 3D Light Orb Helper
      const lightOrbGroup = new THREE.Group();
      lightOrbGroup.visible = false;
      scene.add(lightOrbGroup);

      const orbMat = new THREE.MeshBasicMaterial({ color: 0xfff5e4 });
      const orbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), orbMat);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffd89b,
        transparent: true,
        opacity: 0.32,
        depthWrite: false
      });
      const haloMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 20, 20),
        haloMat
      );
      orbMesh.add(haloMesh);
      lightOrbGroup.add(orbMesh);

      const rayLineMat = new THREE.LineBasicMaterial({
        color: 0xffd89b,
        transparent: true,
        opacity: 0.6,
        depthTest: false
      });
      const rayLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        LIGHT_CENTER.clone()
      ]);
      const rayLine = new THREE.Line(rayLineGeo, rayLineMat);
      rayLine.renderOrder = 995;
      lightOrbGroup.add(rayLine);

      // Studio Floor & Architectural Grid
      const floorGeo = new THREE.PlaneGeometry(18, 18);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x181b21,
        roughness: 0.82,
        metalness: 0.08
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(1.8, -0.002, 1.4);
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      const gridHelper = new THREE.GridHelper(12, 24, 0x3b404c, 0x232730);
      gridHelper.position.set(1.8, -0.001, 1.4);
      scene.add(gridHelper);

      const displayTex = createOvenDisplayTexture();
      const matDefs = buildDefaultMaterialsTable(displayTex);

      const kitchenRoot = new THREE.Group();
      kitchenRoot.scale.set(0.001, 0.001, 0.001);
      scene.add(kitchenRoot);

      const staticGroups = [
        'static_carcass',
        'static_countertop',
        'static_appliances',
        'static_plinth',
        'static_hardware'
      ];
      const groupContainers = {};
      for (const sg of staticGroups) {
        const g = new THREE.Group();
        g.name = sg;
        kitchenRoot.add(g);
        groupContainers[sg] = g;
      }

      const interactiveMap = {};
      const interactiveMeshes = [];
      const paintableMeshes = [];
      const allKitchenMeshes = [];
      const edgeLines = [];

      const staticTargets = {
        countertop: [],
        carcass: [],
        vitrine_carcass: [],
        plinth: []
      };
      const staticZoneAssignments = {
        countertop: null,
        carcass: null,
        vitrine_carcass: null,
        plinth: null
      };

      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x1a1c20,
        transparent: true,
        opacity: 0.28
      });

      for (const spec of payload.specs) {
        const outer = new THREE.Group();
        outer.name = spec.id + '_outer';
        kitchenRoot.add(outer);

        let container = outer;
        if (spec.type === 'rotate' && spec.pivot) {
          outer.position.set(spec.pivot[0], spec.pivot[1], spec.pivot[2]);
          const inner = new THREE.Group();
          inner.position.set(-spec.pivot[0], -spec.pivot[1], -spec.pivot[2]);
          outer.add(inner);
          container = inner;
        }

        groupContainers[spec.id] = container;
        interactiveMap[spec.id] = {
          spec,
          outer,
          container,
          isOpen: false,
          progress: 0,
          target: 0,
          meshes: [],
          facadeMeshes: [],
          assignedMatId: null,
          bboxMm: {
            min: [Infinity, Infinity, Infinity],
            max: [-Infinity, -Infinity, -Infinity]
          },
          dimsCm: { w: 0, h: 0, d: 0, orientZ: false }
        };
      }

      for (const b of payload.batches) {
        const geom = new THREE.BufferGeometry();
        const posInt16 = decodeBase64(b.p, Int16Array);
        const posArr = new Float32Array(posInt16.length);
        for (let i = 0; i < posInt16.length; i++) posArr[i] = posInt16[i];

        const normInt8 = decodeBase64(b.n, Int8Array);
        const idxArr = decodeBase64(
          b.i,
          b.it === 'uint32' ? Uint32Array : Uint16Array
        );

        // Box-projected UV coordinates (500 mm = 1.0 UV unit)
        const uvArr = new Float32Array(b.vc * 2);
        for (let i = 0; i < b.vc; i++) {
          const px = posArr[i * 3] * 0.002;
          const py = posArr[i * 3 + 1] * 0.002;
          const pz = posArr[i * 3 + 2] * 0.002;
          const nx = Math.abs(normInt8[i * 3]);
          const ny = Math.abs(normInt8[i * 3 + 1]);
          const nz = Math.abs(normInt8[i * 3 + 2]);
          if (ny > nx && ny > nz) {
            uvArr[i * 2] = px;
            uvArr[i * 2 + 1] = pz;
          } else if (nx > nz) {
            uvArr[i * 2] = pz;
            uvArr[i * 2 + 1] = py;
          } else {
            uvArr[i * 2] = px;
            uvArr[i * 2 + 1] = py;
          }
        }

        geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        geom.setAttribute('normal', new THREE.BufferAttribute(normInt8, 3, true));
        geom.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
        geom.setIndex(new THREE.BufferAttribute(idxArr, 1));
        geom.computeBoundingBox();

        let mat = matDefs[b.m] || matDefs[0];
        const isInteractive = Boolean(interactiveMap[b.g]);
        const isPaintableStatic = [
          'static_countertop',
          'static_carcass',
          'static_plinth'
        ].includes(b.g);

        if (isInteractive || isPaintableStatic) {
          mat = mat.clone();
          mat.userData.baseMatIdx = b.m;
        }

        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = b.g !== 'static_hardware';
        mesh.receiveShadow = true;
        mesh.userData.groupId = b.g;
        mesh.userData.matIdx = b.m;

        const parentGroup =
          groupContainers[b.g] || groupContainers['static_carcass'];
        parentGroup.add(mesh);
        allKitchenMeshes.push(mesh);

        if (isInteractive) {
          const item = interactiveMap[b.g];
          item.meshes.push(mesh);
          interactiveMeshes.push(mesh);
          if ([1, 3, 16, 7, 8].includes(b.m)) {
            item.facadeMeshes.push(mesh);
            paintableMeshes.push(mesh);
          }
          const bb = geom.boundingBox;
          if (bb) {
            item.bboxMm.min[0] = Math.min(item.bboxMm.min[0], bb.min.x);
            item.bboxMm.min[1] = Math.min(item.bboxMm.min[1], bb.min.y);
            item.bboxMm.min[2] = Math.min(item.bboxMm.min[2], bb.min.z);
            item.bboxMm.max[0] = Math.max(item.bboxMm.max[0], bb.max.x);
            item.bboxMm.max[1] = Math.max(item.bboxMm.max[1], bb.max.y);
            item.bboxMm.max[2] = Math.max(item.bboxMm.max[2], bb.max.z);
          }
        } else if (isPaintableStatic) {
          paintableMeshes.push(mesh);
          if (b.g === 'static_countertop') {
            mesh.userData.staticZone = 'countertop';
            staticTargets.countertop.push(mesh);
          } else if (b.g === 'static_plinth') {
            mesh.userData.staticZone = 'plinth';
            staticTargets.plinth.push(mesh);
          } else if (b.g === 'static_carcass') {
            if (b.m === 3) {
              mesh.userData.staticZone = 'vitrine_carcass';
              staticTargets.vitrine_carcass.push(mesh);
            } else {
              mesh.userData.staticZone = 'carcass';
              staticTargets.carcass.push(mesh);
            }
          }
        }

        if (b.vc < 8000 && b.g !== 'static_hardware') {
          const edgesGeo = new THREE.EdgesGeometry(geom, 28);
          const line = new THREE.LineSegments(edgesGeo, edgeMat);
          line.raycast = () => {};
          mesh.add(line);
          edgeLines.push(line);
        }
      }

      // Compute exact Width, Height, Depth in cm for each interactive part
      for (const id in interactiveMap) {
        const item = interactiveMap[id];
        const dxCm = (item.bboxMm.max[0] - item.bboxMm.min[0]) / 10.0;
        const dyCm = (item.bboxMm.max[1] - item.bboxMm.min[1]) / 10.0;
        const dzCm = (item.bboxMm.max[2] - item.bboxMm.min[2]) / 10.0;
        const cat = item.spec.category;
        const orientZ = cat === 'peninsula_door' || cat === 'left_door';
        item.dimsCm = {
          w: orientZ ? dzCm : dxCm,
          h: dyCm,
          d: orientZ ? dxCm : dzCm,
          dxCm,
          dyCm,
          dzCm,
          orientZ
        };
      }

      // 3D CAD Dimension Overlay Groups
      const dimsRootGroup = new THREE.Group();
      dimsRootGroup.visible = false;
      scene.add(dimsRootGroup);

      const staticDimsGroup = new THREE.Group();
      dimsRootGroup.add(staticDimsGroup);
      buildStaticDimensions(staticDimsGroup);

      const partDimsGroup = new THREE.Group();
      dimsRootGroup.add(partDimsGroup);

      const tapeDimsGroup = new THREE.Group();
      dimsRootGroup.add(tapeDimsGroup);

      const ctx = {
        payload,
        scene,
        camera,
        renderer,
        controls,
        LIGHT_CENTER,
        ambientLight,
        mainLight,
        fillLight,
        warmWorktopLight,
        lightOrbGroup,
        orbMesh,
        orbMat,
        haloMat,
        rayLineGeo,
        rayLineMat,
        groupContainers,
        interactiveMap,
        interactiveMeshes,
        paintableMeshes,
        allKitchenMeshes,
        edgeLines,
        staticTargets,
        staticZoneAssignments,
        dimsRootGroup,
        staticDimsGroup,
        partDimsGroup,
        tapeDimsGroup,
        tapePointA: null,
        hoveredGroupId: null,
        selectedPartId: null,
        camAnim: null,
        isRestoring: false
      };
      sceneRef.current = ctx;
      setSpecs(payload.specs);

      // Fly to initial overview camera
      const initPreset = CAM_PRESETS.overview;
      const portraitScale = window.innerHeight > window.innerWidth ? 1.25 : 1.0;
      const tVec = new THREE.Vector3(...initPreset.target);
      const pVec = new THREE.Vector3(...initPreset.pos);
      if (portraitScale > 1.0) {
        const dir = pVec.clone().sub(tVec).multiplyScalar(portraitScale);
        pVec.copy(tVec).add(dir);
      }
      camera.position.copy(pVec);
      controls.target.copy(tVec);

      // Restore persisted workspace from IndexedDB / localStorage
      ctx.isRestoring = true;
      const saved = await readPersistedData();
      if (saved && saved.version === 1) {
        if (saved.lang && I18N[saved.lang]) {
          setLang(saved.lang);
          stateRef.current.lang = saved.lang;
        }
        let restoredMats = [INITIAL_WHITE_MAT];
        if (Array.isArray(saved.materials)) {
          restoredMats = [];
          for (const sm of saved.materials) {
            let tex = null;
            if (sm.type === 'texture' && sm.dataUrl) {
              tex = await createTextureFromDataUrl(sm.dataUrl);
            }
            restoredMats.push({
              id: sm.id,
              name: sm.name,
              type: sm.type || 'color',
              colorHex: sm.colorHex || '#ffffff',
              dataUrl: sm.dataUrl || null,
              thumbCss: sm.thumbCss || sm.colorHex || DEFAULT_WHITE_HEX,
              texture: tex,
              scale: typeof sm.scale === 'number' ? sm.scale : 1.0,
              rotate90: Boolean(sm.rotate90),
              finishIdx: typeof sm.finishIdx === 'number' ? sm.finishIdx : 0
            });
          }
        }
        setMaterials(restoredMats);
        stateRef.current.materials = restoredMats;

        const nextActiveId = restoredMats.some(
          (m) => m.id === saved.activeCustomMatId
        )
          ? saved.activeCustomMatId
          : restoredMats[0]
          ? restoredMats[0].id
          : null;
        setActiveMatId(nextActiveId);
        stateRef.current.activeMatId = nextActiveId;

        if (saved.partAssignments) {
          for (const [pid, matId] of Object.entries(saved.partAssignments)) {
            const matEntry = restoredMats.find((m) => m.id === matId);
            const item = interactiveMap[pid];
            if (item && matEntry) {
              item.assignedMatId = matEntry.id;
              const targets = item.facadeMeshes.length
                ? item.facadeMeshes
                : item.meshes;
              for (const m of targets) applyMatEntryToMesh(m, matEntry, false);
            }
          }
        }

        if (saved.staticZoneAssignments) {
          for (const [zKey, matId] of Object.entries(
            saved.staticZoneAssignments
          )) {
            const matEntry = restoredMats.find((m) => m.id === matId);
            if (matEntry && staticTargets[zKey]) {
              staticZoneAssignments[zKey] = matEntry.id;
              for (const m of staticTargets[zKey]) {
                applyMatEntryToMesh(m, matEntry, false);
              }
            }
          }
        }

        if (saved.openParts) {
          for (const [pid, isOpenVal] of Object.entries(saved.openParts)) {
            const item = interactiveMap[pid];
            if (item && isOpenVal) {
              item.isOpen = true;
              item.target = 1;
              item.progress = 1;
              const spec = item.spec;
              if (spec.type === 'slide') {
                item.outer.position.set(
                  spec.delta[0],
                  spec.delta[1],
                  spec.delta[2]
                );
              } else if (spec.type === 'rotate') {
                const rad = THREE.MathUtils.degToRad(spec.angle);
                item.outer.rotation.set(
                  spec.axis === 'x' ? rad : 0,
                  spec.axis === 'y' ? rad : 0,
                  spec.axis === 'z' ? rad : 0
                );
              }
            }
          }
        }

        if (saved.lightState) {
          const mergedLight = { ...INITIAL_LIGHT_STATE, ...saved.lightState };
          setLightState(mergedLight);
          stateRef.current.lightState = mergedLight;
        }
      }
      ctx.isRestoring = false;
      syncPartsMetaToReact();
      setLoading(false);

      // Raycasting & Pointer Events
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const activePointers = new Set();
      let hadMultiTouch = false;
      let pointerDownPos = { x: 0, y: 0 };
      let pointerDownTime = 0;

      function setHoveredGroup3D(gid) {
        if (ctx.hoveredGroupId === gid) return;
        if (ctx.hoveredGroupId && interactiveMap[ctx.hoveredGroupId]) {
          for (const m of interactiveMap[ctx.hoveredGroupId].meshes) {
            if (m.material && m.material.emissive && m.userData.matIdx !== 9) {
              m.material.emissive.setHex(0x000000);
              m.material.emissiveIntensity = 0;
            }
          }
        }
        ctx.hoveredGroupId = gid;
        if (ctx.hoveredGroupId && interactiveMap[ctx.hoveredGroupId]) {
          for (const m of interactiveMap[ctx.hoveredGroupId].meshes) {
            if (m.material && m.material.emissive && m.userData.matIdx !== 9) {
              m.material.emissive.setHex(
                stateRef.current.paintModeActive ? 0xa855f7 : 0xd4a359
              );
              m.material.emissiveIntensity = 0.25;
            }
          }
        }
      }
      ctx.setHoveredGroup3D = setHoveredGroup3D;

      const onPointerMove = (e) => {
        if (e.pointerType === 'touch') return;
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

        const {
          dimsEnabled: curDims,
          dimMode: curDimMode,
          paintModeActive: curPaint,
          lang: curLang,
          materials: curMats,
          activeMatId: curActiveMatId
        } = stateRef.current;

        if (curDims && curDimMode === 'tape') {
          renderer.domElement.style.cursor = 'crosshair';
          setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
          return;
        }

        raycaster.setFromCamera(pointer, camera);
        const targetList = curPaint ? paintableMeshes : interactiveMeshes;
        const hits = raycaster.intersectObjects(targetList, false);

        if (hits.length > 0) {
          const hitMesh = hits[0].object;
          const gid = hitMesh.userData.groupId;
          const dict = I18N[curLang] || I18N.ro;
          const activeMat =
            curMats.find((m) => m.id === curActiveMatId) || curMats[0] || null;
          const activeMatLabel = activeMat ? activeMat.name : 'Alb (Default)';

          if (interactiveMap[gid]) {
            setHoveredGroup3D(gid);
            if (curDims) update3DDimensionsDisplay(gid);
            const item = interactiveMap[gid];
            renderer.domElement.style.cursor = 'pointer';
            setTooltip({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              title: getSpecTitle(item.spec, curLang),
              dims: `📏 ${formatPartDimsText(item.dimsCm, curLang)}`,
              sub: curPaint
                ? `${dict.clickToPaint}${activeMatLabel}`
                : item.isOpen
                ? dict.clickToClose
                : dict.clickToOpen
            });
            return;
          } else if (curPaint && hitMesh.userData.staticZone) {
            setHoveredGroup3D(null);
            renderer.domElement.style.cursor = 'pointer';
            setTooltip({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              title: hitMesh.userData.staticZone.toUpperCase(),
              dims: '',
              sub: `${dict.clickToPaint}${activeMatLabel}`
            });
            return;
          }
        }

        setHoveredGroup3D(null);
        if (curDims) update3DDimensionsDisplay(ctx.selectedPartId);
        renderer.domElement.style.cursor = 'grab';
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      };

      const onPointerDown = (e) => {
        activePointers.add(e.pointerId);
        if (activePointers.size > 1) {
          hadMultiTouch = true;
          return;
        }
        hadMultiTouch = false;
        pointerDownPos = { x: e.clientX, y: e.clientY };
        pointerDownTime = performance.now();
      };

      const onPointerCancel = (e) => {
        activePointers.delete(e.pointerId);
      };

      const onPointerUp = (e) => {
        activePointers.delete(e.pointerId);
        if (hadMultiTouch) return;

        const dx = e.clientX - pointerDownPos.x;
        const dy = e.clientY - pointerDownPos.y;
        const dist = Math.hypot(dx, dy);
        const dt = performance.now() - pointerDownTime;
        const maxDist = e.pointerType === 'touch' ? 14 : 6;

        if (dist < maxDist && dt < 500) {
          pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
          pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);

          const {
            dimsEnabled: curDims,
            dimMode: curDimMode,
            paintModeActive: curPaint,
            materials: curMats,
            activeMatId: curActiveMatId,
            xrayActive: curXray,
            lang: curLang
          } = stateRef.current;

          // 1. Tape Measure Mode
          if (curDims && curDimMode === 'tape') {
            const allHits = raycaster.intersectObjects(allKitchenMeshes, false);
            if (allHits.length > 0) {
              const hitPoint = allHits[0].point;
              if (!ctx.tapePointA) {
                ctx.tapePointA = hitPoint.clone();
                tapeDimsGroup.add(createPinMarker(ctx.tapePointA, 0xf43f5e));
                setTapeHasPointA(true);
                setTapeMeasurement(null);
              } else {
                const ptB = hitPoint.clone();
                tapeDimsGroup.add(createPinMarker(ptB, 0xf43f5e));
                const distCm = ctx.tapePointA.distanceTo(ptB) * 100.0;
                const dxCm = Math.abs(ptB.x - ctx.tapePointA.x) * 100.0;
                const dyCm = Math.abs(ptB.y - ctx.tapePointA.y) * 100.0;
                const dzCm = Math.abs(ptB.z - ctx.tapePointA.z) * 100.0;
                const labelStr = `${fmtCm(distCm)} cm`;

                addCadDimLine(
                  tapeDimsGroup,
                  ctx.tapePointA.clone(),
                  ptB.clone(),
                  labelStr,
                  'rose',
                  new THREE.Vector3(0, 1, 0),
                  0.025,
                  1.0
                );

                setTapeMeasurement({ labelStr, dxCm, dyCm, dzCm });
                setTapeHasPointA(false);
                ctx.tapePointA = null;
              }
            }
            return;
          }

          // 2. 3D Click-to-Paint Mode
          if (curPaint) {
            const paintHits = raycaster.intersectObjects(paintableMeshes, false);
            if (paintHits.length > 0) {
              const hitMesh = paintHits[0].object;
              const gid = hitMesh.userData.groupId;
              const activeMat =
                curMats.find((m) => m.id === curActiveMatId) ||
                curMats[0] ||
                null;
              const dict = I18N[curLang] || I18N.ro;

              if (interactiveMap[gid] && activeMat) {
                const item = interactiveMap[gid];
                item.assignedMatId = activeMat.id;
                const targets = item.facadeMeshes.length
                  ? item.facadeMeshes
                  : item.meshes;
                for (const m of targets) {
                  applyMatEntryToMesh(m, activeMat, curXray);
                }
                syncPartsMetaToReact();
                persistWorkspace();
                showToast(
                  `🎨 ${getSpecTitle(item.spec, curLang)} → ${activeMat.name}`
                );
              } else if (hitMesh.userData.staticZone && activeMat) {
                const zKey = hitMesh.userData.staticZone;
                staticZoneAssignments[zKey] = activeMat.id;
                for (const m of staticTargets[zKey] || []) {
                  applyMatEntryToMesh(m, activeMat, curXray);
                }
                persistWorkspace();
                showToast(`🎨 ${dict.appliedToast}${activeMat.name}`);
              }
            }
            return;
          }

          // 3. Open / Close Interactive Door or Drawer
          const hits = raycaster.intersectObjects(interactiveMeshes, false);
          if (hits.length > 0) {
            const gid = hits[0].object.userData.groupId;
            if (ctx.toggleInteractivePart) {
              ctx.toggleInteractivePart(gid, null, true);
            }
          }
        }
      };

      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointercancel', onPointerCancel);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      const onResize = () => {
        const portrait = window.innerHeight > window.innerWidth;
        camera.fov = portrait ? 52 : 42;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);

      let lastTime = performance.now();
      const animate = (now) => {
        if (disposed) return;
        animFrameId = requestAnimationFrame(animate);
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        if (ctx.camAnim) {
          const u = Math.min(
            (now - ctx.camAnim.startTime) / ctx.camAnim.duration,
            1
          );
          const e = easeInOutCubic(u);
          camera.position.lerpVectors(
            ctx.camAnim.startPos,
            ctx.camAnim.endPos,
            e
          );
          controls.target.lerpVectors(
            ctx.camAnim.startTarget,
            ctx.camAnim.endTarget,
            e
          );
          if (u >= 1) ctx.camAnim = null;
        }

        const speed = 2.6;
        let activePartAnimating = false;
        for (const id in interactiveMap) {
          const item = interactiveMap[id];
          if (Math.abs(item.progress - item.target) > 0.0005) {
            if (item.progress < item.target) {
              item.progress = Math.min(1, item.progress + speed * dt);
            } else {
              item.progress = Math.max(0, item.progress - speed * dt);
            }
            const eased = easeInOutCubic(item.progress);
            const spec = item.spec;
            if (spec.type === 'slide') {
              item.outer.position.set(
                spec.delta[0] * eased,
                spec.delta[1] * eased,
                spec.delta[2] * eased
              );
            } else if (spec.type === 'rotate') {
              const rad = THREE.MathUtils.degToRad(spec.angle * eased);
              item.outer.rotation.set(
                spec.axis === 'x' ? rad : 0,
                spec.axis === 'y' ? rad : 0,
                spec.axis === 'z' ? rad : 0
              );
            }
            if (id === ctx.selectedPartId || id === ctx.hoveredGroupId) {
              activePartAnimating = true;
            }
          }
        }

        if (
          activePartAnimating &&
          stateRef.current.dimsEnabled &&
          stateRef.current.dimMode !== 'tape'
        ) {
          update3DDimensionsDisplay(ctx.hoveredGroupId || ctx.selectedPartId);
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animFrameId = requestAnimationFrame(animate);
    }

    initScene();

    return () => {
      disposed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [
    applyMatEntryToMesh,
    persistWorkspace,
    showToast,
    syncPartsMetaToReact,
    update3DDimensionsDisplay
  ]);

  // Sync Lighting State to Three.js Lights
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    const rad = THREE.MathUtils.degToRad(lightState.angleDeg);
    const lx = ctx.LIGHT_CENTER.x + Math.sin(rad) * lightState.distM;
    const lz = ctx.LIGHT_CENTER.z + Math.cos(rad) * lightState.distM;
    const ly = lightState.heightM;

    ctx.mainLight.position.set(lx, ly, lz);
    ctx.mainLight.target.updateMatrixWorld();

    ctx.orbMesh.position.set(lx, ly, lz);
    ctx.rayLineGeo.setFromPoints([
      new THREE.Vector3(lx, ly, lz),
      ctx.LIGHT_CENTER.clone()
    ]);

    const toneColor = kelvinToColor(lightState.kelvin);
    ctx.mainLight.color.copy(toneColor);
    ctx.ambientLight.color.copy(toneColor);
    ctx.warmWorktopLight.color.copy(toneColor);
    ctx.orbMat.color.copy(toneColor);
    ctx.haloMat.color.copy(toneColor);
    ctx.rayLineMat.color.copy(toneColor);

    const mainScale = lightState.mainPct / 100.0;
    const ambScale = lightState.ambientPct / 100.0;
    ctx.mainLight.intensity = 1.65 * mainScale;
    ctx.warmWorktopLight.intensity = 0.9 * mainScale;
    ctx.ambientLight.intensity = 0.85 * ambScale;
    ctx.fillLight.intensity = 0.65 * ambScale;
    ctx.scene.environmentIntensity = 0.65 * ambScale;
  }, [lightState, loading]);

  // Sync Dimensions Group Visibility
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.dimsRootGroup.visible = dimsEnabled;
    ctx.staticDimsGroup.visible = dimsEnabled && dimMode === 'all';
    ctx.partDimsGroup.visible = dimsEnabled && dimMode !== 'tape';
    ctx.tapeDimsGroup.visible = dimsEnabled;
    if (dimsEnabled && dimMode !== 'tape') {
      update3DDimensionsDisplay(ctx.hoveredGroupId || ctx.selectedPartId);
    }
  }, [dimsEnabled, dimMode, update3DDimensionsDisplay]);

  // Toggle Interactive Door / Drawer
  const toggleInteractivePart = useCallback(
    (id, forceState = null, withToast = false) => {
      const ctx = sceneRef.current;
      if (!ctx || !ctx.interactiveMap[id]) return;

      const item = ctx.interactiveMap[id];
      ctx.selectedPartId = id;
      const nextOpen = forceState !== null ? forceState : !item.isOpen;
      item.isOpen = nextOpen;
      item.target = nextOpen ? 1 : 0;

      // Coupled hidden inner cutlery drawer logic (B15 inside B14)
      if (
        id === 'drawer_b15' &&
        nextOpen &&
        ctx.interactiveMap['drawer_b14'] &&
        !ctx.interactiveMap['drawer_b14'].isOpen
      ) {
        ctx.interactiveMap['drawer_b14'].isOpen = true;
        ctx.interactiveMap['drawer_b14'].target = 1;
      }
      if (
        id === 'drawer_b14' &&
        !nextOpen &&
        ctx.interactiveMap['drawer_b15'] &&
        ctx.interactiveMap['drawer_b15'].isOpen
      ) {
        ctx.interactiveMap['drawer_b15'].isOpen = false;
        ctx.interactiveMap['drawer_b15'].target = 0;
      }

      if (stateRef.current.dimsEnabled) {
        update3DDimensionsDisplay(id);
      }

      if (withToast && window.innerWidth <= 768) {
        const dict = I18N[stateRef.current.lang] || I18N.ro;
        const dimInfo = ` (${fmtCm(item.dimsCm.w)}×${fmtCm(item.dimsCm.h)} cm)`;
        showToast(
          `${getSpecTitle(item.spec, stateRef.current.lang)}${dimInfo}: ${
            nextOpen ? dict.statusOpen : dict.statusClosed
          }`
        );
      }

      syncPartsMetaToReact();
      persistWorkspace();
    },
    [persistWorkspace, showToast, syncPartsMetaToReact, update3DDimensionsDisplay]
  );

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.toggleInteractivePart = toggleInteractivePart;
    }
  }, [toggleInteractivePart, loading]);

  // Quick Actions Handlers
  const handleOpenAll = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.payload.specs.forEach((s) => toggleInteractivePart(s.id, true));
  };

  const handleCloseAll = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.payload.specs.forEach((s) => toggleInteractivePart(s.id, false));
  };

  const handleToggleDrawers = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const drawerSpecs = ctx.payload.specs.filter((s) => s.category === 'drawer');
    const anyClosed = drawerSpecs.some((s) => !ctx.interactiveMap[s.id].isOpen);
    drawerSpecs.forEach((s) => toggleInteractivePart(s.id, anyClosed));
  };

  const handleToggleDoors = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const doorSpecs = ctx.payload.specs.filter((s) => s.category !== 'drawer');
    const anyClosed = doorSpecs.some((s) => !ctx.interactiveMap[s.id].isOpen);
    doorSpecs.forEach((s) => toggleInteractivePart(s.id, anyClosed));
  };

  const handleToggleXray = () => {
    const ctx = sceneRef.current;
    const next = !xrayActive;
    setXrayActive(next);
    if (!ctx) return;
    for (const m of ctx.interactiveMeshes) {
      const assignedId = m.material.userData.assignedMatId;
      const matEntry = materials.find((x) => x.id === assignedId);
      const isGlass =
        m.userData.matIdx === 16 || (matEntry && matEntry.finishIdx === 3);
      if (isGlass) {
        m.material.transparent = true;
        m.material.opacity = next ? 0.25 : 0.6;
        m.material.depthWrite = false;
        m.material.needsUpdate = true;
      } else if ([1, 3].includes(m.userData.matIdx)) {
        m.material.transparent = next;
        m.material.opacity = next ? 0.28 : 1.0;
        m.material.depthWrite = !next;
        m.material.needsUpdate = true;
      }
    }
  };

  const handleToggleCountertop = () => {
    const ctx = sceneRef.current;
    const next = !countertopHidden;
    setCountertopHidden(next);
    if (ctx && ctx.groupContainers['static_countertop']) {
      ctx.groupContainers['static_countertop'].visible = !next;
    }
  };

  const handleToggleEdges = () => {
    const ctx = sceneRef.current;
    const next = !edgesVisible;
    setEdgesVisible(next);
    if (ctx) {
      for (const line of ctx.edgeLines) line.visible = next;
    }
  };

  const handleClearTape = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.tapePointA = null;
    while (ctx.tapeDimsGroup.children.length > 0) {
      ctx.tapeDimsGroup.remove(ctx.tapeDimsGroup.children[0]);
    }
    setTapeHasPointA(false);
    setTapeMeasurement(null);
  };

  // Camera Presets & AutoRotate
  const handleSelectCamera = (camKey) => {
    const ctx = sceneRef.current;
    const preset = CAM_PRESETS[camKey];
    if (!ctx || !preset) return;
    const portraitScale = window.innerHeight > window.innerWidth ? 1.25 : 1.0;
    const tVec = new THREE.Vector3(...preset.target);
    const pVec = new THREE.Vector3(...preset.pos);
    if (portraitScale > 1.0) {
      const dir = pVec.clone().sub(tVec).multiplyScalar(portraitScale);
      pVec.copy(tVec).add(dir);
    }
    ctx.camAnim = {
      startPos: ctx.camera.position.clone(),
      endPos: pVec,
      startTarget: ctx.controls.target.clone(),
      endTarget: tVec,
      startTime: performance.now(),
      duration: 650
    };
    if (window.innerWidth <= 768) {
      setPanelOpen(false);
    }
  };

  const handleToggleAutoRotate = () => {
    const ctx = sceneRef.current;
    const next = !autoRotate;
    setAutoRotate(next);
    if (ctx) {
      ctx.controls.autoRotate = next;
      ctx.controls.autoRotateSpeed = 1.2;
    }
  };

  // Material Studio Handlers
  const handleUploadTextures = (files) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 512;
          c.height = 512;
          const ctx2d = c.getContext('2d');
          ctx2d.drawImage(img, 0, 0, 512, 512);
          const compressedDataUrl = c.toDataURL('image/jpeg', 0.84);

          const tex = new THREE.CanvasTexture(c);
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.center.set(0.5, 0.5);
          tex.anisotropy = 4;

          const cleanName =
            file.name.replace(/\.[^/.]+$/, '').slice(0, 22) || 'Textură Custom';
          const newId =
            'custom_tex_' +
            Date.now() +
            '_' +
            Math.floor(Math.random() * 1000);
          const newMat = {
            id: newId,
            name: cleanName,
            type: 'texture',
            colorHex: '#ffffff',
            dataUrl: compressedDataUrl,
            thumbCss: `url(${compressedDataUrl}) center/cover`,
            texture: tex,
            scale: 1.0,
            rotate90: false,
            finishIdx: 1
          };

          setMaterials((prev) => {
            const next = [...prev, newMat];
            setActiveMatId(newId);
            persistWorkspace({ materials: next, activeMatId: newId });
            return next;
          });
          showToast(`📸 Textură încărcată: ${cleanName}`);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddColorMaterial = (hex) => {
    const newId = 'custom_col_' + Date.now();
    const newMat = {
      id: newId,
      name: `Culoare ${hex.toUpperCase()}`,
      type: 'color',
      colorHex: hex,
      dataUrl: null,
      thumbCss: hex,
      texture: null,
      scale: 1.0,
      rotate90: false,
      finishIdx: 0
    };
    setMaterials((prev) => {
      const next = [...prev, newMat];
      setActiveMatId(newId);
      persistWorkspace({ materials: next, activeMatId: newId });
      return next;
    });
    showToast(`🎨 Culoare adăugată: ${hex.toUpperCase()}`);
  };

  const handleDeleteMaterial = (matId) => {
    const ctx = sceneRef.current;
    setMaterials((prev) => {
      const target = prev.find((m) => m.id === matId);
      if (target && target.texture) target.texture.dispose();
      const next = prev.filter((m) => m.id !== matId);

      // Revert any surfaces using this deleted material back to Default White
      if (ctx) {
        for (const spec of ctx.payload.specs) {
          const item = ctx.interactiveMap[spec.id];
          if (item && item.assignedMatId === matId) {
            item.assignedMatId = null;
            const targets = item.facadeMeshes.length
              ? item.facadeMeshes
              : item.meshes;
            for (const m of targets) applyDefaultWhiteToMesh(m, xrayActive);
          }
        }
        for (const zKey of Object.keys(ctx.staticZoneAssignments)) {
          if (ctx.staticZoneAssignments[zKey] === matId) {
            ctx.staticZoneAssignments[zKey] = null;
            for (const m of ctx.staticTargets[zKey] || []) {
              applyDefaultWhiteToMesh(m, xrayActive);
            }
          }
        }
      }

      const nextActive =
        activeMatId === matId ? (next[0] ? next[0].id : null) : activeMatId;
      setActiveMatId(nextActive);
      syncPartsMetaToReact();
      persistWorkspace({ materials: next, activeMatId: nextActive });
      return next;
    });
  };

  const handleResetFurnitureToWhite = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    for (const spec of ctx.payload.specs) {
      const item = ctx.interactiveMap[spec.id];
      if (!item) continue;
      item.assignedMatId = null;
      const targets = item.facadeMeshes.length ? item.facadeMeshes : item.meshes;
      for (const m of targets) applyDefaultWhiteToMesh(m, xrayActive);
    }
    for (const zKey of Object.keys(ctx.staticTargets)) {
      ctx.staticZoneAssignments[zKey] = null;
      for (const m of ctx.staticTargets[zKey]) {
        applyDefaultWhiteToMesh(m, xrayActive);
      }
    }
    syncPartsMetaToReact();
    persistWorkspace();
    showToast('🔄 Mobilier resetat la Alb Default');
  };

  const handleDeleteAllMaterials = () => {
    materials.forEach((m) => {
      if (m.texture) m.texture.dispose();
    });
    setMaterials([]);
    setActiveMatId(null);
    handleResetFurnitureToWhite();
    persistWorkspace({ materials: [], activeMatId: null });
    showToast('🗑️ Toate materialele au fost șterse');
  };

  const handleUpdateActiveMaterialProp = (prop, value) => {
    const ctx = sceneRef.current;
    setMaterials((prev) => {
      const next = prev.map((m) =>
        m.id === activeMatId ? { ...m, [prop]: value } : m
      );
      const updatedMat = next.find((m) => m.id === activeMatId);
      if (updatedMat && ctx) {
        for (const m of ctx.paintableMeshes) {
          if (m.material.userData.assignedMatId === updatedMat.id) {
            applyMatEntryToMesh(m, updatedMat, xrayActive);
          }
        }
      }
      persistWorkspace({ materials: next });
      return next;
    });
  };

  const handlePaintPart = (partId) => {
    const ctx = sceneRef.current;
    const activeMat =
      materials.find((m) => m.id === activeMatId) || materials[0] || null;
    if (!ctx || !activeMat || !ctx.interactiveMap[partId]) return;

    const item = ctx.interactiveMap[partId];
    item.assignedMatId = activeMat.id;
    const targets = item.facadeMeshes.length ? item.facadeMeshes : item.meshes;
    for (const m of targets) {
      applyMatEntryToMesh(m, activeMat, xrayActive);
    }
    syncPartsMetaToReact();
    persistWorkspace();
    showToast(`🎨 ${getSpecTitle(item.spec, lang)} → ${activeMat.name}`);
  };

  const handleApplyMaterialToZone = (zoneKey) => {
    const ctx = sceneRef.current;
    const activeMat =
      materials.find((m) => m.id === activeMatId) || materials[0] || null;
    if (!ctx || !activeMat) return;
    const dict = I18N[lang] || I18N.ro;

    const assignPart = (id) => {
      const item = ctx.interactiveMap[id];
      if (!item) return;
      item.assignedMatId = activeMat.id;
      const targets = item.facadeMeshes.length ? item.facadeMeshes : item.meshes;
      for (const m of targets) applyMatEntryToMesh(m, activeMat, xrayActive);
    };

    const assignStatic = (sKey) => {
      ctx.staticZoneAssignments[sKey] = activeMat.id;
      for (const m of ctx.staticTargets[sKey] || []) {
        applyMatEntryToMesh(m, activeMat, xrayActive);
      }
    };

    if (zoneKey === 'all_facades') {
      ctx.payload.specs.forEach((s) => assignPart(s.id));
      assignStatic('vitrine_carcass');
    } else if (zoneKey === 'upper_doors') {
      ctx.payload.specs
        .filter((s) => s.category === 'upper_door' || s.category === 'left_door')
        .forEach((s) => assignPart(s.id));
    } else if (zoneKey === 'lower_facades') {
      ctx.payload.specs
        .filter((s) =>
          ['drawer', 'base_door', 'appliance', 'peninsula_door'].includes(
            s.category
          )
        )
        .forEach((s) => assignPart(s.id));
    } else if (zoneKey === 'drawers_only') {
      ctx.payload.specs
        .filter((s) => s.category === 'drawer')
        .forEach((s) => assignPart(s.id));
    } else if (zoneKey === 'base_doors_only') {
      ctx.payload.specs
        .filter((s) => s.category === 'base_door' || s.category === 'appliance')
        .forEach((s) => assignPart(s.id));
    } else if (zoneKey === 'tall_columns') {
      ctx.payload.specs
        .filter((s) => s.category === 'tall_door')
        .forEach((s) => assignPart(s.id));
    } else if (zoneKey === 'peninsula') {
      ctx.payload.specs
        .filter((s) => s.category === 'peninsula_door')
        .forEach((s) => assignPart(s.id));
    } else if (zoneKey === 'vitrine_glass') {
      ['door_g1', 'door_g2'].forEach((id) => assignPart(id));
    } else if (zoneKey === 'vitrine_body') {
      ['door_sb_bot_l', 'door_sb_bot_r'].forEach((id) => assignPart(id));
      assignStatic('vitrine_carcass');
    } else if (zoneKey === 'countertop') {
      assignStatic('countertop');
    } else if (zoneKey === 'carcass') {
      assignStatic('carcass');
    } else if (zoneKey === 'plinth') {
      assignStatic('plinth');
    }

    syncPartsMetaToReact();
    persistWorkspace();
    showToast(`🎨 ${dict.appliedToast}${activeMat.name}`);
  };

  // Lighting Studio Handlers
  const handleChangeLightState = (partial) => {
    setLightState((prev) => {
      const next = { ...prev, ...partial };
      persistWorkspace({ lightState: next });
      return next;
    });
  };

  const handleToggleLightOrb = () => {
    const ctx = sceneRef.current;
    const next = !showLightOrb;
    setShowLightOrb(next);
    if (ctx) {
      ctx.lightOrbGroup.visible = next;
    }
  };

  const handleChangeLang = (nextLang) => {
    setLang(nextLang);
    persistWorkspace({ lang: nextLang });
  };

  const handleHoverPart = (partId) => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    if (ctx.setHoveredGroup3D) ctx.setHoveredGroup3D(partId);
    if (dimsEnabled) update3DDimensionsDisplay(partId || ctx.selectedPartId);
  };

  const dict = I18N[lang] || I18N.ro;

  return (
    <>
      <div id="loader" className={loading ? '' : 'hidden'}>
        <div className="spinner" />
        <div style={{ fontWeight: 600, letterSpacing: '0.03em' }}>
          Se încarcă modelul 3D al bucătăriei...
        </div>
      </div>

      <div id="canvas-container" ref={canvasContainerRef} />

      <div
        id="tooltip"
        className={tooltip.visible ? 'visible' : ''}
        style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
      >
        <div className="tt-title">{tooltip.title}</div>
        {tooltip.dims && <div className="tt-dims">{tooltip.dims}</div>}
        <div className="tt-sub">{tooltip.sub}</div>
      </div>

      <div id="mobile-toast" className={toastMsg ? 'show' : ''}>
        {toastMsg}
      </div>

      <TopBar
        lang={lang}
        onChangeLang={handleChangeLang}
        dimsEnabled={dimsEnabled}
        onToggleDims={() => setDimsEnabled((v) => !v)}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />

      <DimensionToolbar
        lang={lang}
        dimsEnabled={dimsEnabled}
        dimMode={dimMode}
        onSetDimMode={setDimMode}
        activeDimInfo={activeDimInfo}
        tapeMeasurement={tapeMeasurement}
        tapeHasPointA={tapeHasPointA}
        onClearTape={handleClearTape}
      />

      <aside id="side-panel" className={panelOpen ? '' : 'collapsed'}>
        <div className="sheet-handle-bar" onClick={() => setPanelOpen(false)}>
          <div className="sheet-pill" />
          <div className="sheet-header-row">
            <span>{dict.controlsToggle}</span>
            <button
              className="sheet-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setPanelOpen(false);
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="panel-section">
          <div className="section-title">
            <span>{dict.quickActions}</span>
          </div>
          <div className="btn-grid">
            <button className="btn-pill" onClick={handleOpenAll}>
              <span>🔓</span>
              <span>{dict.openAll}</span>
            </button>
            <button className="btn-pill" onClick={handleCloseAll}>
              <span>🔒</span>
              <span>{dict.closeAll}</span>
            </button>
            <button className="btn-pill" onClick={handleToggleDrawers}>
              <span>🗄️</span>
              <span>{dict.toggleDrawers}</span>
            </button>
            <button className="btn-pill" onClick={handleToggleDoors}>
              <span>🚪</span>
              <span>{dict.toggleDoors}</span>
            </button>
            <button
              className={`btn-pill ${xrayActive ? 'active' : ''}`}
              onClick={handleToggleXray}
            >
              <span>👁️</span>
              <span>{dict.xrayFronts}</span>
            </button>
            <button
              className={`btn-pill ${countertopHidden ? 'active' : ''}`}
              onClick={handleToggleCountertop}
            >
              <span>🪨</span>
              <span>{dict.hideCountertop}</span>
            </button>
            <button
              className={`btn-pill ${edgesVisible ? 'active' : ''}`}
              onClick={handleToggleEdges}
            >
              <span>📐</span>
              <span>{dict.showEdges}</span>
            </button>
            <button
              className={`btn-pill ${dimsEnabled ? 'active' : ''}`}
              onClick={() => setDimsEnabled((v) => !v)}
            >
              <span>📏</span>
              <span>{dict.showDims}</span>
            </button>
          </div>
        </div>

        <MaterialStudioSection
          lang={lang}
          materials={materials}
          activeMatId={activeMatId}
          onSelectMaterial={(id) => {
            setActiveMatId(id);
            persistWorkspace({ activeMatId: id });
          }}
          onUploadTextures={handleUploadTextures}
          onAddColorMaterial={handleAddColorMaterial}
          onDeleteMaterial={handleDeleteMaterial}
          onDeleteAllMaterials={handleDeleteAllMaterials}
          onResetFurnitureToWhite={handleResetFurnitureToWhite}
          onUpdateActiveMaterialProp={handleUpdateActiveMaterialProp}
          paintModeActive={paintModeActive}
          onTogglePaintMode={() => setPaintModeActive((v) => !v)}
          onApplyMaterialToZone={handleApplyMaterialToZone}
        />

        <LightingStudioSection
          lang={lang}
          lightState={lightState}
          onChangeLightState={handleChangeLightState}
          showLightOrb={showLightOrb}
          onToggleLightOrb={handleToggleLightOrb}
        />

        <InteractivePartsSection
          lang={lang}
          specs={specs}
          partsMeta={partsMeta}
          materials={materials}
          onTogglePart={(id) => toggleInteractivePart(id, null, true)}
          onPaintPart={handlePaintPart}
          onHoverPart={handleHoverPart}
        />
      </aside>

      <CameraPresetsBar
        lang={lang}
        onSelectCamera={handleSelectCamera}
        autoRotate={autoRotate}
        onToggleAutoRotate={handleToggleAutoRotate}
      />

      <div id="help-pill">
        <span>🖱️ {dict.hintOrbit}</span>
        <span>•</span>
        <span>✋ {dict.hintPan}</span>
        <span>•</span>
        <span>🔍 {dict.hintZoom}</span>
        <span>•</span>
        <span>👆 {dict.hintClick}</span>
      </div>
    </>
  );
}
