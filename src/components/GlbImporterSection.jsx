'use client';

import React, { useRef } from 'react';
import { I18N, fmtCm } from '../i18n/translations.js';

export default function GlbImporterSection({
  lang,
  importedModels,
  selectedGlbId,
  onSelectGlb,
  onImportGlbFiles,
  onDeleteGlb,
  onDuplicateGlb,
  gizmoMode,
  onSetGizmoMode,
  placeOnSurfaceMode,
  onTogglePlaceOnSurface,
  onUpdateGlbTransform,
  onPaintWholeGlbWithActiveMat,
  onColorWholeGlb,
  onResetGlbMaterials,
  onPaintGlbSubMeshWithActiveMat,
  onColorGlbSubMesh
}) {
  const dict = I18N[lang] || I18N.ro;
  const fileInputRef = useRef(null);

  const selectedModel =
    importedModels.find((m) => m.id === selectedGlbId) ||
    importedModels[0] ||
    null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onImportGlbFiles(files);
    }
    e.target.value = '';
  };

  const curW = selectedModel
    ? selectedModel.baseDimsCm.w * selectedModel.scale[0]
    : 0;
  const curH = selectedModel
    ? selectedModel.baseDimsCm.h * selectedModel.scale[1]
    : 0;
  const curD = selectedModel
    ? selectedModel.baseDimsCm.d * selectedModel.scale[2]
    : 0;

  return (
    <div className="panel-section">
      <div className="section-title">
        <span>📦 {dict.glbStudioTitle}</span>
        <span>{importedModels.length}</span>
      </div>

      <div className="studio-box">
        <button
          className="upload-btn"
          style={{ width: '100%' }}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <span>📦</span>
          <span>{dict.importGlbBtn}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {importedModels.length === 0 ? (
          <div
            style={{
              fontSize: '0.73rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '8px 6px'
            }}
          >
            {dict.emptyGlbHint}
          </div>
        ) : (
          <>
            {/* Imported Models List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                maxHeight: '140px',
                overflowY: 'auto'
              }}
            >
              {importedModels.map((mdl) => {
                const isSel = mdl.id === (selectedModel && selectedModel.id);
                const mw = fmtCm(mdl.baseDimsCm.w * mdl.scale[0]);
                const mh = fmtCm(mdl.baseDimsCm.h * mdl.scale[1]);
                const md = fmtCm(mdl.baseDimsCm.d * mdl.scale[2]);
                return (
                  <div
                    key={mdl.id}
                    className={`part-row ${isSel ? 'open' : ''}`}
                    style={{
                      border: isSel
                        ? '1px solid var(--accent)'
                        : '1px solid rgba(255,255,255,0.08)',
                      background: isSel
                        ? 'rgba(212, 163, 89, 0.16)'
                        : 'rgba(255,255,255,0.03)'
                    }}
                    onClick={() => onSelectGlb(mdl.id)}
                  >
                    <div className="part-info">
                      <span className="part-name">📦 {mdl.name}</span>
                      <span className="part-dims">
                        📏 {mw} × {mh} × {md} cm
                      </span>
                    </div>
                    <div className="part-actions">
                      <button
                        className="part-paint-btn"
                        title={dict.duplicateGlbBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateGlb(mdl.id);
                        }}
                      >
                        📋
                      </button>
                      <button
                        className="part-paint-btn"
                        style={{ color: '#fda4af', borderColor: 'rgba(244,63,94,0.35)' }}
                        title={dict.deleteGlbBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteGlb(mdl.id);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedModel && (
              <div className="studio-controls">
                {/* 3D Transform Gizmo Mode Selector */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '4px'
                  }}
                >
                  <button
                    className={`light-chip ${
                      gizmoMode === 'translate' ? 'active' : ''
                    }`}
                    onClick={() => onSetGizmoMode('translate')}
                  >
                    ✥ {dict.gizmoMove}
                  </button>
                  <button
                    className={`light-chip ${
                      gizmoMode === 'rotate' ? 'active' : ''
                    }`}
                    onClick={() => onSetGizmoMode('rotate')}
                  >
                    🔄 {dict.gizmoRotate}
                  </button>
                  <button
                    className={`light-chip ${
                      gizmoMode === 'scale' ? 'active' : ''
                    }`}
                    onClick={() => onSetGizmoMode('scale')}
                  >
                    ⤢ {dict.gizmoScale}
                  </button>
                  <button
                    className={`light-chip ${!gizmoMode ? 'active' : ''}`}
                    onClick={() => onSetGizmoMode(null)}
                  >
                    ✕
                  </button>
                </div>

                {/* Click-on-Surface to Place Button */}
                <button
                  className={`btn-pill ${
                    placeOnSurfaceMode ? 'active-cyan' : ''
                  }`}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={onTogglePlaceOnSurface}
                >
                  <span>📍</span>
                  <span>
                    {placeOnSurfaceMode
                      ? dict.placeSurfaceActiveBtn
                      : dict.placeSurfaceBtn}
                  </span>
                </button>

                {/* Quick Snap & Rotate Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 0.7fr 0.7fr',
                    gap: '4px'
                  }}
                >
                  <button
                    className="light-chip"
                    onClick={() =>
                      onUpdateGlbTransform(selectedModel.id, {
                        position: [
                          selectedModel.position[0],
                          0,
                          selectedModel.position[2]
                        ]
                      })
                    }
                  >
                    ⬇️ {dict.snapFloorBtn}
                  </button>
                  <button
                    className="light-chip"
                    onClick={() =>
                      onUpdateGlbTransform(selectedModel.id, {
                        position: [
                          selectedModel.position[0],
                          0.9,
                          selectedModel.position[2]
                        ]
                      })
                    }
                  >
                    ⬆️ {dict.snapCounterBtn}
                  </button>
                  <button
                    className="light-chip"
                    onClick={() =>
                      onUpdateGlbTransform(selectedModel.id, {
                        rotationYDeg:
                          ((selectedModel.rotationYDeg - 45 + 540) % 360) - 180
                      })
                    }
                  >
                    {dict.rotLeft45}
                  </button>
                  <button
                    className="light-chip"
                    onClick={() =>
                      onUpdateGlbTransform(selectedModel.id, {
                        rotationYDeg:
                          ((selectedModel.rotationYDeg + 45 + 540) % 360) - 180
                      })
                    }
                  >
                    {dict.rotRight45}
                  </button>
                </div>

                {/* Position X, Y, Z Sliders */}
                <div className="studio-slider-row">
                  <span>{dict.posXLbl}</span>
                  <span className="val">
                    {`${(selectedModel.position[0] * 100).toFixed(0)} cm`}
                  </span>
                </div>
                <input
                  type="range"
                  className="studio-range"
                  min="-2.5"
                  max="6.5"
                  step="0.02"
                  value={selectedModel.position[0]}
                  onChange={(e) =>
                    onUpdateGlbTransform(selectedModel.id, {
                      position: [
                        parseFloat(e.target.value),
                        selectedModel.position[1],
                        selectedModel.position[2]
                      ]
                    })
                  }
                />

                <div className="studio-slider-row">
                  <span>{dict.posYLbl}</span>
                  <span className="val">
                    {`${(selectedModel.position[1] * 100).toFixed(0)} cm`}
                  </span>
                </div>
                <input
                  type="range"
                  className="studio-range"
                  min="0.0"
                  max="3.2"
                  step="0.01"
                  value={selectedModel.position[1]}
                  onChange={(e) =>
                    onUpdateGlbTransform(selectedModel.id, {
                      position: [
                        selectedModel.position[0],
                        parseFloat(e.target.value),
                        selectedModel.position[2]
                      ]
                    })
                  }
                />

                <div className="studio-slider-row">
                  <span>{dict.posZLbl}</span>
                  <span className="val">
                    {`${(selectedModel.position[2] * 100).toFixed(0)} cm`}
                  </span>
                </div>
                <input
                  type="range"
                  className="studio-range"
                  min="-2.0"
                  max="5.5"
                  step="0.02"
                  value={selectedModel.position[2]}
                  onChange={(e) =>
                    onUpdateGlbTransform(selectedModel.id, {
                      position: [
                        selectedModel.position[0],
                        selectedModel.position[1],
                        parseFloat(e.target.value)
                      ]
                    })
                  }
                />

                {/* Rotation Y Slider */}
                <div className="studio-slider-row">
                  <span>{dict.rotYLbl}</span>
                  <span className="val">
                    {`${Math.round(selectedModel.rotationYDeg)}°`}
                  </span>
                </div>
                <input
                  type="range"
                  className="studio-range"
                  min="-180"
                  max="180"
                  step="1"
                  value={selectedModel.rotationYDeg}
                  onChange={(e) =>
                    onUpdateGlbTransform(selectedModel.id, {
                      rotationYDeg: parseFloat(e.target.value)
                    })
                  }
                />

                {/* Uniform Scale + Independent W x H x D cm Sizing */}
                <div className="studio-slider-row">
                  <span>{dict.uniformScaleLbl}</span>
                  <span className="val">{`${selectedModel.scale[0].toFixed(
                    2
                  )}x`}</span>
                </div>
                <input
                  type="range"
                  className="studio-range"
                  min="0.1"
                  max="5.0"
                  step="0.05"
                  value={selectedModel.scale[0]}
                  onChange={(e) => {
                    const s = parseFloat(e.target.value) || 1.0;
                    onUpdateGlbTransform(selectedModel.id, {
                      scale: [s, s, s]
                    });
                  }}
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '5px',
                    marginTop: '2px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span
                      style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}
                    >
                      {dict.widthCmLbl}
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={Math.round(curW)}
                      onChange={(e) => {
                        const targetW = Math.max(
                          1,
                          parseFloat(e.target.value) || curW
                        );
                        const sx = targetW / selectedModel.baseDimsCm.w;
                        onUpdateGlbTransform(selectedModel.id, {
                          scale: [
                            sx,
                            selectedModel.scale[1],
                            selectedModel.scale[2]
                          ]
                        });
                      }}
                      style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        color: '#fbbf24',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        width: '100%'
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span
                      style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}
                    >
                      {dict.heightCmLbl}
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={Math.round(curH)}
                      onChange={(e) => {
                        const targetH = Math.max(
                          1,
                          parseFloat(e.target.value) || curH
                        );
                        const sy = targetH / selectedModel.baseDimsCm.h;
                        onUpdateGlbTransform(selectedModel.id, {
                          scale: [
                            selectedModel.scale[0],
                            sy,
                            selectedModel.scale[2]
                          ]
                        });
                      }}
                      style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        color: '#34d399',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        width: '100%'
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span
                      style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}
                    >
                      {dict.depthCmLbl}
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={Math.round(curD)}
                      onChange={(e) => {
                        const targetD = Math.max(
                          1,
                          parseFloat(e.target.value) || curD
                        );
                        const sz = targetD / selectedModel.baseDimsCm.d;
                        onUpdateGlbTransform(selectedModel.id, {
                          scale: [
                            selectedModel.scale[0],
                            selectedModel.scale[1],
                            sz
                          ]
                        });
                      }}
                      style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        color: '#38bdf8',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        width: '100%'
                      }}
                    />
                  </div>
                </div>

                {/* Colors & Materials Editor for Imported .GLB */}
                <div className="zone-title" style={{ marginTop: '6px' }}>
                  {dict.glbMatTitle}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn-pill"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() =>
                      onPaintWholeGlbWithActiveMat(selectedModel.id)
                    }
                  >
                    <span>🖌️</span>
                    <span>{dict.paintWholeGlbBtn}</span>
                  </button>

                  <label
                    className="btn-pill"
                    style={{ cursor: 'pointer', padding: '6px 9px' }}
                    title="Alege o culoare pentru întregul model"
                  >
                    🎨
                    <input
                      type="color"
                      defaultValue="#d4a359"
                      style={{ width: 0, height: 0, opacity: 0 }}
                      onChange={(e) =>
                        onColorWholeGlb(selectedModel.id, e.target.value)
                      }
                    />
                  </label>
                </div>

                <button
                  className="btn-pill"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onResetGlbMaterials(selectedModel.id)}
                >
                  <span>🔄</span>
                  <span>{dict.resetGlbMatBtn}</span>
                </button>

                {selectedModel.subParts && selectedModel.subParts.length > 0 && (
                  <>
                    <div className="zone-title">{dict.glbSubMeshesTitle}</div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        maxHeight: '135px',
                        overflowY: 'auto'
                      }}
                    >
                      {selectedModel.subParts.map((sp) => (
                        <div
                          key={sp.subIdx}
                          className="part-row"
                          style={{
                            padding: '5px 8px',
                            background: 'rgba(255,255,255,0.03)'
                          }}
                        >
                          <span
                            className="part-name"
                            style={{ fontSize: '0.71rem' }}
                          >
                            {sp.name}
                          </span>
                          <div className="part-actions">
                            <label
                              className="part-paint-btn"
                              style={{ cursor: 'pointer' }}
                              title="Schimbă culoarea acestei sub-piese"
                            >
                              <span
                                className="part-mat-dot"
                                style={{ background: sp.colorHex || '#e5e7eb' }}
                              />
                              🎨
                              <input
                                type="color"
                                value={sp.colorHex || '#e5e7eb'}
                                style={{ width: 0, height: 0, opacity: 0 }}
                                onChange={(e) =>
                                  onColorGlbSubMesh(
                                    selectedModel.id,
                                    sp.subIdx,
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                            <button
                              className="part-paint-btn"
                              title="Aplică materialul/textura selectată din Studio pe această sub-piesă"
                              onClick={() =>
                                onPaintGlbSubMeshWithActiveMat(
                                  selectedModel.id,
                                  sp.subIdx
                                )
                              }
                            >
                              🖌️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
