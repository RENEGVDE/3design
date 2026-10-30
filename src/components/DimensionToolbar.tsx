'use client';

import React from 'react';
import { I18N, fmtCm } from '../i18n/translations';

export default function DimensionToolbar({
  lang,
  dimsEnabled,
  dimMode,
  onSetDimMode,
  activeDimInfo,
  tapeMeasurement,
  tapeHasPointA,
  onClearTape
}) {
  const dict = I18N[lang] || I18N.ro;

  return (
    <div id="dim-toolbar" className={dimsEnabled ? '' : 'hidden'}>
      <div className="dim-toolbar-row">
        <button
          className={`btn-pill ${dimMode === 'all' ? 'active' : ''}`}
          onClick={() => onSetDimMode('all')}
        >
          <span>📐</span>
          <span>{dict.dimModeAll}</span>
        </button>

        <button
          className={`btn-pill ${dimMode === 'part' ? 'active' : ''}`}
          onClick={() => onSetDimMode('part')}
        >
          <span>📦</span>
          <span>{dict.dimModePart}</span>
        </button>

        <button
          className={`btn-pill ${dimMode === 'tape' ? 'active-cyan' : ''}`}
          onClick={() => onSetDimMode(dimMode === 'tape' ? 'all' : 'tape')}
        >
          <span>📍</span>
          <span>{dict.dimModeTape}</span>
        </button>

        {(tapeHasPointA || tapeMeasurement) && (
          <button className="btn-pill" onClick={onClearTape}>
            <span>✕</span>
            <span>{dict.clearTape}</span>
          </button>
        )}
      </div>

      <div id="dim-readout">
        {dimMode === 'tape' ? (
          tapeMeasurement ? (
            <>
              <span className="dim-readout-title">
                <strong>📏 {tapeMeasurement.labelStr}</strong>
              </span>
              <div className="dim-badges">
                <span className="dim-badge w">ΔX: {fmtCm(tapeMeasurement.dxCm)} cm</span>
                <span className="dim-badge h">ΔY: {fmtCm(tapeMeasurement.dyCm)} cm</span>
                <span className="dim-badge d">ΔZ: {fmtCm(tapeMeasurement.dzCm)} cm</span>
              </div>
            </>
          ) : (
            <span className="dim-readout-title">
              {tapeHasPointA ? dict.tapeHint2 : dict.tapeHint1}
            </span>
          )
        ) : activeDimInfo ? (
          <>
            <span className="dim-readout-title">
              <strong>{activeDimInfo.title}</strong>
            </span>
            <div className="dim-badges">
              <span className="dim-badge w">{dict.lblW}: {fmtCm(activeDimInfo.w)} cm</span>
              <span className="dim-badge h">{dict.lblH}: {fmtCm(activeDimInfo.h)} cm</span>
              <span className="dim-badge d">{dict.lblD}: {fmtCm(activeDimInfo.d)} cm</span>
            </div>
          </>
        ) : (
          <span className="dim-readout-title">{dict.dimHintDefault}</span>
        )}
      </div>
    </div>
  );
}
