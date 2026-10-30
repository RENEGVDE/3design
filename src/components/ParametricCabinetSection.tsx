'use client';

import React, { useState } from 'react';
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
    <div className="side-section" id="parametric-cabinet-studio">
      <div className="section-title">
        <span>📐</span>
        <span>
          {isRo
            ? 'Studio Mobilă Parametrică (Creează Corpuri)'
            : isRu
            ? 'Студия параметрической мебели'
            : 'Parametric Furniture Studio'}
        </span>
      </div>

      <div className="section-subtitle">
        {isRo
          ? 'Configurează și adaugă corpuri modulare de bucătărie cu uși și sertare interactive, fără cunoștințe CAD.'
          : isRu
          ? 'Создавайте модульные шкафы с открывающимися дверьми и ящиками без навыков CAD.'
          : 'Configure & place custom kitchen cabinets with opening doors & drawers, no CAD experience needed.'}
      </div>

      {/* Archetype Selector Badges */}
      <div className="control-group" style={{ marginTop: '10px' }}>
        <label className="input-label">
          {isRo ? '1. Alege Tipul de Corp:' : isRu ? '1. Выберите тип корпуса:' : '1. Choose Cabinet Type:'}
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            marginTop: '6px'
          }}
        >
          {CABINET_ARCHETYPES.map((arch) => {
            const isSelected = arch.id === archetypeId;
            const labels = {
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
            const icons = {
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
                onClick={() => handleSelectArchetype(arch)}
                className={`btn-pill ${isSelected ? 'active' : ''}`}
                style={{
                  fontSize: '11px',
                  padding: '6px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  lineHeight: '1.2'
                }}
              >
                <span style={{ fontSize: '14px' }}>{icons[arch.id] || '📦'}</span>
                <span>{labels[arch.id] || arch.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Name Input */}
      <div className="control-group" style={{ marginTop: '10px' }}>
        <label className="input-label">
          {isRo ? 'Nume Corp:' : isRu ? 'Название корпуса:' : 'Cabinet Name:'}
        </label>
        <input
          type="text"
          value={cabinetName}
          onChange={(e) => setCabinetName(e.target.value)}
          className="search-input"
          style={{ width: '100%', marginTop: '4px' }}
        />
      </div>

      {/* Dimension Sliders */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginTop: '10px'
        }}
      >
        <div>
          <label className="input-label" style={{ fontSize: '11px' }}>
            {isRo ? 'Lățime' : isRu ? 'Ширина' : 'Width'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="number"
              min="20"
              max="150"
              value={widthCm}
              onChange={(e) => setWidthCm(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>cm</span>
          </div>
        </div>

        <div>
          <label className="input-label" style={{ fontSize: '11px' }}>
            {isRo ? 'Înălțime' : isRu ? 'Высота' : 'Height'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="number"
              min="30"
              max="260"
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>cm</span>
          </div>
        </div>

        <div>
          <label className="input-label" style={{ fontSize: '11px' }}>
            {isRo ? 'Adâncime' : isRu ? 'Глубина' : 'Depth'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="number"
              min="20"
              max="90"
              value={depthCm}
              onChange={(e) => setDepthCm(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>cm</span>
          </div>
        </div>
      </div>

      {/* Quick Standard Sizes */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
        {[30, 40, 45, 50, 60, 80, 90].map((sz) => (
          <button
            key={sz}
            onClick={() => setWidthCm(sz)}
            className="btn-pill"
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              opacity: widthCm === sz ? 1 : 0.65,
              borderColor: widthCm === sz ? '#38bdf8' : 'rgba(255,255,255,0.1)'
            }}
          >
            {sz}cm
          </button>
        ))}
      </div>

      {/* Shelves & Plinth */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginTop: '10px'
        }}
      >
        <div>
          <label className="input-label" style={{ fontSize: '11px' }}>
            {isRo ? 'Număr Polițe:' : isRu ? 'Полок:' : 'Shelves:'} {shelvesCount}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={shelvesCount}
            onChange={(e) => setShelvesCount(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#38bdf8' }}
          />
        </div>

        <div>
          <label className="input-label" style={{ fontSize: '11px' }}>
            {isRo ? 'Soclu / Plintă:' : isRu ? 'Цоколь:' : 'Plinth:'} {plinthHeightCm}cm
          </label>
          <input
            type="range"
            min="0"
            max="15"
            step="5"
            value={plinthHeightCm}
            onChange={(e) => setPlinthHeightCm(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#38bdf8' }}
          />
        </div>
      </div>

      {/* Add Button */}
      <button
        className="btn-primary"
        onClick={handleAddCabinet}
        disabled={generating}
        style={{
          width: '100%',
          marginTop: '12px',
          padding: '10px',
          fontSize: '13px',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '8px',
          border: 'none',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
          cursor: generating ? 'wait' : 'pointer'
        }}
      >
        {generating
          ? (isRo ? '⏳ Se generează...' : isRu ? '⏳ Генерация...' : '⏳ Generating...')
          : `➕ ${isRo ? 'Adaugă Corpul în Scenă 3D' : isRu ? 'Добавить шкаф в 3D сцену' : 'Add Cabinet to 3D Scene'}`}
      </button>

      {/* Production & Workshop Export Tools */}
      <div
        style={{
          marginTop: '14px',
          padding: '10px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#38bdf8',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {isRo ? 'Producție & Export Atelier (Bazis / CNC)' : isRu ? 'Экспорт для производства' : 'Production & Workshop Export'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            className="btn-secondary"
            onClick={handleExportAllCuttingLists}
            style={{
              padding: '7px 10px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
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
              className="btn-secondary"
              onClick={onCaptureScreenshot}
              style={{
                padding: '7px 10px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
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

