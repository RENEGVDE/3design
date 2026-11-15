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
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
        <span>🎨 {dict.customStudioTitle}</span>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#14171C] p-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#17789E] bg-[#0F5773] px-2.5 py-2 text-xs font-semibold text-white hover:bg-[#146E91] transition-colors cursor-pointer"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <span>📸</span>
            <span>{dict.uploadTexBtn}</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#1C2027] px-2.5 py-2 text-xs font-medium text-[#F5F7FA] hover:bg-[#262B34] transition-colors cursor-pointer"
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
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#1C2027] px-2.5 py-1.5 text-xs font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
            onClick={onResetFurnitureToWhite}
          >
            <span>🔄</span>
            <span>{dict.resetWhiteBtn}</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#1C2027] px-2.5 py-1.5 text-xs font-medium text-[#C9D1D9] hover:border-red-500/50 hover:bg-red-950/40 hover:text-red-200 transition-colors cursor-pointer"
            onClick={onDeleteAllMaterials}
          >
            <span>🗑️</span>
            <span>{dict.deleteAllMatsBtn}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {materials.length === 0 ? (
            <div className="col-span-full py-2.5 px-1.5 text-center text-[11.5px] text-[#8B949E]">
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
                      ? 'border-[#17789E] bg-[#0F5773]/30'
                      : 'border-white/[0.08] bg-[#0F1115] hover:border-white/25'
                  }`}
                  title={mat.name}
                  onClick={() => onSelectMaterial(mat.id)}
                >
                  <div
                    className="h-9 w-full rounded border border-white/[0.12]"
                    style={{ background: mat.thumbCss }}
                  />
                  <div className="w-full truncate text-center text-[10.5px] font-medium text-[#C9D1D9]">
                    {mat.name}
                  </div>
                  <button
                    type="button"
                    className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-[#1C2027] border border-white/20 text-[10px] font-bold text-white shadow group-hover:flex cursor-pointer hover:bg-red-700"
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

        <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-[#0F1115] p-2.5">
          <div className="flex items-center justify-between text-xs text-[#C9D1D9]">
            <span>{dict.grainScaleLbl}</span>
            <span className="font-mono font-semibold text-[#F5F7FA]">
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
              className="inline-flex items-center justify-center rounded-md border border-white/[0.08] bg-[#1C2027] px-2 py-1.5 text-[11px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
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
              className="inline-flex items-center justify-center rounded-md border border-white/[0.08] bg-[#1C2027] px-2 py-1.5 text-[11px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
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
              ? 'border-[#355E43] bg-[#1F3627] text-white'
              : 'border-white/[0.08] bg-[#1C2027] text-[#C9D1D9] hover:bg-[#262B34] hover:text-white'
          }`}
          onClick={onTogglePaintMode}
        >
          <span>🖌️</span>
          <span>{paintModeActive ? dict.paintModeActiveBtn : dict.paintModeBtn}</span>
        </button>

        <div className="mt-1 flex flex-col gap-1.5">
          <div className="text-[11.5px] font-semibold text-[#8B949E]">
            {isRo ? 'Aplicare Finisaj Activ pe Mobilier:' : isRu ? 'Применить активный материал:' : 'Apply Active Material to Furniture:'}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/[0.08] bg-[#1C2027] px-1.5 py-1.5 text-[11.5px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
              title={isRo ? 'Aplică finisajul pe corpul CAD selectat în scenă' : 'Apply to selected model'}
              onClick={onApplyToSelectedModel}
            >
              <span>🛋️</span>
              <span>{isRo ? 'Corp Selectat' : isRu ? 'Выбранное' : 'Selected'}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/[0.08] bg-[#1C2027] px-1.5 py-1.5 text-[11.5px] font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
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
