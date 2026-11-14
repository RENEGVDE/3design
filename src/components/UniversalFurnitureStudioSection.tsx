'use client';

import React, { useState, useMemo } from 'react';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import {
  UNIVERSAL_FURNITURE_TYPES,
  buildUniversalFurniture
} from '../utils/universalFurnitureGenerator';
import {
  exportToGlbArrayBuffer,
  generateCuttingListCsv,
  downloadFile
} from '../utils/parametricCabinet';
import { arrayBufferToBase64 } from '../utils/glbImporter';

export default function UniversalFurnitureStudioSection({
  lang = 'ro',
  materials = [],
  activeMatId = null,
  onMountGeneratedFurniture,
  onCaptureScreenshot
}) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [furnitureTypeId, setFurnitureTypeId] = useState('wardrobe_sliding');
  const [furnitureName, setFurnitureName] = useState('Dressing Uși Culisante');
  const [widthCm, setWidthCm] = useState(200);
  const [heightCm, setHeightCm] = useState(240);
  const [depthCm, setDepthCm] = useState(65);
  const [sectionsCount, setSectionsCount] = useState(2);
  const [shelvesPerSection, setShelvesPerSection] = useState(3);
  const [mountType, setMountType] = useState('floor');
  const [hasClothesRail, setHasClothesRail] = useState(true);
  const [facadeStyle, setFacadeStyle] = useState('sliding');
  const [handleType, setHandleType] = useState('bar_black');
  const [legType, setLegType] = useState('plinth');
  const [hasLedGlow, setHasLedGlow] = useState(false);

  const [showPanelTable, setShowPanelTable] = useState(false);
  const [generating, setGenerating] = useState(false);

  const selectedType = useMemo(
    () => UNIVERSAL_FURNITURE_TYPES.find((t) => t.id === furnitureTypeId) || UNIVERSAL_FURNITURE_TYPES[0],
    [furnitureTypeId]
  );

  const handleSelectType = (t) => {
    setFurnitureTypeId(t.id);
    setWidthCm(t.defaultW);
    setHeightCm(t.defaultH);
    setDepthCm(t.defaultD);
    setSectionsCount(t.defaultSections);
    setShelvesPerSection(t.defaultShelves);
    setHasClothesRail(t.hasRail);

    if (t.id === 'wardrobe_sliding') setFacadeStyle('sliding');
    else if (t.id === 'chest_of_drawers' || t.id === 'nightstand') setFacadeStyle('drawers');
    else if (t.id === 'bookcase_shelving') setFacadeStyle('open');
    else setFacadeStyle('doors');

    const defaultNames = {
      wardrobe_sliding: isRo ? 'Dressing Uși Culisante' : isRu ? 'Шкаф-купе' : 'Sliding Wardrobe',
      wardrobe_hinged: isRo ? 'Dulap Haine 2 Uși' : isRu ? 'Шкаф распашной' : 'Hinged Wardrobe',
      tv_media_unit: isRo ? 'Comodă TV Living' : isRu ? 'ТВ-тумба' : 'TV Console',
      bookcase_shelving: isRo ? 'Bibliotecă & Rafturi' : isRu ? 'Книжный шкаф' : 'Bookcase',
      chest_of_drawers: isRo ? 'Comodă Sertare' : isRu ? 'Комод' : 'Chest of Drawers',
      nightstand: isRo ? 'Noptieră Dormitor' : isRu ? 'Тумбочка' : 'Nightstand',
      office_desk: isRo ? 'Birou de Lucru' : isRu ? 'Письменный стол' : 'Work Desk',
      bathroom_vanity: isRo ? 'Mobilier Baie Lavoar' : isRu ? 'Тумба в ванную' : 'Bathroom Vanity',
      freeform_custom: isRo ? 'Corp Parametric Custom' : isRu ? 'Модуль на заказ' : 'Custom Cabinet'
    };
    setFurnitureName(defaultNames[t.id] || 'Mobilier');
  };

  const activeMat = useMemo(
    () => materials.find((m) => m.id === activeMatId) || null,
    [materials, activeMatId]
  );

  const currentComposition = useMemo(() => {
    return buildUniversalFurniture({
      name: furnitureName,
      furnitureTypeId,
      widthCm,
      heightCm,
      depthCm,
      sectionsCount,
      shelvesPerSection,
      mountType,
      hasClothesRail,
      facadeStyle,
      carcassColor: activeMat?.colorHex || '#f4f4f2',
      facadeColor: activeMat?.colorHex || '#f4f4f2',
      handleType,
      legType,
      hasLedGlow
    });
  }, [furnitureName, furnitureTypeId, widthCm, heightCm, depthCm, sectionsCount, shelvesPerSection, mountType, hasClothesRail, facadeStyle, activeMat, handleType, legType, hasLedGlow]);

  const bomMetrics = useMemo(() => {
    let carcassSqM = 0;
    let facadeSqM = 0;
    currentComposition.panelCuttingList.forEach((p) => {
      const sqM = ((p.lengthMm * p.widthMm) / 1000000) * p.qty;
      if (p.material.includes('PAL')) carcassSqM += sqM;
      else if (p.material.includes('MDF') || p.material.includes('Ușă')) facadeSqM += sqM;
    });
    return {
      carcassSqM: carcassSqM.toFixed(2),
      facadeSqM: facadeSqM.toFixed(2),
      totalParts: currentComposition.panelCuttingList.length
    };
  }, [currentComposition]);

  const handleGenerateFurniture = async () => {
    setGenerating(true);
    try {
      const glbBuffer = await exportToGlbArrayBuffer(currentComposition.root);
      const b64Data = arrayBufferToBase64(glbBuffer);
      const furnId = `furn_${Date.now()}`;

      const spawnY = mountType === 'floating' ? 0.45 : 0.0;
      const spawnZ = 2.2;

      if (onMountGeneratedFurniture) {
        await onMountGeneratedFurniture(
          glbBuffer,
          b64Data,
          furnId,
          furnitureName,
          {
            position: [1.8, spawnY, spawnZ],
            rotationYDeg: 0,
            scale: [1, 1, 1]
          },
          {
            furnitureTypeId,
            widthCm,
            heightCm,
            depthCm,
            sectionsCount,
            shelvesPerSection,
            mountType,
            hasClothesRail,
            facadeStyle,
            handleType,
            legType,
            hasLedGlow,
            panelCuttingList: currentComposition.panelCuttingList
          }
        );
      }
    } catch (err) {
      console.error('Error generating universal furniture:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCsv = () => {
    const csv = generateCuttingListCsv(currentComposition.panelCuttingList);
    downloadFile(
      csv,
      `debitare_${furnitureName.replace(/\s+/g, '_')}_${Date.now()}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  return (
    <div className="flex flex-col gap-3" id="universal-furniture-studio">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
        <span>🛋️</span>
        <span>
          {isRo
            ? 'Studio Mobilă Universală (CAD Studio)'
            : isRu
            ? 'Студия Универсальной Мебели (CAD Studio)'
            : 'Universal Furniture CAD Studio'}
        </span>
      </div>

      <div className="text-[11px] leading-relaxed text-slate-400">
        {isRo
          ? 'Proiectează orice tip de mobilier: dressinguri culisante, comode TV, biblioteci, birouri, mobilier dormitor & baie de orice formă și dimensiune.'
          : isRu
          ? 'Проектируйте любую корпусную мебель: шкафы-купе, ТВ-тумбы, стеллажи, письменные столы, комоды и гарнитуры любых форм и размеров.'
          : 'Design any kind of furniture: sliding wardrobes, media consoles, bookcases, desks, chests & vanities of any custom shape & size.'}
      </div>

      {/* 1. Category Selector */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {isRo ? '1. Tip & Destinație Mobilier:' : isRu ? '1. Назначение и тип мебели:' : '1. Furniture Destination & Type:'}
        </label>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {UNIVERSAL_FURNITURE_TYPES.map((t) => {
            const isSel = t.id === furnitureTypeId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectType(t)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center text-[10px] leading-tight transition-colors cursor-pointer ${
                  isSel
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="text-[15px]">{t.nameRo.slice(0, 2)}</span>
                <span>{isRo ? t.nameRo.slice(3) : isRu ? t.nameRu.slice(3) : t.nameEn.slice(3)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Furniture Name */}
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-400">
          {isRo ? 'Nume Proiect:' : isRu ? 'Название изделия:' : 'Item Name:'}
        </label>
        <input
          type="text"
          value={furnitureName}
          onChange={(e) => setFurnitureName(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-slate-950/75 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
        />
      </div>

      {/* 3. Parametric Dimensions (cm) */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
        <div className="mb-2 text-[11px] font-semibold text-sky-400">
          {isRo ? '2. Dimensiuni Gabarit (cm):' : isRu ? '2. Габаритные размеры (см):' : '2. Dimensions (cm):'}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-slate-400">
              {isRo ? 'Lățime (X):' : isRu ? 'Ширина (X):' : 'Width (X):'}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="30"
                max="400"
                step="5"
                value={widthCm}
                onChange={(e) => setWidthCm(Number(e.target.value))}
                className="w-full rounded-md border border-white/15 bg-white/5 px-1.5 py-1 text-xs text-white outline-none focus:border-sky-400"
              />
              <span className="text-[10px] text-slate-400">cm</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] text-slate-400">
              {isRo ? 'Înălțime (Y):' : isRu ? 'Высота (Y):' : 'Height (Y):'}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="30"
                max="300"
                step="5"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full rounded-md border border-white/15 bg-white/5 px-1.5 py-1 text-xs text-white outline-none focus:border-sky-400"
              />
              <span className="text-[10px] text-slate-400">cm</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] text-slate-400">
              {isRo ? 'Adâncime (Z):' : isRu ? 'Глубина (Z):' : 'Depth (Z):'}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="20"
                max="120"
                step="5"
                value={depthCm}
                onChange={(e) => setDepthCm(Number(e.target.value))}
                className="w-full rounded-md border border-white/15 bg-white/5 px-1.5 py-1 text-xs text-white outline-none focus:border-sky-400"
              />
              <span className="text-[10px] text-slate-400">cm</span>
            </div>
          </div>
        </div>

        {/* Compartimentare & Polițe */}
        <div className="mt-2.5 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-300">
              {isRo ? 'Compartimente Verticale:' : isRu ? 'Вертикальных секций:' : 'Vertical Sections:'}{' '}
              <strong className="text-sky-400">{sectionsCount}</strong>
            </label>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[sectionsCount]}
              onValueChange={(vals) => setSectionsCount(vals[0] ?? 1)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-300">
              {isRo ? 'Polițe pe Compartiment:' : isRu ? 'Полок в секции:' : 'Shelves per section:'}{' '}
              <strong className="text-sky-400">{shelvesPerSection}</strong>
            </label>
            <Slider
              min={0}
              max={8}
              step={1}
              value={[shelvesPerSection]}
              onValueChange={(vals) => setShelvesPerSection(vals[0] ?? 0)}
            />
          </div>
        </div>
      </div>

      {/* 4. Facade & Functional Equipment */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold text-slate-300">
          {isRo ? '3. Tip Închidere & Funcțiuni:' : isRu ? '3. Фасады и наполнение:' : '3. Facade Style & Features:'}
        </label>
        <div className="grid grid-cols-4 gap-1">
          {[
            { id: 'sliding', ro: 'Culisant', ru: 'Купе', en: 'Sliding' },
            { id: 'doors', ro: 'Batant', ru: 'Распашной', en: 'Hinged' },
            { id: 'drawers', ro: 'Sertare', ru: 'Ящики', en: 'Drawers' },
            { id: 'open', ro: 'Deschis', ru: 'Открыто', en: 'Open' }
          ].map((fst) => (
            <button
              key={fst.id}
              type="button"
              onClick={() => setFacadeStyle(fst.id)}
              className={`rounded-md border px-1 py-1.5 text-[10px] font-medium transition-colors cursor-pointer ${
                facadeStyle === fst.id
                  ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {isRo ? fst.ro : isRu ? fst.ru : fst.en}
            </button>
          ))}
        </div>

        {/* Feronerie: Mânere & Butoni */}
        <div className="mt-2.5">
          <label className="mb-1 block text-[10px] font-medium text-slate-400">
            {isRo ? 'Mânere & Feronerie Fațadă:' : isRu ? 'Ручки и фурнитура фасадов:' : 'Handles & Hardware:'}
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'bar_black', ro: 'Bară Negru', ru: 'Черная рейка', en: 'Black Bar' },
              { id: 'bar_gold', ro: 'Bară Auriu', ru: 'Золотая рейка', en: 'Gold Bar' },
              { id: 'bar_chrome', ro: 'Bară Inox', ru: 'Хром рейка', en: 'Chrome Bar' },
              { id: 'knob_black', ro: 'Buton Negru', ru: 'Черная кнопка', en: 'Black Knob' },
              { id: 'knob_gold', ro: 'Buton Auriu', ru: 'Золотая кнопка', en: 'Gold Knob' },
              { id: 'none', ro: 'Push / Fără', ru: 'Push-to-Open', en: 'Push-to-Open' }
            ].map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHandleType(h.id)}
                className={`rounded-md border px-1 py-1 text-[9.5px] font-medium transition-colors cursor-pointer ${
                  handleType === h.id
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {isRo ? h.ro : isRu ? h.ru : h.en}
              </button>
            ))}
          </div>
        </div>

        {/* Bază: Picioare & Soclu */}
        <div className="mt-2.5">
          <label className="mb-1 block text-[10px] font-medium text-slate-400">
            {isRo ? 'Bază & Suport:' : isRu ? 'Опора и цоколь:' : 'Base & Legs:'}
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: 'plinth', ro: 'Soclu PAL', ru: 'Цоколь ЛДСП', en: 'Plinth' },
              { id: 'legs_black', ro: 'Picioare Negre', ru: 'Ножки Черные', en: 'Black Legs' },
              { id: 'legs_gold', ro: 'Picioare Aurii', ru: 'Ножки Золото', en: 'Gold Legs' },
              { id: 'wall_hung', ro: 'Suspendat', ru: 'Подвесной', en: 'Wall-Hung' }
            ].map((lg) => (
              <button
                key={lg.id}
                type="button"
                onClick={() => setLegType(lg.id)}
                className={`rounded-md border px-1 py-1 text-[9.5px] font-medium transition-colors cursor-pointer ${
                  legType === lg.id
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {isRo ? lg.ro : isRu ? lg.ru : lg.en}
              </button>
            ))}
          </div>
        </div>

        {/* Optiuni Aditionale: Bara Haine & LED Ambient */}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-2.5 py-1.5 text-[11px] text-slate-200">
            <span>👔 {isRo ? 'Bară Haine' : isRu ? 'Штанга одежды' : 'Clothes Rail'}</span>
            <Switch checked={hasClothesRail} onCheckedChange={setHasClothesRail} />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-2.5 py-1.5 text-[11px] text-slate-200">
            <span>💡 {isRo ? 'Bandă LED' : isRu ? 'LED подсветка' : 'Ambient LED'}</span>
            <Switch checked={hasLedGlow} onCheckedChange={setHasLedGlow} />
          </label>
        </div>
      </div>

      {/* 5. Generate Button */}
      <button
        type="button"
        onClick={handleGenerateFurniture}
        disabled={generating}
        className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-sky-600 to-sky-700 p-3 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(2,132,199,0.4)] hover:brightness-110 transition ${
          generating ? 'cursor-wait opacity-70' : 'cursor-pointer'
        }`}
      >
        <span>🛋️</span>
        <span>
          {generating
            ? (isRo ? '⏳ Se construiește piesa...' : isRu ? '⏳ Генерация...' : '⏳ Building...')
            : (isRo ? 'Construiește Piesa de Mobilier în 3D' : isRu ? 'Сгенерировать мебель в 3D' : 'Build Furniture in 3D')}
        </span>
      </button>

      {/* 6. Live BOM & Panel Table */}
      <div>
        <button
          type="button"
          onClick={() => setShowPanelTable((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px] font-medium text-slate-200 hover:bg-white/[0.07] transition-colors cursor-pointer"
        >
          <span>📋 {isRo ? `Panouri & Debitări CAD (${bomMetrics.totalParts} repere)` : isRu ? `Деталировка CAD (${bomMetrics.totalParts} шт)` : `CAD Parts List (${bomMetrics.totalParts} pcs)`}</span>
          <span>{showPanelTable ? '▲' : '▼'}</span>
        </button>

        {showPanelTable && (
          <div className="mt-1.5 max-h-[260px] overflow-y-auto rounded-md border border-white/10 bg-[#0d1117] text-[10px]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.06] text-slate-400">
                  <th className="px-1.5 py-1">Denumire Piesă</th>
                  <th className="px-1.5 py-1">L (mm)</th>
                  <th className="px-1.5 py-1">W (mm)</th>
                  <th className="px-1.5 py-1">T</th>
                  <th className="px-1.5 py-1">Cant</th>
                </tr>
              </thead>
              <tbody>
                {currentComposition.panelCuttingList.map((p, idx) => (
                  <tr key={idx} className="border-b border-white/[0.04] text-slate-300">
                    <td className="px-1.5 py-1 text-sky-400">{p.partName}</td>
                    <td className="px-1.5 py-1 font-semibold">{p.lengthMm}</td>
                    <td className="px-1.5 py-1 font-semibold">{p.widthMm}</td>
                    <td className="px-1.5 py-1">{p.thicknessMm}</td>
                    <td className="px-1.5 py-1 text-slate-400">{p.edgeBanding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Export CSV & PNG */}
      <div className="flex gap-1.5">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 px-1.5 py-2 text-[11px] font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
          onClick={handleDownloadCsv}
        >
          <span>📐</span>
          <span>{isRo ? 'Descarcă CSV Debitare' : isRu ? 'Раскрой (CSV)' : 'Cutting CSV'}</span>
        </button>

        {onCaptureScreenshot && (
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 px-1.5 py-2 text-[11px] font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            onClick={onCaptureScreenshot}
          >
            <span>📸</span>
            <span>{isRo ? 'Poză HD' : isRu ? 'Рендер' : 'HD Render'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

