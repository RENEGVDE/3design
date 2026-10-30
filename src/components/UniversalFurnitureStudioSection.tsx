'use client';

import React, { useState, useMemo } from 'react';
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
    <div className="side-section" id="universal-furniture-studio">
      <div className="section-title">
        <span>🛋️</span>
        <span>
          {isRo
            ? 'Studio Mobilă Universală (CAD Studio)'
            : isRu
            ? 'Студия Универсальной Мебели (CAD Studio)'
            : 'Universal Furniture CAD Studio'}
        </span>
      </div>

      <div className="section-subtitle">
        {isRo
          ? 'Proiectează orice tip de mobilier: dressinguri culisante, comode TV, biblioteci, birouri, mobilier dormitor & baie de orice formă și dimensiune.'
          : isRu
          ? 'Проектируйте любую корпусную мебель: шкафы-купе, ТВ-тумбы, стеллажи, письменные столы, комоды и гарнитуры любых форм и размеров.'
          : 'Design any kind of furniture: sliding wardrobes, media consoles, bookcases, desks, chests & vanities of any custom shape & size.'}
      </div>

      {/* 1. Category Selector */}
      <div className="control-group" style={{ marginTop: '12px' }}>
        <label className="input-label">
          {isRo ? '1. Tip & Destinație Mobilier:' : isRu ? '1. Назначение и тип мебели:' : '1. Furniture Destination & Type:'}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '6px' }}>
          {UNIVERSAL_FURNITURE_TYPES.map((t) => {
            const isSel = t.id === furnitureTypeId;
            return (
              <button
                key={t.id}
                onClick={() => handleSelectType(t)}
                className={`btn-pill ${isSel ? 'active' : ''}`}
                style={{
                  fontSize: '10px',
                  padding: '7px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}
              >
                <span style={{ fontSize: '15px' }}>{t.nameRo.slice(0, 2)}</span>
                <span>{isRo ? t.nameRo.slice(3) : isRu ? t.nameRu.slice(3) : t.nameEn.slice(3)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Furniture Name */}
      <div className="control-group" style={{ marginTop: '10px' }}>
        <label className="input-label">
          {isRo ? 'Nume Proiect:' : isRu ? 'Название изделия:' : 'Item Name:'}
        </label>
        <input
          type="text"
          value={furnitureName}
          onChange={(e) => setFurnitureName(e.target.value)}
          className="search-input"
          style={{ width: '100%', marginTop: '4px' }}
        />
      </div>

      {/* 3. Parametric Dimensions (cm) */}
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
          {isRo ? '2. Dimensiuni Gabarit (cm):' : isRu ? '2. Габаритные размеры (см):' : '2. Dimensions (cm):'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div>
            <label className="input-label" style={{ fontSize: '10px' }}>
              {isRo ? 'Lățime (X):' : isRu ? 'Ширина (X):' : 'Width (X):'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                min="30"
                max="400"
                step="5"
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
            <label className="input-label" style={{ fontSize: '10px' }}>
              {isRo ? 'Înălțime (Y):' : isRu ? 'Высота (Y):' : 'Height (Y):'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                min="30"
                max="300"
                step="5"
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
            <label className="input-label" style={{ fontSize: '10px' }}>
              {isRo ? 'Adâncime (Z):' : isRu ? 'Глубина (Z):' : 'Depth (Z):'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                min="20"
                max="120"
                step="5"
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

        {/* Compartimentare & Polițe */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
          <div>
            <label className="input-label" style={{ fontSize: '10px' }}>
              {isRo ? 'Compartimente Verticale:' : isRu ? 'Вертикальных секций:' : 'Vertical Sections:'} {sectionsCount}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={sectionsCount}
              onChange={(e) => setSectionsCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
          </div>

          <div>
            <label className="input-label" style={{ fontSize: '10px' }}>
              {isRo ? 'Polițe pe Compartiment:' : isRu ? 'Полок в секции:' : 'Shelves per section:'} {shelvesPerSection}
            </label>
            <input
              type="range"
              min="0"
              max="8"
              step="1"
              value={shelvesPerSection}
              onChange={(e) => setShelvesPerSection(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
          </div>
        </div>
      </div>

      {/* 4. Facade & Functional Equipment */}
      <div style={{ marginTop: '12px' }}>
        <label className="input-label" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>
          {isRo ? '3. Tip Închidere & Funcțiuni:' : isRu ? '3. Фасады и наполнение:' : '3. Facade Style & Features:'}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          {[
            { id: 'sliding', ro: 'Culisant', ru: 'Купе', en: 'Sliding' },
            { id: 'doors', ro: 'Batant', ru: 'Распашной', en: 'Hinged' },
            { id: 'drawers', ro: 'Sertare', ru: 'Ящики', en: 'Drawers' },
            { id: 'open', ro: 'Deschis', ru: 'Открыто', en: 'Open' }
          ].map((fst) => (
            <button
              key={fst.id}
              onClick={() => setFacadeStyle(fst.id)}
              className={`btn-pill ${facadeStyle === fst.id ? 'active' : ''}`}
              style={{ fontSize: '10px', padding: '6px 2px' }}
            >
              {isRo ? fst.ro : isRu ? fst.ru : fst.en}
            </button>
          ))}
        </div>

                {/* Feronerie: Mânere & Butoni */}
        <div style={{ marginTop: '10px' }}>
          <label className="input-label" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>
            {isRo ? 'Mânere & Feronerie Fațadă:' : isRu ? 'Ручки и фурнитура фасадов:' : 'Handles & Hardware:'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
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
                onClick={() => setHandleType(h.id)}
                className={`btn-pill ${handleType === h.id ? 'active' : ''}`}
                style={{ fontSize: '9px', padding: '5px 2px' }}
              >
                {isRo ? h.ro : isRu ? h.ru : h.en}
              </button>
            ))}
          </div>
        </div>

        {/* Bază: Picioare & Soclu */}
        <div style={{ marginTop: '10px' }}>
          <label className="input-label" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>
            {isRo ? 'Bază & Suport:' : isRu ? 'Опора и цоколь:' : 'Base & Legs:'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {[
              { id: 'plinth', ro: 'Soclu PAL', ru: 'Цоколь ЛДСП', en: 'Plinth' },
              { id: 'legs_black', ro: 'Picioare Negre', ru: 'Ножки Черные', en: 'Black Legs' },
              { id: 'legs_gold', ro: 'Picioare Aurii', ru: 'Ножки Золото', en: 'Gold Legs' },
              { id: 'wall_hung', ro: 'Suspendat', ru: 'Подвесной', en: 'Wall-Hung' }
            ].map((lg) => (
              <button
                key={lg.id}
                onClick={() => setLegType(lg.id)}
                className={`btn-pill ${legType === lg.id ? 'active' : ''}`}
                style={{ fontSize: '9px', padding: '5px 2px' }}
              >
                {isRo ? lg.ro : isRu ? lg.ru : lg.en}
              </button>
            ))}
          </div>
        </div>

        {/* Optiuni Aditionale: Bara Haine & LED Ambient */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasClothesRail}
              onChange={(e) => setHasClothesRail(e.target.checked)}
              style={{ accentColor: '#38bdf8' }}
            />
            <span>👔 {isRo ? 'Bară Haine' : isRu ? 'Штанга одежды' : 'Clothes Rail'}</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasLedGlow}
              onChange={(e) => setHasLedGlow(e.target.checked)}
              style={{ accentColor: '#38bdf8' }}
            />
            <span>💡 {isRo ? 'Bandă LED Ambient' : isRu ? 'LED подсветка' : 'Ambient LED'}</span>
          </label>
        </div>
      </div>

      {/* 5. Generate Button */}
      <button
        className="btn-primary"
        onClick={handleGenerateFurniture}
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
        <span>🛋️</span>
        <span>
          {generating
            ? (isRo ? '⏳ Se construiește piesa...' : isRu ? '⏳ Генерация...' : '⏳ Building...')
            : (isRo ? 'Construiește Piesa de Mobilier în 3D' : isRu ? 'Сгенерировать мебель в 3D' : 'Build Furniture in 3D')}
        </span>
      </button>

      {/* 6. Live BOM & Panel Table */}
      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowPanelTable((v) => !v)}
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
          <span>📋 {isRo ? `Panouri & Debitări CAD (${bomMetrics.totalParts} repere)` : isRu ? `Деталировка CAD (${bomMetrics.totalParts} шт)` : `CAD Parts List (${bomMetrics.totalParts} pcs)`}</span>
          <span>{showPanelTable ? '▲' : '▼'}</span>
        </button>

        {showPanelTable && (
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
                  <th style={{ padding: '4px 6px' }}>Denumire Piesă</th>
                  <th style={{ padding: '4px 6px' }}>L (mm)</th>
                  <th style={{ padding: '4px 6px' }}>W (mm)</th>
                  <th style={{ padding: '4px 6px' }}>T</th>
                  <th style={{ padding: '4px 6px' }}>Cant</th>
                </tr>
              </thead>
              <tbody>
                {currentComposition.panelCuttingList.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#cbd5e1' }}>
                    <td style={{ padding: '4px 6px', color: '#38bdf8' }}>{p.partName}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 600 }}>{p.lengthMm}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 600 }}>{p.widthMm}</td>
                    <td style={{ padding: '4px 6px' }}>{p.thicknessMm}</td>
                    <td style={{ padding: '4px 6px', color: '#94a3b8' }}>{p.edgeBanding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Export CSV & PNG */}
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
          <span>{isRo ? 'Descarcă CSV Debitare' : isRu ? 'Раскрой (CSV)' : 'Cutting CSV'}</span>
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
            <span>{isRo ? 'Poză HD' : isRu ? 'Рендер' : 'HD Render'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

