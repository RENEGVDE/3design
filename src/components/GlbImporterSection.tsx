'use client';

import React, { useRef } from 'react';
import { I18N, fmtCm } from '../i18n/translations';
import { Slider } from './ui/slider';

export default function GlbImporterSection({
  lang,
  importedModels,
  selectedGlbId,
  onSelectGlb,
  onImportGlbFiles,
  onDeleteGlb,
  onDuplicateGlb,
  gizmoMode,
  onSetGizmoMode,
  placeOnSurfaceMode,
  onTogglePlaceOnSurface,
  onUpdateGlbTransform,
  onPaintWholeGlbWithActiveMat,
  onColorWholeGlb,
  onResetGlbMaterials,
  onPaintGlbSubMeshWithActiveMat,
  onColorGlbSubMesh,
  onSetGlbSubMeshMechanism,
  onToggleGlbSubMeshOpen,
  onToggleAllGlbParts,
  onAutoDetectGlbMechanisms,
  onClearGlbMechanisms,
  onToggleNativeGlbAnimation,
  onOptimizeGlb,
  onExportModelGlb,
  onExportModelB3D,
  onExportModelObj,
  onUpdateGlbSubPartTransform,
  onDeleteGlbSubPart,
  onRestoreGlbSubPart,
  onDuplicateGlbSubPart,
  onAddPartToGlbModel,
  onOpenPartContextMenu
}: {
  lang: any;
  importedModels: any[];
  selectedGlbId: any;
  onSelectGlb: any;
  onImportGlbFiles: any;
  onDeleteGlb: any;
  onDuplicateGlb: any;
  gizmoMode: any;
  onSetGizmoMode: any;
  placeOnSurfaceMode: any;
  onTogglePlaceOnSurface: any;
  onUpdateGlbTransform: any;
  onPaintWholeGlbWithActiveMat: any;
  onColorWholeGlb: any;
  onResetGlbMaterials: any;
  onPaintGlbSubMeshWithActiveMat: any;
  onColorGlbSubMesh: any;
  onSetGlbSubMeshMechanism: any;
  onToggleGlbSubMeshOpen: any;
  onToggleAllGlbParts: any;
  onAutoDetectGlbMechanisms: any;
  onClearGlbMechanisms: any;
  onToggleNativeGlbAnimation: any;
  onOptimizeGlb?: (modelId: string) => void;
  onExportModelGlb?: (modelId: string) => void;
  onExportModelB3D?: (modelId: string) => void;
  onExportModelObj?: (modelId: string) => void;
  onUpdateGlbSubPartTransform?: any;
  onDeleteGlbSubPart?: (modelId: string, subIdx: number) => void;
  onRestoreGlbSubPart?: (modelId: string, subIdx: number) => void;
  onDuplicateGlbSubPart?: (modelId: string, subIdx: number) => void;
  onAddPartToGlbModel?: (modelId: string, partConfig: any, nearSubIdx?: number | null) => void;
  onOpenPartContextMenu?: (modelId: string, subIdx: number) => void;
}) {
  const dict = I18N[lang] || I18N.ro;
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';
  const fileInputRef = useRef(null);

  const selectedModel =
    importedModels.find((m) => m.id === selectedGlbId) ||
    importedModels[0] ||
    null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onImportGlbFiles(files);
    }
    e.target.value = '';
  };

  const curW = selectedModel
    ? selectedModel.baseDimsCm.w * selectedModel.scale[0]
    : 0;
  const curH = selectedModel
    ? selectedModel.baseDimsCm.h * selectedModel.scale[1]
    : 0;
  const curD = selectedModel
    ? selectedModel.baseDimsCm.d * selectedModel.scale[2]
    : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
        <span>📦 {dict.glbStudioTitle}</span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-slate-200">
          {importedModels.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-3">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <span>📦</span>
          <span>{dict.importGlbBtn}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf,.b3d,.obj"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {importedModels.length === 0 ? (
          <div className="py-2 px-1.5 text-center text-[11.5px] text-slate-400">
            {dict.emptyGlbHint}
          </div>
        ) : (
          <>
            {/* Imported Models List */}
            <div className="flex max-h-[140px] flex-col gap-1.5 overflow-y-auto pr-0.5">
              {importedModels.map((mdl) => {
                const isSel = mdl.id === (selectedModel && selectedModel.id);
                const mw = fmtCm(mdl.baseDimsCm.w * mdl.scale[0]);
                const mh = fmtCm(mdl.baseDimsCm.h * mdl.scale[1]);
                const md = fmtCm(mdl.baseDimsCm.d * mdl.scale[2]);
                return (
                  <div
                    key={mdl.id}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                      isSel
                        ? 'border-amber-400/70 bg-amber-500/15'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                    onClick={() => onSelectGlb(mdl.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-slate-100">📦 {mdl.name}</div>
                      <div className="text-[10.5px] text-slate-400">
                        📏 {mw} × {mh} × {md} cm
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="rounded border border-white/10 bg-white/5 px-1.5 py-1 text-xs hover:bg-white/15 transition-colors cursor-pointer"
                        title={dict.duplicateGlbBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateGlb(mdl.id);
                        }}
                      >
                        📋
                      </button>
                      <button
                        type="button"
                        className="rounded border border-rose-500/35 bg-rose-500/10 px-1.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title={dict.deleteGlbBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteGlb(mdl.id);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedModel && (
              <div className="flex flex-col gap-2.5">
                {/* CAD Three.js Performance Metrics & Optimizer Card */}
                {selectedModel.metrics && (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="font-semibold text-slate-100">⚡ Three.js CAD Engine</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${
                          selectedModel.metrics.isOptimized
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {selectedModel.metrics.isOptimized
                          ? dict.cadOptimizedBadge || '⚡ 60 FPS Three.js'
                          : '⚡ Fast View'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-center text-[10.5px] text-slate-400">
                      <div className="rounded bg-black/25 p-1">
                        <div className="font-semibold text-slate-100">
                          {selectedModel.metrics.polyCount > 0 ? selectedModel.metrics.polyCount.toLocaleString() : '—'}
                        </div>
                        <div>{dict.cadStatsPoly || 'Poligoane'}</div>
                      </div>
                      <div className="rounded bg-black/25 p-1">
                        <div className="font-semibold text-slate-100">
                          {selectedModel.subParts ? selectedModel.subParts.length : selectedModel.metrics.meshCount}
                        </div>
                        <div>{dict.cadStatsParts || 'Piese CAD'}</div>
                      </div>
                      <div className="rounded bg-black/25 p-1">
                        <div className="font-semibold text-slate-100">
                          {selectedModel.metrics.estimatedVramMb > 0 ? `${selectedModel.metrics.estimatedVramMb} MB` : '< 1 MB'}
                        </div>
                        <div>{dict.cadStatsVram || 'VRAM GPU'}</div>
                      </div>
                    </div>

                    {onOptimizeGlb && (
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/40 bg-gradient-to-br from-amber-500/25 to-amber-600/20 px-2 py-1.5 text-[11.5px] font-medium text-amber-200 hover:brightness-110 transition cursor-pointer"
                        onClick={() => onOptimizeGlb(selectedModel.id)}
                      >
                        <span>⚡</span>
                        <span>{dict.cadOptimizeBtn || '⚡ Convertește & Optimizează Three.js (60 FPS)'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Export Model CAD Formats */}
                <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
                  <div className="text-[11px] font-semibold text-slate-100">
                    💾 {isRo ? 'Exportă acest corp / model' : isRu ? 'Экспорт этого изделия' : 'Export this Model'}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                      title={isRo ? 'Descarcă modelul 3D binar (.glb)' : 'Download .GLB'}
                      onClick={() => onExportModelGlb && onExportModelGlb(selectedModel.id)}
                    >
                      📦 .glb
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                      title={isRo ? 'Descarcă modelul tehnic CAD (.b3d)' : 'Download .B3D'}
                      onClick={() => onExportModelB3D && onExportModelB3D(selectedModel.id)}
                    >
                      🧱 .b3d
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                      title={isRo ? 'Descarcă geometria CAD (.obj + .mtl)' : 'Download .OBJ'}
                      onClick={() => onExportModelObj && onExportModelObj(selectedModel.id)}
                    >
                      📐 .obj
                    </button>
                  </div>
                </div>

                {/* 3D Transform Gizmo Mode Selector */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    className={`rounded-md border py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                      gizmoMode === 'translate'
                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                    onClick={() => onSetGizmoMode('translate')}
                  >
                    ✥ {dict.gizmoMove}
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                      gizmoMode === 'rotate'
                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                    onClick={() => onSetGizmoMode('rotate')}
                  >
                    🔄 {dict.gizmoRotate}
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                      gizmoMode === 'scale'
                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                    onClick={() => onSetGizmoMode('scale')}
                  >
                    ⤢ {dict.gizmoScale}
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                      !gizmoMode
                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                    onClick={() => onSetGizmoMode(null)}
                  >
                    ✕
                  </button>
                </div>

                {/* Click-on-Surface to Place Button */}
                <button
                  type="button"
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    placeOnSurfaceMode
                      ? 'border-sky-400/60 bg-sky-500/20 text-sky-300'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                  onClick={onTogglePlaceOnSurface}
                >
                  <span>📍</span>
                  <span>
                    {placeOnSurfaceMode
                      ? dict.placeSurfaceActiveBtn
                      : dict.placeSurfaceBtn}
                  </span>
                </button>

                {/* Quick Snap & Rotate Row */}
                <div className="grid grid-cols-[1fr_1fr_0.7fr_0.7fr] gap-1">
                  <button
                    type="button"
                    className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() =>
                      onUpdateGlbTransform(selectedModel.id, {
                        position: [
                          selectedModel.position[0],
                          0,
                          selectedModel.position[2]
                        ]
                      })
                    }
                  >
                    ⬇️ {dict.snapFloorBtn}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() =>
                      onUpdateGlbTransform(selectedModel.id, {
                        position: [
                          selectedModel.position[0],
                          0.9,
                          selectedModel.position[2]
                        ]
                      })
                    }
                  >
                    ⬆️ {dict.snapCounterBtn}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() =>
                      onUpdateGlbTransform(selectedModel.id, {
                        rotationYDeg:
                          ((selectedModel.rotationYDeg - 45 + 540) % 360) - 180
                      })
                    }
                  >
                    {dict.rotLeft45}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() =>
                      onUpdateGlbTransform(selectedModel.id, {
                        rotationYDeg:
                          ((selectedModel.rotationYDeg + 45 + 540) % 360) - 180
                      })
                    }
                  >
                    {dict.rotRight45}
                  </button>
                </div>

                {/* Position X, Y, Z Sliders */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11.5px] text-slate-300">
                    <span>{dict.posXLbl}</span>
                    <span className="font-mono font-semibold text-amber-300">
                      {`${(selectedModel.position[0] * 100).toFixed(0)} cm`}
                    </span>
                  </div>
                  <Slider
                    min={-2.5}
                    max={6.5}
                    step={0.02}
                    value={[selectedModel.position[0]]}
                    onValueChange={(vals) =>
                      onUpdateGlbTransform(selectedModel.id, {
                        position: [
                          vals[0] ?? selectedModel.position[0],
                          selectedModel.position[1],
                          selectedModel.position[2]
                        ]
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11.5px] text-slate-300">
                    <span>{dict.posYLbl}</span>
                    <span className="font-mono font-semibold text-amber-300">
                      {`${(selectedModel.position[1] * 100).toFixed(0)} cm`}
                    </span>
                  </div>
                  <Slider
                    min={0.0}
                    max={3.2}
                    step={0.01}
                    value={[selectedModel.position[1]]}
                    onValueChange={(vals) =>
                      onUpdateGlbTransform(selectedModel.id, {
                        position: [
                          selectedModel.position[0],
                          vals[0] ?? selectedModel.position[1],
                          selectedModel.position[2]
                        ]
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11.5px] text-slate-300">
                    <span>{dict.posZLbl}</span>
                    <span className="font-mono font-semibold text-amber-300">
                      {`${(selectedModel.position[2] * 100).toFixed(0)} cm`}
                    </span>
                  </div>
                  <Slider
                    min={-2.0}
                    max={5.5}
                    step={0.02}
                    value={[selectedModel.position[2]]}
                    onValueChange={(vals) =>
                      onUpdateGlbTransform(selectedModel.id, {
                        position: [
                          selectedModel.position[0],
                          selectedModel.position[1],
                          vals[0] ?? selectedModel.position[2]
                        ]
                      })
                    }
                  />
                </div>

                {/* Rotation Y Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11.5px] text-slate-300">
                    <span>{dict.rotYLbl}</span>
                    <span className="font-mono font-semibold text-amber-300">
                      {`${Math.round(selectedModel.rotationYDeg)}°`}
                    </span>
                  </div>
                  <Slider
                    min={-180}
                    max={180}
                    step={1}
                    value={[selectedModel.rotationYDeg]}
                    onValueChange={(vals) =>
                      onUpdateGlbTransform(selectedModel.id, {
                        rotationYDeg: vals[0] ?? selectedModel.rotationYDeg
                      })
                    }
                  />
                </div>

                {/* Uniform Scale + Independent W x H x D cm Sizing */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11.5px] text-slate-300">
                    <span>{dict.uniformScaleLbl}</span>
                    <span className="font-mono font-semibold text-amber-300">
                      {`${selectedModel.scale[0].toFixed(2)}x`}
                    </span>
                  </div>
                  <Slider
                    min={0.1}
                    max={5.0}
                    step={0.05}
                    value={[selectedModel.scale[0]]}
                    onValueChange={(vals) => {
                      const s = vals[0] || 1.0;
                      onUpdateGlbTransform(selectedModel.id, {
                        scale: [s, s, s]
                      });
                    }}
                  />
                </div>

                <div className="mt-0.5 grid grid-cols-3 gap-1.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400">{dict.widthCmLbl}</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={Math.round(curW)}
                      onChange={(e) => {
                        const targetW = Math.max(1, parseFloat(e.target.value) || curW);
                        const sx = targetW / selectedModel.baseDimsCm.w;
                        onUpdateGlbTransform(selectedModel.id, {
                          scale: [sx, selectedModel.scale[1], selectedModel.scale[2]]
                        });
                      }}
                      className="w-full rounded-md border border-white/15 bg-black/35 px-1.5 py-1 text-xs font-bold text-amber-400 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400">{dict.heightCmLbl}</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={Math.round(curH)}
                      onChange={(e) => {
                        const targetH = Math.max(1, parseFloat(e.target.value) || curH);
                        const sy = targetH / selectedModel.baseDimsCm.h;
                        onUpdateGlbTransform(selectedModel.id, {
                          scale: [selectedModel.scale[0], sy, selectedModel.scale[2]]
                        });
                      }}
                      className="w-full rounded-md border border-white/15 bg-black/35 px-1.5 py-1 text-xs font-bold text-emerald-400 outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400">{dict.depthCmLbl}</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={Math.round(curD)}
                      onChange={(e) => {
                        const targetD = Math.max(1, parseFloat(e.target.value) || curD);
                        const sz = targetD / selectedModel.baseDimsCm.d;
                        onUpdateGlbTransform(selectedModel.id, {
                          scale: [selectedModel.scale[0], selectedModel.scale[1], sz]
                        });
                      }}
                      className="w-full rounded-md border border-white/15 bg-black/35 px-1.5 py-1 text-xs font-bold text-sky-400 outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                {/* Colors & Materials Editor for Imported .GLB */}
                <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {dict.glbMatTitle}
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => onPaintWholeGlbWithActiveMat(selectedModel.id)}
                  >
                    <span>🖌️</span>
                    <span>{dict.paintWholeGlbBtn}</span>
                  </button>

                  <label
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs hover:bg-white/10 transition-colors"
                    title="Alege o culoare pentru întregul model"
                  >
                    🎨
                    <input
                      type="color"
                      defaultValue="#d4a359"
                      className="h-0 w-0 opacity-0"
                      onChange={(e) => onColorWholeGlb(selectedModel.id, e.target.value)}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => onResetGlbMaterials(selectedModel.id)}
                >
                  <span>🔄</span>
                  <span>{dict.resetGlbMatBtn}</span>
                </button>

                {/* Furniture Mechanisms (Doors & Drawers) & Full CAD Editor Section */}
                <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {dict.glbMechTitle}
                </div>

                <div className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-amber-200">
                  💡 <strong>Click Dreapta pe orice piesă în 3D</strong> pentru a-i seta tipul de deschidere (Ușă, Sertar, Aventos), a-i edita dimensiunile (mm), poziția, a o duplica sau a o șterge.
                </div>

                {onAddPartToGlbModel && (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                    <div className="text-[11px] font-semibold text-slate-100">
                      ➕ Adaugă Piesă / Panou Nou în acest Model:
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() =>
                          onAddPartToGlbModel(selectedModel.id, {
                            name: 'Ușă Nouă 600×720',
                            wMm: 596,
                            hMm: 716,
                            dMm: 18,
                            mechType: 'door_left'
                          })
                        }
                      >
                        🚪 + Ușă 600×720
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() =>
                          onAddPartToGlbModel(selectedModel.id, {
                            name: 'Sertar Nou 600×180',
                            wMm: 596,
                            hMm: 176,
                            dMm: 18,
                            mechType: 'drawer'
                          })
                        }
                      >
                        🗄️ + Sertar 600×180
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() =>
                          onAddPartToGlbModel(selectedModel.id, {
                            name: 'Poliță Orizontală',
                            wMm: 564,
                            hMm: 18,
                            dMm: 530,
                            mechType: 'none'
                          })
                        }
                      >
                        📐 + Poliță 564×530
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() =>
                          onAddPartToGlbModel(selectedModel.id, {
                            name: 'Panou Vertical',
                            wMm: 18,
                            hMm: 720,
                            dMm: 560,
                            mechType: 'none'
                          })
                        }
                      >
                        🧱 + Laterală 720×560
                      </button>
                    </div>
                  </div>
                )}

                {selectedModel.hasNativeAnimations && (
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-sky-400/50 bg-sky-500/20 px-2.5 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/30 transition-colors cursor-pointer"
                    onClick={() => onToggleNativeGlbAnimation(selectedModel.id)}
                  >
                    <span>{dict.playGlbAnimBtn}</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => onAutoDetectGlbMechanisms(selectedModel.id)}
                  >
                    {dict.autoDetectMechBtn}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => onClearGlbMechanisms(selectedModel.id)}
                  >
                    {dict.clearMechBtn}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => onToggleAllGlbParts(selectedModel.id, true)}
                  >
                    {dict.openAllGlbBtn}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => onToggleAllGlbParts(selectedModel.id, false)}
                  >
                    {dict.closeAllGlbBtn}
                  </button>
                </div>

                {selectedModel.subParts && selectedModel.subParts.length > 0 && (
                  <>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {dict.glbSubMeshesTitle}
                    </div>
                    <div className="flex max-h-[230px] flex-col gap-1.5 overflow-y-auto pr-0.5">
                      {selectedModel.subParts.map((sp) => {
                        const hasMech = sp.mechType && sp.mechType !== 'none';
                        const isDeleted = Boolean(sp.deleted);
                        return (
                          <div
                            key={sp.subIdx}
                            className={`flex flex-col items-stretch gap-1 rounded-lg border px-2 py-1.5 ${
                              isDeleted
                                ? 'border-rose-500/20 bg-rose-500/10 opacity-45'
                                : hasMech
                                  ? 'border-sky-400/25 bg-sky-500/10'
                                  : 'border-white/10 bg-white/[0.03]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`min-w-0 flex-1 truncate text-[11px] font-medium text-slate-100 ${
                                  isDeleted ? 'line-through' : ''
                                }`}
                              >
                                #{sp.subIdx + 1} {sp.name}
                              </span>
                              <div className="flex shrink-0 items-center gap-1">
                                {!isDeleted && hasMech && (
                                  <button
                                    type="button"
                                    className={`rounded border px-1 py-0.5 text-[11px] transition-colors cursor-pointer ${
                                      sp.isOpen
                                        ? 'border-emerald-400 text-emerald-400'
                                        : 'border-sky-400/45 text-sky-200'
                                    }`}
                                    title={sp.isOpen ? dict.clickToClose : dict.clickToOpen}
                                    onClick={() => onToggleGlbSubMeshOpen(selectedModel.id, sp.subIdx)}
                                  >
                                    {sp.isOpen ? '🔓' : '🔒'}
                                  </button>
                                )}
                                {!isDeleted && onOpenPartContextMenu && (
                                  <button
                                    type="button"
                                    className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[11px] hover:bg-white/15 cursor-pointer"
                                    title="Editează Dimensiuni, Poziție & Mecanism Piesă"
                                    onClick={() => onOpenPartContextMenu(selectedModel.id, sp.subIdx)}
                                  >
                                    ✏️
                                  </button>
                                )}
                                {!isDeleted && onDuplicateGlbSubPart && (
                                  <button
                                    type="button"
                                    className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[11px] hover:bg-white/15 cursor-pointer"
                                    title="Duplică această piesă"
                                    onClick={() => onDuplicateGlbSubPart(selectedModel.id, sp.subIdx)}
                                  >
                                    📋
                                  </button>
                                )}
                                {!isDeleted && (
                                  <label
                                    className="inline-flex cursor-pointer items-center gap-1 rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[11px] hover:bg-white/15"
                                    title="Schimbă culoarea acestei sub-piese"
                                  >
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full border border-white/30"
                                      style={{ background: sp.colorHex || '#e5e7eb' }}
                                    />
                                    🎨
                                    <input
                                      type="color"
                                      value={sp.colorHex || '#e5e7eb'}
                                      className="h-0 w-0 opacity-0"
                                      onChange={(e) =>
                                        onColorGlbSubMesh(selectedModel.id, sp.subIdx, e.target.value)
                                      }
                                    />
                                  </label>
                                )}
                                {!isDeleted && (
                                  <button
                                    type="button"
                                    className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[11px] hover:bg-white/15 cursor-pointer"
                                    title="Aplică materialul/textura selectată din Studio pe această sub-piesă"
                                    onClick={() =>
                                      onPaintGlbSubMeshWithActiveMat(selectedModel.id, sp.subIdx)
                                    }
                                  >
                                    🖌️
                                  </button>
                                )}
                                {!isDeleted && onDeleteGlbSubPart && (
                                  <button
                                    type="button"
                                    className="rounded border border-rose-500/35 bg-rose-500/10 px-1 py-0.5 text-[11px] text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                                    title="Șterge această piesă din model"
                                    onClick={() => onDeleteGlbSubPart(selectedModel.id, sp.subIdx)}
                                  >
                                    🗑️
                                  </button>
                                )}
                                {isDeleted && onRestoreGlbSubPart && (
                                  <button
                                    type="button"
                                    className="rounded border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                                    title="Restaurează această piesă în model"
                                    onClick={() => onRestoreGlbSubPart(selectedModel.id, sp.subIdx)}
                                  >
                                    ♻️ Restaurează
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Mechanism Selector Dropdown */}
                            {!isDeleted && (
                              <select
                                value={sp.mechType || 'none'}
                                onChange={(e) =>
                                  onSetGlbSubMeshMechanism(
                                    selectedModel.id,
                                    sp.subIdx,
                                    e.target.value
                                  )
                                }
                                className={`w-full cursor-pointer rounded border bg-black/45 px-1.5 py-0.5 text-[11px] outline-none ${
                                  hasMech
                                    ? 'border-sky-400/50 text-sky-200'
                                    : 'border-white/15 text-slate-300'
                                }`}
                              >
                                <option value="none">{dict.mech_none}</option>
                                <option value="door_left">{dict.mech_door_left}</option>
                                <option value="door_right">{dict.mech_door_right}</option>
                                <option value="flap_up">{dict.mech_flap_up}</option>
                                <option value="flap_down">{dict.mech_flap_down}</option>
                                <option value="drawer">{dict.mech_drawer}</option>
                                <option value="drawer_back">{dict.mech_drawer_back}</option>
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
