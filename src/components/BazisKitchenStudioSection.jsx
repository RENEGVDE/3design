'use client';

import React, { useState, useMemo } from 'react';
import {
  KITCHEN_LAYOUT_TYPES,
  buildBazisKitchenComposition
} from '../utils/bazisKitchenGenerator.js';
import {
  exportToGlbArrayBuffer,
  generateCuttingListCsv,
  downloadFile
} from '../utils/parametricCabinet.js';
import { arrayBufferToBase64 } from '../utils/glbImporter.js';

export default function BazisKitchenStudioSection({
  lang = 'ro',
  materials = [],
  activeMatId = null,
  onMountGeneratedKitchen,
  onCaptureScreenshot
}) {
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
    return buildBazisKitchenComposition({
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

    currentComposition.panelCuttingList.forEach((p) => {
      const sqM = ((p.lengthMm * p.widthMm) / 1000000) * p.qty;
      if (p.material.includes('PAL')) carcassSqM += sqM;
      else if (p.material.includes('MDF')) facadeSqM += sqM;
      else if (p.material.includes('Blat')) countertopLinM += (p.lengthMm / 1000) * p.qty;

      // Estimate edge perimeter
      if (p.edgeBanding && !p.edgeBanding.includes('Fără')) {
        edgeBandingLinM += ((p.lengthMm + p.widthMm) * 2 / 1000) * p.qty * 0.5; // ~2 to 4 edges
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
      const glbBuffer = await exportToGlbArrayBuffer(currentComposition.root);
      const b64Data = arrayBufferToBase64(glbBuffer);
      const kitchenId = `bazis_kitchen_${Date.now()}`;
      const kitchenName = isRo
        ? `Bucătărie БАЗИС (${mainWallWidthCm}cm)`
        : isRu
        ? `Кухня БАЗИС (${mainWallWidthCm}см)`
        : `BAZIS Kitchen (${mainWallWidthCm}cm)`;

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
      console.error('Error generating Bazis kitchen:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCsv = () => {
    const csv = generateCuttingListCsv(currentComposition.panelCuttingList);
    downloadFile(
      csv,
      `bazis_specificatie_panouri_${layoutType}_${Date.now()}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  return (
    <div className="side-section" id="bazis-kitchen-studio">
      <div className="section-title">
        <span>🏛️</span>
        <span>
          {isRo
            ? 'Studio Bucătărie БАЗИС-Мебельщик'
            : isRu
            ? 'Студия БАЗИС-Кухня (Планировщик & CAD)'
            : 'BAZIS Kitchen Architecture Studio'}
        </span>
      </div>

      <div className="section-subtitle">
        {isRo
          ? 'Proiectează bucătării complete de orice formă (L-Colț, Peninsulă, Liniară, Formă de U) cu blat continuu, electrocasnice și listă tehnică de panouri.'
          : isRu
          ? 'Проектируйте полные кухни любой конфигурации (угловые, с полуостровом, П-образные) с единой столешницей, техническими узлами и спецификацией раскроя.'
          : 'Design complete kitchen layouts of any shape (L-Corner, Peninsula, Linear, U-Shape) with continuous worktops and panel cutting specs.'}
      </div>

      {/* 1. Layout Topology Badges */}
      <div className="control-group" style={{ marginTop: '12px' }}>
        <label className="input-label">
          {isRo ? '1. Tipul / Forma Configurației:' : isRu ? '1. Форма гарнитура:' : '1. Layout Configuration:'}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '6px' }}>
          {KITCHEN_LAYOUT_TYPES.map((lt) => {
            const isSel = lt.id === layoutType;
            return (
              <button
                key={lt.id}
                onClick={() => setLayoutType(lt.id)}
                className={`btn-pill ${isSel ? 'active' : ''}`}
                style={{
                  fontSize: '11px',
                  padding: '8px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textAlign: 'left'
                }}
              >
                <span style={{ fontSize: '15px' }}>
                  {lt.id === 'l_peninsula' ? '📐' : lt.id === 'l_corner' ? '🚪' : lt.id === 'linear' ? '📏' : '🏛️'}
                </span>
                <span style={{ fontWeight: isSel ? '600' : '400', lineHeight: '1.2' }}>
                  {isRo ? lt.nameRo : isRu ? lt.nameRu : lt.nameEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Room & Wall Dimension Inputs */}
      <div
        style={{
          marginTop: '12px',
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
          {isRo ? '2. Cote Încăpere & Pereți (cm):' : isRu ? '2. Размеры помещения и стен (см):' : '2. Room & Wall Dimensions (cm):'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label className="input-label" style={{ fontSize: '10px' }}>
              {isRo ? 'Latură Principală (X):' : isRu ? 'Основная стена (X):' : 'Main Wall (X):'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                min="240"
                max="500"
                step="10"
                value={mainWallWidthCm}
                onChange={(e) => setMainWallWidthCm(Number(e.target.value))}
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
            <label className="input-label" style={{ fontSize: '10px' }}>
              {isRo ? 'Înălțime Tavan (Y):' : isRu ? 'Высота потолка (Y):' : 'Ceiling Height (Y):'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                min="230"
                max="300"
                step="5"
                value={roomHeightCm}
                onChange={(e) => setRoomHeightCm(Number(e.target.value))}
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

        {layoutType !== 'linear' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
            <div>
              <label className="input-label" style={{ fontSize: '10px' }}>
                {isRo ? 'Perete Colț / Retur (Z):' : isRu ? 'Угловой выступ (Z):' : 'Return Wall (Z):'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="120"
                  max="350"
                  step="10"
                  value={returnWallDepthCm}
                  onChange={(e) => setReturnWallDepthCm(Number(e.target.value))}
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

            {(layoutType === 'l_peninsula' || layoutType === 'u_shape') && (
              <div>
                <label className="input-label" style={{ fontSize: '10px' }}>
                  {isRo ? 'Lungime Peninsulă:' : isRu ? 'Длина полуострова:' : 'Peninsula Length:'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="140"
                    max="280"
                    step="10"
                    value={peninsulaLengthCm}
                    onChange={(e) => setPeninsulaLengthCm(Number(e.target.value))}
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
            )}
          </div>
        )}
      </div>

      {/* 3. Integrated Module Toggles */}
      <div style={{ marginTop: '10px' }}>
        <label className="input-label" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>
          {isRo ? '3. Echipare & Zone Funcționale:' : isRu ? '3. Функциональные зоны:' : '3. Functional Zones & Equipment:'}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeOvenCol} onChange={(e) => setIncludeOvenCol(e.target.checked)} style={{ accentColor: '#38bdf8' }} />
            <span>{isRo ? 'Cuptor în Coloană' : isRu ? 'Духовой шкаф в пенале' : 'Built-in Oven Column'}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeFridgeCol} onChange={(e) => setIncludeFridgeCol(e.target.checked)} style={{ accentColor: '#38bdf8' }} />
            <span>{isRo ? 'Coloană Frigider' : isRu ? 'Пенал холодильника' : 'Integrated Fridge'}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeDishwasher} onChange={(e) => setIncludeDishwasher(e.target.checked)} style={{ accentColor: '#38bdf8' }} />
            <span>{isRo ? 'Mașină de Spălat' : isRu ? 'Посудомоечная машина' : 'Dishwasher'}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
            <input type="checkbox" checked={includePeninsula} onChange={(e) => setIncludePeninsula(e.target.checked)} style={{ accentColor: '#38bdf8' }} />
            <span>{isRo ? 'Peninsulă Bar' : isRu ? 'Полуостров бар' : 'Peninsula Island'}</span>
          </label>
        </div>
      </div>

      {/* 4. Generation Button */}
      <button
        className="btn-primary"
        onClick={handleGenerateKitchen}
        disabled={generating}
        style={{
          width: '100%',
          marginTop: '14px',
          padding: '12px',
          fontSize: '13px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '8px',
          border: 'none',
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
          cursor: generating ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <span>🏗️</span>
        <span>
          {generating
            ? (isRo ? '⏳ Se generează compoziția...' : isRu ? '⏳ Генерация...' : '⏳ Generating...')
            : (isRo ? 'Generează Bucătăria în 3D' : isRu ? 'Сгенерировать кухню в 3D' : 'Generate Full Kitchen in 3D')}
        </span>
      </button>

      {/* 5. BOM Summary Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          marginTop: '12px',
          textAlign: 'center'
        }}
      >
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 4px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>PAL Carcasă</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>{bomSummary.carcassSqM} m²</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 4px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>MDF Fronturi</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>{bomSummary.facadeSqM} m²</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 4px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>Blat Lucru</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>{bomSummary.countertopLinM} m</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 4px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>Cant ABS</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#a855f7' }}>{bomSummary.edgeBandingLinM} m</div>
        </div>
      </div>

      {/* 6. БАЗИС Panel Inspector Table (Спецификация панелей) */}
      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowPanelInspector((v) => !v)}
          className="btn-secondary"
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.03)'
          }}
        >
          <span>📋 {isRo ? `Tabel Panouri БАЗИС (${bomSummary.totalParts} piese)` : isRu ? `Таблица деталей БАЗИС (${bomSummary.totalParts} шт)` : `BAZIS Parts Table (${bomSummary.totalParts} pcs)`}</span>
          <span>{showPanelInspector ? '▲' : '▼'}</span>
        </button>

        {showPanelInspector && (
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              background: '#0d1117',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              marginTop: '6px',
              fontSize: '10px'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '4px 6px' }}>Corp</th>
                  <th style={{ padding: '4px 6px' }}>Piesă</th>
                  <th style={{ padding: '4px 6px' }}>L (mm)</th>
                  <th style={{ padding: '4px 6px' }}>W (mm)</th>
                  <th style={{ padding: '4px 6px' }}>Cant</th>
                </tr>
              </thead>
              <tbody>
                {currentComposition.panelCuttingList.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#cbd5e1' }}>
                    <td style={{ padding: '4px 6px', color: '#38bdf8' }}>{p.cabinet}</td>
                    <td style={{ padding: '4px 6px' }}>{p.partName}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 600 }}>{p.lengthMm}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 600 }}>{p.widthMm}</td>
                    <td style={{ padding: '4px 6px', color: '#94a3b8' }}>{p.edgeBanding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Workshop Export Buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
        <button
          className="btn-secondary"
          onClick={handleDownloadCsv}
          style={{
            flex: 1,
            padding: '8px 6px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <span>📐</span>
          <span>{isRo ? 'Listă Debitare (CSV)' : isRu ? 'Раскрой (CSV)' : 'Cutting List (CSV)'}</span>
        </button>

        {onCaptureScreenshot && (
          <button
            className="btn-secondary"
            onClick={onCaptureScreenshot}
            style={{
              flex: 1,
              padding: '8px 6px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <span>📸</span>
            <span>{isRo ? 'Poză HD (PNG)' : isRu ? 'HD Рендер' : 'HD Render'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

