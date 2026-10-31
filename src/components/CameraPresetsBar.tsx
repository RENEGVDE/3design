'use client';

import React from 'react';
import { I18N } from '../i18n/translations';

const CAMERA_BUTTONS = [
  { key: 'overview', icon: '🌐', i18nKey: 'camOverview' },
  { key: 'front', icon: '🎯', i18nKey: 'camFront' },
  { key: 'side', icon: '📐', i18nKey: 'camSide' },
  { key: 'top', icon: '🗺️', i18nKey: 'camTop' },
  { key: 'focus', icon: '🔍', i18nKey: 'camFocus' }
];

export default function CameraPresetsBar({
  lang,
  onSelectCamera,
  autoRotate,
  onToggleAutoRotate
}) {
  const dict = I18N[lang] || I18N.ro;

  return (
    <div id="bottom-bar">
      {CAMERA_BUTTONS.map((b) => (
        <button
          key={b.key}
          className="btn-pill"
          onClick={() => onSelectCamera(b.key)}
        >
          <span>{b.icon}</span>
          <span>{dict[b.i18nKey]}</span>
        </button>
      ))}
      <button
        id="btn-autorotate"
        className={`btn-pill ${autoRotate ? 'active' : ''}`}
        onClick={onToggleAutoRotate}
      >
        <span>🔄</span>
        <span>{dict.autoRotate}</span>
      </button>
    </div>
  );
}
