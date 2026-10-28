'use client';

import React from 'react';
import { I18N } from '../i18n/translations.js';
import { LIGHT_POS_PRESETS } from '../utils/textures.js';

export default function LightingStudioSection({
  lang,
  lightState,
  onChangeLightState,
  showLightOrb,
  onToggleLightOrb
}) {
  const dict = I18N[lang] || I18N.ro;

  let kelvinTag = '';
  if (lightState.kelvin <= 3200) {
    kelvinTag = lang === 'ro' ? ' (Caldă)' : lang === 'ru' ? ' (Тёплый)' : ' (Warm)';
  } else if (lightState.kelvin <= 4600) {
    kelvinTag = lang === 'ro' ? ' (Neutră)' : lang === 'ru' ? ' (Нейтр.)' : ' (Neutral)';
  } else {
    kelvinTag = lang === 'ro' ? ' (Rece)' : lang === 'ru' ? ' (Холод.)' : ' (Cool)';
  }

  return (
    <div className="panel-section">
      <div className="section-title">
        <span>💡 {dict.lightStudioTitle}</span>
      </div>

      <div className="light-box">
        <div className="studio-slider-row">
          <span>{dict.lightKelvinLbl}</span>
          <span className="val">{`${lightState.kelvin}K${kelvinTag}`}</span>
        </div>
        <input
          type="range"
          className="studio-range kelvin-range"
          min="2700"
          max="6500"
          step="100"
          value={lightState.kelvin}
          onChange={(e) =>
            onChangeLightState({ kelvin: parseInt(e.target.value, 10) || 4000 })
          }
        />

        <div className="light-preset-row">
          <button
            className="light-chip"
            onClick={() => onChangeLightState({ kelvin: 2900 })}
          >
            <span>🌅</span>
            <span>{dict.kelvinWarm}</span>
          </button>
          <button
            className="light-chip"
            onClick={() => onChangeLightState({ kelvin: 4000 })}
          >
            <span>☀️</span>
            <span>{dict.kelvinNeutral}</span>
          </button>
          <button
            className="light-chip"
            onClick={() => onChangeLightState({ kelvin: 6000 })}
          >
            <span>❄️</span>
            <span>{dict.kelvinDaylight}</span>
          </button>
        </div>

        <div className="studio-slider-row" style={{ marginTop: '4px' }}>
          <span>{dict.lightIntensityLbl}</span>
          <span className="val">{`${lightState.mainPct}%`}</span>
        </div>
        <input
          type="range"
          className="studio-range"
          min="0"
          max="250"
          step="5"
          value={lightState.mainPct}
          onChange={(e) =>
            onChangeLightState({ mainPct: parseInt(e.target.value, 10) })
          }
        />

        <div className="studio-slider-row">
          <span>{dict.ambientIntensityLbl}</span>
          <span className="val">{`${lightState.ambientPct}%`}</span>
        </div>
        <input
          type="range"
          className="studio-range"
          min="10"
          max="200"
          step="5"
          value={lightState.ambientPct}
          onChange={(e) =>
            onChangeLightState({ ambientPct: parseInt(e.target.value, 10) })
          }
        />

        <div className="zone-title" style={{ marginTop: '2px' }}>
          {dict.lightPointTitle}
        </div>
        <div className="light-pos-grid">
          <button
            className="light-chip"
            onClick={() => onChangeLightState(LIGHT_POS_PRESETS.front_right)}
          >
            <span>↘️</span>
            <span>{dict.lposFrontRight}</span>
          </button>
          <button
            className="light-chip"
            onClick={() => onChangeLightState(LIGHT_POS_PRESETS.front_left)}
          >
            <span>↙️</span>
            <span>{dict.lposFrontLeft}</span>
          </button>
          <button
            className="light-chip"
            onClick={() => onChangeLightState(LIGHT_POS_PRESETS.ceiling)}
          >
            <span>⬆️</span>
            <span>{dict.lposCeiling}</span>
          </button>
          <button
            className="light-chip"
            onClick={() => onChangeLightState(LIGHT_POS_PRESETS.window)}
          >
            <span>🪟</span>
            <span>{dict.lposWindow}</span>
          </button>
          <button
            className="light-chip"
            onClick={() => onChangeLightState(LIGHT_POS_PRESETS.low_dramatic)}
          >
            <span>🌇</span>
            <span>{dict.lposDramatic}</span>
          </button>
        </div>

        <div className="studio-slider-row">
          <span>{dict.lightAngleLbl}</span>
          <span className="val">{`${lightState.angleDeg}°`}</span>
        </div>
        <input
          type="range"
          className="studio-range"
          min="-180"
          max="180"
          step="2"
          value={lightState.angleDeg}
          onChange={(e) =>
            onChangeLightState({ angleDeg: parseInt(e.target.value, 10) })
          }
        />

        <div className="studio-slider-row">
          <span>{dict.lightHeightLbl}</span>
          <span className="val">{`${lightState.heightM.toFixed(1)}m`}</span>
        </div>
        <input
          type="range"
          className="studio-range"
          min="0.8"
          max="6.5"
          step="0.1"
          value={lightState.heightM}
          onChange={(e) =>
            onChangeLightState({ heightM: parseFloat(e.target.value) })
          }
        />

        <div className="studio-slider-row">
          <span>{dict.lightDistLbl}</span>
          <span className="val">{`${lightState.distM.toFixed(1)}m`}</span>
        </div>
        <input
          type="range"
          className="studio-range"
          min="1.5"
          max="7.0"
          step="0.1"
          value={lightState.distM}
          onChange={(e) =>
            onChangeLightState({ distM: parseFloat(e.target.value) })
          }
        />

        <button
          className={`btn-pill ${showLightOrb ? 'active' : ''}`}
          style={{ width: '100%', justifyContent: 'center', marginTop: '2px' }}
          onClick={onToggleLightOrb}
        >
          <span>🔮</span>
          <span>{dict.showLightOrbBtn}</span>
        </button>
      </div>
    </div>
  );
}
