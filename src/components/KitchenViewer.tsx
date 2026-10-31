'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import {
  I18N,
  fmtCm,
  getSpecTitle,
  formatPartDimsText
} from '../i18n/translations';
import { writePersistedData, readPersistedData } from '../utils/storage';
import {
  DEFAULT_WHITE_HEX,
  FINISH_MODES,
  CAM_PRESETS,
  kelvinToColor,
  createOvenDisplayTexture,
  createTextureFromDataUrl,
  buildDefaultMaterialsTable
} from '../utils/textures';
import {
  addCadDimLine,
  buildStaticDimensions,
  renderPartDimensions3D,
  createPinMarker
} from '../utils/dimensions3d';
import {
  loadGlbModelFromBuffer,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  updateGlbMechanismsIn3D,
  autoDetectGlbMechanisms,
  buildFollowerMap,
  disposeModelHierarchy
} from '../utils/glbImporter';

import TopBar from './TopBar';
import DimensionToolbar from './DimensionToolbar';
import CameraPresetsBar from './CameraPresetsBar';
import MaterialStudioSection from './MaterialStudioSection';
import UniversalFurnitureStudioSection from './UniversalFurnitureStudioSection';
import ModularKitchenStudioSection from './ModularKitchenStudioSection';
import ParametricCabinetSection from './ParametricCabinetSection';
import { exportToGlbArrayBuffer } from '../utils/parametricCabinet';
import GlbImporterSection from './GlbImporterSection';
import LightingStudioSection from './LightingStudioSection';
import InteractivePartsSection from './InteractivePartsSection';
import ModelTreePanel from './ModelTreePanel';
import ArchitecturalRoomSection from './ArchitecturalRoomSection';
import ApplianceCatalogSection from './ApplianceCatalogSection';
import { createFastenerMeshes } from '../utils/furnitureEngineering';
import {
  buildArchitecturalRoom,
  drawArchitecturalFloorPlan,
  DEFAULT_ROOM_CONFIG,
  RoomConfig
} from '../utils/architecturalRoom';
import {
  buildAppliance3DModel,
  APPLIANCE_CATALOG,
  ApplianceDefinition,
  ApplianceInstance
} from '../utils/applianceCatalog';
import TechnicalReportModal from './TechnicalReportModal';
import { calculateMagneticSnap, alignModelDirectly } from '../utils/magneticSnapping';

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

async function decompressGzipBase64(b64) {
  if (!b64) return null;
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const resp = new Response(ds.readable);
    return await resp.arrayBuffer();
  }
  return bytes.buffer;
}

function decodeBase64(b64, TypedArr) {
  if (!b64) return new TypedArr(0);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TypedArr(bytes.buffer);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function KitchenViewer() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ro');
  const [panelOpen, setPanelOpen] = useState(true);
  const [specs, setSpecs] = useState([]);
  const [partsMeta, setPartsMeta] = useState({});

  const [materials, setMaterials] = useState([INITIAL_WHITE_MAT]);
  const [activeMatId, setActiveMatId] = useState('mat_default_white');
  const [paintModeActive, setPaintModeActive] = useState(false);

  // Imported .GLB Models State
  const [importedModels, setImportedModels] = useState([]);
  const [selectedGlbId, setSelectedGlbId] = useState(null);
  const [gizmoMode, setGizmoMode] = useState('translate');
  const [placeOnSurfaceMode, setPlaceOnSurfaceMode] = useState(false);

  const [xrayActive, setXrayActive] = useState(false);
  const [countertopHidden, setCountertopHidden] = useState(false);
  const [edgesVisible, setEdgesVisible] = useState(true);
  const [roomWallsActive, setRoomWallsActive] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  const [dimsEnabled, setDimsEnabled] = useState(false);
  const [dimMode, setDimMode] = useState('all');
  const [activeDimInfo, setActiveDimInfo] = useState(null);
  const [tapeHasPointA, setTapeHasPointA] = useState(false);
  const [tapeMeasurement, setTapeMeasurement] = useState(null);

  // Architectural Space & Appliances State
  const [roomConfig, setRoomConfig] = useState<RoomConfig>(DEFAULT_ROOM_CONFIG);
  const [is2DPlanMode, setIs2DPlanMode] = useState(false);
  const [appliances, setAppliances] = useState<ApplianceInstance[]>([]);
  const [selectedApplianceId, setSelectedApplianceId] = useState<string | null>(null);
  const planCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Project & CAD Studio States
  const [magneticSnapEnabled, setMagneticSnapEnabled] = useState(true);
  const [technicalReportOpen, setTechnicalReportOpen] = useState(false);

  const [lightState, setLightState] = useState(INITIAL_LIGHT_STATE);
  const [showLightOrb, setShowLightOrb] = useState(false);

  // Studio Tabs & Navigation State
  const [activeStudioTab, setActiveStudioTab] = useState('furniture'); // 'architecture' | 'furniture' | 'appliances' | 'materials' | 'models' | 'lighting' | 'parts' | 'tree'
  const [furnitureSubTab, setFurnitureSubTab] = useState('universal'); // 'universal' | 'kitchen' | 'single'
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);

  // CAD Engineering & Model Tree States
  const [explodedProgress, setExplodedProgress] = useState(0);
  const [showFasteners3d, setShowFasteners3d] = useState(false);
  const [wireframeActive, setWireframeActive] = useState(false);
  const [hiddenPartIds, setHiddenPartIds] = useState<Set<string>>(new Set());

  // Undo & Redo History State
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isRestoringHistoryRef = useRef(false);
  const lastContinuousActionRef = useRef(null);
  const glbBinaryCacheRef = useRef(new Map());
  const captureSnapshotRef = useRef(null);
  const pushHistoryRef = useRef(null);

  const [toastMsg, setToastMsg] = useState('');
  const tooltipRef = useRef(null);
  const ttTitleRef = useRef(null);
  const ttDimsRef = useRef(null);
  const ttSubRef = useRef(null);

  const updateTooltipDOM = useCallback(
    (visible, x = 0, y = 0, title = '', dims = '', sub = '') => {
      const el = tooltipRef.current;
      if (!el) return;
      if (!visible) {
        el.classList.remove('visible');
        return;
      }
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      if (ttTitleRef.current) ttTitleRef.current.textContent = title;
      if (ttDimsRef.current) {
        ttDimsRef.current.textContent = dims;
        ttDimsRef.current.style.display = dims ? 'block' : 'none';
      }
      if (ttSubRef.current) ttSubRef.current.textContent = sub;
      el.classList.add('visible');
    },
    []
  );

  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg('');
    }, 2200);
  }, []);

  const stateRef = useRef<any>({
    lang,
    materials,
    activeMatId,
    paintModeActive,
    importedModels,
    selectedGlbId,
    gizmoMode,
    placeOnSurfaceMode,
    xrayActive,
    dimsEnabled,
    dimMode,
    magneticSnapEnabled,
    lightState,
    roomConfig,
    appliances,
    selectedApplianceId,
    is2DPlanMode
  });
  useEffect(() => {
    stateRef.current = {
      lang,
      materials,
      activeMatId,
      paintModeActive,
      importedModels,
      selectedGlbId,
      gizmoMode,
      placeOnSurfaceMode,
      xrayActive,
      dimsEnabled,
      dimMode,
      magneticSnapEnabled,
      lightState,
      roomConfig,
      appliances,
      selectedApplianceId,
      is2DPlanMode
    };
  }, [
    lang,
    materials,
    activeMatId,
    paintModeActive,
    importedModels,
    selectedGlbId,
    gizmoMode,
    placeOnSurfaceMode,
    xrayActive,
    dimsEnabled,
    dimMode,
    lightState,
    roomConfig,
    appliances,
    selectedApplianceId,
    is2DPlanMode
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

  const persistWorkspace = useCallback((overrides: any = {}) => {
    const ctx = sceneRef.current;
    if (!ctx || ctx.isRestoring) return;

    const curLang = overrides.lang ?? stateRef.current.lang;
    const curMats = overrides.materials ?? stateRef.current.materials;
    const curActiveId = overrides.activeMatId ?? stateRef.current.activeMatId;
    const curLight = overrides.lightState ?? stateRef.current.lightState;
    const curImported =
      overrides.importedModels ?? stateRef.current.importedModels;
    const curRoom = overrides.roomConfig ?? stateRef.current.roomConfig;
    const curApps = overrides.appliances ?? stateRef.current.appliances;

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

    const serializedImported = (curImported || []).map((im) => ({
      id: im.id,
      name: im.name,
      b64Data: im.b64Data || glbBinaryCacheRef.current.get(im.id) || null,
      position: im.position,
      rotationYDeg: im.rotationYDeg,
      scale: im.scale,
      subParts: im.subParts,
      isParametric: Boolean(im.isParametric),
      parametricConfig: im.parametricConfig || null
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
      lightState: { ...curLight },
      importedModels: serializedImported
    });
  }, []);

  const captureSnapshot = useCallback((desc = '') => {
    const ctx = sceneRef.current;
    if (!ctx) return null;

    const materials = stateRef.current.materials.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      colorHex: m.colorHex,
      dataUrl: m.dataUrl || null,
      thumbCss: m.thumbCss,
      texture: m.texture || null,
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

    const staticZoneAssignments = { ...ctx.staticZoneAssignments };

    const importedModels = (stateRef.current.importedModels || []).map((im) => ({
      id: im.id,
      name: im.name,
      b64Data: im.b64Data,
      position: [...im.position],
      rotationYDeg: im.rotationYDeg,
      scale: [...im.scale],
      baseDimsCm: im.baseDimsCm ? { ...im.baseDimsCm } : undefined,
      hasNativeAnimations: im.hasNativeAnimations,
      subParts: im.subParts ? im.subParts.map((sp) => ({ ...sp })) : [],
      isParametric: Boolean(im.isParametric),
      parametricConfig: im.parametricConfig ? { ...im.parametricConfig } : null
    }));

    return {
      desc,
      activeMatId: stateRef.current.activeMatId,
      materials,
      partAssignments,
      staticZoneAssignments,
      openParts,
      lightState: { ...stateRef.current.lightState },
      importedModels
    };
  }, []);
  captureSnapshotRef.current = captureSnapshot;

  const pushHistory = useCallback(
    (desc = '', isContinuous = false) => {
      if (isRestoringHistoryRef.current || sceneRef.current?.isRestoring) return;
      const snapshot = captureSnapshot(desc);
      if (!snapshot) return;

      const now = performance.now();
      const last = lastContinuousActionRef.current;

      if (isContinuous && last && last.desc === desc && now - last.time < 1200) {
        const curIdx = historyIndexRef.current;
        if (curIdx >= 0 && historyRef.current[curIdx]) {
          historyRef.current[curIdx] = snapshot;
          lastContinuousActionRef.current = { desc, time: now };
          return;
        }
      }

      lastContinuousActionRef.current = isContinuous ? { desc, time: now } : null;

      const curIdx = historyIndexRef.current;
      const truncated = historyRef.current.slice(0, curIdx + 1);
      truncated.push(snapshot);
      if (truncated.length > 40) {
        truncated.shift();
      }
      historyRef.current = truncated;
      const nextIdx = truncated.length - 1;
      historyIndexRef.current = nextIdx;

      setCanUndo(nextIdx > 0);
      setCanRedo(false);
    },
    [captureSnapshot]
  );
  pushHistoryRef.current = pushHistory;

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
    if (!stateRef.current.dimsEnabled || stateRef.current.dimMode === 'tape')
      return;

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

  // Helper to mount a parsed .GLB model into the 3D scene and register its meshes
  const mountParsedGlbIntoScene = useCallback(
    async (
      arrayBuffer,
      b64Data,
      modelId,
      modelName,
      initTransform = null,
      savedSubParts = null,
      availableMats = []
    ) => {
      const ctx = sceneRef.current;
      if (!ctx) return null;

      const parsed: any = await loadGlbModelFromBuffer(
        arrayBuffer,
        modelId,
        modelName
      );
      const pos =
        initTransform && initTransform.position
          ? initTransform.position
          : [1.85, 0.0, 2.15];
      const rotYDeg =
        initTransform && typeof initTransform.rotationYDeg === 'number'
          ? initTransform.rotationYDeg
          : 0;
      const scl =
        initTransform && initTransform.scale
          ? initTransform.scale
          : [1.0, 1.0, 1.0];

      parsed.wrapperGroup.position.set(pos[0], pos[1], pos[2]);
      parsed.wrapperGroup.rotation.set(
        0,
        THREE.MathUtils.degToRad(rotYDeg),
        0
      );
      parsed.wrapperGroup.scale.set(scl[0], scl[1], scl[2]);

      ctx.importedRootGroup.add(parsed.wrapperGroup);
      ctx.importedMap[modelId] = parsed;

      const finalSubParts = parsed.subPartsMeta.map((sp, idx) => {
        const savedSp =
          savedSubParts && savedSubParts[idx] ? savedSubParts[idx] : null;
        const mesh = parsed.meshes[idx];
        let nextSp = { ...sp };

        if (savedSp) {
          if (typeof savedSp.mechType === 'string') {
            nextSp.mechType = savedSp.mechType;
          }
          if (typeof savedSp.isOpen === 'boolean') {
            nextSp.isOpen = savedSp.isOpen;
          }
        }

        if (mesh) {
          mesh.userData.mechProgress = nextSp.isOpen ? 1 : 0;
          mesh.userData.mechTarget = nextSp.isOpen ? 1 : 0;

          if (savedSp) {
            if (savedSp.assignedMatId) {
              const matEntry = availableMats.find(
                (m) => m.id === savedSp.assignedMatId
              );
              if (matEntry) {
                applyMatEntryToMesh(
                  mesh,
                  matEntry,
                  stateRef.current.xrayActive
                );
                nextSp.assignedMatId = matEntry.id;
                nextSp.colorHex = matEntry.colorHex || sp.colorHex;
              }
            } else if (savedSp.colorHex) {
              mesh.material.map = null;
              mesh.material.color.set(savedSp.colorHex);
              mesh.material.needsUpdate = true;
              nextSp.colorHex = savedSp.colorHex;
              nextSp.assignedMatId = null;
            }
          }
        }
        return nextSp;
      });

      updateGlbMechanismsIn3D(parsed, finalSubParts);

      for (const m of parsed.meshes) {
        ctx.importedMeshes.push(m);
        ctx.paintableMeshes.push(m);
      }

      if (b64Data) {
        glbBinaryCacheRef.current.set(modelId, b64Data);
      }
      return ({
        id: modelId,
        name: modelName,
        position: pos,
        rotationYDeg: rotYDeg,
        scale: scl,
        baseDimsCm: parsed.baseDimsCm,
        hasNativeAnimations: parsed.hasNativeAnimations,
        subParts: finalSubParts
      }) as any;
    },
    [applyMatEntryToMesh]
  );

  const restoreSnapshot = useCallback(
    async (snapshot) => {
      const ctx = sceneRef.current;
      if (!ctx || !snapshot) return;

      isRestoringHistoryRef.current = true;

      // 1. Materials
      const curMats = stateRef.current.materials;
      const nextMaterials = [];
      for (const sm of snapshot.materials) {
        let tex = sm.texture;
        if (!tex) {
          const existing = curMats.find(
            (m) => m.id === sm.id && m.dataUrl === sm.dataUrl && m.texture
          );
          if (existing) {
            tex = existing.texture;
          } else if (sm.type === 'texture' && sm.dataUrl) {
            tex = await createTextureFromDataUrl(sm.dataUrl);
          }
        }
        if (tex) {
          const rep = 1.0 / Math.max(0.15, sm.scale);
          tex.repeat.set(rep, rep);
          tex.rotation = sm.rotate90 ? Math.PI / 2 : 0;
          tex.needsUpdate = true;
        }
        nextMaterials.push({
          ...sm,
          texture: tex
        });
      }
      setMaterials(nextMaterials);
      stateRef.current.materials = nextMaterials;
      setActiveMatId(snapshot.activeMatId);
      stateRef.current.activeMatId = snapshot.activeMatId;

      // 2. Kitchen interactive parts materials
      for (const spec of ctx.payload.specs) {
        const item = ctx.interactiveMap[spec.id];
        if (!item) continue;
        const assignedId = snapshot.partAssignments[spec.id] || null;
        item.assignedMatId = assignedId;
        const matEntry = assignedId
          ? nextMaterials.find((m) => m.id === assignedId)
          : null;
        const targets = item.facadeMeshes.length
          ? item.facadeMeshes
          : item.meshes;
        for (const m of targets) {
          if (matEntry) {
            applyMatEntryToMesh(m, matEntry, stateRef.current.xrayActive);
          } else {
            applyDefaultWhiteToMesh(m, stateRef.current.xrayActive);
          }
        }
      }

      // Static zones materials
      for (const zKey of Object.keys(ctx.staticTargets)) {
        const assignedId = snapshot.staticZoneAssignments[zKey] || null;
        ctx.staticZoneAssignments[zKey] = assignedId;
        const matEntry = assignedId
          ? nextMaterials.find((m) => m.id === assignedId)
          : null;
        for (const m of ctx.staticTargets[zKey] || []) {
          if (matEntry) {
            applyMatEntryToMesh(m, matEntry, stateRef.current.xrayActive);
          } else {
            applyDefaultWhiteToMesh(m, stateRef.current.xrayActive);
          }
        }
      }

      // 3. Open/Close state of doors & drawers
      for (const spec of ctx.payload.specs) {
        const item = ctx.interactiveMap[spec.id];
        if (!item) continue;
        const shouldBeOpen = Boolean(snapshot.openParts[spec.id]);
        item.isOpen = shouldBeOpen;
        item.target = shouldBeOpen ? 1 : 0;
      }

      // 4. Lighting state
      if (snapshot.lightState) {
        setLightState({ ...snapshot.lightState });
        stateRef.current.lightState = { ...snapshot.lightState };
      }

      // 5. Imported GLB models
      const currentGlbIds = new Set(Object.keys(ctx.importedMap));
      const targetGlbMap = new Map();
      for (const im of snapshot.importedModels || []) {
        targetGlbMap.set(im.id, im);
      }

      for (const curId of currentGlbIds) {
        if (!targetGlbMap.has(curId)) {
          const entry = ctx.importedMap[curId];
          if (entry) {
            if (
              ctx.transformControls &&
              ctx.transformControls.object === entry.wrapperGroup
            ) {
              ctx.transformControls.detach();
              ctx.transformControls.visible = false;
            }
            disposeModelHierarchy(entry.wrapperGroup);
            ctx.importedRootGroup.remove(entry.wrapperGroup);
            ctx.needsShadowUpdate = true;
            ctx.importedMeshes = ctx.importedMeshes.filter(
              (m) => m.userData.importedModelId !== curId
            );
            ctx.paintableMeshes = ctx.paintableMeshes.filter(
              (m) => m.userData.importedModelId !== curId
            );
            delete ctx.importedMap[curId];
          }
        }
      }

      const restoredGlbList = [];
      for (const im of snapshot.importedModels || []) {
        let entry = ctx.importedMap[im.id];
        if (!entry) {
          const b64 = im.b64Data || glbBinaryCacheRef.current.get(im.id);
          if (b64) {
            glbBinaryCacheRef.current.set(im.id, b64);
            const buf = base64ToArrayBuffer(b64);
            const mounted = await mountParsedGlbIntoScene(
              buf,
              b64,
              im.id,
              im.name,
              {
                position: im.position,
                rotationYDeg: im.rotationYDeg,
                scale: im.scale
              },
              im.subParts,
              nextMaterials
            );
            if (mounted) {
              mounted.isParametric = Boolean(im.isParametric);
              mounted.parametricConfig = im.parametricConfig || null;
              restoredGlbList.push(mounted);
              continue;
            }
          }
        } else {
          entry.wrapperGroup.position.set(
            im.position[0],
            im.position[1],
            im.position[2]
          );
          entry.wrapperGroup.rotation.set(
            0,
            THREE.MathUtils.degToRad(im.rotationYDeg),
            0
          );
          entry.wrapperGroup.scale.set(im.scale[0], im.scale[1], im.scale[2]);

          if (im.subParts && entry.meshes) {
            for (let i = 0; i < entry.meshes.length; i++) {
              const sp = im.subParts[i];
              const mesh = entry.meshes[i];
              if (!sp || !mesh) continue;

              mesh.userData.mechTarget = sp.isOpen ? 1 : 0;
              if (sp.assignedMatId) {
                const matEntry = nextMaterials.find(
                  (m) => m.id === sp.assignedMatId
                );
                if (matEntry) {
                  applyMatEntryToMesh(mesh, matEntry, stateRef.current.xrayActive);
                }
              } else if (sp.colorHex) {
                mesh.material.map = null;
                mesh.material.color.set(sp.colorHex);
                mesh.material.userData.assignedMatId = null;
                mesh.material.needsUpdate = true;
              } else if (mesh.userData.originalGlbMaterial) {
                mesh.material = mesh.userData.originalGlbMaterial.clone();
                mesh.material.needsUpdate = true;
              }
            }
            updateGlbMechanismsIn3D(entry, im.subParts);
          }
          restoredGlbList.push(im);
        }
      }

      setImportedModels(restoredGlbList);
      stateRef.current.importedModels = restoredGlbList;
      if (!restoredGlbList.some((m) => m.id === stateRef.current.selectedGlbId)) {
        const nextSel = restoredGlbList[0] ? restoredGlbList[0].id : null;
        setSelectedGlbId(nextSel);
        stateRef.current.selectedGlbId = nextSel;
      }

      syncPartsMetaToReact();
      if (stateRef.current.dimsEnabled) {
        update3DDimensionsDisplay(ctx.selectedPartId);
      }

      persistWorkspace({
        materials: nextMaterials,
        activeMatId: snapshot.activeMatId,
        lightState: snapshot.lightState,
        importedModels: restoredGlbList
      });

      isRestoringHistoryRef.current = false;
    },
    [
      applyDefaultWhiteToMesh,
      applyMatEntryToMesh,
      mountParsedGlbIntoScene,
      persistWorkspace,
      syncPartsMetaToReact,
      update3DDimensionsDisplay
    ]
  );

  const handleUndo = useCallback(async () => {
    if (historyIndexRef.current <= 0) return;
    const targetIdx = historyIndexRef.current - 1;
    const snapshot = historyRef.current[targetIdx];
    if (!snapshot) return;

    historyIndexRef.current = targetIdx;
    setCanUndo(targetIdx > 0);
    setCanRedo(true);

    await restoreSnapshot(snapshot);

    const dict = I18N[stateRef.current.lang] || I18N.ro;
    const desc = snapshot.desc ? ` (${snapshot.desc})` : '';
    showToast(`↩️ ${dict.undoToast || 'Anulat'}${desc}`);
  }, [restoreSnapshot, showToast]);

  const handleRedo = useCallback(async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const targetIdx = historyIndexRef.current + 1;
    const snapshot = historyRef.current[targetIdx];
    if (!snapshot) return;

    historyIndexRef.current = targetIdx;
    setCanUndo(true);
    setCanRedo(targetIdx < historyRef.current.length - 1);

    await restoreSnapshot(snapshot);

    const dict = I18N[stateRef.current.lang] || I18N.ro;
    const desc = snapshot.desc ? ` (${snapshot.desc})` : '';
    showToast(`↪️ ${dict.redoToast || 'Refăcut'}${desc}`);
  }, [restoreSnapshot, showToast]);

  // Sync TransformControls gizmo attachment & mode
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.transformControls) return;
    const tc = ctx.transformControls;

    if (!selectedGlbId || !gizmoMode || !ctx.importedMap[selectedGlbId]) {
      tc.detach();
      tc.visible = false;
      return;
    }

    const entry = ctx.importedMap[selectedGlbId];
    tc.setMode(gizmoMode);
    tc.attach(entry.wrapperGroup);
    tc.visible = true;
  }, [selectedGlbId, gizmoMode, importedModels, loading]);

  // Keyboard shortcuts for Undo/Redo (Ctrl+Z / Ctrl+Y) and TransformControls (W, E, R, Esc)
  useEffect(() => {
    const onKeyDown = (e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (isCtrlOrMeta) {
        const tag = document.activeElement?.tagName?.toLowerCase() || '';
        const activeInput = document.activeElement as HTMLInputElement;
        const isTextInput =
          tag === 'input' &&
          activeInput?.type !== 'range' &&
          activeInput?.type !== 'color';
        if (!isTextInput && tag !== 'textarea') {
          if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
            e.preventDefault();
            handleUndo();
            return;
          } else if (
            e.key === 'y' ||
            e.key === 'Y' ||
            ((e.key === 'z' || e.key === 'Z') && e.shiftKey)
          ) {
            e.preventDefault();
            handleRedo();
            return;
          }
        }
      }

      if (
        !stateRef.current.selectedGlbId ||
        ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'w') setGizmoMode('translate');
      else if (k === 'e') setGizmoMode('rotate');
      else if (k === 'r') setGizmoMode('scale');
      else if (k === 'escape') {
        setGizmoMode(null);
        setPlaceOnSurfaceMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // Initialize Three.js Scene
  useEffect(() => {
    let disposed = false;
    let animFrameId: any = null;
    let hoverRaf: any = null;

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setPanelOpen(false);
    }

    async function initScene() {
      const payload = { specs: [], batches: [] };
      const rawBuffer = null;
      if (disposed) return;

      const container = canvasContainerRef.current;
      if (!container) return;
      container.innerHTML = '';

      const isMobile =
        window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth <= 768;

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
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.5)
      );
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
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

      // 3D TransformControls Gizmo for Imported .GLB Models
      const transformControls = new TransformControls(
        camera,
        renderer.domElement
      );
      (transformControls as any).setSize(isMobile ? 0.95 : 0.8);
      (transformControls as any).visible = false;
      scene.add(transformControls as any);

      transformControls.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
        if (!event.value && stateRef.current.selectedGlbId) {
          const gid = stateRef.current.selectedGlbId;
          const entry = sceneRef.current?.importedMap?.[gid];
          if (entry) {
            const p = entry.wrapperGroup.position;
            const ry = THREE.MathUtils.radToDeg(entry.wrapperGroup.rotation.y);
            const s = entry.wrapperGroup.scale;
            let nextPos = [
              Math.round(p.x * 1000) / 1000,
              Math.round(Math.max(0, p.y) * 1000) / 1000,
              Math.round(p.z * 1000) / 1000
            ];

            if (stateRef.current.selectedApplianceId) {
              const aid = stateRef.current.selectedApplianceId;
              const appMesh = sceneRef.current?.appliancesRootGroup?.children.find((c: any) => c.userData?.applianceId === aid);
              if (appMesh) {
                const ap = appMesh.position;
                const ar = appMesh.rotation;
                setAppliances((prev) => {
                  const updated = prev.map((a) => a.id === aid ? { ...a, position: { x: ap.x, y: ap.y, z: ap.z }, rotation: { x: ar.x, y: ar.y, z: ar.z } } : a);
                  persistWorkspace({ appliances: updated });
                  return updated;
                });
              }
            }
            if (stateRef.current.magneticSnapEnabled && (stateRef.current.gizmoMode === 'translate' || !stateRef.current.gizmoMode)) {
              const snapResult = calculateMagneticSnap(
                gid,
                stateRef.current.importedModels,
                sceneRef.current.importedMap,
                0.06
              );
              if (snapResult) {
                nextPos = snapResult.position;
                entry.wrapperGroup.position.set(nextPos[0], nextPos[1], nextPos[2]);
                if (snapResult.info) {
                  showToast('🧲 ' + snapResult.info);
                }
              }
            }
            const nextRot = Math.round(ry);
            const nextScale = [
              Math.max(0.05, Math.round(s.x * 1000) / 1000),
              Math.max(0.05, Math.round(s.y * 1000) / 1000),
              Math.max(0.05, Math.round(s.z * 1000) / 1000)
            ];
            setImportedModels((prev) => {
              const updated = prev.map((im) =>
                im.id === gid
                  ? {
                    ...im,
                    position: nextPos,
                    rotationYDeg: nextRot,
                    scale: nextScale
                  }
                  : im
              );
              persistWorkspace({ importedModels: updated });
              return updated;
            });
            pushHistoryRef.current?.('Transformare 3D ' + (stateRef.current.gizmoMode || 'Model'));
          }
        }
      });

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
      const orbMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 20, 20),
        orbMat
      );
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

      // Studio Room Reference Walls (Back & Left Corner)
      const roomWallsGroup = new THREE.Group();
      roomWallsGroup.name = 'studio_room_walls';
      roomWallsGroup.visible = false;

      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x222732,
        roughness: 0.92,
        metalness: 0.04
      });
      const skirtingMat = new THREE.MeshStandardMaterial({
        color: 0x15181f,
        roughness: 0.65,
        metalness: 0.1
      });

      // Back Wall (Width 6.8m, Height 2.8m, Thickness 0.08m)
      const backWallGeo = new THREE.BoxGeometry(6.8, 2.8, 0.08);
      const backWallMesh = new THREE.Mesh(backWallGeo, wallMat);
      backWallMesh.position.set(2.2, 1.4, -0.06);
      backWallMesh.receiveShadow = true;
      roomWallsGroup.add(backWallMesh);

      // Back Skirting
      const backSkirtingGeo = new THREE.BoxGeometry(6.8, 0.09, 0.02);
      const backSkirtingMesh = new THREE.Mesh(backSkirtingGeo, skirtingMat);
      backSkirtingMesh.position.set(2.2, 0.045, -0.01);
      roomWallsGroup.add(backSkirtingMesh);

      // Left Wall (Depth 5.2m, Height 2.8m, Thickness 0.08m)
      const leftWallGeo = new THREE.BoxGeometry(0.08, 2.8, 5.2);
      const leftWallMesh = new THREE.Mesh(leftWallGeo, wallMat);
      leftWallMesh.position.set(-0.36, 1.4, 2.5);
      leftWallMesh.receiveShadow = true;
      roomWallsGroup.add(leftWallMesh);

      // Left Skirting
      const leftSkirtingGeo = new THREE.BoxGeometry(0.02, 0.09, 5.2);
      const leftSkirtingMesh = new THREE.Mesh(leftSkirtingGeo, skirtingMat);
      leftSkirtingMesh.position.set(-0.31, 0.045, 2.5);
      roomWallsGroup.add(leftSkirtingMesh);

      scene.add(roomWallsGroup);

      const displayTex = createOvenDisplayTexture();
      const matDefs = buildDefaultMaterialsTable(displayTex);

      const kitchenRoot = new THREE.Group();
      kitchenRoot.scale.set(0.001, 0.001, 0.001);
      scene.add(kitchenRoot);

      // 3D Parametric Architectural Room
      const roomRoot = buildArchitecturalRoom(stateRef.current.roomConfig || DEFAULT_ROOM_CONFIG);
      scene.add(roomRoot);

      // Container for Built-in Appliances
      const appliancesRootGroup = new THREE.Group();
      appliancesRootGroup.name = 'appliances_root';
      scene.add(appliancesRootGroup);

      // Container for Imported & Parametric Furniture Models
      const importedRootGroup = new THREE.Group();
      importedRootGroup.name = 'imported_glb_root';
      scene.add(importedRootGroup);

      // Container for 3D Fasteners & Hardware (System 32)
      const fastenersRootGroup = new THREE.Group();
      fastenersRootGroup.name = 'cad_fasteners_root';
      fastenersRootGroup.visible = false;
      scene.add(fastenersRootGroup);

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
      const importedMap = {};
      const importedMeshes = [];

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
        let posArr, normInt8, idxArr;

        if (rawBuffer && typeof b.po === 'number') {
          posArr = new Float32Array(rawBuffer, b.po, b.vc * 3);
          normInt8 = new Int8Array(rawBuffer, b.no, b.vc * 3);
          idxArr = b.u32
            ? new Uint32Array(rawBuffer, b.io, b.ic)
            : new Uint16Array(rawBuffer, b.io, b.ic);
        } else if (b.p) {
          const posInt16 = decodeBase64(b.p, Int16Array);
          posArr = new Float32Array(posInt16.length);
          for (let i = 0; i < posInt16.length; i++) posArr[i] = posInt16[i];
          normInt8 = decodeBase64(b.n, Int8Array);
          idxArr = decodeBase64(
            b.i,
            b.it === 'uint32' ? Uint32Array : Uint16Array
          );
        } else {
          continue;
        }

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
          line.raycast = () => { };
          mesh.add(line);
          edgeLines.push(line);
        }
      }

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
        kitchenRoot,
        roomWallsGroup,
        camera,
        renderer,
        controls,
        transformControls,
        floorMesh,
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
        roomRoot,
        appliancesRootGroup,
        importedRootGroup,
        fastenersRootGroup,
        importedMap,
        importedMeshes,
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
        isRestoring: false,
        needsShadowUpdate: true
      };
      sceneRef.current = ctx;
      setSpecs(payload.specs);

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
      let restoredMats = [INITIAL_WHITE_MAT];
      if (saved && saved.version === 1) {
        if (saved.lang && I18N[saved.lang]) {
          setLang(saved.lang);
          stateRef.current.lang = saved.lang;
        }
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

        if (saved.roomConfig) {
          setRoomConfig(saved.roomConfig);
          stateRef.current.roomConfig = saved.roomConfig;
          if (ctx.roomRoot) {
            scene.remove(ctx.roomRoot);
            const newRoom = buildArchitecturalRoom(saved.roomConfig);
            scene.add(newRoom);
            ctx.roomRoot = newRoom;
          }
        }

        if (Array.isArray(saved.appliances) && saved.appliances.length > 0) {
          setAppliances(saved.appliances);
          stateRef.current.appliances = saved.appliances;
          for (const app of saved.appliances) {
            const mesh = buildAppliance3DModel(app);
            ctx.appliancesRootGroup.add(mesh);
          }
        }

        // Restore Imported .GLB Models from IndexedDB
        if (Array.isArray(saved.importedModels) && saved.importedModels.length) {
          const restoredGlbs = [];
          for (const sim of saved.importedModels) {
            if (!sim.b64Data) continue;
            glbBinaryCacheRef.current.set(sim.id, sim.b64Data);
            try {
              const buf = base64ToArrayBuffer(sim.b64Data);
              const mounted = await mountParsedGlbIntoScene(
                buf,
                sim.b64Data,
                sim.id,
                sim.name,
                {
                  position: sim.position,
                  rotationYDeg: sim.rotationYDeg,
                  scale: sim.scale
                },
                sim.subParts,
                restoredMats
              );
              if (mounted) {
                mounted.isParametric = Boolean(sim.isParametric);
                mounted.parametricConfig = sim.parametricConfig || null;
                restoredGlbs.push(mounted);
              }
            } catch (e) {
              console.warn('Failed to restore imported GLB:', e);
            }
          }
          setImportedModels(restoredGlbs);
          stateRef.current.importedModels = restoredGlbs;
          if (restoredGlbs.length > 0) {
            setSelectedGlbId(restoredGlbs[0].id);
            stateRef.current.selectedGlbId = restoredGlbs[0].id;
          }
        }
      }
      ctx.isRestoring = false;
      syncPartsMetaToReact();
      setLoading(false);

      // Register initial base state in undo/redo stack
      const baseSnap = captureSnapshotRef.current?.('Stare inițială');
      if (baseSnap) {
        historyRef.current = [baseSnap];
        historyIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
      }

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
      (ctx as any).setHoveredGroup3D = setHoveredGroup3D;

      hoverRaf = null;
      let lastPointerEvent = null;

      const runHoverCheck = () => {
        hoverRaf = null;
        if (!lastPointerEvent || disposed) return;
        const e = lastPointerEvent;

        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

        const {
          dimsEnabled: curDims,
          dimMode: curDimMode,
          paintModeActive: curPaint,
          placeOnSurfaceMode: curPlaceSurface,
          lang: curLang,
          materials: curMats,
          activeMatId: curActiveMatId
        } = stateRef.current;

        if ((curDims && curDimMode === 'tape') || curPlaceSurface) {
          renderer.domElement.style.cursor = 'crosshair';
          updateTooltipDOM(false);
          return;
        }

        raycaster.setFromCamera(pointer, camera);
        const targetList = curPaint
          ? paintableMeshes
          : [...importedMeshes, ...interactiveMeshes];
        const hits = raycaster.intersectObjects(targetList, false);

        if (hits.length > 0) {
          const hitMesh = hits[0].object;
          const gid = hitMesh.userData.groupId;
          const impId = hitMesh.userData.importedModelId;
          const dict = I18N[curLang] || I18N.ro;
          const activeMat =
            curMats.find((m) => m.id === curActiveMatId) || curMats[0] || null;
          const activeMatLabel = activeMat ? activeMat.name : 'Alb (Default)';

          if (impId && importedMap[impId]) {
            setHoveredGroup3D(null);
            renderer.domElement.style.cursor = 'pointer';
            const impEntry = stateRef.current.importedModels.find(
              (x) => x.id === impId
            );
            const impName = impEntry
              ? impEntry.name
              : importedMap[impId].name;
            const subIdx = hitMesh.userData.subMeshIdx;
            const sp =
              impEntry && impEntry.subParts ? impEntry.subParts[subIdx] : null;
            const hasMech = sp && sp.mechType && sp.mechType !== 'none';
            const mechLabel = hasMech ? dict[`mech_${sp.mechType}`] || '' : '';

            const dimsText = impEntry
              ? `📏 ${fmtCm(
                impEntry.baseDimsCm.w * impEntry.scale[0]
              )} × ${fmtCm(
                impEntry.baseDimsCm.h * impEntry.scale[1]
              )} × ${fmtCm(impEntry.baseDimsCm.d * impEntry.scale[2])} cm${mechLabel ? ` • ${mechLabel}` : ''
              }`
              : '';

            const subText = curPaint
              ? `${dict.clickToPaint}${activeMatLabel}`
              : hasMech
                ? sp.isOpen
                  ? dict.clickToClose
                  : dict.clickToOpen
                : 'Click pt. Selectare & Mutare 3D';

            updateTooltipDOM(
              true,
              e.clientX,
              e.clientY,
              hasMech ? `📦 ${impName} — ${sp.name}` : `📦 ${impName}`,
              dimsText,
              subText
            );
            return;
          } else if (interactiveMap[gid]) {
            setHoveredGroup3D(gid);
            if (curDims) update3DDimensionsDisplay(gid);
            const item = interactiveMap[gid];
            renderer.domElement.style.cursor = 'pointer';
            updateTooltipDOM(
              true,
              e.clientX,
              e.clientY,
              getSpecTitle(item.spec, curLang),
              `📏 ${formatPartDimsText(item.dimsCm, curLang)}`,
              curPaint
                ? `${dict.clickToPaint}${activeMatLabel}`
                : item.isOpen
                  ? dict.clickToClose
                  : dict.clickToOpen
            );
            return;
          } else if (curPaint && hitMesh.userData.staticZone) {
            setHoveredGroup3D(null);
            renderer.domElement.style.cursor = 'pointer';
            updateTooltipDOM(
              true,
              e.clientX,
              e.clientY,
              hitMesh.userData.staticZone.toUpperCase(),
              '',
              `${dict.clickToPaint}${activeMatLabel}`
            );
            return;
          }
        }

        setHoveredGroup3D(null);
        if (curDims) update3DDimensionsDisplay(ctx.selectedPartId);
        renderer.domElement.style.cursor = 'grab';
        updateTooltipDOM(false);
      };

      const onPointerMove = (e) => {
        if (e.pointerType === 'touch') return;
        lastPointerEvent = e;
        if (tooltipRef.current && tooltipRef.current.classList.contains('visible')) {
          tooltipRef.current.style.left = `${e.clientX}px`;
          tooltipRef.current.style.top = `${e.clientY}px`;
        }
        if (!hoverRaf) {
          hoverRaf = requestAnimationFrame(runHoverCheck);
        }
      };

      const onPointerDown = (e) => {
        if (hoverRaf) {
          cancelAnimationFrame(hoverRaf);
          hoverRaf = null;
        }
        updateTooltipDOM(false);
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
        if (transformControls.dragging) return;

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
            placeOnSurfaceMode: curPlaceSurface,
            selectedGlbId: curSelGlbId,
            materials: curMats,
            activeMatId: curActiveMatId,
            xrayActive: curXray,
            lang: curLang
          } = stateRef.current;

          // 0. Click-on-Surface to Place Selected .GLB Model
          if (curPlaceSurface && curSelGlbId && importedMap[curSelGlbId]) {
            const surfaceHits = raycaster.intersectObjects(
              [floorMesh, ...allKitchenMeshes],
              false
            );
            if (surfaceHits.length > 0) {
              const pt = surfaceHits[0].point;
              const nextPos = [
                Math.round(pt.x * 1000) / 1000,
                Math.round(Math.max(0, pt.y) * 1000) / 1000,
                Math.round(pt.z * 1000) / 1000
              ];
              importedMap[curSelGlbId].wrapperGroup.position.set(
                nextPos[0],
                nextPos[1],
                nextPos[2]
              );
              setImportedModels((prev) => {
                const updated = prev.map((im) =>
                  im.id === curSelGlbId ? { ...im, position: nextPos } : im
                );
                persistWorkspace({ importedModels: updated });
                return updated;
              });
              setPlaceOnSurfaceMode(false);
              showToast(
                `📍 Model plasat la X:${(nextPos[0] * 100).toFixed(
                  0
                )} Y:${(nextPos[1] * 100).toFixed(0)} Z:${(
                  nextPos[2] * 100
                ).toFixed(0)} cm`
              );
              pushHistoryRef.current?.('Plasare Model 3D');
            }
            return;
          }

          // 1. Tape Measure Mode
          if (curDims && curDimMode === 'tape') {
            const allHits = raycaster.intersectObjects(
              [...allKitchenMeshes, ...importedMeshes],
              false
            );
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

          // 2. 3D Click-to-Paint Mode (Works on both Kitchen & Imported .GLB Models!)
          if (curPaint) {
            const paintHits = raycaster.intersectObjects(paintableMeshes, false);
            if (paintHits.length > 0) {
              const hitMesh = paintHits[0].object;
              const gid = hitMesh.userData.groupId;
              const impId = hitMesh.userData.importedModelId;
              const subIdx = hitMesh.userData.subMeshIdx;
              const activeMat =
                curMats.find((m) => m.id === curActiveMatId) ||
                curMats[0] ||
                null;
              const dict = I18N[curLang] || I18N.ro;

              if (impId && importedMap[impId] && activeMat) {
                applyMatEntryToMesh(hitMesh, activeMat, curXray);
                setSelectedGlbId(impId);
                setImportedModels((prev) => {
                  const updated = prev.map((im) => {
                    if (im.id !== impId) return im;
                    const nextSubs = (im.subParts || []).map((sp) =>
                      sp.subIdx === subIdx
                        ? {
                          ...sp,
                          assignedMatId: activeMat.id,
                          colorHex: activeMat.colorHex || sp.colorHex
                        }
                        : sp
                    );
                    return { ...im, subParts: nextSubs };
                  });
                  persistWorkspace({ importedModels: updated });
                  return updated;
                });
                showToast(`🎨 ${dict.appliedToast}${activeMat.name}`);
                pushHistoryRef.current?.('Vopsire Model GLB');
              } else if (interactiveMap[gid] && activeMat) {
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
                pushHistoryRef.current?.('Vopsire ' + getSpecTitle(item.spec, curLang));
              } else if (hitMesh.userData.staticZone && activeMat) {
                const zKey = hitMesh.userData.staticZone;
                staticZoneAssignments[zKey] = activeMat.id;
                for (const m of staticTargets[zKey] || []) {
                  applyMatEntryToMesh(m, activeMat, curXray);
                }
                persistWorkspace();
                showToast(`🎨 ${dict.appliedToast}${activeMat.name}`);
                pushHistoryRef.current?.('Vopsire Zonă ' + zKey);
              }
            }
            return;
          }

          // 3. Normal Click: Check Imported .GLB Models first (Open/Close Door/Drawer or Select & Show 3D Gizmo), then Kitchen Doors/Drawers
          const hits = raycaster.intersectObjects(
            [...importedMeshes, ...interactiveMeshes],
            false
          );
          if (hits.length > 0) {
            const hitObj = hits[0].object;
            if (hitObj.userData.importedModelId) {
              const impId = hitObj.userData.importedModelId;
              const clickedSubIdx = hitObj.userData.subMeshIdx;
              setSelectedGlbId(impId);
              if (!stateRef.current.gizmoMode) {
                setGizmoMode('translate');
              }

              const parsedEntry = importedMap[impId];
              const impRecord = stateRef.current.importedModels.find(
                (x) => x.id === impId
              );
              if (parsedEntry && impRecord && Array.isArray(impRecord.subParts)) {
                const followers = buildFollowerMap(
                  parsedEntry.meshes,
                  impRecord.subParts
                );
                const targetSubIdx =
                  impRecord.subParts[clickedSubIdx]?.mechType &&
                    impRecord.subParts[clickedSubIdx].mechType !== 'none'
                    ? clickedSubIdx
                    : followers[clickedSubIdx] !== undefined
                      ? followers[clickedSubIdx]
                      : null;

                if (targetSubIdx !== null && parsedEntry.meshes[targetSubIdx]) {
                  const curSp = impRecord.subParts[targetSubIdx];
                  const nextOpen = !curSp.isOpen;
                  parsedEntry.meshes[targetSubIdx].userData.mechTarget = nextOpen
                    ? 1
                    : 0;
                  setImportedModels((prev) => {
                    const updated = prev.map((im) => {
                      if (im.id !== impId) return im;
                      const nextSubs = (im.subParts || []).map((sp) =>
                        sp.subIdx === targetSubIdx
                          ? { ...sp, isOpen: nextOpen }
                          : sp
                      );
                      return { ...im, subParts: nextSubs };
                    });
                    persistWorkspace({ importedModels: updated });
                    return updated;
                  });
                  pushHistoryRef.current?.('Comutare Ușă/Sertar GLB');
                }
              }
              return;
            }
            const gid = hitObj.userData.groupId;
            if ((ctx as any).toggleInteractivePart) {
              (ctx as any).toggleInteractivePart(gid, null, true);
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

        // Animate Imported .GLB Mechanisms & Native glTF Animations
        let anyGlbAnimating = false;
        for (const impId in importedMap) {
          const entry = importedMap[impId];
          if (entry.mixer) {
            entry.mixer.update(dt);
            anyGlbAnimating = true;
          }
          let glbMechChanged = false;
          for (const m of entry.meshes) {
            const prog = m.userData.mechProgress || 0;
            const targ = m.userData.mechTarget || 0;
            if (Math.abs(prog - targ) > 0.0005) {
              if (prog < targ) {
                m.userData.mechProgress = Math.min(1, prog + speed * dt);
              } else {
                m.userData.mechProgress = Math.max(0, prog - speed * dt);
              }
              glbMechChanged = true;
              anyGlbAnimating = true;
            }
          }
          if (glbMechChanged) {
            const impRec = stateRef.current.importedModels.find(
              (x) => x.id === impId
            );
            if (impRec && impRec.subParts) {
              updateGlbMechanismsIn3D(entry, impRec.subParts);
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

        if (
          activePartAnimating ||
          anyGlbAnimating ||
          transformControls.dragging ||
          ctx.needsShadowUpdate
        ) {
          renderer.shadowMap.needsUpdate = true;
          ctx.needsShadowUpdate = false;
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animFrameId = requestAnimationFrame(animate);
    }

    initScene();

    return () => {
      disposed = true;
      if (hoverRaf) cancelAnimationFrame(hoverRaf);
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [
    applyMatEntryToMesh,
    mountParsedGlbIntoScene,
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
    (id, forceState = null, withToast = false, skipHistory = false) => {
      const ctx = sceneRef.current;
      if (!ctx || !ctx.interactiveMap[id]) return;

      const item = ctx.interactiveMap[id];
      ctx.selectedPartId = id;
      const nextOpen = forceState !== null ? forceState : !item.isOpen;
      item.isOpen = nextOpen;
      item.target = nextOpen ? 1 : 0;

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
          `${getSpecTitle(item.spec, stateRef.current.lang)}${dimInfo}: ${nextOpen ? dict.statusOpen : dict.statusClosed
          }`
        );
      }

      syncPartsMetaToReact();
      persistWorkspace();
      if (!skipHistory) {
        pushHistoryRef.current?.(`${nextOpen ? 'Deschide' : 'Închide'} ${getSpecTitle(item.spec, stateRef.current.lang)}`);
      }
    },
    [persistWorkspace, showToast, syncPartsMetaToReact, update3DDimensionsDisplay]
  );

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.toggleInteractivePart = toggleInteractivePart;
    }
  }, [toggleInteractivePart, loading]);

  // ============================================================================
  // IMPORTED .GLB MODELS HANDLERS (Import, Transform, Resize, Paint & Delete)
  // ============================================================================
  const handleImportGlbFiles = (files) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const arrayBuffer = ev.target.result;
          const b64Data = arrayBufferToBase64(arrayBuffer);
          const cleanName =
            file.name.replace(/\.[^/.]+$/, '').slice(0, 26) || 'Model 3D';
          const newId =
            'glb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

          // Offset position slightly if multiple models are imported
          const count = stateRef.current.importedModels.length;
          const initPos = [1.85 + count * 0.35, 0.0, 2.15];

          const mounted = await mountParsedGlbIntoScene(
            arrayBuffer,
            b64Data,
            newId,
            cleanName,
            { position: initPos, rotationYDeg: 0, scale: [1.0, 1.0, 1.0] },
            null,
            stateRef.current.materials
          );
          if (!mounted) return;

          glbBinaryCacheRef.current.set(newId, b64Data);
          setImportedModels((prev) => {
            const updated = [...prev, mounted];
            setSelectedGlbId(newId);
            setGizmoMode('translate');
            persistWorkspace({ importedModels: updated });
            return updated;
          });
          pushHistoryRef.current?.('Import ' + cleanName);
          showToast(`📦 Model .GLB importat: ${cleanName}`);
        } catch (err) {
          console.error('Error importing GLB:', err);
          showToast('❌ Eroare la citirea fișierului .GLB');
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleMountGeneratedFurniture = async (
    glbBuffer,
    b64Data,
    furnId,
    furnName,
    initTransform,
    furnitureConfig
  ) => {
    try {
      const mounted = await mountParsedGlbIntoScene(
        glbBuffer,
        b64Data,
        furnId,
        furnName,
        initTransform,
        null,
        stateRef.current.materials
      );
      if (!mounted) return;

      glbBinaryCacheRef.current.set(furnId, b64Data);
      mounted.isUniversalFurniture = true;
      mounted.furnitureConfig = furnitureConfig;

      setImportedModels((prev) => {
        const updated = [...prev, mounted];
        setSelectedGlbId(furnId);
        setGizmoMode('translate');
        persistWorkspace({ importedModels: updated });
        return updated;
      });

      pushHistoryRef.current?.('Generare mobilier ' + furnName);
      showToast(
        lang === 'ro'
          ? `🛋️ Piesa "${furnName}" adăugată în scenă!`
          : lang === 'ru'
            ? `🛋️ Изделие "${furnName}" создано в 3D!`
            : `🛋️ Item "${furnName}" created in 3D!`
      );
    } catch (err) {
      console.error('Error mounting generated universal furniture:', err);
      showToast('❌ Eroare la generarea mobilierului');
    }
  };

  const handleMountGeneratedKitchen = async (
    glbBuffer,
    b64Data,
    kitchenId,
    kitchenName,
    initTransform,
    kitchenConfig
  ) => {
    try {
      const mounted = await mountParsedGlbIntoScene(
        glbBuffer,
        b64Data,
        kitchenId,
        kitchenName,
        initTransform,
        null,
        stateRef.current.materials
      );
      if (!mounted) return;

      glbBinaryCacheRef.current.set(kitchenId, b64Data);
      mounted.isModularKitchen = true;
      mounted.kitchenConfig = kitchenConfig;

      setImportedModels((prev) => {
        const filtered = prev.filter((m) => !m.isModularKitchen);
        const updated = [...filtered, mounted];
        setSelectedGlbId(kitchenId);
        setGizmoMode('translate');
        persistWorkspace({ importedModels: updated });
        return updated;
      });

      pushHistoryRef.current?.('Generare bucătărie ' + kitchenName);
      showToast(
        lang === 'ro'
          ? `🏛️ Bucătărie Modulară CAD generată cu succes!`
          : lang === 'ru'
            ? `🏛️ Модульная кухня CAD успешно сгенерирована!`
            : `🏛️ Modular Kitchen CAD generated successfully!`
      );
    } catch (err) {
      console.error('Error mounting generated modular kitchen:', err);
      showToast('❌ Eroare la generarea bucătăriei');
    }
  };

  const handleMountGeneratedCabinet = async (
    glbBuffer,
    b64Data,
    modelId,
    modelName,
    initTransform,
    parametricConfig
  ) => {
    try {
      const mounted = await mountParsedGlbIntoScene(
        glbBuffer,
        b64Data,
        modelId,
        modelName,
        initTransform,
        null,
        stateRef.current.materials
      );
      if (!mounted) return;

      glbBinaryCacheRef.current.set(modelId, b64Data);
      mounted.isParametric = true;
      mounted.parametricConfig = parametricConfig;

      setImportedModels((prev) => {
        const updated = [...prev, mounted];
        setSelectedGlbId(modelId);
        setGizmoMode('translate');
        persistWorkspace({ importedModels: updated });
        return updated;
      });

      pushHistoryRef.current?.('Adăugare corp ' + modelName);
      showToast(
        lang === 'ro'
          ? `📐 Corp generat: ${modelName}`
          : lang === 'ru'
            ? `📐 Шкаф создан: ${modelName}`
            : `📐 Cabinet created: ${modelName}`
      );
    } catch (err) {
      console.error('Error mounting generated cabinet:', err);
      showToast('❌ Eroare la generarea corpului');
    }
  };

  const handleCaptureScreenshot = (onlyReturnData = false) => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.renderer) return null;

    if (ctx.transformControls) ctx.transformControls.visible = false;
    ctx.renderer.render(ctx.scene, ctx.camera);
    const dataUrl = ctx.renderer.domElement.toDataURL('image/png');
    if (ctx.transformControls) ctx.transformControls.visible = true;

    if (onlyReturnData) {
      return dataUrl;
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `3design_randare_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(
      lang === 'ro'
        ? '📸 Poză HD salvată!'
        : lang === 'ru'
          ? '📸 HD рендер сохранен!'
          : '📸 HD Render downloaded!'
    );
    return dataUrl;
  };

  const handleDeleteGlb = (modelId) => {
    const ctx = sceneRef.current;
    if (ctx && ctx.importedMap[modelId]) {
      const entry = ctx.importedMap[modelId];
      if (ctx.transformControls.object === entry.wrapperGroup) {
        ctx.transformControls.detach();
        ctx.transformControls.visible = false;
      }
      disposeModelHierarchy(entry.wrapperGroup);
      ctx.importedRootGroup.remove(entry.wrapperGroup);
      ctx.needsShadowUpdate = true;
      ctx.importedMeshes = ctx.importedMeshes.filter(
        (m) => m.userData.importedModelId !== modelId
      );
      ctx.paintableMeshes = ctx.paintableMeshes.filter(
        (m) => m.userData.importedModelId !== modelId
      );
      delete ctx.importedMap[modelId];
    }

    setImportedModels((prev) => {
      const updated = prev.filter((im) => im.id !== modelId);
      if (selectedGlbId === modelId) {
        setSelectedGlbId(updated[0] ? updated[0].id : null);
      }
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Ștergere Model GLB');
  };

  const handleDuplicateGlb = async (modelId) => {
    const src = importedModels.find((im) => im.id === modelId);
    if (!src || !src.b64Data) return;
    const buf = base64ToArrayBuffer(src.b64Data);
    const newId = 'glb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const nextPos = [
      src.position[0] + 0.35,
      src.position[1],
      src.position[2]
    ];
    const mounted = await mountParsedGlbIntoScene(
      buf,
      src.b64Data,
      newId,
      `${src.name} (Copie)`,
      {
        position: nextPos,
        rotationYDeg: src.rotationYDeg,
        scale: [...src.scale]
      },
      src.subParts,
      materials
    );
    if (!mounted) return;
    glbBinaryCacheRef.current.set(newId, src.b64Data);
    setImportedModels((prev) => {
      const updated = [...prev, mounted];
      setSelectedGlbId(newId);
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Duplicare ' + src.name);
    showToast(`📋 Duplicat: ${src.name}`);
  };

  const handleUpdateGlbTransform = (modelId, changes) => {
    const ctx = sceneRef.current;
    setImportedModels((prev) => {
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const nextPos = changes.position ?? im.position;
        const nextRot = changes.rotationYDeg ?? im.rotationYDeg;
        const nextScale = changes.scale ?? im.scale;

        if (ctx && ctx.importedMap[modelId]) {
          const wg = ctx.importedMap[modelId].wrapperGroup;
          wg.position.set(nextPos[0], nextPos[1], nextPos[2]);
          wg.rotation.set(0, THREE.MathUtils.degToRad(nextRot), 0);
          wg.scale.set(nextScale[0], nextScale[1], nextScale[2]);
        }

        return {
          ...im,
          position: nextPos,
          rotationYDeg: nextRot,
          scale: nextScale
        };
      });
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Transformare GLB', true);
  };

  const handlePaintWholeGlbWithActiveMat = (modelId) => {
    const ctx = sceneRef.current;
    const activeMat =
      materials.find((m) => m.id === activeMatId) || materials[0] || null;
    if (!ctx || !activeMat || !ctx.importedMap[modelId]) return;

    const entry = ctx.importedMap[modelId];
    for (const m of entry.meshes) {
      applyMatEntryToMesh(m, activeMat, xrayActive);
    }

    setImportedModels((prev) => {
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const nextSubs = (im.subParts || []).map((sp) => ({
          ...sp,
          assignedMatId: activeMat.id,
          colorHex: activeMat.colorHex || sp.colorHex
        }));
        return { ...im, subParts: nextSubs };
      });
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Vopsire Model GLB');
    showToast(`🎨 ${entry.name} → ${activeMat.name}`);
  };

  const handleColorWholeGlb = (modelId, hexColor) => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.importedMap[modelId]) return;
    const entry = ctx.importedMap[modelId];
    for (const m of entry.meshes) {
      m.material.map = null;
      m.material.color.set(hexColor);
      m.material.userData.assignedMatId = null;
      m.material.needsUpdate = true;
    }

    setImportedModels((prev) => {
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const nextSubs = (im.subParts || []).map((sp) => ({
          ...sp,
          assignedMatId: null,
          colorHex: hexColor
        }));
        return { ...im, subParts: nextSubs };
      });
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Culoare Model GLB');
  };

  const handleResetGlbMaterials = (modelId) => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.importedMap[modelId]) return;
    const entry = ctx.importedMap[modelId];
    for (const m of entry.meshes) {
      if (m.userData.originalGlbMaterial) {
        m.material = m.userData.originalGlbMaterial.clone();
        m.material.needsUpdate = true;
      }
    }

    setImportedModels((prev) => {
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const nextSubs = (im.subParts || []).map((sp, idx) => {
          const mesh = entry.meshes[idx];
          const origHex =
            mesh && mesh.material && mesh.material.color
              ? '#' + mesh.material.color.getHexString()
              : '#e5e7eb';
          return {
            ...sp,
            assignedMatId: null,
            colorHex: origHex
          };
        });
        return { ...im, subParts: nextSubs };
      });
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Reset Materiale GLB');
    showToast('🔄 Materialele originale .GLB au fost restaurate');
  };

  const handlePaintGlbSubMeshWithActiveMat = (modelId, subIdx) => {
    const ctx = sceneRef.current;
    const activeMat =
      materials.find((m) => m.id === activeMatId) || materials[0] || null;
    if (!ctx || !activeMat || !ctx.importedMap[modelId]) return;

    const entry = ctx.importedMap[modelId];
    const mesh = entry.meshes[subIdx];
    if (mesh) {
      applyMatEntryToMesh(mesh, activeMat, xrayActive);
    }

    setImportedModels((prev) => {
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const nextSubs = (im.subParts || []).map((sp) =>
          sp.subIdx === subIdx
            ? {
              ...sp,
              assignedMatId: activeMat.id,
              colorHex: activeMat.colorHex || sp.colorHex
            }
            : sp
        );
        return { ...im, subParts: nextSubs };
      });
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Vopsire Sub-piesă GLB');
    showToast(`🎨 Sub-piesă → ${activeMat.name}`);
  };

  const handleColorGlbSubMesh = (modelId, subIdx, hexColor) => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.importedMap[modelId]) return;
    const entry = ctx.importedMap[modelId];
    const mesh = entry.meshes[subIdx];
    if (mesh) {
      mesh.material.map = null;
      mesh.material.color.set(hexColor);
      mesh.material.userData.assignedMatId = null;
      mesh.material.needsUpdate = true;
    }

    setImportedModels((prev) => {
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const nextSubs = (im.subParts || []).map((sp) =>
          sp.subIdx === subIdx
            ? { ...sp, assignedMatId: null, colorHex: hexColor }
            : sp
        );
        return { ...im, subParts: nextSubs };
      });
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Culoare Sub-piesă GLB');
  };

  // Furniture Mechanism Handlers for Imported .GLB Models
  const handleSetGlbSubMeshMechanism = (modelId, subIdx, mechType) => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.importedMap[modelId]) return;
    const entry = ctx.importedMap[modelId];
    const mesh = entry.meshes[subIdx];

    setImportedModels((prev) => {
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const nextSubs = (im.subParts || []).map((sp) => {
          if (sp.subIdx !== subIdx) return sp;
          const nextOpen = mechType === 'none' ? false : sp.isOpen;
          if (mesh) {
            mesh.userData.mechTarget = nextOpen ? 1 : 0;
            if (mechType === 'none') mesh.userData.mechProgress = 0;
          }
          return { ...sp, mechType, isOpen: nextOpen };
        });
        updateGlbMechanismsIn3D(entry, nextSubs);
        return { ...im, subParts: nextSubs };
      });
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Mecanism GLB ' + mechType);
  };

  const handleToggleGlbSubMeshOpen = (modelId, subIdx, forceState = null) => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.importedMap[modelId]) return;
    const entry = ctx.importedMap[modelId];

    setImportedModels((prev) => {
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const nextSubs = (im.subParts || []).map((sp) => {
          if (sp.subIdx !== subIdx) return sp;
          const nextOpen =
            typeof forceState === 'boolean' ? forceState : !sp.isOpen;
          if (entry.meshes[subIdx]) {
            entry.meshes[subIdx].userData.mechTarget = nextOpen ? 1 : 0;
          }
          return { ...sp, isOpen: nextOpen };
        });
        return { ...im, subParts: nextSubs };
      });
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Comutare Ușă/Sertar GLB');
  };

  const handleToggleAllGlbParts = (modelId, openState) => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.importedMap[modelId]) return;
    const entry = ctx.importedMap[modelId];

    setImportedModels((prev) => {
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const nextSubs = (im.subParts || []).map((sp) => {
          const hasMech = sp.mechType && sp.mechType !== 'none';
          const nextOpen = hasMech ? Boolean(openState) : false;
          if (entry.meshes[sp.subIdx]) {
            entry.meshes[sp.subIdx].userData.mechTarget = nextOpen ? 1 : 0;
          }
          return { ...sp, isOpen: nextOpen };
        });
        return { ...im, subParts: nextSubs };
      });
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.(openState ? 'Deschide Tot GLB' : 'Închide Tot GLB');
  };

  const handleAutoDetectGlbMechanisms = (modelId) => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.importedMap[modelId]) return;
    const entry = ctx.importedMap[modelId];
    setImportedModels((prev) => {
      let detectedCount = 0;
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const autoSubs = autoDetectGlbMechanisms(
          entry.meshes,
          im.subParts || entry.subPartsMeta,
          entry.baseDimsCm
        );
        autoSubs.forEach((sp, idx) => {
          if (sp.mechType && sp.mechType !== 'none') detectedCount++;
          if (entry.meshes[idx]) {
            entry.meshes[idx].userData.mechTarget = 0;
            entry.meshes[idx].userData.mechProgress = 0;
          }
        });
        updateGlbMechanismsIn3D(entry, autoSubs);
        return { ...im, subParts: autoSubs };
      });
      persistWorkspace({ importedModels: updated });
      showToast(`${dict.mechDetectedToast}${detectedCount}`);
      return updated;
    });
    pushHistoryRef.current?.('Auto-detectare Mecanisme GLB');
  };

  const handleClearGlbMechanisms = (modelId) => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.importedMap[modelId]) return;
    const entry = ctx.importedMap[modelId];

    setImportedModels((prev) => {
      const updated = prev.map((im) => {
        if (im.id !== modelId) return im;
        const clearedSubs = (im.subParts || []).map((sp, idx) => {
          if (entry.meshes[idx]) {
            entry.meshes[idx].userData.mechTarget = 0;
            entry.meshes[idx].userData.mechProgress = 0;
          }
          return { ...sp, mechType: 'none', isOpen: false };
        });
        updateGlbMechanismsIn3D(entry, clearedSubs);
        return { ...im, subParts: clearedSubs };
      });
      persistWorkspace({ importedModels: updated });
      return updated;
    });
    pushHistoryRef.current?.('Blocare Mecanisme GLB');
  };

  const handleToggleNativeGlbAnimation = (modelId) => {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.importedMap[modelId]) return;
    const entry = ctx.importedMap[modelId];
    if (!entry.animActions || entry.animActions.length === 0) return;

    entry.nativeAnimOpen = !entry.nativeAnimOpen;
    for (const action of entry.animActions) {
      action.paused = false;
      action.timeScale = entry.nativeAnimOpen ? 1 : -1;
      if (!action.isRunning()) {
        action.play();
      }
    }
  };

  // Quick Actions Handlers
  const handleOpenAll = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.payload.specs.forEach((s) => toggleInteractivePart(s.id, true, false, true));
    pushHistoryRef.current?.('Deschide Tot');
  };

  const handleCloseAll = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.payload.specs.forEach((s) => toggleInteractivePart(s.id, false, false, true));
    pushHistoryRef.current?.('Închide Tot');
  };

  const handleToggleDrawers = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const drawerSpecs = ctx.payload.specs.filter(
      (s) => s.category === 'drawer'
    );
    const anyClosed = drawerSpecs.some((s) => !ctx.interactiveMap[s.id].isOpen);
    drawerSpecs.forEach((s) => toggleInteractivePart(s.id, anyClosed, false, true));
    pushHistoryRef.current?.('Comută Sertare');
  };

  const handleToggleDoors = () => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const doorSpecs = ctx.payload.specs.filter((s) => s.category !== 'drawer');
    const anyClosed = doorSpecs.some((s) => !ctx.interactiveMap[s.id].isOpen);
    doorSpecs.forEach((s) => toggleInteractivePart(s.id, anyClosed, false, true));
    pushHistoryRef.current?.('Comută Uși');
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
          pushHistoryRef.current?.('Upload Textură: ' + cleanName);
          showToast(`📸 Textură încărcată: ${cleanName}`);
        };
        img.src = (ev.target?.result as string) || '';
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
    pushHistoryRef.current?.('Adăugare Culoare ' + hex.toUpperCase());
    showToast(`🎨 Culoare adăugată: ${hex.toUpperCase()}`);
  };

  const handleDeleteMaterial = (matId) => {
    const ctx = sceneRef.current;
    setMaterials((prev) => {
      const target = prev.find((m) => m.id === matId);
      if (target && target.texture) target.texture.dispose();
      const next = prev.filter((m) => m.id !== matId);

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
        for (const m of ctx.importedMeshes) {
          if (m.material.userData.assignedMatId === matId) {
            applyDefaultWhiteToMesh(m, xrayActive);
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
    pushHistoryRef.current?.('Ștergere Material');
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
    pushHistoryRef.current?.('Reset Mobilier la Alb');
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
    pushHistoryRef.current?.('Șterge Toate Materialele');
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
    pushHistoryRef.current?.('Proprietate Material', prop === 'scale');
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
    pushHistoryRef.current?.('Vopsire ' + getSpecTitle(item.spec, lang));
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
      ['door_oak_top_l', 'door_oak_top_r'].forEach((id) => assignPart(id));
    } else if (zoneKey === 'vitrine_body') {
      ['door_oak_bot_l', 'door_oak_bot_r'].forEach((id) => assignPart(id));
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
    pushHistoryRef.current?.('Aplicare Zonă ' + zoneKey);
    showToast(`🎨 ${dict.appliedToast}${activeMat.name}`);
  };

  // Lighting Studio Handlers
  const handleChangeLightState = (partial, isContinuous = true) => {
    setLightState((prev) => {
      const next = { ...prev, ...partial };
      persistWorkspace({ lightState: next });
      return next;
    });
    pushHistoryRef.current?.('Iluminare', isContinuous);
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

  const handleNewProject = useCallback(() => {
    const confirmMsg =
      lang === 'ro'
        ? 'Dorești să creezi un proiect nou? Scena curentă va fi curățată.'
        : lang === 'ru'
          ? 'Создать новый проект? Текущая сцена будет очищена.'
          : 'Create a new project? The current scene will be cleared.';

    if (!window.confirm(confirmMsg)) return;

    if (sceneRef.current) {
      for (const m of stateRef.current.importedModels) {
        disposeModelHierarchy(m.id, sceneRef.current);
      }
      if (sceneRef.current.appliancesRootGroup) {
        while (sceneRef.current.appliancesRootGroup.children.length > 0) {
          sceneRef.current.appliancesRootGroup.remove(sceneRef.current.appliancesRootGroup.children[0]);
        }
      }
      if (sceneRef.current.roomRoot) {
        sceneRef.current.scene.remove(sceneRef.current.roomRoot);
        const cleanRoom = buildArchitecturalRoom(DEFAULT_ROOM_CONFIG);
        sceneRef.current.scene.add(cleanRoom);
        sceneRef.current.roomRoot = cleanRoom;
        sceneRef.current.needsShadowUpdate = true;
      }
    }

    setImportedModels([]);
    setSelectedGlbId(null);
    setAppliances([]);
    setSelectedApplianceId(null);
    setRoomConfig(DEFAULT_ROOM_CONFIG);
    historyRef.current = [];
    historyIndexRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);

    persistWorkspace({
      importedModels: [],
      selectedGlbId: null,
      appliances: [],
      roomConfig: DEFAULT_ROOM_CONFIG
    });

    showToast(
      lang === 'ro'
        ? '🆕 Proiect nou creat! Spațiul arhitectural este pregătit.'
        : lang === 'ru'
          ? '🆕 Новый проект создан! Пространство готово.'
          : '🆕 New project created! Architectural space is ready.'
    );
  }, [lang, persistWorkspace, showToast]);

  const handleSaveProject = useCallback(() => {
    const projectData = {
      format: '3design_cad_project',
      version: '2.0',
      savedAt: new Date().toISOString(),
      lang,
      roomConfig: stateRef.current.roomConfig,
      appliances: stateRef.current.appliances,
      activeMatId,
      materials,
      lightState,
      importedModels: stateRef.current.importedModels
    };

    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proiect-cad-mobilier-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);

    showToast(
      lang === 'ro'
        ? '💾 Proiectul CAD a fost salvat și descărcat (.json)!'
        : lang === 'ru'
          ? '💾 Проект CAD сохранен и скачан (.json)!'
          : '💾 CAD Project saved and downloaded (.json)!'
    );
  }, [lang, activeMatId, materials, lightState, showToast]);

  const handleLoadProject = useCallback(async (file: File) => {
    try {
      const lowerName = file.name.toLowerCase();
      // If user selected a .glb / .gltf 3D model directly from Project menu
      if (lowerName.endsWith('.glb') || lowerName.endsWith('.gltf')) {
        await handleImportGlbFiles([file]);
        showToast(
          lang === 'ro'
            ? `📦 Model 3D (${file.name}) importat cu succes!`
            : `📦 3D Model (${file.name}) imported successfully!`
        );
        return;
      }

      const text = await file.text();
      const proj = JSON.parse(text);
      if (!proj || (!proj.format && !proj.importedModels)) {
        alert('Fișier invalid. Alege un fișier de tip .json, .cadproj sau .glb');
        return;
      }

      if (sceneRef.current) {
        for (const m of stateRef.current.importedModels) {
          disposeModelHierarchy(m.id, sceneRef.current);
        }
      }

      if (proj.roomConfig) {
        handleChangeRoomConfig(proj.roomConfig);
      }
      if (Array.isArray(proj.appliances)) {
        setAppliances(proj.appliances);
        if (sceneRef.current?.appliancesRootGroup) {
          while (sceneRef.current.appliancesRootGroup.children.length > 0) {
            sceneRef.current.appliancesRootGroup.remove(sceneRef.current.appliancesRootGroup.children[0]);
          }
          for (const app of proj.appliances) {
            const mesh = buildAppliance3DModel(app);
            sceneRef.current.appliancesRootGroup.add(mesh);
          }
        }
      }

      if (Array.isArray(proj.materials)) {
        setMaterials(proj.materials);
      }
      if (proj.activeMatId) {
        setActiveMatId(proj.activeMatId);
      }
      if (proj.lightState) {
        setLightState(proj.lightState);
      }

      if (Array.isArray(proj.importedModels)) {
        setImportedModels(proj.importedModels);
        for (const m of proj.importedModels) {
          const b64 = m.b64Data || glbBinaryCacheRef.current.get(m.id);
          if (b64 && sceneRef.current) {
            const buf = base64ToArrayBuffer(b64);
            await mountParsedGlbIntoScene(
              buf,
              b64,
              m.id,
              m.name,
              { position: m.position, rotationYDeg: m.rotationYDeg, scale: m.scale },
              m.subParts,
              proj.materials || stateRef.current.materials
            );
          }
        }
      }

      persistWorkspace({
        importedModels: proj.importedModels || [],
        roomConfig: proj.roomConfig || DEFAULT_ROOM_CONFIG, appliances: proj.appliances || []
      });

      showToast('📥 Proiect încărcat cu succes!');
    } catch (err) {
      console.error('Error loading project:', err);
      alert('Eroare la încărcarea fișierului: ' + err.message);
    }
  }, [persistWorkspace, showToast]);

  const handleToggleRoomWalls = useCallback(() => {
    setRoomWallsActive((prev) => {
      const next = !prev;
      if (sceneRef.current?.roomWallsGroup) {
        sceneRef.current.roomWallsGroup.visible = next;
        sceneRef.current.needsShadowUpdate = true;
      }
      showToast(
        next
          ? (lang === 'ro' ? '🧱 Pereți cameră: ACTIVAT' : lang === 'ru' ? '🧱 Стены комнаты: ВКЛ' : '🧱 Room walls: ON')
          : (lang === 'ro' ? '🧱 Pereți cameră: DEZACTIVAT' : lang === 'ru' ? '🧱 Стены комнаты: ВЫКЛ' : '🧱 Room walls: OFF')
      );
      return next;
    });
  }, [lang, showToast]);

  const handleExportFullSceneGlb = useCallback(async () => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    try {
      showToast(
        lang === 'ro'
          ? '⏳ Se exportă scena 3D în format .GLB...'
          : lang === 'ru'
            ? '⏳ Экспорт 3D сцены в .GLB...'
            : '⏳ Exporting 3D scene to .GLB...'
      );

      const toExport = [];
      if (ctx.roomRoot) {
        toExport.push(ctx.roomRoot);
      }
      if (ctx.importedRootGroup && ctx.importedRootGroup.children.length > 0) {
        toExport.push(ctx.importedRootGroup);
      }
      if (ctx.appliancesRootGroup && ctx.appliancesRootGroup.children.length > 0) {
        toExport.push(ctx.appliancesRootGroup);
      }

      if (toExport.length === 0) {
        showToast(
          lang === 'ro'
            ? '⚠️ Scena este goală, nu există mobilier de exportat'
            : lang === 'ru'
              ? '⚠️ Сцена пуста'
              : '⚠️ Scene is empty'
        );
        return;
      }

      const buffer = await exportToGlbArrayBuffer(toExport);
      const blob = new Blob([buffer as BlobPart], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `3design_scena_${new Date().toISOString().slice(0, 10)}.glb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(
        lang === 'ro'
          ? '📦 Scena completă a fost exportată (.glb)!'
          : lang === 'ru'
            ? '📦 Сцена успешно экспортирована (.glb)!'
            : '📦 Full scene exported to .GLB!'
      );
    } catch (err) {
      console.error('Error exporting scene GLB:', err);
      showToast(
        lang === 'ro'
          ? '❌ Eroare la exportarea scenei GLB'
          : lang === 'ru'
            ? '❌ Ошибка экспорта сцены в GLB'
            : '❌ Error exporting scene to GLB'
      );
    }
  }, [lang, showToast]);

  const handleChangeRoomConfig = useCallback((newConfig: RoomConfig) => {
    setRoomConfig(newConfig);
    stateRef.current.roomConfig = newConfig;

    const ctx = sceneRef.current;
    if (ctx && ctx.scene) {
      if (ctx.roomRoot) {
        ctx.scene.remove(ctx.roomRoot);
      }
      const newRoomRoot = buildArchitecturalRoom(newConfig);
      ctx.scene.add(newRoomRoot);
      ctx.roomRoot = newRoomRoot;
      ctx.needsShadowUpdate = true;
    }

    persistWorkspace({ roomConfig: newConfig });
  }, [persistWorkspace]);

  const handleAddAppliance = useCallback((def: ApplianceDefinition, finish: string) => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    const id = `app_${Date.now()}`;
    let pos = { x: (roomConfig.widthCm / 100) / 2, y: 0.85, z: (roomConfig.lengthCm / 100) / 2 };
    if (stateRef.current.selectedGlbId) {
      const selectedModel = stateRef.current.importedModels.find((m: any) => m.id === stateRef.current.selectedGlbId);
      if (selectedModel && selectedModel.position) {
        pos = {
          x: selectedModel.position[0],
          y: selectedModel.position[1] + (def.mountingType === 'countertop_cutout' ? 0.85 : 0.4),
          z: selectedModel.position[2]
        };
      }
    }

    const instance: ApplianceInstance = {
      id,
      type: def.type,
      name: lang === 'ro' ? def.nameRo : lang === 'ru' ? def.nameRu : def.nameEn,
      position: pos,
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { ...def.defaultDimensions },
      finish,
      powerKw: def.powerKw
    };

    const meshGroup = buildAppliance3DModel(instance);
    ctx.appliancesRootGroup.add(meshGroup);

    setAppliances((prev) => {
      const updated = [...prev, instance];
      persistWorkspace({ appliances: updated });
      return updated;
    });

    setSelectedApplianceId(id);
    setSelectedGlbId(null);
    ctx.transformControls.attach(meshGroup);
    ctx.transformControls.visible = true;

    showToast(
      lang === 'ro'
        ? `🍳 ${instance.name} adăugat în proiect!`
        : `🍳 ${instance.name} added to scene!`
    );
  }, [lang, roomConfig, persistWorkspace, showToast]);

  const handleDeleteAppliance = useCallback((id: string) => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    const meshGroup = ctx.appliancesRootGroup.children.find((c: any) => c.userData?.applianceId === id);
    if (meshGroup) {
      if (ctx.transformControls.object === meshGroup) {
        ctx.transformControls.detach();
        ctx.transformControls.visible = false;
      }
      ctx.appliancesRootGroup.remove(meshGroup);
    }

    setAppliances((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      persistWorkspace({ appliances: updated });
      return updated;
    });
    if (selectedApplianceId === id) {
      setSelectedApplianceId(null);
    }
  }, [selectedApplianceId, persistWorkspace]);

  const handleSelectAppliance = useCallback((id: string | null) => {
    setSelectedApplianceId(id);
    const ctx = sceneRef.current;
    if (!ctx) return;

    if (!id) {
      if (selectedApplianceId) {
        ctx.transformControls.detach();
        ctx.transformControls.visible = false;
      }
      return;
    }

    setSelectedGlbId(null);
    const meshGroup = ctx.appliancesRootGroup.children.find((c: any) => c.userData?.applianceId === id);
    if (meshGroup) {
      ctx.transformControls.attach(meshGroup);
      ctx.transformControls.visible = true;
    }
  }, [selectedApplianceId]);

  useEffect(() => {
    if (is2DPlanMode && planCanvasRef.current) {
      drawArchitecturalFloorPlan(
        planCanvasRef.current,
        roomConfig,
        importedModels,
        appliances
      );
    }
  }, [is2DPlanMode, roomConfig, importedModels, appliances]);

  const handleDownload2DPlanPng = useCallback(() => {
    if (!planCanvasRef.current) return;
    const dataUrl = planCanvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `schita_2d_plan_${Date.now()}.png`;
    a.click();
  }, []);

  const handleToggleFasteners3d = useCallback(() => {
    setShowFasteners3d((prev) => {
      const next = !prev;
      const ctx = sceneRef.current;
      if (!ctx || !ctx.fastenersRootGroup) return next;

      while (ctx.fastenersRootGroup.children.length > 0) {
        const c = ctx.fastenersRootGroup.children[0];
        ctx.fastenersRootGroup.remove(c);
      }

      if (next) {
        stateRef.current.importedModels.forEach((m) => {
          const entry = ctx.importedMap[m.id];
          if (!entry || !entry.wrapperGroup) return;

          const config = m.furnitureConfig || m.cabinetConfig || {
            widthMm: 600,
            heightMm: 720,
            depthMm: 560,
            boardThicknessMm: 18,
            shelvesCount: 1,
            plinthHeightMm: 100,
            hasDoors: true
          };

          const { group } = createFastenerMeshes(config);
          group.scale.set(0.001, 0.001, 0.001);
          group.position.copy(entry.wrapperGroup.position);
          group.rotation.copy(entry.wrapperGroup.rotation);
          ctx.fastenersRootGroup.add(group);
        });

        if (ctx.kitchenRoot && ctx.kitchenRoot.visible) {
          const baseKitchenFasteners = new THREE.Group();
          const fConfig = { widthMm: 800, heightMm: 720, depthMm: 560, boardThicknessMm: 18, shelvesCount: 1, plinthHeightMm: 100, hasDoors: true };
          const { group: g1 } = createFastenerMeshes(fConfig);
          g1.scale.set(0.001, 0.001, 0.001);
          g1.position.set(0.6, 0, 0.28);
          baseKitchenFasteners.add(g1);
          ctx.fastenersRootGroup.add(baseKitchenFasteners);
        }

        ctx.fastenersRootGroup.visible = true;
      } else {
        ctx.fastenersRootGroup.visible = false;
      }

      ctx.needsShadowUpdate = true;
      showToast(
        next
          ? (lang === 'ro' ? '🔩 Feronerie & Îmbinări 3D: ACTIVAT' : lang === 'ru' ? '🔩 Крепеж 3D: ВКЛ' : '🔩 3D Fasteners: ON')
          : (lang === 'ro' ? '🔩 Feronerie & Îmbinări 3D: DEZACTIVAT' : lang === 'ru' ? '🔩 Крепеж 3D: ВЫКЛ' : '🔩 3D Fasteners: OFF')
      );
      return next;
    });
  }, [lang, showToast]);

  const handleExplodedProgressChange = useCallback((val) => {
    setExplodedProgress(val);
    const ctx = sceneRef.current;
    if (!ctx) return;

    const offsetM = (val / 100) * 0.25;

    stateRef.current.importedModels.forEach((m) => {
      const entry = ctx.importedMap[m.id];
      if (!entry || !entry.wrapperGroup) return;

      entry.wrapperGroup.traverse((child) => {
        if (child.isMesh && child !== entry.wrapperGroup) {
          if (!child.userData.cadOrigPos) {
            child.userData.cadOrigPos = child.position.clone();
          }
          const orig = child.userData.cadOrigPos;
          const name = (child.name || '').toLowerCase();

          if (name.includes('stang') || name.includes('left')) {
            child.position.x = orig.x - offsetM;
          } else if (name.includes('dreapt') || name.includes('right')) {
            child.position.x = orig.x + offsetM;
          } else if (name.includes('capac') || name.includes('top') || name.includes('blat')) {
            child.position.y = orig.y + offsetM;
          } else if (name.includes('fund') || name.includes('bottom') || name.includes('soclu')) {
            child.position.y = orig.y - offsetM;
          } else if (name.includes('spate') || name.includes('back') || name.includes('pfl')) {
            child.position.z = orig.z - offsetM;
          } else if (name.includes('front') || name.includes('door') || name.includes('usa') || name.includes('sertar')) {
            child.position.z = orig.z + offsetM * 1.5;
          } else {
            const dirX = orig.x >= 0 ? 1 : -1;
            child.position.x = orig.x + dirX * (offsetM * 0.5);
          }
        }
      });
    });

    if (ctx.kitchenRoot && ctx.kitchenRoot.visible) {
      const offsetMm = (val / 100) * 250;
      ctx.kitchenRoot.traverse((child) => {
        if (child.isMesh && child.name && !child.name.startsWith('static_hardware')) {
          if (!child.userData.cadOrigPos) {
            child.userData.cadOrigPos = child.position.clone();
          }
          const orig = child.userData.cadOrigPos;
          const name = child.name.toLowerCase();

          if (name.includes('front') || name.includes('door') || name.includes('drawer')) {
            child.position.z = orig.z + offsetMm * 1.2;
          } else if (name.includes('countertop')) {
            child.position.y = orig.y + offsetMm * 0.8;
          }
        }
      });
    }

    ctx.needsShadowUpdate = true;
  }, []);

  const handleToggleWireframe = useCallback(() => {
    setWireframeActive((prev) => {
      const next = !prev;
      const ctx = sceneRef.current;
      if (!ctx) return next;

      ctx.scene.traverse((child) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              if (mat.name !== 'Mat_Gizmo') mat.wireframe = next;
            });
          } else {
            if (child.material.name !== 'Mat_Gizmo') child.material.wireframe = next;
          }
        }
      });

      showToast(
        next
          ? (lang === 'ro' ? '📐 Wireframe CAD: ACTIVAT' : lang === 'ru' ? '📐 Каркасный режим: ВКЛ' : '📐 Wireframe CAD: ON')
          : (lang === 'ro' ? '📐 Wireframe CAD: DEZACTIVAT' : lang === 'ru' ? '📐 Каркасный режим: ВЫКЛ' : '📐 Wireframe CAD: OFF')
      );
      return next;
    });
  }, [lang, showToast]);

  const handleTogglePartVisibility = useCallback((partId) => {
    setHiddenPartIds((prev) => {
      const next = new Set(prev);
      const isCurrentlyHidden = next.has(partId);
      if (isCurrentlyHidden) {
        next.delete(partId);
      } else {
        next.add(partId);
      }

      const ctx = sceneRef.current;
      if (ctx && ctx.importedMap[partId]) {
        ctx.importedMap[partId].wrapperGroup.visible = isCurrentlyHidden;
        ctx.needsShadowUpdate = true;
      }
      return next;
    });
  }, []);

  const handleAddCustomPanel = useCallback(async (config) => {
    try {
      const {
        name = 'Panou Personalizat',
        orientation = 'horizontal',
        lengthMm = 600,
        widthMm = 400,
        thicknessMm = 18,
        edgeBanding = 'Cant ABS 1mm',
        material = 'PAL Melaminat Alb 18mm'
      } = config;

      let dimX = lengthMm / 1000;
      let dimY = thicknessMm / 1000;
      let dimZ = widthMm / 1000;

      if (orientation === 'vertical') {
        dimX = thicknessMm / 1000;
        dimY = lengthMm / 1000;
        dimZ = widthMm / 1000;
      } else if (orientation === 'frontal') {
        dimX = lengthMm / 1000;
        dimY = widthMm / 1000;
        dimZ = thicknessMm / 1000;
      }

      const panelGeo = new THREE.BoxGeometry(dimX, dimY, dimZ);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0xf4f4f2,
        roughness: 0.45,
        metalness: 0.02
      });
      const panelMesh = new THREE.Mesh(panelGeo, panelMat);
      panelMesh.name = name;
      panelMesh.position.set(0, dimY / 2, 0);

      const panelGroup = new THREE.Group();
      panelGroup.name = name;
      panelGroup.add(panelMesh);

      const buffer = await exportToGlbArrayBuffer(panelGroup);
      const b64 = arrayBufferToBase64(buffer);
      const modelId = `panel_custom_${Date.now()}`;

      const mounted = await mountParsedGlbIntoScene(
        buffer,
        b64,
        modelId,
        name,
        { pos: [1.8, 0.7, 1.4], rot: [0, 0, 0], scale: [1, 1, 1] },
        null,
        stateRef.current.materials
      );
      if (!mounted) return;

      mounted.panelCuttingList = [
        {
          cabinet: 'Panouri Libere',
          partName: name,
          lengthMm,
          widthMm,
          thicknessMm,
          qty: 1,
          material,
          grain: orientation === 'vertical' ? 'Vertical' : 'Orizontal',
          edgeBanding
        }
      ];

      setImportedModels((prev) => {
        const updated = [...prev, mounted];
        setSelectedGlbId(modelId);
        setGizmoMode('translate');
        persistWorkspace({ importedModels: updated });
        return updated;
      });

      showToast(
        lang === 'ro'
          ? `📐 Panou generat: ${name} (${lengthMm}×${widthMm} mm)`
          : lang === 'ru'
            ? `📐 Деталь создана: ${name}`
            : `📐 Panel created: ${name}`
      );
    } catch (err) {
      console.error('Error adding custom panel:', err);
      showToast('❌ Eroare la adăugarea panoului');
    }
  }, [lang, mountParsedGlbIntoScene, persistWorkspace, showToast]);


  return (
    <>
      <div id="loader" className={loading ? '' : 'hidden'}>
        <div className="spinner" />
        <div style={{ fontWeight: 600, letterSpacing: '0.03em' }}>
          Se încarcă modelul 3D al bucătăriei...
        </div>
      </div>

      <div id="canvas-container" ref={canvasContainerRef} />

      <div id="tooltip" ref={tooltipRef}>
        <div className="tt-title" ref={ttTitleRef} />
        <div className="tt-dims" ref={ttDimsRef} style={{ display: 'none' }} />
        <div className="tt-sub" ref={ttSubRef} />
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
        canUndo={canUndo}
        onUndo={handleUndo}
        canRedo={canRedo}
        onRedo={handleRedo}
        is2DPlanMode={is2DPlanMode}
        onToggle2DPlanMode={() => setIs2DPlanMode((v) => !v)}
        onNewProject={handleNewProject}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onOpenTechnicalReport={() => setTechnicalReportOpen(true)}
        magneticSnapEnabled={magneticSnapEnabled}
        onToggleMagneticSnap={() => setMagneticSnapEnabled((v) => !v)}
        onCaptureScreenshot={handleCaptureScreenshot}
        onExportSceneGlb={handleExportFullSceneGlb}
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

        {/* Studio Top Navigation Tab Bar */}
        <div className="studio-tab-bar">
          <button
            className={`studio-tab-btn ${activeStudioTab === 'furniture' ? 'active' : ''}`}
            onClick={() => setActiveStudioTab('furniture')}
            title={dict.tabFurniture}
          >
            <span className="tab-icon">🛋️</span>
            <span className="tab-label">{dict.tabFurniture}</span>
          </button>
          <button
            className={`studio-tab-btn ${activeStudioTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveStudioTab('materials')}
            title={dict.tabMaterials}
          >
            <span className="tab-icon">🎨</span>
            <span className="tab-label">{dict.tabMaterials}</span>
          </button>
          <button
            className={`studio-tab-btn ${activeStudioTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveStudioTab('models')}
            title={dict.tab3DModels}
          >
            <span className="tab-icon">📦</span>
            <span className="tab-label">{dict.tab3DModels}</span>
          </button>
          <button
            className={`studio-tab-btn ${activeStudioTab === 'lighting' ? 'active' : ''}`}
            onClick={() => setActiveStudioTab('lighting')}
            title={dict.tabLighting}
          >
            <span className="tab-icon">💡</span>
            <span className="tab-label">{dict.tabLighting}</span>
          </button>
          <button
            className={`studio-tab-btn ${activeStudioTab === 'parts' ? 'active' : ''}`}
            onClick={() => setActiveStudioTab('parts')}
            title={dict.tabParts}
          >
            <span className="tab-icon">📋</span>
            <span className="tab-label">{dict.tabParts}</span>
          </button>
          <button
            className={`studio-tab-btn ${activeStudioTab === 'tree' ? 'active' : ''}`}
            onClick={() => setActiveStudioTab('tree')}
            title={dict.tabModelTree || 'Arbore CAD'}
          >
            <span className="tab-icon">🌲</span>
            <span className="tab-label">{dict.tabModelTree || 'Arbore CAD'}</span>
          </button>
        </div>

        {/* Compact Quick Actions Strip */}
        <div className="compact-quick-actions">
          <div className="quick-actions-bar">
            <button
              className="quick-icon-btn"
              disabled={!canUndo}
              onClick={handleUndo}
              title={dict.undo}
            >
              ↩️
            </button>
            <button
              className="quick-icon-btn"
              disabled={!canRedo}
              onClick={handleRedo}
              title={dict.redo}
            >
              ↪️
            </button>
            <div className="quick-divider" />
            <button
              className="quick-icon-btn"
              onClick={handleOpenAll}
              title={dict.openAll}
            >
              🔓
            </button>
            <button
              className="quick-icon-btn"
              onClick={handleCloseAll}
              title={dict.closeAll}
            >
              🔒
            </button>
            <button
              className={`quick-icon-btn ${xrayActive ? 'active' : ''}`}
              onClick={handleToggleXray}
              title={dict.xrayFronts}
            >
              👁️
            </button>
            <button
              className={`quick-icon-btn ${edgesVisible ? 'active' : ''}`}
              onClick={handleToggleEdges}
              title={dict.showEdges}
            >
              📐
            </button>
            <button
              className={`quick-icon-btn ${dimsEnabled ? 'active' : ''}`}
              onClick={() => setDimsEnabled((v) => !v)}
              title={dict.showDims}
            >
              📏
            </button>
            <button
              className={`quick-icon-btn ${roomWallsActive ? 'active' : ''}`}
              onClick={handleToggleRoomWalls}
              title={lang === 'ro' ? 'Pereți de Referință Cameră (ON/OFF)' : lang === 'ru' ? 'Стены комнаты (Вкл/Выкл)' : 'Room Reference Walls (ON/OFF)'}
            >
              🧱
            </button>
            <button
              className={`quick-icon-btn ${quickActionsExpanded ? 'active' : ''}`}
              onClick={() => setQuickActionsExpanded((v) => !v)}
              title="Mai multe acțiuni"
              style={{ marginLeft: 'auto' }}
            >
              {quickActionsExpanded ? '▲' : '⚡'}
            </button>
          </div>

          {quickActionsExpanded && (
            <div className="btn-grid" style={{ marginTop: '8px' }}>
              <button className="btn-pill" onClick={handleToggleDrawers}>
                <span>🗄️</span>
                <span>{dict.toggleDrawers}</span>
              </button>
              <button className="btn-pill" onClick={handleToggleDoors}>
                <span>🚪</span>
                <span>{dict.toggleDoors}</span>
              </button>
              <button
                className={`btn-pill ${countertopHidden ? 'active' : ''}`}
                onClick={handleToggleCountertop}
              >
                <span>🪨</span>
                <span>{dict.hideCountertop}</span>
              </button>
              <button
                className={`btn-pill ${dimsEnabled ? 'active' : ''}`}
                onClick={() => setDimsEnabled((v) => !v)}
              >
                <span>📏</span>
                <span>{dict.showDims}</span>
              </button>
            </div>
          )}
        </div>

        {/* Studio Content Area */}
        <div className="studio-tab-content">
          {activeStudioTab === 'architecture' && (
            <ArchitecturalRoomSection
              lang={lang}
              roomConfig={roomConfig}
              onChangeRoomConfig={handleChangeRoomConfig}
              onOpen2DPlanView={() => setIs2DPlanMode(true)}
            />
          )}

          {activeStudioTab === 'appliances' && (
            <ApplianceCatalogSection
              lang={lang}
              appliances={appliances}
              selectedApplianceId={selectedApplianceId}
              onAddAppliance={handleAddAppliance}
              onSelectAppliance={handleSelectAppliance}
              onDeleteAppliance={handleDeleteAppliance}
            />
          )}

          {activeStudioTab === 'furniture' && (
            <div>
              {/* Furniture Sub-navigation Pill Switcher */}
              <div className="furniture-subnav">
                <button
                  className={`subnav-btn ${furnitureSubTab === 'universal' ? 'active' : ''}`}
                  onClick={() => setFurnitureSubTab('universal')}
                >
                  <span>🌟</span>
                  <span>{dict.subUniversal}</span>
                </button>
                <button
                  className={`subnav-btn ${furnitureSubTab === 'kitchen' ? 'active' : ''}`}
                  onClick={() => setFurnitureSubTab('kitchen')}
                >
                  <span>🍳</span>
                  <span>{dict.subKitchen}</span>
                </button>
                <button
                  className={`subnav-btn ${furnitureSubTab === 'single' ? 'active' : ''}`}
                  onClick={() => setFurnitureSubTab('single')}
                >
                  <span>🧱</span>
                  <span>{dict.subSingleCabinet}</span>
                </button>
              </div>

              {furnitureSubTab === 'universal' && (
                <UniversalFurnitureStudioSection
                  lang={lang}
                  materials={materials}
                  activeMatId={activeMatId}
                  onMountGeneratedFurniture={handleMountGeneratedFurniture}
                  onCaptureScreenshot={handleCaptureScreenshot}
                />
              )}

              {furnitureSubTab === 'kitchen' && (
                <ModularKitchenStudioSection
                  lang={lang}
                  materials={materials}
                  activeMatId={activeMatId}
                  onMountGeneratedKitchen={handleMountGeneratedKitchen}
                  onCaptureScreenshot={handleCaptureScreenshot}
                />
              )}

              {furnitureSubTab === 'single' && (
                <ParametricCabinetSection
                  lang={lang}
                  materials={materials}
                  activeMatId={activeMatId}
                  onMountGeneratedCabinet={handleMountGeneratedCabinet}
                  placedCabinets={importedModels.filter((im) => im.isParametric)}
                  onDeleteCabinet={handleDeleteGlb}
                  onSelectCabinet={(id) => {
                    setSelectedGlbId(id);
                    setGizmoMode('translate');
                  }}
                  selectedCabinetId={selectedGlbId}
                  onCaptureScreenshot={handleCaptureScreenshot}
                />
              )}
            </div>
          )}

          {activeStudioTab === 'materials' && (
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
          )}

          {activeStudioTab === 'models' && (
            <GlbImporterSection
              lang={lang}
              importedModels={importedModels}
              selectedGlbId={selectedGlbId}
              onSelectGlb={(id) => {
                setSelectedGlbId(id);
                if (!gizmoMode) setGizmoMode('translate');
              }}
              onImportGlbFiles={handleImportGlbFiles}
              onDeleteGlb={handleDeleteGlb}
              onDuplicateGlb={handleDuplicateGlb}
              gizmoMode={gizmoMode}
              onSetGizmoMode={setGizmoMode}
              placeOnSurfaceMode={placeOnSurfaceMode}
              onTogglePlaceOnSurface={() => setPlaceOnSurfaceMode((v) => !v)}
              onUpdateGlbTransform={handleUpdateGlbTransform}
              onPaintWholeGlbWithActiveMat={handlePaintWholeGlbWithActiveMat}
              onColorWholeGlb={handleColorWholeGlb}
              onResetGlbMaterials={handleResetGlbMaterials}
              onPaintGlbSubMeshWithActiveMat={handlePaintGlbSubMeshWithActiveMat}
              onColorGlbSubMesh={handleColorGlbSubMesh}
              onSetGlbSubMeshMechanism={handleSetGlbSubMeshMechanism}
              onToggleGlbSubMeshOpen={handleToggleGlbSubMeshOpen}
              onToggleAllGlbParts={handleToggleAllGlbParts}
              onAutoDetectGlbMechanisms={handleAutoDetectGlbMechanisms}
              onClearGlbMechanisms={handleClearGlbMechanisms}
              onToggleNativeGlbAnimation={handleToggleNativeGlbAnimation}
            />
          )}

          {activeStudioTab === 'lighting' && (
            <LightingStudioSection
              lang={lang}
              lightState={lightState}
              onChangeLightState={handleChangeLightState}
              showLightOrb={showLightOrb}
              onToggleLightOrb={handleToggleLightOrb}
            />
          )}

          {activeStudioTab === 'parts' && (
            <InteractivePartsSection
              lang={lang}
              specs={specs}
              partsMeta={partsMeta}
              materials={materials}
              onTogglePart={(id) => toggleInteractivePart(id, null, true)}
              onPaintPart={handlePaintPart}
              onHoverPart={handleHoverPart}
            />
          )}

          {activeStudioTab === 'tree' && (
            <ModelTreePanel
              lang={lang}
              importedModels={importedModels}
              appliances={appliances}
              explodedProgress={explodedProgress}
              onChangeExplodedProgress={handleExplodedProgressChange}
              showFasteners3d={showFasteners3d}
              onToggleFasteners3d={handleToggleFasteners3d}
              wireframeActive={wireframeActive}
              onToggleWireframe={handleToggleWireframe}
              selectedPartId={selectedGlbId || selectedApplianceId}
              onSelectPart={(id) => {
                if (appliances.some((a) => a.id === id)) {
                  handleSelectAppliance(id);
                } else {
                  setSelectedGlbId(id);
                  setGizmoMode('translate');
                }
              }}
              onTogglePartVisibility={handleTogglePartVisibility}
              hiddenPartIds={hiddenPartIds}
              onAddCustomPanel={handleAddCustomPanel}
              onDeleteModel={(id) => {
                if (appliances.some((a) => a.id === id)) {
                  handleDeleteAppliance(id);
                } else {
                  handleDeleteGlb(id);
                }
              }}
            />
          )}
        </div>
      </aside>

      <CameraPresetsBar
        lang={lang}
        onSelectCamera={handleSelectCamera}
        autoRotate={autoRotate}
        onToggleAutoRotate={handleToggleAutoRotate}
      />

      {/* 2D Architectural Floor Plan Overlay */}
      {is2DPlanMode && (
        <div className="floorplan-2d-overlay">
          <div className="floorplan-header">
            <div className="floorplan-title">
              <span>📐</span>
              <strong>
                {lang === 'ro'
                  ? 'Schiță 2D Plan Arhitectural & Mobilier'
                  : lang === 'ru'
                  ? '2D Архитектурный план помещения'
                  : '2D Architectural Floor Plan'}
              </strong>
            </div>
            <div className="floorplan-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDownload2DPlanPng}
                title="Descarcă Schiță Plan PNG"
              >
                <span>📥</span>
                <span>{lang === 'ro' ? 'Exportă Plan PNG' : 'Export Plan PNG'}</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIs2DPlanMode(false)}
              >
                <span>🏛️</span>
                <span>{lang === 'ro' ? 'Înapoi la Perspectivă 3D' : 'Back to 3D View'}</span>
              </button>
            </div>
          </div>
          <div className="floorplan-canvas-container">
            <canvas
              ref={planCanvasRef}
              width={1600}
              height={1200}
              className="floorplan-canvas"
            />
          </div>
        </div>
      )}

      <TechnicalReportModal
        isOpen={technicalReportOpen}
        onClose={() => setTechnicalReportOpen(false)}
        lang={lang}
        importedModels={importedModels}
        materials={materials}
        onCaptureScreenshot={handleCaptureScreenshot}
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
