'use client';

import React, { useState, useRef } from 'react';
import { I18N } from '../i18n/translations.js';

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
  showDemoKitchen = true,
  onToggleDemoKitchen,
  onNewProject,
  onSaveProject,
  onLoadProject,
  onOpenTechnicalReport,
  magneticSnapEnabled = true,
  onToggleMagneticSnap
}) {
  const dict = I18N[lang] || I18N.ro;
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
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
            className={`action-btn ${projectMenuOpen ? 'active' : ''}`}
            onClick={() => setProjectMenuOpen((v) => !v)}
            title="Meniu Proiect & Export"
          >
            <span>📂</span>
            <span className="btn-label-desktop">{isRo ? 'Proiect' : isRu ? 'Проект' : 'Project'} ▾</span>
          </button>

          {projectMenuOpen && (
            <div
              className="project-dropdown-menu"
              onClick={() => setProjectMenuOpen(false)}
            >
              <button
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectMenuOpen(false);
                  onNewProject?.();
                }}
              >
                <span>🆕</span>
                <div>
                  <strong>{isRo ? 'Proiect Nou (Cameră Goală)' : isRu ? 'Новый проект (Пустая комната)' : 'New Project (Empty Room)'}</strong>
                  <small>{isRo ? 'Curăță scena pentru mobilier personalizat' : isRu ? 'Очистить для новой мебели' : 'Clean room for custom furniture'}</small>
                </div>
              </button>

              <button
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectMenuOpen(false);
                  onToggleDemoKitchen?.();
                }}
              >
                <span>🍳</span>
                <div>
                  <strong>{isRo ? (showDemoKitchen ? 'Ascunde Bucătăria Demo' : 'Arată Bucătăria Demo') : isRu ? (showDemoKitchen ? 'Скрыть демо-кухню' : 'Показать демо-кухню') : (showDemoKitchen ? 'Hide Demo Kitchen' : 'Show Demo Kitchen')}</strong>
                  <small>{isRo ? 'Comută modelul demonstrativ de bucătărie' : isRu ? 'Вкл/выкл показ демо кухни' : 'Toggle demo kitchen model'}</small>
                </div>
              </button>

              <div className="dropdown-divider" />

              <button
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectMenuOpen(false);
                  onSaveProject?.();
                }}
              >
                <span>💾</span>
                <div>
                  <strong>{isRo ? 'Salvează Proiect (.3design)' : isRu ? 'Сохранить проект (.3design)' : 'Save Project (.3design)'}</strong>
                  <small>{isRo ? 'Descarcă fișierul cu corpurile și materialele' : isRu ? 'Скачать файл проекта со всеми деталями' : 'Download file with parts & materials'}</small>
                </div>
              </button>

              <button
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <span>📥</span>
                <div>
                  <strong>{isRo ? 'Încarcă Proiect (.3design)' : isRu ? 'Открыть проект (.3design)' : 'Open Project (.3design)'}</strong>
                  <small>{isRo ? 'Restaurează un proiect salvat anterior' : isRu ? 'Загрузить ранее сохраненный проект' : 'Restore previously saved project'}</small>
                </div>
              </button>

              <div className="dropdown-divider" />

              <button
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectMenuOpen(false);
                  onOpenTechnicalReport?.();
                }}
              >
                <span>📄</span>
                <div>
                  <strong>{isRo ? 'Fișă Tehnică & Raport Fabricație' : isRu ? 'Техническая карта и спецификация' : 'Technical Spec & Cutting List'}</strong>
                  <small>{isRo ? 'Tabel debitare, suprafețe m² și consum PAL' : isRu ? 'Карта раскроя, площадь м² и смета' : 'Cutting list, board area & hardware'}</small>
                </div>
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".3design,.json"
            onChange={handleFileChange}
          />
        </div>

        {/* Magnetic Snapping Toggle */}
        <button
          className={`action-btn ${magneticSnapEnabled ? 'active' : ''}`}
          onClick={onToggleMagneticSnap}
          title={isRo ? 'Lipire Magnetică Automată (Snapping 3D)' : isRu ? 'Магнитное прилипание деталей' : 'Magnetic 3D Snapping'}
        >
          <span>🧲</span>
          <span className="btn-label-desktop">{magneticSnapEnabled ? 'Snap: ON' : 'Snap: OFF'}</span>
        </button>

        {/* Technical Report Direct Button */}
        <button
          className="action-btn"
          onClick={onOpenTechnicalReport}
          title={isRo ? 'Fișă Tehnică & Raport Debitări' : isRu ? 'Техническая спецификация' : 'Technical Report'}
          style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.15))', borderColor: 'rgba(56, 189, 248, 0.4)' }}
        >
          <span>📄</span>
          <span className="btn-label-desktop">{isRo ? 'Fișă Tehnică' : isRu ? 'Спецификация' : 'Cutting List'}</span>
        </button>

        <button
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
              key={l}
              className={`lang-btn ${lang === l ? 'active' : ''}`}
              onClick={() => onChangeLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <button
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
