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
    <div
      id="dim-toolbar"
      className={
        dimsEnabled
          ? 'flex flex-col gap-2 rounded-xl border border-white/15 bg-slate-950/90 p-2.5 text-slate-100 shadow-xl backdrop-blur-md'
          : 'hidden'
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
            dimMode === 'all'
              ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
          onClick={() => onSetDimMode('all')}
        >
          <span>📐</span>
          <span>{dict.dimModeAll}</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
            dimMode === 'part'
              ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
          onClick={() => onSetDimMode('part')}
        >
          <span>📦</span>
          <span>{dict.dimModePart}</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
            dimMode === 'tape'
              ? 'border-sky-400/50 bg-sky-500/20 text-sky-300'
              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
          onClick={() => onSetDimMode(dimMode === 'tape' ? 'all' : 'tape')}
        >
          <span>📍</span>
          <span>{dict.dimModeTape}</span>
        </button>

        {(tapeHasPointA || tapeMeasurement) && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
            onClick={onClearTape}
          >
            <span>✕</span>
            <span>{dict.clearTape}</span>
          </button>
        )}
      </div>

      <div id="dim-readout" className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {dimMode === 'tape' ? (
          tapeMeasurement ? (
            <>
              <span className="font-semibold text-slate-100">
                <strong>📏 {tapeMeasurement.labelStr}</strong>
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-rose-300">ΔX: {fmtCm(tapeMeasurement.dxCm)} cm</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">ΔY: {fmtCm(tapeMeasurement.dyCm)} cm</span>
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-sky-300">ΔZ: {fmtCm(tapeMeasurement.dzCm)} cm</span>
              </div>
            </>
          ) : (
            <span className="text-slate-300">
              {tapeHasPointA ? dict.tapeHint2 : dict.tapeHint1}
            </span>
          )
        ) : activeDimInfo ? (
          <>
            <span className="font-semibold text-slate-100">
              <strong>{activeDimInfo.title}</strong>
            </span>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-rose-300">{dict.lblW}: {fmtCm(activeDimInfo.w)} cm</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">{dict.lblH}: {fmtCm(activeDimInfo.h)} cm</span>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-sky-300">{dict.lblD}: {fmtCm(activeDimInfo.d)} cm</span>
            </div>
          </>
        ) : (
          <span className="text-slate-400">{dict.dimHintDefault}</span>
        )}
      </div>
    </div>
  );
}
