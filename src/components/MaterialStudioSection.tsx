'use client';

import React, { useRef } from 'react';
import { I18N } from '../i18n/translations';
import { FINISH_MODES } from '../utils/textures';
import { Slider } from './ui/slider';

export default function MaterialStudioSection({
  lang,
  materials,
  activeMatId,
  onSelectMaterial,
  onUploadTextures,
  onAddColorMaterial,
  onDeleteMaterial,
  onDeleteAllMaterials,
  onResetFurnitureToWhite,
  onUpdateActiveMaterialProp,
  paintModeActive,
  onTogglePaintMode,
  onApplyToSelectedModel,
  onApplyToAllModels
}: {
  lang: string;
  materials: any[];
  activeMatId: string | null;
  onSelectMaterial: (id: string) => void;
  onUploadTextures: (files: File[]) => void;
  onAddColorMaterial: (hex: string) => void;
  onDeleteMaterial: (id: string) => void;
  onDeleteAllMaterials: () => void;
  onResetFurnitureToWhite: () => void;
  onUpdateActiveMaterialProp: (prop: string, val: any) => void;
  paintModeActive: boolean;
  onTogglePaintMode: () => void;
  onApplyToSelectedModel?: () => void;
  onApplyToAllModels?: () => void;
}) {
  const dict = I18N[lang] || I18N.ro;
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const activeMat = materials.find((m) => m.id === activeMatId) || materials[0] || null;
  const finObj = activeMat
    ? FINISH_MODES[activeMat.finishIdx] || FINISH_MODES[0]
    : FINISH_MODES[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      onUploadTextures(files);
    }
    e.target.value = '';
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onAddColorMaterial(e.target.value);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
        <span>🎨 {dict.customStudioTitle}</span>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-400/35 bg-amber-500/15 px-2.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <span>📸</span>
            <span>{dict.uploadTexBtn}</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            onClick={() => colorInputRef.current && colorInputRef.current.click()}
          >
            <span>🎨</span>
            <span>{dict.addColorBtn}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={colorInputRef}
            type="color"
            defaultValue="#c8a986"
            className="hidden"
            onChange={handleColorChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            onClick={onResetFurnitureToWhite}
          >
            <span>🔄</span>
            <span>{dict.resetWhiteBtn}</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/35 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
            onClick={onDeleteAllMaterials}
          >
            <span>🗑️</span>
            <span>{dict.deleteAllMatsBtn}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {materials.length === 0 ? (
            <div className="col-span-full py-2.5 px-1.5 text-center text-[11.5px] text-slate-400">
              {dict.emptyMatHint}
            </div>
          ) : (
            materials.map((mat) => {
              const isSelected = mat.id === activeMatId;
              return (
                <div
                  key={mat.id}
                  className={`group relative flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-1.5 transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_12px_rgba(212,163,89,0.2)]'
                      : 'border-white/10 bg-slate-950/60 hover:border-white/25'
                  }`}
                  title={mat.name}
                  onClick={() => onSelectMaterial(mat.id)}
                >
                  <div
                    className="h-9 w-full rounded border border-white/15"
                    style={{ background: mat.thumbCss }}
                  />
                  <div className="w-full truncate text-center text-[10.5px] font-medium text-slate-200">
                    {mat.name}
                  </div>
                  <button
                    type="button"
                    className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow group-hover:flex cursor-pointer"
                    title="Șterge materialul"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMaterial(mat.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/25 p-2.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{dict.grainScaleLbl}</span>
            <span className="font-mono font-semibold text-amber-300">
              {activeMat ? `${activeMat.scale.toFixed(1)}x` : '1.0x'}
            </span>
          </div>
          <Slider
            min={0.3}
            max={3.0}
            step={0.1}
            value={[activeMat ? activeMat.scale : 1.0]}
            disabled={!activeMat}
            onValueChange={(vals) => onUpdateActiveMaterialProp('scale', vals[0] ?? 1.0)}
          />
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
              disabled={!activeMat}
              onClick={() =>
                onUpdateActiveMaterialProp('rotate90', activeMat ? !activeMat.rotate90 : false)
              }
            >
              <span>
                {activeMat && activeMat.rotate90 ? dict.grainDirHorizBtn : dict.grainDirBtn}
              </span>
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
              disabled={!activeMat}
              onClick={() =>
                onUpdateActiveMaterialProp(
                  'finishIdx',
                  activeMat ? (activeMat.finishIdx + 1) % FINISH_MODES.length : 0
                )
              }
            >
              <span>{dict[finObj.i18nKey]}</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            paintModeActive
              ? 'border-purple-400 bg-purple-500/25 text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.3)]'
              : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
          onClick={onTogglePaintMode}
        >
          <span>🖌️</span>
          <span>{paintModeActive ? dict.paintModeActiveBtn : dict.paintModeBtn}</span>
        </button>

        <div className="mt-1 flex flex-col gap-1.5">
          <div className="text-[11.5px] font-semibold text-slate-400">
            {isRo ? 'Aplicare Finisaj Activ pe Mobilier:' : isRu ? 'Применить активный материал:' : 'Apply Active Material to Furniture:'}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1.5 text-[11.5px] font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              title={isRo ? 'Aplică finisajul pe corpul CAD selectat în scenă' : 'Apply to selected model'}
              onClick={onApplyToSelectedModel}
            >
              <span>🛋️</span>
              <span>{isRo ? 'Corp Selectat' : isRu ? 'Выбранное' : 'Selected'}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1.5 text-[11.5px] font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              title={isRo ? 'Aplică finisajul pe toate corpurile de mobilier din scenă' : 'Apply to all models in scene'}
              onClick={onApplyToAllModels}
            >
              <span>🏠</span>
              <span>{isRo ? 'Toate Corpurile' : isRu ? 'Все изделия' : 'All Models'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
