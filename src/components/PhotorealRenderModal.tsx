'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhotorealRenderSettings,
  PostProcessSettings,
  DEFAULT_RENDER_SETTINGS,
  DEFAULT_POST_PROCESS,
  RawRenderBuffer,
  renderPhotorealScene,
  applyPostProcessingToCanvas,
  RenderAtmospherePreset,
  RenderBackdropMode
} from '../utils/photorealRenderer';

export interface PhotorealRenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  onGetSceneContext: () => any;
  onShowToast?: (msg: string) => void;
}

export default function PhotorealRenderModal({
  isOpen,
  onClose,
  lang,
  onGetSceneContext,
  onShowToast
}: PhotorealRenderModalProps) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [renderSettings, setRenderSettings] = useState<PhotorealRenderSettings>(
    DEFAULT_RENDER_SETTINGS
  );
  const [postSettings, setPostSettings] = useState<PostProcessSettings>(
    DEFAULT_POST_PROCESS
  );

  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<{
    percent: number;
    pass: number;
    total: number;
  } | null>(null);
  const [rawBuffer, setRawBuffer] = useState<RawRenderBuffer | null>(null);

  const cancelRef = useRef(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const startRenderPass = useCallback(
    async (customSettings?: PhotorealRenderSettings) => {
      const ctx = onGetSceneContext();
      if (!ctx || !ctx.renderer || !ctx.scene || !ctx.camera) return;

      const cfg = customSettings || renderSettings;
      cancelRef.current = false;
      setIsRendering(true);
      setProgress({ percent: 0, pass: 0, total: cfg.samples });

      try {
        const buf = await renderPhotorealScene(
          ctx,
          cfg,
          (percent, pass, total) => {
            setProgress({ percent, pass, total });
          },
          () => cancelRef.current
        );
        setRawBuffer(buf);
        if (previewCanvasRef.current) {
          applyPostProcessingToCanvas(buf, postSettings, previewCanvasRef.current);
        }
      } catch (err) {
        console.error('Photoreal render error:', err);
      } finally {
        setIsRendering(false);
        setProgress(null);
      }
    },
    [onGetSceneContext, renderSettings, postSettings]
  );

  // Automatically run an initial fast studio render when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startRenderPass({
          ...renderSettings,
          samples: Math.min(renderSettings.samples, 16)
        });
      }, 120);
      return () => {
        clearTimeout(timer);
        cancelRef.current = true;
      };
    } else {
      cancelRef.current = true;
    }
  }, [isOpen]);

  // Re-apply post-processing instantaneously whenever postSettings change
  useEffect(() => {
    if (rawBuffer && previewCanvasRef.current) {
      applyPostProcessingToCanvas(rawBuffer, postSettings, previewCanvasRef.current);
    }
  }, [rawBuffer, postSettings]);

  if (!isOpen) return null;

  const handleDownloadImage = (format: 'png' | 'jpeg') => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mime, 0.96);
    const a = document.createElement('a');
    a.href = dataUrl;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `render-fotorealist-3d-${ts}.${format === 'png' ? 'png' : 'jpg'}`;
    a.click();
    onShowToast?.(
      isRo
        ? `📸 Imaginea fotorealistă (${canvas.width}×${canvas.height}) a fost descărcată!`
        : `📸 Photorealistic render (${canvas.width}×${canvas.height}) downloaded!`
    );
  };

  const updateRenderSetting = <K extends keyof PhotorealRenderSettings>(
    key: K,
    val: PhotorealRenderSettings[K],
    autoRerender = false
  ) => {
    const next = { ...renderSettings, [key]: val };
    setRenderSettings(next);
    if (autoRerender && !isRendering) {
      startRenderPass(next);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(6, 9, 16, 0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRendering) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1180px',
          maxHeight: '92dvh',
          background: 'linear-gradient(165deg, rgba(18, 24, 38, 0.99), rgba(10, 14, 24, 0.99))',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '20px',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.85)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.09)',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '19px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
              }}
            >
              📸
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                {isRo
                  ? 'Studio Randare 3D Fotorealistă (Ray-Shadow & Post-Processing)'
                  : isRu
                  ? 'Студия фотореалистичного 3D рендера'
                  : 'Photorealistic 3D Render Studio'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                {isRo
                  ? 'Acumulare multi-pas de umbre moi (Soft Area Shadows), reflexii PBR și procesare fotografică în timp real'
                  : 'Multi-pass soft area shadows, PBR reflections & live photographic color grading'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              cancelRef.current = true;
              onClose();
            }}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Main Body: Responsive Split Layout */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            flex: 1,
            overflowY: 'auto'
          }}
        >
          {/* Left Column: Photo Preview Viewport */}
          <div
            style={{
              flex: '1 1 560px',
              minHeight: '320px',
              background: '#070a12',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              position: 'relative',
              borderRight: '1px solid rgba(255, 255, 255, 0.07)'
            }}
          >
            <div
              style={{
                width: '100%',
                maxHeight: '64dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <canvas
                ref={previewCanvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '62dvh',
                  width: 'auto',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain'
                }}
              />

              {/* Live Render Progress Overlay */}
              {isRendering && progress && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(7, 10, 18, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '24px'
                  }}
                >
                  <div style={{ fontSize: '28px' }}>✨</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                    {isRo
                      ? `Se randează imaginea fotorealistă... ${progress.percent}%`
                      : `Rendering photorealistic image... ${progress.percent}%`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {isRo
                      ? `Pasul ${progress.pass} din ${progress.total} (Acumulare umbre moi & anti-aliasing)`
                      : `Pass ${progress.pass} of ${progress.total} (Soft shadows & SSAA)`}
                  </div>
                  <div
                    style={{
                      width: '260px',
                      height: '8px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.12)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${progress.percent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #f59e0b, #ec4899)',
                        transition: 'width 0.15s ease'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Bar under Preview */}
            <div
              style={{
                width: '100%',
                marginTop: '14px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                📐 {renderSettings.width} × {renderSettings.height} px • {renderSettings.samples} samples Ray-Shadow
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  disabled={isRendering}
                  onClick={() => startRenderPass(renderSettings)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)'
                  }}
                >
                  🎬 {isRo ? 'Randează la Calitate Maximă' : isRu ? 'Рендер в макс. качестве' : 'Render Full Quality'}
                </button>

                <button
                  type="button"
                  disabled={isRendering || !rawBuffer}
                  onClick={() => handleDownloadImage('png')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(34, 197, 94, 0.45)',
                    background: 'rgba(34, 197, 94, 0.16)',
                    color: '#86efac',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  📥 {isRo ? 'Descarcă PNG' : 'Download PNG'}
                </button>

                <button
                  type="button"
                  disabled={isRendering || !rawBuffer}
                  onClick={() => handleDownloadImage('jpeg')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(56, 189, 248, 0.45)',
                    background: 'rgba(56, 189, 248, 0.16)',
                    color: '#7dd3fc',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  📥 {isRo ? 'Descarcă JPG' : 'Download JPG'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Studio Controls */}
          <div
            style={{
              flex: '1 1 340px',
              maxWidth: '420px',
              padding: '18px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* 1. Atmosphere Preset */}
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '7px' }}>
                ☀️ {isRo ? '1. ILUMINARE & ATMOSFERĂ STUDIO' : '1. LIGHTING & ATMOSPHERE'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {(
                  [
                    {
                      id: 'daylight',
                      label: isRo ? '☀️ Lumina Zilei (5500K)' : '☀️ Daylight (5500K)'
                    },
                    {
                      id: 'golden_hour',
                      label: isRo ? '🌅 Apus Cald (3700K)' : '🌅 Golden Hour (3700K)'
                    },
                    {
                      id: 'studio_catalog',
                      label: isRo ? '🎬 Studio Catalog' : '🎬 Catalog Studio'
                    },
                    {
                      id: 'luxury_evening',
                      label: isRo ? '🌙 Seară Showroom' : '🌙 Luxury Evening'
                    }
                  ] as { id: RenderAtmospherePreset; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isRendering}
                    onClick={() => updateRenderSetting('atmosphere', item.id, true)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '9px',
                      border:
                        renderSettings.atmosphere === item.id
                          ? '1px solid #f59e0b'
                          : '1px solid rgba(255,255,255,0.1)',
                      background:
                        renderSettings.atmosphere === item.id
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(255,255,255,0.04)',
                      color: renderSettings.atmosphere === item.id ? '#fde68a' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Backdrop & Floor */}
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '7px' }}>
                🏛️ {isRo ? '2. AMBIENT CAMERĂ & PODEA' : '2. ROOM & FLOOR BACKDROP'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {(
                  [
                    {
                      id: 'warm_parquet_walls',
                      label: isRo ? '🪵 Parchet Stejar & Pereți' : '🪵 Oak Floor & Walls'
                    },
                    {
                      id: 'marble_showroom',
                      label: isRo ? '🏛️ Marmură & Reflexii' : '🏛️ Polished Marble'
                    },
                    {
                      id: 'studio_cyclorama',
                      label: isRo ? '📸 Fundal Studio Foto' : '📸 Studio Cyclorama'
                    },
                    {
                      id: 'current_scene',
                      label: isRo ? '🧱 Scena Actuală' : '🧱 Current Scene'
                    }
                  ] as { id: RenderBackdropMode; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isRendering}
                    onClick={() => updateRenderSetting('backdrop', item.id, true)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '9px',
                      border:
                        renderSettings.backdrop === item.id
                          ? '1px solid #38bdf8'
                          : '1px solid rgba(255,255,255,0.1)',
                      background:
                        renderSettings.backdrop === item.id
                          ? 'rgba(56, 189, 248, 0.18)'
                          : 'rgba(255,255,255,0.04)',
                      color: renderSettings.backdrop === item.id ? '#7dd3fc' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Resolution & Samples */}
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '7px' }}>
                📐 {isRo ? '3. REZOLUȚIE & CALITATE UMBRE (SAMPLES)' : '3. RESOLUTION & SAMPLES'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                {[
                  { label: 'Full HD 1080p', w: 1920, h: 1080 },
                  { label: '2K QHD', w: 2560, h: 1440 },
                  { label: '4K Ultra', w: 3840, h: 2160 }
                ].map((res) => {
                  const active = renderSettings.width === res.w && renderSettings.height === res.h;
                  return (
                    <button
                      key={res.label}
                      type="button"
                      disabled={isRendering}
                      onClick={() => {
                        const next = { ...renderSettings, width: res.w, height: res.h };
                        setRenderSettings(next);
                      }}
                      style={{
                        padding: '7px 6px',
                        borderRadius: '8px',
                        border: active ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                        background: active ? 'rgba(168, 85, 247, 0.22)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#e9d5ff' : '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {res.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { label: isRo ? '⚡ Rapid (12x)' : '⚡ Fast (12x)', s: 12 },
                  { label: isRo ? '✨ Studio (24x)' : '✨ Studio (24x)', s: 24 },
                  { label: isRo ? '💎 Ultra (48x)' : '💎 Ultra (48x)', s: 48 }
                ].map((q) => {
                  const active = renderSettings.samples === q.s;
                  return (
                    <button
                      key={q.s}
                      type="button"
                      disabled={isRendering}
                      onClick={() => updateRenderSetting('samples', q.s, false)}
                      style={{
                        padding: '7px 6px',
                        borderRadius: '8px',
                        border: active ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                        background: active ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#fde68a' : '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {q.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Live Photographic Post-Processing Sliders */}
            <div
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#f8fafc' }}>
                  🎚️ {isRo ? 'REGLAJE FOTO LIVE (INSTANT)' : 'LIVE PHOTO GRADING'}
                </span>
                <button
                  type="button"
                  onClick={() => setPostSettings(DEFAULT_POST_PROCESS)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              </div>

              {/* Exposure */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                  <span>☀️ {isRo ? 'Expunere (Luminozitate)' : 'Exposure'}</span>
                  <span>{Math.round(postSettings.exposure * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.65}
                  max={1.5}
                  step={0.02}
                  value={postSettings.exposure}
                  onChange={(e) =>
                    setPostSettings((p) => ({ ...p, exposure: parseFloat(e.target.value) }))
                  }
                  style={{ width: '100%' }}
                />
              </div>

              {/* Contrast */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                  <span>🌗 {isRo ? 'Contrast Filmic' : 'Filmic Contrast'}</span>
                  <span>{Math.round(postSettings.contrast * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.85}
                  max={1.45}
                  step={0.02}
                  value={postSettings.contrast}
                  onChange={(e) =>
                    setPostSettings((p) => ({ ...p, contrast: parseFloat(e.target.value) }))
                  }
                  style={{ width: '100%' }}
                />
              </div>

              {/* Warmth */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                  <span>🌡️ {isRo ? 'Balans de Alb (Rece ↔ Cald)' : 'Warmth Balance'}</span>
                  <span>{postSettings.warmth > 0 ? `+${postSettings.warmth}` : postSettings.warmth}</span>
                </div>
                <input
                  type="range"
                  min={-35}
                  max={35}
                  step={1}
                  value={postSettings.warmth}
                  onChange={(e) =>
                    setPostSettings((p) => ({ ...p, warmth: parseInt(e.target.value, 10) }))
                  }
                  style={{ width: '100%' }}
                />
              </div>

              {/* Saturation */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                  <span>🎨 {isRo ? 'Saturație Culori & Texturi' : 'Saturation'}</span>
                  <span>{Math.round(postSettings.saturation * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.45}
                  step={0.02}
                  value={postSettings.saturation}
                  onChange={(e) =>
                    setPostSettings((p) => ({ ...p, saturation: parseFloat(e.target.value) }))
                  }
                  style={{ width: '100%' }}
                />
              </div>

              {/* Specular Bloom */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                  <span>✨ {isRo ? 'Glow Lumină (Specular Bloom)' : 'Highlight Bloom'}</span>
                  <span>{Math.round(postSettings.bloom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.85}
                  step={0.02}
                  value={postSettings.bloom}
                  onChange={(e) =>
                    setPostSettings((p) => ({ ...p, bloom: parseFloat(e.target.value) }))
                  }
                  style={{ width: '100%' }}
                />
              </div>

              {/* Vignette */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                  <span>📷 {isRo ? 'Vignetare Obiectiv Foto' : 'Lens Vignette'}</span>
                  <span>{Math.round(postSettings.vignette * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.75}
                  step={0.02}
                  value={postSettings.vignette}
                  onChange={(e) =>
                    setPostSettings((p) => ({ ...p, vignette: parseFloat(e.target.value) }))
                  }
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

