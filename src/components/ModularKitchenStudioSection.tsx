'use client';

import React, { useState, useMemo } from 'react';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import {
  KITCHEN_LAYOUT_TYPES,
  buildModularKitchenComposition
} from '../utils/modularKitchenGenerator';
import {
  exportToGlbArrayBuffer,
  generateCuttingListCsv,
  downloadFile
} from '../utils/parametricCabinet';
import { arrayBufferToBase64 } from '../utils/glbImporter';

export interface ModularKitchenStudioSectionProps {
  lang?: string;
  materials?: any[];
  activeMatId?: string | null;
  onMountGeneratedKitchen?: (
    glbBuffer: ArrayBuffer,
    b64Data: string,
    id: string,
    name: string,
    transform: any,
    config: any
  ) => Promise<void> | void;
  onCaptureScreenshot?: () => void;
}

export default function ModularKitchenStudioSection({
  lang = 'ro',
  materials = [],
  activeMatId = null,
  onMountGeneratedKitchen,
  onCaptureScreenshot
}: ModularKitchenStudioSectionProps) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [layoutType, setLayoutType] = useState('l_peninsula');
  const [mainWallWidthCm, setMainWallWidthCm] = useState(360);
  const [returnWallDepthCm, setReturnWallDepthCm] = useState(240);
  const [peninsulaLengthCm, setPeninsulaLengthCm] = useState(200);
  const [roomHeightCm, setRoomHeightCm] = useState(265);

  const [includeOvenCol, setIncludeOvenCol] = useState(true);
  const [includeFridgeCol, setIncludeFridgeCol] = useState(true);
  const [includeDishwasher, setIncludeDishwasher] = useState(true);
  const [includePeninsula, setIncludePeninsula] = useState(true);

  const [showPanelInspector, setShowPanelInspector] = useState(false);
  const [generating, setGenerating] = useState(false);

  const activeMat = useMemo(
    () => materials.find((m) => m.id === activeMatId) || null,
    [materials, activeMatId]
  );

  // Current composition preview for calculation
  const currentComposition = useMemo(() => {
    return buildModularKitchenComposition({
      layoutType: includePeninsula ? layoutType : 'l_corner',
      mainWallWidthCm,
      returnWallDepthCm,
      peninsulaLengthCm,
      roomHeightCm,
      carcassColor: activeMat?.colorHex || '#f4f4f2',
      facadeColor: activeMat?.colorHex || '#f4f4f2',
      countertopColor: activeMat?.colorHex || '#f4f4f2',
      plinthColor: activeMat?.colorHex || '#f4f4f2'
    });
  }, [layoutType, mainWallWidthCm, returnWallDepthCm, peninsulaLengthCm, roomHeightCm, includePeninsula, activeMat]);

  // BOM Summary calculations
  const bomSummary = useMemo(() => {
    let carcassSqM = 0;
    let facadeSqM = 0;
    let countertopLinM = 0;
    let edgeBandingLinM = 0;

    currentComposition.panelCuttingList.forEach((p: any) => {
      const sqM = ((p.lengthMm * p.widthMm) / 1000000) * p.qty;
      if (p.material.includes('PAL')) carcassSqM += sqM;
      else if (p.material.includes('MDF')) facadeSqM += sqM;
      else if (p.material.includes('Blat')) countertopLinM += (p.lengthMm / 1000) * p.qty;

      // Estimate edge perimeter
      if (p.edgeBanding && !p.edgeBanding.includes('Fără')) {
        edgeBandingLinM += (((p.lengthMm + p.widthMm) * 2) / 1000) * p.qty * 0.5; // ~2 to 4 edges
      }
    });

    return {
      carcassSqM: carcassSqM.toFixed(2),
      facadeSqM: facadeSqM.toFixed(2),
      countertopLinM: countertopLinM.toFixed(2),
      edgeBandingLinM: edgeBandingLinM.toFixed(1),
      totalParts: currentComposition.panelCuttingList.length
    };
  }, [currentComposition]);

  const handleGenerateKitchen = async () => {
    setGenerating(true);
    try {
      const glbBuffer = (await exportToGlbArrayBuffer(currentComposition.root)) as ArrayBuffer;
      const b64Data = arrayBufferToBase64(glbBuffer);
      const kitchenId = `modular_kitchen_${Date.now()}`;
      const kitchenName = isRo
        ? `Bucătărie Modulară CAD (${mainWallWidthCm}cm)`
        : isRu
        ? `Модульная кухня CAD (${mainWallWidthCm}см)`
        : `Modular Kitchen CAD (${mainWallWidthCm}cm)`;

      if (onMountGeneratedKitchen) {
        await onMountGeneratedKitchen(
          glbBuffer,
          b64Data,
          kitchenId,
          kitchenName,
          {
            position: [0.0, 0.0, 0.0],
            rotationYDeg: 0,
            scale: [1, 1, 1]
          },
          {
            layoutType,
            mainWallWidthCm,
            returnWallDepthCm,
            peninsulaLengthCm,
            roomHeightCm
          }
        );
      }
    } catch (err) {
      console.error('Error generating modular kitchen:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCsv = () => {
    const csv = generateCuttingListCsv(currentComposition.panelCuttingList);
    downloadFile(
      csv,
      `specificatie_panouri_bucatarie_${layoutType}_${Date.now()}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  return (
    <div className="flex flex-col gap-3.5" id="modular-kitchen-studio">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
        <span>🏛️</span>
        <span>
          {isRo
            ? 'Studio Bucătărie Modulară CAD'
            : isRu
            ? 'Студия модульной кухни (Планировщик & CAD)'
            : 'Modular Kitchen CAD Studio'}
        </span>
      </div>

      <div className="text-[11px] leading-relaxed text-[#8B949E]">
        {isRo
          ? 'Proiectează bucătării complete de orice formă (L-Colț, Peninsulă, Liniară, Formă de U) cu blat continuu, electrocasnice și listă tehnică de panouri.'
          : isRu
          ? 'Проектируйте гарнитуры любой конфигурации (Угловая, П-образная, Полуостров, Прямая) с непрерывной столешницей и картами раскроя.'
          : 'Design full modular kitchens (L-Corner, Peninsula, Straight, U-Shape) with continuous worktops and engineering cutting lists.'}
      </div>

      {/* Layout Selection */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8B949E]">
          {isRo ? '1. Configurație Spațială:' : isRu ? '1. Конфигурация помещения:' : '1. Spatial Layout:'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {KITCHEN_LAYOUT_TYPES.map((t) => {
            const isSelected = layoutType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`flex flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-[#17789E] bg-[#0F5773]'
                    : 'border-white/[0.08] bg-[#14171C] hover:bg-[#1C2027]'
                }`}
                onClick={() => setLayoutType(t.id)}
              >
                <strong className={`text-[13px] ${isSelected ? 'text-white' : 'text-[#F5F7FA]'}`}>
                  {isRo ? t.nameRo : isRu ? t.nameRu : t.nameEn}
                </strong>
                <span className={`text-[11px] ${isSelected ? 'text-[#C9D1D9]' : 'text-[#8B949E]'}`}>
                  {t.hasPeninsula ? (isRo ? 'Cu Peninsulă / Bar' : 'With Peninsula') : (isRo ? 'Standard de Perete' : 'Wall Standard')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parametric Dimension Sliders */}
      <div className="flex flex-col gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8B949E]">
          {isRo ? '2. Dimensiuni Perete & Înălțime:' : isRu ? '2. Размеры стен и потолка:' : '2. Wall Dimensions & Ceiling:'}
        </div>

        {/* Main Wall Width */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-[#C9D1D9]">
            <span>{isRo ? 'Perete Principal (Lățime):' : isRu ? 'Основная стена (Длина):' : 'Main Wall Width:'}</span>
            <strong className="font-mono text-[#F5F7FA]">{mainWallWidthCm} cm</strong>
          </div>
          <Slider
            min={200}
            max={600}
            step={10}
            value={[mainWallWidthCm]}
            onValueChange={(vals) => setMainWallWidthCm(vals[0] ?? 200)}
          />
        </div>

        {/* Return Wall Depth (for L and U) */}
        {(layoutType === 'l_corner' || layoutType === 'l_peninsula' || layoutType === 'u_shape') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-[#C9D1D9]">
              <span>{isRo ? 'Perete Secundar / Colț (Adâncime):' : isRu ? 'Угловая стена (Глубина):' : 'Return Wall Depth:'}</span>
              <strong className="font-mono text-[#F5F7FA]">{returnWallDepthCm} cm</strong>
            </div>
            <Slider
              min={120}
              max={400}
              step={10}
              value={[returnWallDepthCm]}
              onValueChange={(vals) => setReturnWallDepthCm(vals[0] ?? 120)}
            />
          </div>
        )}

        {/* Peninsula Length (for peninsula layouts) */}
        {(layoutType === 'l_peninsula' || layoutType === 'u_shape') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-[#C9D1D9]">
              <span>{isRo ? 'Lungime Peninsulă / Masă Bar:' : isRu ? 'Длина полуострова / стойки:' : 'Peninsula Length:'}</span>
              <strong className="font-mono text-[#F5F7FA]">{peninsulaLengthCm} cm</strong>
            </div>
            <Slider
              min={120}
              max={300}
              step={10}
              value={[peninsulaLengthCm]}
              onValueChange={(vals) => setPeninsulaLengthCm(vals[0] ?? 120)}
            />
          </div>
        )}

        {/* Room Height */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-[#C9D1D9]">
            <span>{isRo ? 'Înălțime Încăpere (Tavan):' : isRu ? 'Высота потолка:' : 'Ceiling Height:'}</span>
            <strong className="font-mono text-[#F5F7FA]">{roomHeightCm} cm</strong>
          </div>
          <Slider
            min={220}
            max={320}
            step={5}
            value={[roomHeightCm]}
            onValueChange={(vals) => setRoomHeightCm(vals[0] ?? 220)}
          />
        </div>
      </div>

      {/* Module Inclusions Checkboxes */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8B949E]">
          {isRo ? '3. Echipare Coloane & Dotări:' : isRu ? '3. Комплектация пеналов:' : '3. Modules & Features:'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#14171C] px-2.5 py-2 text-xs text-[#F5F7FA]">
            <span>{isRo ? 'Coloană Cuptor' : isRu ? 'Пенал с духовкой' : 'Oven Tall Unit'}</span>
            <Switch checked={includeOvenCol} onCheckedChange={setIncludeOvenCol} />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#14171C] px-2.5 py-2 text-xs text-[#F5F7FA]">
            <span>{isRo ? 'Coloană Frigider' : isRu ? 'Пенал холодильника' : 'Fridge Column'}</span>
            <Switch checked={includeFridgeCol} onCheckedChange={setIncludeFridgeCol} />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#14171C] px-2.5 py-2 text-xs text-[#F5F7FA]">
            <span>{isRo ? 'Mașină Spălat Vase' : isRu ? 'Посудомойка' : 'Dishwasher'}</span>
            <Switch checked={includeDishwasher} onCheckedChange={setIncludeDishwasher} />
          </label>
          {(layoutType === 'l_peninsula' || layoutType === 'u_shape') && (
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#14171C] px-2.5 py-2 text-xs text-[#F5F7FA]">
              <span>{isRo ? 'Activează Peninsulă' : isRu ? 'Полуостров' : 'Peninsula'}</span>
              <Switch checked={includePeninsula} onCheckedChange={setIncludePeninsula} />
            </label>
          )}
        </div>
      </div>

      {/* Engineering BOM Metrics Banner */}
      <div className="rounded-xl border border-white/[0.08] bg-[#14171C] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#F5F7FA]">
            📊 {isRo ? 'Consum Materiale Proiect:' : isRu ? 'Расход материалов:' : 'BOM Consumption:'}
          </span>
          <span className="rounded border border-[#355E43] bg-[#1F3627] px-1.5 py-0.5 text-[11px] font-medium text-white">
            {bomSummary.totalParts} {isRo ? 'piese' : 'repere'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[#8B949E]">{isRo ? 'Carcasă PAL:' : 'Carcass PAL:'}</span>{' '}
            <strong className="text-[#F5F7FA]">{bomSummary.carcassSqM} m²</strong>
          </div>
          <div>
            <span className="text-[#8B949E]">{isRo ? 'Fațade MDF:' : 'Facades MDF:'}</span>{' '}
            <strong className="text-[#F5F7FA]">{bomSummary.facadeSqM} m²</strong>
          </div>
          <div>
            <span className="text-[#8B949E]">{isRo ? 'Blat Termo:' : 'Worktop:'}</span>{' '}
            <strong className="text-[#F5F7FA]">{bomSummary.countertopLinM} ml</strong>
          </div>
          <div>
            <span className="text-[#8B949E]">{isRo ? 'Cant ABS:' : 'Edge ABS:'}</span>{' '}
            <strong className="text-[#F5F7FA]">{bomSummary.edgeBandingLinM} ml</strong>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#17789E] bg-[#0F5773] p-3 text-xs font-semibold text-white hover:bg-[#146E91] disabled:opacity-50 transition cursor-pointer"
          onClick={handleGenerateKitchen}
          disabled={generating}
        >
          <span>{generating ? '⏳' : '🚀'}</span>
          <span>
            {generating
              ? (isRo ? 'Se generează compoziția...' : 'Generating...')
              : (isRo ? 'Inserează Bucătăria Modulară în Scenă' : isRu ? 'Вставить кухню в проект' : 'Insert Modular Kitchen into Scene')}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#355E43] bg-[#1F3627] px-2.5 py-2 text-xs font-medium text-white hover:bg-[#2A4935] transition-colors cursor-pointer"
            onClick={handleDownloadCsv}
            title={isRo ? 'Descarcă fișier CSV cu toate panourile pentru utilaje debitare' : 'Download CSV Cutting List'}
          >
            <span>📥</span>
            <span>{isRo ? 'Export CSV Debitare' : isRu ? 'Экспорт в CSV' : 'Export Cut CSV'}</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#1C2027] px-2.5 py-2 text-xs font-medium text-[#C9D1D9] hover:bg-[#262B34] hover:text-white transition-colors cursor-pointer"
            onClick={() => setShowPanelInspector(!showPanelInspector)}
          >
            <span>{showPanelInspector ? '▲' : '📋'}</span>
            <span>{showPanelInspector ? (isRo ? 'Închide Panou' : 'Close') : (isRo ? 'Listă Detalii' : 'Parts List')}</span>
          </button>
        </div>
      </div>

      {/* Expanded Panel Inspector List */}
      {showPanelInspector && (
        <div className="mt-1 max-h-[260px] overflow-y-auto rounded-lg border border-white/[0.08] bg-[#090A0C] p-2.5">
          <div className="mb-1.5 text-xs font-semibold text-[#F5F7FA]">
            {isRo ? 'Specificație Detaliată Piese Mobilă:' : 'Detailed Parts Specification:'}
          </div>
          <table className="w-full border-collapse text-[11px] text-[#C9D1D9]">
            <thead>
              <tr className="border-b border-white/[0.08] text-left text-[#8B949E]">
                <th className="p-1">Corp</th>
                <th className="p-1">Piesă</th>
                <th className="p-1">Dimensiune</th>
                <th className="p-1 text-center">Buc</th>
              </tr>
            </thead>
            <tbody>
              {currentComposition.panelCuttingList.map((p: any, idx: number) => (
                <tr key={idx} className="border-b border-white/[0.04]">
                  <td className="p-1 text-[#8B949E]">{p.cabinet}</td>
                  <td className="p-1 text-[#F5F7FA]">{p.partName}</td>
                  <td className="p-1 font-mono text-[#C9D1D9]">
                    {p.lengthMm}×{p.widthMm}
                  </td>
                  <td className="p-1 text-center">{p.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
