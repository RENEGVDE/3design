'use client';

import React, { useState } from 'react';
import { Slider } from './ui/slider';
import {
  CABINET_ARCHETYPES,
  buildParametricCabinetHierarchy,
  buildCuttingList,
  generateCuttingListCsv,
  downloadFile,
  exportToGlbArrayBuffer
} from '../utils/parametricCabinet';
import { arrayBufferToBase64 } from '../utils/glbImporter';

export default function ParametricCabinetSection({
  lang = 'ro',
  materials = [],
  activeMatId = null,
  onMountGeneratedCabinet,
  placedCabinets = [],
  onDeleteCabinet,
  onSelectCabinet,
  selectedCabinetId = null,
  onToggleCabinetOpen,
  onCaptureScreenshot
}: any) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [archetypeId, setArchetypeId] = useState('base_single_door');
  const [cabinetName, setCabinetName] = useState('Corp Bază 60cm');
  const [widthCm, setWidthCm] = useState(60);
  const [heightCm, setHeightCm] = useState(82);
  const [depthCm, setDepthCm] = useState(56);
  const [shelvesCount, setShelvesCount] = useState(1);
  const [plinthHeightCm, setPlinthHeightCm] = useState(10);
  const [handleType, setHandleType] = useState('bar');
  const [generating, setGenerating] = useState(false);

  const selectedArchetype =
    CABINET_ARCHETYPES.find((a) => a.id === archetypeId) ||
    CABINET_ARCHETYPES[0];

  const handleSelectArchetype = (arch) => {
    setArchetypeId(arch.id);
    setWidthCm(arch.defaultWidthCm);
    setHeightCm(arch.defaultHeightCm);
    setDepthCm(arch.defaultDepthCm);
    setShelvesCount(arch.defaultShelves);
    setPlinthHeightCm(arch.defaultPlinthCm);

    const defaultNames = {
      base_single_door: isRo ? 'Corp Bază 1 Ușă' : isRu ? 'Нижний шкаф 1 дверь' : 'Base Cabinet 1 Door',
      base_double_door: isRo ? 'Corp Bază 2 Uși' : isRu ? 'Нижний шкаф 2 двери' : 'Base Cabinet 2 Doors',
      base_drawers_3: isRo ? 'Corp Bază 3 Sertare' : isRu ? 'Тумба 3 ящика' : 'Base 3 Drawers',
      base_sink: isRo ? 'Mască Chiuvetă' : isRu ? 'Шкаф под мойку' : 'Sink Base Cabinet',
      upper_single_door: isRo ? 'Corp Suspendat 1 Ușă' : isRu ? 'Навесной шкаф 1 дверь' : 'Upper Wall 1 Door',
      upper_double_door: isRo ? 'Corp Suspendat 2 Uși' : isRu ? 'Навесной шкаф 2 двери' : 'Upper Wall 2 Doors',
      upper_aventos: isRo ? 'Corp Rabatabil Aventos' : isRu ? 'Навесной Авентос' : 'Upper Aventos Lift',
      tall_column: isRo ? 'Coloană Înaltă Soldat' : isRu ? 'Высокий пенал' : 'Tall Larder Column',
      open_shelf: isRo ? 'Raft Deschis' : isRu ? 'Открытая полка' : 'Open Shelf Unit'
    };
    setCabinetName(defaultNames[arch.id] || 'Corp Nou');
  };

  const handleAddCabinet = async () => {
    setGenerating(true);
    try {
      const activeMat = materials.find((m) => m.id === activeMatId);
      const chosenColor = activeMat?.colorHex || '#f4f4f2';

      const config = {
        id: `param_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: cabinetName.trim() || 'Corp Mobilier',
        archetypeId,
        widthCm: Number(widthCm),
        heightCm: Number(heightCm),
        depthCm: Number(depthCm),
        shelvesCount: Number(shelvesCount),
        plinthHeightCm: Number(plinthHeightCm),
        handleType,
        carcassColor: chosenColor,
        facadeColor: chosenColor
      };

      const threeGroup = buildParametricCabinetHierarchy(config);
      const glbBuffer = await exportToGlbArrayBuffer(threeGroup);
      const b64Data = arrayBufferToBase64(glbBuffer);

      // Default positioning: place on floor with comfortable camera distance
      const spawnX = (placedCabinets.length * 0.7) + 0.5;
      const spawnY = selectedArchetype.category === 'upper' ? 1.45 : 0.0;
      const spawnZ = 2.0;

      if (onMountGeneratedCabinet) {
        await onMountGeneratedCabinet(
          glbBuffer,
          b64Data,
          config.id,
          config.name,
          {
            position: [spawnX, spawnY, spawnZ],
            rotationYDeg: 0,
            scale: [1, 1, 1]
          },
          config
        );
      }
    } catch (err) {
      console.error('Error generating parametric cabinet:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Export cutting list for all placed custom cabinets combined
  const handleExportAllCuttingLists = () => {
    if (!placedCabinets.length) {
      // Export current previewed cabinet
      const currentConfig = {
        name: cabinetName,
        archetypeId,
        widthCm,
        heightCm,
        depthCm,
        shelvesCount,
        plinthHeightCm
      };
      const parts = buildCuttingList(currentConfig);
      const csv = generateCuttingListCsv(parts);
      downloadFile(csv, `lista_debitare_${cabinetName.replace(/\s+/g, '_')}.csv`, 'text/csv;charset=utf-8');
      return;
    }

    let allParts = [];
    placedCabinets.forEach((cab) => {
      const cfg = cab.parametricConfig || {
        name: cab.name,
        archetypeId: 'base_single_door',
        widthCm: cab.baseDimsCm?.w || 60,
        heightCm: cab.baseDimsCm?.h || 82,
        depthCm: cab.baseDimsCm?.d || 56,
        shelvesCount: 1,
        plinthHeightCm: 10
      };
      allParts = allParts.concat(buildCuttingList(cfg));
    });

    const csv = generateCuttingListCsv(allParts);
    downloadFile(csv, `lista_debitare_completa_${Date.now()}.csv`, 'text/csv;charset=utf-8');
  };

  return (
    <div className="flex flex-col gap-3" id="parametric-cabinet-studio">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
        <span>📐</span>
        <span>
          {isRo
            ? 'Studio Mobilă Parametrică (Creează Corpuri)'
            : isRu
            ? 'Студия параметрической мебели'
            : 'Parametric Furniture Studio'}
        </span>
      </div>

      <div className="text-[11px] leading-relaxed text-slate-400">
        {isRo
          ? 'Configurează și adaugă corpuri modulare de bucătărie cu uși și sertare interactive, fără cunoștințe CAD.'
          : isRu
          ? 'Создавайте модульные шкафы с открывающимися дверьми и ящиками без навыков CAD.'
          : 'Configure & place custom kitchen cabinets with opening doors & drawers, no CAD experience needed.'}
      </div>

      {/* Archetype Selector Badges */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {isRo ? '1. Alege Tipul de Corp:' : isRu ? '1. Выберите тип корпуса:' : '1. Choose Cabinet Type:'}
        </label>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {CABINET_ARCHETYPES.map((arch) => {
            const isSelected = arch.id === archetypeId;
            const labels: Record<string, string> = {
              base_single_door: isRo ? 'Bază 1 Ușă' : isRu ? 'Низ 1Дв' : 'Base 1D',
              base_double_door: isRo ? 'Bază 2 Uși' : isRu ? 'Низ 2Дв' : 'Base 2D',
              base_drawers_3: isRo ? '3 Sertare' : isRu ? '3 Ящика' : '3 Drawers',
              base_sink: isRo ? 'Chiuvetă' : isRu ? 'Мойка' : 'Sink Unit',
              upper_single_door: isRo ? 'Suspendat 1U' : isRu ? 'Верх 1Дв' : 'Upper 1D',
              upper_double_door: isRo ? 'Suspendat 2U' : isRu ? 'Верх 2Дв' : 'Upper 2D',
              upper_aventos: isRo ? 'Aventos' : isRu ? 'Авентос' : 'Aventos',
              tall_column: isRo ? 'Coloană' : isRu ? 'Пенал' : 'Tall Unit',
              open_shelf: isRo ? 'Raft Deschis' : isRu ? 'Полка' : 'Open Shelf'
            };
            const icons: Record<string, string> = {
              base_single_door: '🗄️',
              base_double_door: '🚪',
              base_drawers_3: '🗃️',
              base_sink: '🚰',
              upper_single_door: '🔲',
              upper_double_door: '🔳',
              upper_aventos: '⬆️',
              tall_column: '🏛️',
              open_shelf: '📐'
            };

            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => handleSelectArchetype(arch)}
                className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[11px] leading-tight transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="text-sm">{icons[arch.id] || '📦'}</span>
                <span>{labels[arch.id] || arch.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Name Input */}
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-400">
          {isRo ? 'Nume Corp:' : isRu ? 'Название корпуса:' : 'Cabinet Name:'}
        </label>
        <input
          type="text"
          value={cabinetName}
          onChange={(e) => setCabinetName(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-slate-950/75 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
        />
      </div>

      {/* Dimension Inputs */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-400">
            {isRo ? 'Lățime' : isRu ? 'Ширина' : 'Width'}
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="20"
              max="150"
              value={widthCm}
              onChange={(e) => setWidthCm(Number(e.target.value))}
              className="w-full rounded-md border border-white/15 bg-white/5 px-1.5 py-1 text-xs text-white outline-none focus:border-sky-400"
            />
            <span className="text-[10px] text-slate-400">cm</span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-400">
            {isRo ? 'Înălțime' : isRu ? 'Высота' : 'Height'}
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="30"
              max="260"
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="w-full rounded-md border border-white/15 bg-white/5 px-1.5 py-1 text-xs text-white outline-none focus:border-sky-400"
            />
            <span className="text-[10px] text-slate-400">cm</span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-400">
            {isRo ? 'Adâncime' : isRu ? 'Глубина' : 'Depth'}
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="20"
              max="90"
              value={depthCm}
              onChange={(e) => setDepthCm(Number(e.target.value))}
              className="w-full rounded-md border border-white/15 bg-white/5 px-1.5 py-1 text-xs text-white outline-none focus:border-sky-400"
            />
            <span className="text-[10px] text-slate-400">cm</span>
          </div>
        </div>
      </div>

      {/* Quick Standard Sizes */}
      <div className="flex flex-wrap gap-1">
        {[30, 40, 45, 50, 60, 80, 90].map((sz) => (
          <button
            key={sz}
            type="button"
            onClick={() => setWidthCm(sz)}
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
              widthCm === sz
                ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            {sz}cm
          </button>
        ))}
      </div>

      {/* Shelves & Plinth */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-slate-300">
            {isRo ? 'Număr Polițe:' : isRu ? 'Полок:' : 'Shelves:'}{' '}
            <strong className="text-sky-400">{shelvesCount}</strong>
          </label>
          <Slider
            min={0}
            max={5}
            step={1}
            value={[shelvesCount]}
            onValueChange={(vals) => setShelvesCount(vals[0] ?? 0)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-slate-300">
            {isRo ? 'Soclu / Plintă:' : isRu ? 'Цоколь:' : 'Plinth:'}{' '}
            <strong className="text-sky-400">{plinthHeightCm}cm</strong>
          </label>
          <Slider
            min={0}
            max={15}
            step={5}
            value={[plinthHeightCm]}
            onValueChange={(vals) => setPlinthHeightCm(vals[0] ?? 0)}
          />
        </div>
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={handleAddCabinet}
        disabled={generating}
        className={`mt-1 w-full rounded-lg bg-gradient-to-br from-sky-600 to-sky-700 p-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(2,132,199,0.35)] hover:brightness-110 transition ${
          generating ? 'cursor-wait opacity-70' : 'cursor-pointer'
        }`}
      >
        {generating
          ? (isRo ? '⏳ Se generează...' : isRu ? '⏳ Генерация...' : '⏳ Generating...')
          : `➕ ${isRo ? 'Adaugă Corpul în Scenă 3D' : isRu ? 'Добавить шкаф в 3D сцену' : 'Add Cabinet to 3D Scene'}`}
      </button>

      {/* Production & Workshop Export Tools */}
      <div className="mt-1 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-400">
          {isRo ? 'Producție & Export Atelier (CAD / CNC)' : isRu ? 'Экспорт для производства' : 'Production & Workshop Export'}
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            onClick={handleExportAllCuttingLists}
          >
            <span>📐</span>
            <span>
              {isRo
                ? 'Descarcă Listă de Debitare (CSV / Excel)'
                : isRu
                ? 'Скачать карту раскроя (CSV)'
                : 'Download Cutting List (CSV)'}
            </span>
          </button>

          {onCaptureScreenshot && (
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={onCaptureScreenshot}
            >
              <span>📸</span>
              <span>
                {isRo ? 'Salvează Poză HD (Randare PNG)' : isRu ? 'Сохранить HD рендер (PNG)' : 'Export HD Render (PNG)'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

