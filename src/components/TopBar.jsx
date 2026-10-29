'use client';

import React from 'react';
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
  onRedo
}) {
  const dict = I18N[lang] || I18N.ro;

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
