'use client';

import React, { useState, useMemo } from 'react';
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
    <div className="side-section" id="modular-kitchen-studio">
      <div className="section-title">
        <span>🏛️</span>
        <span>
          {isRo
            ? 'Studio Bucătărie Modulară CAD'
            : isRu
            ? 'Студия модульной кухни (Планировщик & CAD)'
            : 'Modular Kitchen CAD Studio'}
        </span>
      </div>

      <div className="section-subtitle">
        {isRo
          ? 'Proiectează bucătării complete de orice formă (L-Colț, Peninsulă, Liniară, Formă de U) cu blat continuu, electrocasnice și listă tehnică de panouri.'
          : isRu
          ? 'Проектируйте гарнитуры любой конфигурации (Угловая, П-образная, Полуостров, Прямая) с непрерывной столешницей и картами раскроя.'
          : 'Design full modular kitchens (L-Corner, Peninsula, Straight, U-Shape) with continuous worktops and engineering cutting lists.'}
      </div>

      {/* Layout Selection */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
          {isRo ? '1. Configurație Spațială:' : isRu ? '1. Конфигурация помещения:' : '1. Spatial Layout:'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {KITCHEN_LAYOUT_TYPES.map((t) => {
            const isSelected = layoutType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`btn-pill ${isSelected ? 'active' : ''}`}
                style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  borderRadius: '8px'
                }}
                onClick={() => setLayoutType(t.id)}
              >
                <strong style={{ fontSize: '0.8rem', color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                  {isRo ? t.nameRo : isRu ? t.nameRu : t.nameEn}
                </strong>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  {t.hasPeninsula ? (isRo ? 'Cu Peninsulă / Bar' : 'With Peninsula') : (isRo ? 'Standard de Perete' : 'Wall Standard')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parametric Dimension Sliders */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
          {isRo ? '2. Dimensiuni Perete & Înălțime:' : isRu ? '2. Размеры стен и потолка:' : '2. Wall Dimensions & Ceiling:'}
        </div>

        {/* Main Wall Width */}
        <div className="slider-row">
          <div className="slider-header">
            <span>{isRo ? 'Perete Principal (Lățime):' : isRu ? 'Основная стена (Длина):' : 'Main Wall Width:'}</span>
            <strong style={{ color: '#38bdf8' }}>{mainWallWidthCm} cm</strong>
          </div>
          <input
            type="range"
            min="200"
            max="600"
            step="10"
            value={mainWallWidthCm}
            onChange={(e) => setMainWallWidthCm(Number(e.target.value))}
            className="styled-slider"
          />
        </div>

        {/* Return Wall Depth (for L and U) */}
        {(layoutType === 'l_corner' || layoutType === 'l_peninsula' || layoutType === 'u_shape') && (
          <div className="slider-row">
            <div className="slider-header">
              <span>{isRo ? 'Perete Secundar / Colț (Adâncime):' : isRu ? 'Угловая стена (Глубина):' : 'Return Wall Depth:'}</span>
              <strong style={{ color: '#38bdf8' }}>{returnWallDepthCm} cm</strong>
            </div>
            <input
              type="range"
              min="120"
              max="400"
              step="10"
              value={returnWallDepthCm}
              onChange={(e) => setReturnWallDepthCm(Number(e.target.value))}
              className="styled-slider"
            />
          </div>
        )}

        {/* Peninsula Length (for peninsula layouts) */}
        {(layoutType === 'l_peninsula' || layoutType === 'u_shape') && (
          <div className="slider-row">
            <div className="slider-header">
              <span>{isRo ? 'Lungime Peninsulă / Masă Bar:' : isRu ? 'Длина полуострова / стойки:' : 'Peninsula Length:'}</span>
              <strong style={{ color: '#38bdf8' }}>{peninsulaLengthCm} cm</strong>
            </div>
            <input
              type="range"
              min="120"
              max="300"
              step="10"
              value={peninsulaLengthCm}
              onChange={(e) => setPeninsulaLengthCm(Number(e.target.value))}
              className="styled-slider"
            />
          </div>
        )}

        {/* Room Height */}
        <div className="slider-row">
          <div className="slider-header">
            <span>{isRo ? 'Înălțime Încăpere (Tavan):' : isRu ? 'Высота потолка:' : 'Ceiling Height:'}</span>
            <strong style={{ color: '#38bdf8' }}>{roomHeightCm} cm</strong>
          </div>
          <input
            type="range"
            min="220"
            max="320"
            step="5"
            value={roomHeightCm}
            onChange={(e) => setRoomHeightCm(Number(e.target.value))}
            className="styled-slider"
          />
        </div>
      </div>

      {/* Module Inclusions Checkboxes */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
          {isRo ? '3. Echipare Coloane & Dotări:' : isRu ? '3. Комплектация пеналов:' : '3. Modules & Features:'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <label className="toggle-label-box">
            <input
              type="checkbox"
              checked={includeOvenCol}
              onChange={(e) => setIncludeOvenCol(e.target.checked)}
            />
            <span>{isRo ? 'Coloană Cuptor' : isRu ? 'Пенал с духовкой' : 'Oven Tall Unit'}</span>
          </label>
          <label className="toggle-label-box">
            <input
              type="checkbox"
              checked={includeFridgeCol}
              onChange={(e) => setIncludeFridgeCol(e.target.checked)}
            />
            <span>{isRo ? 'Coloană Frigider' : isRu ? 'Пенал холодильника' : 'Fridge Column'}</span>
          </label>
          <label className="toggle-label-box">
            <input
              type="checkbox"
              checked={includeDishwasher}
              onChange={(e) => setIncludeDishwasher(e.target.checked)}
            />
            <span>{isRo ? 'Mașină Spălat Vase' : isRu ? 'Посудомойка' : 'Dishwasher'}</span>
          </label>
          {(layoutType === 'l_peninsula' || layoutType === 'u_shape') && (
            <label className="toggle-label-box">
              <input
                type="checkbox"
                checked={includePeninsula}
                onChange={(e) => setIncludePeninsula(e.target.checked)}
              />
              <span>{isRo ? 'Activează Peninsulă' : isRu ? 'Полуостров' : 'Peninsula'}</span>
            </label>
          )}
        </div>
      </div>

      {/* Engineering BOM Metrics Banner */}
      <div className="bom-metrics-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
            📊 {isRo ? 'Consum Materiale Proiect:' : isRu ? 'Расход материалов:' : 'BOM Consumption:'}
          </span>
          <span style={{ fontSize: '0.72rem', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
            {bomSummary.totalParts} {isRo ? 'piese' : 'repere'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
          <div>
            <span style={{ color: '#94a3b8' }}>{isRo ? 'Carcasă PAL:' : 'Carcass PAL:'}</span>{' '}
            <strong style={{ color: '#e2e8f0' }}>{bomSummary.carcassSqM} m²</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>{isRo ? 'Fațade MDF:' : 'Facades MDF:'}</span>{' '}
            <strong style={{ color: '#e2e8f0' }}>{bomSummary.facadeSqM} m²</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>{isRo ? 'Blat Termo:' : 'Worktop:'}</span>{' '}
            <strong style={{ color: '#e2e8f0' }}>{bomSummary.countertopLinM} ml</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>{isRo ? 'Cant ABS:' : 'Edge ABS:'}</span>{' '}
            <strong style={{ color: '#e2e8f0' }}>{bomSummary.edgeBandingLinM} ml</strong>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%', padding: '12px' }}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleDownloadCsv}
            title={isRo ? 'Descarcă fișier CSV cu toate panourile pentru utilaje debitare' : 'Download CSV Cutting List'}
          >
            <span>📥</span>
            <span>{isRo ? 'Export CSV Debitare' : isRu ? 'Экспорт в CSV' : 'Export Cut CSV'}</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowPanelInspector(!showPanelInspector)}
          >
            <span>{showPanelInspector ? '▲' : '📋'}</span>
            <span>{showPanelInspector ? (isRo ? 'Închide Panou' : 'Close') : (isRo ? 'Listă Detalii' : 'Parts List')}</span>
          </button>
        </div>
      </div>

      {/* Expanded Panel Inspector List */}
      {showPanelInspector && (
        <div
          style={{
            marginTop: '12px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px',
            maxHeight: '260px',
            overflowY: 'auto'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
            {isRo ? 'Specificație Detaliată Piese Mobilă:' : 'Detailed Parts Specification:'}
          </div>
          <table style={{ width: '100%', fontSize: '0.68rem', borderCollapse: 'collapse', color: '#cbd5e1' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #475569', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '4px' }}>Corp</th>
                <th style={{ padding: '4px' }}>Piesă</th>
                <th style={{ padding: '4px' }}>Dimensiune</th>
                <th style={{ padding: '4px' }}>Buc</th>
              </tr>
            </thead>
            <tbody>
              {currentComposition.panelCuttingList.map((p: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '4px', color: '#94a3b8' }}>{p.cabinet}</td>
                  <td style={{ padding: '4px' }}>{p.partName}</td>
                  <td style={{ padding: '4px', fontFamily: 'monospace', color: '#38bdf8' }}>
                    {p.lengthMm}×{p.widthMm}
                  </td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>{p.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
