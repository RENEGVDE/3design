'use client';

import React, { useState, useRef } from 'react';
import { I18N } from '../i18n/translations';

export interface TopBarProps {
  lang: string;
  onChangeLang: (lang: string) => void;
  dimsEnabled: boolean;
  onToggleDims: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  canRedo?: boolean;
  onRedo?: () => void;
  is2DPlanMode?: boolean;
  onToggle2DPlanMode?: () => void;
  onNewProject?: () => void;
  onSaveProject?: () => void;
  onLoadProject?: (file: File) => void;
  onOpenTechnicalReport?: () => void;
  magneticSnapEnabled?: boolean;
  onToggleMagneticSnap?: () => void;
  onCaptureScreenshot?: () => void;
  onExportSceneGlb?: () => void;
  onExportSceneD3D?: (ext: 'd3d' | 'b3d') => void;
  onExportSceneObj?: () => void;
}

export default function TopBar({
  lang,
  onChangeLang,
  dimsEnabled,
  onToggleDims,
  panelOpen,
  onTogglePanel,
  canUndo = false,
  onUndo,
  canRedo = false,
  onRedo,
  is2DPlanMode = false,
  onToggle2DPlanMode,
  onNewProject,
  onSaveProject,
  onLoadProject,
  onOpenTechnicalReport,
  magneticSnapEnabled = true,
  onToggleMagneticSnap,
  onCaptureScreenshot,
  onExportSceneGlb,
  onExportSceneD3D,
  onExportSceneObj
}: TopBarProps) {
  const dict = I18N[lang] || I18N.ro;
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadProject) {
      onLoadProject(file);
    }
    e.target.value = '';
    setProjectMenuOpen(false);
  };

  return (
    <div id="top-bar">
      <div className="brand-card">
        <div className="brand-icon">3D</div>
        <div className="brand-text">
          <h1>{dict.title}</h1>
          <p>{dict.subtitle}</p>
        </div>
      </div>

      <div className="top-actions">
        {/* Project Manager Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`action-btn ${projectMenuOpen ? 'active' : ''}`}
            onClick={() => setProjectMenuOpen((v) => !v)}
            title="Meniu Proiect & Export"
          >
            <span>📂</span>
            <span className="btn-label-desktop">{isRo ? 'Proiect' : isRu ? 'Проект' : 'Project'} ▾</span>
          </button>

          {projectMenuOpen && (
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 40,
                  cursor: 'default'
                }}
                onClick={() => setProjectMenuOpen(false)}
              />

              <div className="project-dropdown-menu" style={{ zIndex: 50 }}>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onNewProject) onNewProject();
                  }}
                >
                  <span>🆕</span>
                  <div>
                    <strong>{isRo ? 'Proiect Nou (Scenă Curată CAD)' : isRu ? 'Новый проект (Чистая сцена)' : 'New Project (Clean CAD Space)'}</strong>
                    <small>{isRo ? 'Spațiu de lucru liber cu grilă milimetrică CAD' : isRu ? 'Чистое рабочее пространство с сеткой CAD' : 'Clean workspace with millimeter CAD grid'}</small>
                  </div>
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onSaveProject) onSaveProject();
                  }}
                >
                  <span>💾</span>
                  <div>
                    <strong>{isRo ? 'Salvează Proiect (.json / .cadproj)' : isRu ? 'Сохранить проект (.json / .cadproj)' : 'Save Project (.json / .cadproj)'}</strong>
                    <small>{isRo ? 'Fișier standard cu toate corpurile, cotele și finisajele' : isRu ? 'Файл проекта со всеми деталями и материалами' : 'Standard project file with models & materials'}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  <span>📥</span>
                  <div>
                    <strong>{isRo ? 'Încarcă Proiect sau Model (.glb, .d3d, .b3d, .obj, .json)' : isRu ? 'Открыть проект или 3D модель (.glb, .d3d, .b3d, .obj, .json)' : 'Open Project or 3D Model (.glb, .d3d, .b3d, .obj, .json)'}</strong>
                    <small>{isRo ? 'Recunoaște automat modele 3D, proiecte și fișiere de fabricație' : isRu ? 'Автоматическое распознавание 3D моделей и проектов' : 'Auto-detects 3D models, projects & CAD assemblies'}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onExportSceneGlb) onExportSceneGlb();
                  }}
                >
                  <span>📦</span>
                  <div>
                    <strong>{isRo ? 'Exportă Scenă 3D (.glb)' : isRu ? 'Экспорт 3D сцены (.glb)' : 'Export 3D Scene (.glb)'}</strong>
                    <small>{isRo ? 'Model 3D binar complet pentru randare, Blender și 3ds Max' : isRu ? 'Бинарная 3D модель для Blender / 3ds Max / AR' : 'Binary 3D model for rendering & visualization'}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onExportSceneD3D) onExportSceneD3D('d3d');
                  }}
                >
                  <span>🧱</span>
                  <div>
                    <strong>{isRo ? 'Exportă Model Producție (.d3d / .b3d)' : isRu ? 'Экспорт для производства (.d3d / .b3d)' : 'Export Production Model (.d3d / .b3d)'}</strong>
                    <small>{isRo ? 'Tabel panouri (mm), canturi ABS, feronerie și cote atelier' : isRu ? 'Панели (мм), кромки ABS, фурнитура и спецификация' : 'Panels (mm), ABS edge bands & hardware'}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onExportSceneObj) onExportSceneObj();
                  }}
                >
                  <span>📐</span>
                  <div>
                    <strong>{isRo ? 'Exportă Geometrie CAD (.obj + .mtl)' : isRu ? 'Экспорт геометрии CAD (.obj + .mtl)' : 'Export CAD Geometry (.obj + .mtl)'}</strong>
                    <small>{isRo ? 'Format geometric universal pentru softuri CAD și CNC' : isRu ? 'Универсальный формат геометрии для CAD и ЧПУ' : 'Universal geometric format for CAD & CNC'}</small>
                  </div>
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (onOpenTechnicalReport) onOpenTechnicalReport();
                  }}
                >
                  <span>📄</span>
                  <div>
                    <strong>{isRo ? 'Fișă Tehnică & Raport Fabricație' : isRu ? 'Техническая карта и спецификация' : 'Technical Spec & Cutting List'}</strong>
                    <small>{isRo ? 'Tabel debitare, suprafețe m² și consum PAL' : isRu ? 'Карта раскроя, площадь м² и смета' : 'Cutting list, board area & hardware'}</small>
                  </div>
                </button>
              </div>
            </>
          )}

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json,.cadproj,.glb,.gltf,.d3d,.b3d,.obj,.3design"
            onChange={handleFileChange}
          />
        </div>

        {/* 2D Plan View / 3D CAD Perspective Switcher */}
        {onToggle2DPlanMode && (
          <button
            type="button"
            className={`action-btn ${is2DPlanMode ? 'active' : ''}`}
            onClick={onToggle2DPlanMode}
            title={is2DPlanMode ? 'Comută la Perspectivă 3D CAD' : 'Comută la Schiță 2D Plan Arhitectural'}
            style={is2DPlanMode ? { background: 'rgba(56, 189, 248, 0.25)', borderColor: '#38bdf8' } : {}}
          >
            <span>{is2DPlanMode ? '🏛️' : '📐'}</span>
            <span className="btn-label-desktop">
              {is2DPlanMode
                ? (isRo ? 'Vedere 3D' : isRu ? 'Вид 3D' : '3D View')
                : (isRo ? 'Schiță 2D' : isRu ? 'План 2D' : '2D Plan')}
            </span>
          </button>
        )}

        {/* Magnetic Snapping Toggle */}
        <button
          type="button"
          className={`action-btn ${magneticSnapEnabled ? 'active' : ''}`}
          onClick={onToggleMagneticSnap}
          title={isRo ? 'Lipire Magnetică Automată (Snapping 3D)' : isRu ? 'Магнитное прилипание деталей' : 'Magnetic 3D Snapping'}
        >
          <span>🧲</span>
          <span className="btn-label-desktop">{magneticSnapEnabled ? 'Snap: ON' : 'Snap: OFF'}</span>
        </button>

        {/* Technical Report Direct Button */}
        <button
          type="button"
          className="action-btn"
          onClick={onOpenTechnicalReport}
          title={isRo ? 'Fișă Tehnică & Raport Debitări' : isRu ? 'Техническая спецификация' : 'Technical Report'}
          style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.15))', borderColor: 'rgba(56, 189, 248, 0.4)' }}
        >
          <span>📄</span>
          <span className="btn-label-desktop">{isRo ? 'Fișă Tehnică' : isRu ? 'Спецификация' : 'Cutting List'}</span>
        </button>

        {/* Screenshot HD Direct Button */}
        <button
          type="button"
          className="action-btn"
          onClick={onCaptureScreenshot}
          title={isRo ? 'Captură Foto HD (Randare 3D)' : isRu ? 'Снимок HD (3D рендер)' : 'Download HD 3D Screenshot'}
        >
          <span>📸</span>
          <span className="btn-label-desktop">{isRo ? 'Foto HD' : isRu ? 'Фото HD' : 'HD Photo'}</span>
        </button>

        <button
          type="button"
          id="btn-top-undo"
          className="action-btn"
          disabled={!canUndo}
          onClick={onUndo}
          title={dict.undo}
        >
          <span>↩️</span>
          <span className="btn-label-desktop">{dict.undoBtn}</span>
        </button>

        <button
          type="button"
          id="btn-top-redo"
          className="action-btn"
          disabled={!canRedo}
          onClick={onRedo}
          title={dict.redo}
        >
          <span>↪️</span>
          <span className="btn-label-desktop">{dict.redoBtn}</span>
        </button>

        <button
          type="button"
          id="btn-top-dims"
          className={`action-btn ${dimsEnabled ? 'active' : ''}`}
          onClick={onToggleDims}
          title="Toggle Dimensions in cm"
        >
          <span>📏</span>
          <span>{dict.showDims}</span>
        </button>

        <div className="lang-switch">
          {['en', 'ru', 'ro'].map((l) => (
            <button
              type="button"
              key={l}
              className={`lang-btn ${lang === l ? 'active' : ''}`}
              onClick={() => onChangeLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          type="button"
          id="btn-toggle-panel"
          className={`action-btn ${panelOpen ? 'active' : ''}`}
          onClick={onTogglePanel}
        >
          <span>⚙️</span>
          <span>{dict.controlsToggle}</span>
        </button>
      </div>
    </div>
  );
}
