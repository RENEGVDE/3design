'use client';

import React, { useRef } from 'react';
import { I18N, ZONE_BUTTONS } from '../i18n/translations';
import { FINISH_MODES } from '../utils/textures';

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
  onApplyMaterialToZone
}) {
  const dict = I18N[lang] || I18N.ro;
  const fileInputRef = useRef(null);
  const colorInputRef = useRef(null);

  const activeMat = materials.find((m) => m.id === activeMatId) || materials[0] || null;
  const finObj = activeMat
    ? FINISH_MODES[activeMat.finishIdx] || FINISH_MODES[0]
    : FINISH_MODES[0];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onUploadTextures(files);
    }
    e.target.value = '';
  };

  const handleColorChange = (e) => {
    if (e.target.value) {
      onAddColorMaterial(e.target.value);
    }
  };

  return (
    <div className="panel-section">
      <div className="section-title">
        <span>🎨 {dict.customStudioTitle}</span>
      </div>

      <div className="studio-box">
        <div className="upload-row">
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <span>📸</span>
            <span>{dict.uploadTexBtn}</span>
          </button>

          <button
            className="btn-pill"
            style={{ justifyContent: 'center' }}
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
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <input
            ref={colorInputRef}
            type="color"
            defaultValue="#c8a986"
            style={{ display: 'none' }}
            onChange={handleColorChange}
          />
        </div>

        <div className="upload-row">
          <button
            className="btn-pill"
            style={{ justifyContent: 'center' }}
            onClick={onResetFurnitureToWhite}
          >
            <span>🔄</span>
            <span>{dict.resetWhiteBtn}</span>
          </button>

          <button
            className="btn-pill"
            style={{ justifyContent: 'center', borderColor: 'rgba(244,63,94,0.35)', color: '#fda4af' }}
            onClick={onDeleteAllMaterials}
          >
            <span>🗑️</span>
            <span>{dict.deleteAllMatsBtn}</span>
          </button>
        </div>

        <div className="custom-mat-grid">
          {materials.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                fontSize: '0.73rem',
                color: 'var(--text-muted)',
                textAlign: 'center',
                padding: '10px 6px'
              }}
            >
              {dict.emptyMatHint}
            </div>
          ) : (
            materials.map((mat) => (
              <div
                key={mat.id}
                className={`custom-mat-card ${mat.id === activeMatId ? 'selected' : ''}`}
                title={mat.name}
                onClick={() => onSelectMaterial(mat.id)}
              >
                <div
                  className="custom-mat-thumb"
                  style={{ background: mat.thumbCss }}
                />
                <div className="custom-mat-name">{mat.name}</div>
                <button
                  className="del-mat"
                  title="Șterge materialul"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMaterial(mat.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="studio-controls">
          <div className="studio-slider-row">
            <span>{dict.grainScaleLbl}</span>
            <span className="val">{activeMat ? `${activeMat.scale.toFixed(1)}x` : '1.0x'}</span>
          </div>
          <input
            type="range"
            className="studio-range"
            min="0.3"
            max="3.0"
            step="0.1"
            value={activeMat ? activeMat.scale : 1.0}
            disabled={!activeMat}
            onChange={(e) =>
              onUpdateActiveMaterialProp('scale', parseFloat(e.target.value) || 1.0)
            }
          />
          <div className="studio-opts-row">
            <button
              className="btn-pill"
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
              className="btn-pill"
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
          className={`btn-pill ${paintModeActive ? 'active-paint' : ''}`}
          style={{ width: '100%', justifyContent: 'center', padding: '9px 10px' }}
          onClick={onTogglePaintMode}
        >
          <span>🖌️</span>
          <span>{paintModeActive ? dict.paintModeActiveBtn : dict.paintModeBtn}</span>
        </button>

        <div className="zone-title">{dict.applyZoneTitle}</div>
        <div className="zone-grid">
          {ZONE_BUTTONS.map((z) => (
            <button
              key={z.zone}
              className="zone-btn"
              onClick={() => onApplyMaterialToZone(z.zone)}
            >
              <span>{z.icon}</span>
              <span>{dict[z.i18nKey]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
