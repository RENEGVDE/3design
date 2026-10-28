import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT_DIR, 'public', 'data', 'kitchen-payload.json'), 'r', encoding='utf-8') as f:
    payload_str = f.read()

html_template = r"""<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#121419" />
<title>3D Kitchen Furniture Interactive Viewer — Bucătărie</title>
<style>
  :root {
    --bg-dark: #111317;
    --panel-bg: rgba(20, 23, 29, 0.90);
    --panel-border: rgba(255, 255, 255, 0.12);
    --accent: #d4a359;
    --accent-hover: #e3b56b;
    --accent-glow: rgba(212, 163, 89, 0.25);
    --cyan: #38bdf8;
    --cyan-glow: rgba(56, 189, 248, 0.24);
    --paint: #a855f7;
    --paint-glow: rgba(168, 85, 247, 0.28);
    --text-main: #f3f4f6;
    --text-muted: #9ca3af;
    --success: #34d399;
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-left: env(safe-area-inset-left, 0px);
    --safe-right: env(safe-area-inset-right, 0px);
  }
  * {
    box-sizing: border-box; margin: 0; padding: 0;
    user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  html, body {
    width: 100%; height: 100%; height: 100dvh;
    overflow: hidden; position: fixed; inset: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
    background: radial-gradient(circle at 50% 35%, #262a33 0%, #121419 100%);
    color: var(--text-main);
    touch-action: none;
  }
  #canvas-container {
    position: absolute; inset: 0; width: 100%; height: 100%;
    touch-action: none;
  }
  canvas {
    display: block; width: 100%; height: 100%;
    outline: none; touch-action: none;
  }

  /* Loading Overlay */
  #loader {
    position: fixed; inset: 0; z-index: 1000;
    background: radial-gradient(circle at 50% 40%, #1e222a 0%, #0f1115 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 24px; text-align: center;
    transition: opacity 0.45s ease, visibility 0.45s ease;
  }
  #loader.hidden { opacity: 0; visibility: hidden; pointer-events: none; }
  .spinner {
    width: 54px; height: 54px; border-radius: 50%;
    border: 3px solid rgba(212, 163, 89, 0.2);
    border-top-color: var(--accent);
    animation: spin 0.9s linear infinite;
    margin-bottom: 18px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loader-title { font-size: 18px; font-weight: 600; letter-spacing: 0.4px; margin-bottom: 6px; }
  .loader-sub { font-size: 13px; color: var(--text-muted); }

  /* Top Bar */
  #top-bar {
    position: fixed;
    top: calc(12px + var(--safe-top));
    left: calc(12px + var(--safe-left));
    right: calc(12px + var(--safe-right));
    z-index: 30;
    display: flex; align-items: center; justify-content: space-between;
    pointer-events: none; gap: 8px; flex-wrap: wrap;
  }
  .brand-pill, .top-controls {
    pointer-events: auto;
    background: var(--panel-bg);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    padding: 7px 12px;
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
  }
  .brand-icon {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    background: linear-gradient(135deg, #d4a359, #9e6334);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px; color: #fff;
    box-shadow: 0 2px 10px rgba(212, 163, 89, 0.4);
  }
  .brand-text h1 { font-size: 14px; font-weight: 600; line-height: 1.2; }
  .brand-text p { font-size: 11px; color: var(--text-muted); }

  .lang-group {
    display: flex; background: rgba(255,255,255,0.06); border-radius: 8px; padding: 2px;
  }
  .lang-btn {
    background: transparent; border: none; color: var(--text-muted);
    font-size: 11px; font-weight: 600; padding: 5px 8px; border-radius: 6px;
    cursor: pointer; transition: all 0.18s;
  }
  .lang-btn.active { background: var(--accent); color: #111; }

  .btn {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text-main);
    font-size: 12px; font-weight: 500;
    padding: 7px 11px; border-radius: 8px;
    cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
    transition: all 0.18s ease;
    white-space: nowrap;
  }
  .btn:hover { background: rgba(255,255,255,0.13); border-color: rgba(255,255,255,0.22); }
  .btn:active { transform: scale(0.97); }
  .btn.active {
    background: var(--accent-glow);
    border-color: var(--accent);
    color: #ffd89b;
  }
  .btn.active-cyan {
    background: var(--cyan-glow);
    border-color: var(--cyan);
    color: #bae6fd;
  }
  .btn.active-paint {
    background: var(--paint-glow);
    border-color: var(--paint);
    color: #f3e8ff;
    box-shadow: 0 0 16px rgba(168, 85, 247, 0.35);
  }
  .btn-primary {
    background: var(--accent); color: #141414; border-color: var(--accent); font-weight: 600;
  }
  .btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

  /* Floating Sub-Toolbars (Dimensions & Paint Banner) */
  #dim-toolbar, #paint-banner {
    position: fixed;
    top: calc(68px + var(--safe-top));
    left: calc(12px + var(--safe-left));
    z-index: 28;
    background: rgba(16, 19, 25, 0.93);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(212, 163, 89, 0.45);
    border-radius: 12px;
    padding: 8px 12px;
    display: flex; flex-direction: column; gap: 7px;
    box-shadow: 0 10px 32px rgba(0,0,0,0.5);
    max-width: min(560px, calc(100vw - 24px));
    transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s;
  }
  #paint-banner {
    border-color: var(--paint);
    background: rgba(24, 16, 36, 0.94);
    flex-direction: row; align-items: center; justify-content: space-between; gap: 10px;
  }
  #dim-toolbar.hidden, #paint-banner.hidden {
    opacity: 0; visibility: hidden; pointer-events: none;
    transform: translateY(-8px);
  }
  .dim-bar-row {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .dim-mode-label {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    color: var(--accent); margin-right: 4px; display: flex; align-items: center; gap: 4px;
  }
  .dim-readout {
    font-size: 12px; color: #e5e7eb;
    background: rgba(255,255,255,0.05);
    border-left: 3px solid var(--cyan);
    padding: 6px 10px; border-radius: 6px;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    flex-wrap: wrap;
  }
  .dim-readout strong { color: #fff; font-weight: 600; }
  .dim-badges { display: flex; gap: 6px; flex-wrap: wrap; }
  .dim-badge {
    font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
    background: rgba(56, 189, 248, 0.16); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.35);
    font-variant-numeric: tabular-nums;
  }
  .dim-badge.w { background: rgba(212, 163, 89, 0.18); color: #fcd34d; border-color: rgba(212, 163, 89, 0.4); }
  .dim-badge.h { background: rgba(52, 211, 153, 0.16); color: #6ee7b7; border-color: rgba(52, 211, 153, 0.38); }
  .dim-badge.d { background: rgba(56, 189, 248, 0.16); color: #7dd3fc; border-color: rgba(56, 189, 248, 0.38); }

  /* Side Panel (Desktop Right Sidebar -> Mobile Bottom Sheet) */
  #side-panel {
    position: fixed;
    top: calc(68px + var(--safe-top));
    right: calc(14px + var(--safe-right));
    bottom: calc(74px + var(--safe-bottom));
    width: 350px; z-index: 30;
    background: var(--panel-bg);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--panel-border);
    border-radius: 14px;
    display: flex; flex-direction: column;
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
    transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease;
    overflow: hidden;
  }
  #side-panel.collapsed {
    transform: translateX(380px);
    opacity: 0; pointer-events: none;
  }
  .sheet-handle {
    display: none;
    width: 38px; height: 4px; border-radius: 99px;
    background: rgba(255,255,255,0.25);
    margin: 8px auto 2px;
  }
  .panel-header {
    padding: 11px 14px;
    border-bottom: 1px solid var(--panel-border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .panel-header h2 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #e5e7eb; }
  .panel-close-btn {
    display: none; background: rgba(255,255,255,0.08); border: none; color: #fff;
    width: 26px; height: 26px; border-radius: 50%; font-size: 14px; cursor: pointer;
    align-items: center; justify-content: center;
  }
  .panel-body {
    flex: 1; overflow-y: auto; padding: 12px;
    display: flex; flex-direction: column; gap: 14px;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }
  .panel-body::-webkit-scrollbar { width: 5px; }
  .panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 4px; }

  .section-label {
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    color: var(--text-muted); margin-bottom: 7px; display: flex; justify-content: space-between; align-items: center;
  }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; }

  /* Finish Swatches */
  .swatch-row { display: flex; gap: 6px; }
  .swatch-btn {
    flex: 1; padding: 8px 6px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;
    transition: all 0.18s;
  }
  .swatch-btn:hover { background: rgba(255,255,255,0.1); }
  .swatch-btn.active { border-color: var(--accent); background: var(--accent-glow); }
  .swatch-circles { display: flex; }
  .swatch-circle {
    width: 16px; height: 16px; border-radius: 50%;
    border: 1px solid rgba(0,0,0,0.45);
    margin-left: -4px;
  }
  .swatch-circle:first-child { margin-left: 0; }
  .swatch-name { font-size: 11px; font-weight: 600; color: var(--text-main); text-align: center; }

  /* Custom Material Studio Box */
  .studio-box {
    border: 1px solid rgba(212, 163, 89, 0.3);
    background: rgba(255, 255, 255, 0.03);
    border-radius: 11px;
    padding: 10px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .mat-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
  }
  .mat-card {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.28);
    border-radius: 8px; padding: 5px;
    cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;
    transition: all 0.16s; position: relative;
  }
  .mat-card:hover { background: rgba(255,255,255,0.08); }
  .mat-card.active {
    border-color: var(--accent);
    background: var(--accent-glow);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .mat-thumb {
    width: 100%; height: 34px; border-radius: 5px;
    background-size: cover; background-position: center;
    border: 1px solid rgba(255,255,255,0.15);
  }
  .mat-card-name {
    font-size: 10px; color: #e5e7eb; text-align: center;
    width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .mat-del-btn {
    position: absolute; top: 2px; right: 2px;
    width: 16px; height: 16px; border-radius: 50%;
    background: rgba(0,0,0,0.75); color: #f87171; border: none;
    font-size: 10px; line-height: 1; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }

  .studio-controls-row {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    font-size: 11px; color: var(--text-muted);
  }
  .studio-controls-row input[type="range"] {
    flex: 1; accent-color: var(--accent); cursor: pointer;
  }
  .zone-chip {
    font-size: 10px; padding: 5px 6px; border-radius: 6px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    color: #e5e7eb; cursor: pointer; text-align: center;
    transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .zone-chip:hover {
    background: var(--accent-glow); border-color: var(--accent); color: #ffd89b;
  }
  .zone-chip:active { transform: scale(0.96); }

  /* Interactive Parts List */
  .cat-group {
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px; overflow: hidden;
    background: rgba(0,0,0,0.2);
  }
  .cat-header {
    padding: 9px 10px; background: rgba(255,255,255,0.04);
    font-size: 12px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; justify-content: space-between;
  }
  .cat-header:hover { background: rgba(255,255,255,0.08); }
  .cat-items { display: flex; flex-direction: column; padding: 4px; gap: 2px; }
  .cat-items.hidden { display: none; }
  .part-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 8px; border-radius: 6px; font-size: 12px;
    cursor: pointer; transition: background 0.15s; gap: 6px;
  }
  .part-row:hover { background: rgba(255,255,255,0.08); }
  .part-row.open { background: rgba(52, 211, 153, 0.12); }
  .part-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .part-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .part-dims {
    font-size: 10px; color: #93c5fd; font-variant-numeric: tabular-nums;
    letter-spacing: 0.2px;
  }
  .part-actions { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
  .part-paint-btn {
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14);
    color: #e5e7eb; border-radius: 6px; padding: 3px 6px; font-size: 11px;
    cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 3px;
  }
  .part-paint-btn:hover {
    background: var(--paint-glow); border-color: var(--paint); color: #fff;
  }
  .part-mat-dot {
    width: 10px; height: 10px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.5); display: inline-block;
    background-size: cover; background-position: center;
  }
  .part-status {
    font-size: 10px; font-weight: 600; padding: 3px 7px; border-radius: 99px;
    background: rgba(255,255,255,0.08); color: var(--text-muted); flex-shrink: 0;
  }
  .part-row.open .part-status {
    background: rgba(52, 211, 153, 0.22); color: var(--success);
  }

  /* Bottom Camera Bar */
  #bottom-bar {
    position: fixed;
    bottom: calc(12px + var(--safe-bottom));
    left: 50%; transform: translateX(-50%);
    z-index: 25;
    background: var(--panel-bg);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--panel-border);
    border-radius: 12px; padding: 6px 8px;
    display: flex; align-items: center; gap: 6px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    max-width: calc(100vw - 20px);
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x;
  }
  #bottom-bar::-webkit-scrollbar { display: none; }

  /* Desktop Hover Tooltip */
  #tooltip {
    position: fixed; z-index: 50; pointer-events: none;
    background: rgba(15, 17, 22, 0.94);
    border: 1px solid var(--accent);
    border-radius: 9px; padding: 7px 11px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.55);
    transform: translate(14px, 14px);
    opacity: 0; transition: opacity 0.12s ease;
    white-space: nowrap;
  }
  #tooltip.visible { opacity: 1; }
  .tt-title { font-size: 12px; font-weight: 600; color: #fff; }
  .tt-dims { font-size: 11px; font-weight: 600; color: #7dd3fc; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .tt-sub { font-size: 11px; color: var(--accent); margin-top: 2px; }

  /* Mobile Action Toast */
  #mobile-toast {
    position: fixed;
    bottom: calc(96px + var(--safe-bottom));
    left: 50%; transform: translateX(-50%) translateY(10px);
    z-index: 45; pointer-events: none;
    background: rgba(17, 20, 26, 0.94);
    border: 1px solid var(--accent);
    border-radius: 12px;
    padding: 8px 16px;
    font-size: 12px; font-weight: 600; color: #fff;
    box-shadow: 0 6px 24px rgba(0,0,0,0.5);
    opacity: 0; transition: opacity 0.22s ease, transform 0.22s ease;
    white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis;
    text-align: center;
  }
  #mobile-toast.visible {
    opacity: 1; transform: translateX(-50%) translateY(0);
  }

  /* Help Hint Banner */
  #hint-pill {
    position: fixed;
    bottom: calc(64px + var(--safe-bottom));
    left: 50%; transform: translateX(-50%); z-index: 15;
    background: rgba(17, 19, 24, 0.78);
    border: 1px solid rgba(255,255,255,0.1);
    backdrop-filter: blur(8px);
    padding: 5px 14px; border-radius: 99px;
    font-size: 11px; color: var(--text-muted);
    pointer-events: none; white-space: nowrap;
    max-width: 92vw; overflow: hidden; text-overflow: ellipsis;
    transition: opacity 0.4s;
  }

  /* Mobile Phone Layout Adjustments */
  @media (max-width: 768px) {
    #top-bar { gap: 6px; }
    .brand-pill { padding: 6px 10px; gap: 8px; }
    .brand-icon { width: 26px; height: 26px; font-size: 12px; }
    .brand-text h1 { font-size: 13px; }
    .brand-text p { display: none; }
    .top-controls {
      padding: 5px 8px; gap: 5px;
      flex: 1; justify-content: flex-end; flex-wrap: wrap;
    }
    .btn { padding: 6px 9px; font-size: 11px; }
    .lang-btn { padding: 4px 6px; font-size: 10px; }

    #dim-toolbar, #paint-banner {
      top: calc(62px + var(--safe-top));
      left: 8px; right: 8px;
      max-width: none;
      padding: 7px 10px;
    }

    /* Bottom Sheet on Phone */
    #side-panel {
      top: auto;
      left: 0; right: 0;
      bottom: 0;
      width: 100%;
      height: 62dvh;
      border-radius: 20px 20px 0 0;
      border-bottom: none;
      padding-bottom: var(--safe-bottom);
      z-index: 40;
    }
    #side-panel.collapsed {
      transform: translateY(105%);
      opacity: 1;
    }
    .sheet-handle { display: block; }
    .panel-close-btn { display: inline-flex; }
    #tooltip { display: none !important; }
  }

  @media (max-width: 480px) {
    .brand-text h1 { max-width: 95px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }
</style>
</head>
<body>

<div id="loader">
  <div class="spinner"></div>
  <div class="loader-title" id="loader-title">Loading 3D Kitchen Model...</div>
  <div class="loader-sub" id="loader-sub">Decompressing geometry & preparing interactive hardware</div>
</div>

<div id="canvas-container"></div>

<div id="tooltip">
  <div class="tt-title" id="tt-title">Drawer</div>
  <div class="tt-dims" id="tt-dims">60.0 × 36.4 × 51.2 cm</div>
  <div class="tt-sub" id="tt-sub">Click to open</div>
</div>

<div id="mobile-toast"></div>

<div id="top-bar">
  <div class="brand-pill">
    <div class="brand-icon">3D</div>
    <div class="brand-text">
      <h1 data-i18n="title">Bucătărie 3D</h1>
      <p data-i18n="subtitle">Atingeți orice sertar/ușă • Dimensiuni (cm) • Upload textură proprie pe orice piesă</p>
    </div>
  </div>

  <div class="top-controls">
    <button class="btn" id="btn-top-dims" title="Toggle Dimensions in cm">📏 <span data-i18n="dimensionsCm">Dimensiuni (cm)</span></button>
    <button class="btn btn-primary" id="btn-open-all" data-i18n="openAll">Deschide Tot</button>
    <button class="btn" id="btn-close-all" data-i18n="closeAll">Închide Tot</button>
    <div class="lang-group">
      <button class="lang-btn" data-lang="en">EN</button>
      <button class="lang-btn" data-lang="ru">RU</button>
      <button class="lang-btn active" data-lang="ro">RO</button>
    </div>
    <button class="btn active" id="btn-toggle-panel" data-i18n="inspector">Meniu</button>
  </div>
</div>

<!-- Floating Banner when 3D Paint Mode is Active -->
<div id="paint-banner" class="hidden">
  <div style="display:flex; align-items:center; gap:8px; font-size:12px;">
    <span style="font-size:16px;">🖌️</span>
    <div>
      <strong style="color:#f3e8ff;" data-i18n="paintBannerTitle">Mod Aplicare Material pe 3D Activ</strong>
      <div style="font-size:11px; color:#d8b4fe;" id="paint-banner-sub" data-i18n="paintBannerSub">Atingeți orice ușă, sertar, blat sau carcasă în 3D pentru a-i aplica materialul selectat</div>
    </div>
  </div>
  <button class="btn active-paint" id="btn-exit-paint" data-i18n="exitPaintMode">Gata (Ieșire)</button>
</div>

<!-- Floating Dimensions (cm) Control & Readout Toolbar -->
<div id="dim-toolbar" class="hidden">
  <div class="dim-bar-row">
    <span class="dim-mode-label">📏 <span data-i18n="dimModeLabel">Dimensiuni (cm):</span></span>
    <button class="btn active" id="btn-dim-all" data-i18n="dimAllSections">Toate Secțiunile</button>
    <button class="btn" id="btn-dim-part" data-i18n="dimPartOnly">Doar Piesa Selectată</button>
    <button class="btn" id="btn-tape-measure" data-i18n="tapeMeasure">📐 Ruletă (2 Puncte)</button>
    <button class="btn" id="btn-tape-clear" style="display:none;" data-i18n="tapeClear">Șterge</button>
  </div>
  <div class="dim-readout" id="dim-readout">
    <span id="dim-readout-title" data-i18n="dimHintDefault">Atingeți sau indicați orice sertar sau ușă pentru a vedea L × Î × A în cm</span>
    <div class="dim-badges" id="dim-readout-badges"></div>
  </div>
</div>

<div id="side-panel">
  <div class="sheet-handle" id="sheet-handle"></div>
  <div class="panel-header">
    <h2 data-i18n="controlsHeader">Control & Materiale</h2>
    <div style="display:flex; align-items:center; gap:8px;">
      <span id="open-counter" style="font-size:11px; color:var(--accent); font-weight:600;">0 / 33</span>
      <button class="panel-close-btn" id="btn-close-panel" aria-label="Close panel">✕</button>
    </div>
  </div>
  <div class="panel-body">
    <div>
      <div class="section-label"><span data-i18n="quickActions">Acțiuni Rapide</span></div>
      <div class="grid-2">
        <button class="btn" id="btn-toggle-drawers" data-i18n="toggleDrawers">Sertare (6)</button>
        <button class="btn" id="btn-toggle-doors" data-i18n="toggleDoors">Uși (27)</button>
      </div>
    </div>

    <div>
      <div class="section-label"><span data-i18n="displayModes">Moduri Vizualizare</span></div>
      <div class="grid-2">
        <button class="btn" id="btn-dims">📏 <span data-i18n="dimensionsCm">Dimensiuni (cm)</span></button>
        <button class="btn" id="btn-xray" data-i18n="xray">Fronturi Transparente</button>
        <button class="btn" id="btn-countertop" data-i18n="hideCountertop">Ascunde Blatul</button>
        <button class="btn active" id="btn-edges" data-i18n="cadEdges">Muchii CAD</button>
      </div>
    </div>

    <!-- Lighting Studio: Position, Color Tone (Kelvin) & Intensity -->
    <div>
      <div class="section-label">
        <span data-i18n="lightingStudioTitle">Studio Iluminare (Punct, Ton & Intensitate)</span>
      </div>
      <div class="studio-box" style="border-color: rgba(251, 191, 36, 0.32);">
        <!-- Light Tone (Kelvin) Quick Presets + Gradient Slider -->
        <div>
          <div class="studio-controls-row" style="margin-bottom:5px;">
            <span data-i18n="lightToneLbl">Tonul luminii:</span>
            <span id="lbl-light-kelvin" style="color:#fde68a; font-weight:700;">4000K (Neutră)</span>
          </div>
          <div class="grid-3" style="margin-bottom:6px;">
            <button class="zone-chip" data-kelvin="2700" data-i18n="toneWarm">🕯️ Caldă 2700K</button>
            <button class="zone-chip" data-kelvin="4000" data-i18n="toneNeutral">☀️ Neutră 4000K</button>
            <button class="zone-chip" data-kelvin="6000" data-i18n="toneCool">❄️ Rece 6000K</button>
          </div>
          <input type="range" id="slider-light-kelvin" min="2700" max="6500" step="100" value="4000"
            style="width:100%; height:7px; border-radius:99px; appearance:none; -webkit-appearance:none; background:linear-gradient(90deg, #ffae42 0%, #fff3df 50%, #bae0ff 100%); outline:none; cursor:pointer;" />
        </div>

        <!-- Light Intensity Sliders -->
        <div class="studio-controls-row">
          <span data-i18n="lightIntensityLbl">Intensitate sursă:</span>
          <input type="range" id="slider-light-intensity" min="0" max="250" step="5" value="100" />
          <span id="lbl-light-intensity" style="min-width:38px; text-align:right; color:#ffd89b;">100%</span>
        </div>

        <div class="studio-controls-row">
          <span data-i18n="ambientIntensityLbl">Lumină ambientală:</span>
          <input type="range" id="slider-ambient-intensity" min="10" max="200" step="5" value="100" />
          <span id="lbl-ambient-intensity" style="min-width:38px; text-align:right; color:#ffd89b;">100%</span>
        </div>

        <!-- Light Position (Azimuth Angle, Height & Presets) -->
        <div class="studio-controls-row">
          <span data-i18n="lightAngleLbl">Punct (Unghi 360°):</span>
          <input type="range" id="slider-light-angle" min="-180" max="180" step="2" value="32" />
          <span id="lbl-light-angle" style="min-width:38px; text-align:right; color:#7dd3fc;">32°</span>
        </div>

        <div class="studio-controls-row">
          <span data-i18n="lightHeightLbl">Înălțime sursă:</span>
          <input type="range" id="slider-light-height" min="0.8" max="6.2" step="0.1" value="4.8" />
          <span id="lbl-light-height" style="min-width:38px; text-align:right; color:#7dd3fc;">4.8m</span>
        </div>

        <div class="studio-controls-row">
          <span data-i18n="lightDistLbl">Distanță sursă:</span>
          <input type="range" id="slider-light-dist" min="1.5" max="7.0" step="0.1" value="4.5" />
          <span id="lbl-light-dist" style="min-width:38px; text-align:right; color:#7dd3fc;">4.5m</span>
        </div>

        <div class="grid-3">
          <button class="zone-chip" data-lightpos="front_right" data-i18n="lposFrontRight">Dreapta-Față</button>
          <button class="zone-chip" data-lightpos="front_left" data-i18n="lposFrontLeft">Stânga-Față</button>
          <button class="zone-chip" data-lightpos="ceiling" data-i18n="lposCeiling">Plafon (Sus)</button>
          <button class="zone-chip" data-lightpos="window" data-i18n="lposWindow">Dinspre Geam</button>
          <button class="zone-chip" data-lightpos="low_dramatic" data-i18n="lposLow">Lateral Jos</button>
          <button class="zone-chip" id="btn-show-light-helper" data-i18n="showLightOrb">💡 Sursă 3D</button>
        </div>
      </div>
    </div>

    <!-- Custom Material Upload & Per-Unit Assignment Studio -->
    <div>
      <div class="section-label">
        <span data-i18n="customStudioTitle">Studio Materiale ( salvat automat )</span>
      </div>
      <div class="studio-box">
        <!-- Upload & Solid Color Buttons -->
        <div class="grid-2">
          <label class="btn btn-primary" style="cursor:pointer;">
            📤 <span data-i18n="uploadTexBtn">Upload Textură / Poză</span>
            <input type="file" id="input-upload-tex" accept="image/*" multiple style="display:none;" />
          </label>
          <label class="btn" style="cursor:pointer; position:relative;">
            🎨 <span data-i18n="pickColorBtn">Adaugă Culoare</span>
            <input type="color" id="input-pick-color" value="#d4a359" style="opacity:0; position:absolute; inset:0; width:100%; height:100%; cursor:pointer;" />
          </label>
        </div>

        <!-- Swatch Library Grid (All User Materials — All Deletable) -->
        <div class="mat-grid" id="custom-mat-grid"></div>

        <!-- Texture Scale, Grain Orientation & Finish Controls -->
        <div class="studio-controls-row">
          <span data-i18n="texScaleLbl">Scară fibră:</span>
          <input type="range" id="slider-tex-scale" min="0.25" max="3.0" step="0.05" value="1.0" />
          <span id="lbl-tex-scale" style="min-width:34px; text-align:right; color:#ffd89b;">1.0×</span>
        </div>

        <div class="grid-2">
          <button class="btn" id="btn-grain-dir" data-i18n="grainVert">↕ Fibră Verticală</button>
          <button class="btn" id="btn-finish-mode" data-i18n="finishMatte">Finisaj: Mat</button>
        </div>

        <!-- 3D Click-to-Apply Paint Mode Toggle -->
        <button class="btn" id="btn-paint-mode" style="width:100%; padding:9px;">
          🖌️ <span data-i18n="paintModeBtn">Aplică direct pe 3D (Click pe Piesă)</span>
        </button>

        <!-- Quick Apply by Furniture Zone -->
        <div>
          <div style="font-size:10px; color:var(--text-muted); margin-bottom:5px; text-transform:uppercase; letter-spacing:0.4px;" data-i18n="applyZoneLabel">Sau aplică materialul selectat pe o zonă:</div>
          <div class="grid-2" style="gap:5px;">
            <button class="zone-chip" data-zone="upper_main" data-i18n="zoneUpperMain">Fațada Sus (Stânga–Dreapta)</button>
            <button class="zone-chip" data-zone="upper_all" data-i18n="zoneUpperAll">Toate Corpuri Sus</button>
            <button class="zone-chip" data-zone="drawers" data-i18n="zoneDrawers">Toate Sertarele</button>
            <button class="zone-chip" data-zone="base_all" data-i18n="zoneBaseAll">Bază & Mașină Spălat</button>
            <button class="zone-chip" data-zone="tall_right" data-i18n="zoneTallRight">Coloane Dreapta</button>
            <button class="zone-chip" data-zone="left_all" data-i18n="zoneLeftAll">Coloană Stânga & Frig.</button>
            <button class="zone-chip" data-zone="peninsula" data-i18n="zonePeninsula">Peninsulă Bar</button>
            <button class="zone-chip" data-zone="vitrine_body" data-i18n="zoneVitrineBody">Vitrină (Corp & Jos)</button>
            <button class="zone-chip" data-zone="vitrine_top" data-i18n="zoneVitrineTop">Vitrină (Uși Sus)</button>
            <button class="zone-chip" data-zone="countertop" data-i18n="zoneCountertop">Blat (Countertop)</button>
            <button class="zone-chip" data-zone="carcass" data-i18n="zoneCarcass">Carcasă Bucătărie</button>
            <button class="zone-chip" data-zone="plinth" data-i18n="zonePlinth">Plintă Jos</button>
          </div>
        </div>

        <!-- Reset to White & Clear All Materials Buttons -->
        <div class="grid-2" style="padding-top:4px; border-top:1px solid rgba(255,255,255,0.08);">
          <button class="btn" id="btn-reset-white" style="font-size:11px; padding:6px 8px;" data-i18n="resetWhiteBtn">🔄 Reset Mobilier la Alb</button>
          <button class="btn" id="btn-delete-all-mats" style="font-size:11px; padding:6px 8px; color:#fca5a5;" data-i18n="deleteAllMatsBtn">🗑️ Șterge Materiale</button>
        </div>
      </div>
    </div>

    <div>
      <div class="section-label"><span data-i18n="interactiveParts">Elemente Interactive (33) — 🖌️ = Aplică Material</span></div>
      <div id="parts-list" style="display:flex; flex-direction:column; gap:8px;"></div>
    </div>
  </div>
</div>

<div id="hint-pill" data-i18n="hint">💡 Atingeți sertarele/ușile • Încărcați orice poză de material și aplicați-o pe orice piesă!</div>

<div id="bottom-bar">
  <button class="btn" data-cam="overview" data-i18n="camOverview">Ansamblu</button>
  <button class="btn" data-cam="front" data-i18n="camFront">Vedere Față</button>
  <button class="btn" data-cam="cooking" data-i18n="camCooking">Cuptor & Sertare</button>
  <button class="btn" data-cam="peninsula" data-i18n="camPeninsula">Peninsulă</button>
  <button class="btn" data-cam="sideboard" data-i18n="camSideboard">Vitrină Stejar</button>
  <button class="btn" data-cam="left" data-i18n="camLeft">Coloană Stânga</button>
  <button class="btn" data-cam="top" data-i18n="camTop">Plan Sus</button>
  <button class="btn" id="btn-autorotate" data-i18n="autoRotate">Auto-Rotire</button>
</div>

<!-- Embedded Compressed 3D Model Data -->
<script>
window.KITCHEN_PAYLOAD = __PAYLOAD_JSON__;
</script>

<!-- Three.js via CDN with importmap -->
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/"
  }
}
</script>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

const I18N = {
  en: {
    title: "Kitchen 3D Viewer",
    subtitle: "Tap any door/drawer • Toggle Dimensions (cm) • Upload custom textures & apply to any unit",
    openAll: "Open All",
    closeAll: "Close All",
    inspector: "Controls",
    controlsHeader: "Controls & Materials",
    quickActions: "Quick Actions",
    toggleDrawers: "Drawers (6)",
    toggleDoors: "Doors (27)",
    displayModes: "Display & Inspection",
    xray: "X-Ray Fronts",
    hideCountertop: "Hide Countertop",
    cadEdges: "CAD Edges",
    dimensionsCm: "Dimensions (cm)",
    dimModeLabel: "Dimensions (cm):",
    dimAllSections: "All Sections",
    dimPartOnly: "Selected Part Only",
    tapeMeasure: "📐 Measure 2 Points",
    tapeClear: "Clear",
    dimHintDefault: "Hover or tap any drawer, door, or cabinet to see its exact W × H × D in cm",
    tapeHint1: "📐 Tape Measure: Click/tap first point (Point A) on any surface...",
    tapeHint2: "📐 Point A set! Now click/tap second point (Point B) to measure distance in cm...",
    lblW: "W",
    lblH: "H",
    lblD: "D",
    colorThemes: "Material Palette (Presets)",
    themeOrig: "Sahara & Stejar",
    themeEgger: "Egger H1369 & AGT",
    lightingStudioTitle: "Lighting Studio (Point, Tone & Intensity)",
    lightToneLbl: "Light Tone:",
    toneWarm: "🕯️ Warm 2700K",
    toneNeutral: "☀️ Neutral 4000K",
    toneCool: "❄️ Cool 6000K",
    lightIntensityLbl: "Main Intensity:",
    ambientIntensityLbl: "Ambient Light:",
    lightAngleLbl: "Light Point (360°):",
    lightHeightLbl: "Source Height:",
    lightDistLbl: "Source Distance:",
    lposFrontRight: "Front-Right",
    lposFrontLeft: "Front-Left",
    lposCeiling: "Ceiling (Top)",
    lposWindow: "From Window",
    lposLow: "Low Side",
    showLightOrb: "💡 3D Source",
    customStudioTitle: "Material Studio (Auto-Saved)",
    uploadTexBtn: "Upload Texture / Photo",
    pickColorBtn: "Add Color",
    resetWhiteBtn: "🔄 Reset Furniture to White",
    deleteAllMatsBtn: "🗑️ Clear Materials",
    emptyMatHint: "No materials yet. Upload a texture photo or add a color above.",
    texScaleLbl: "Grain Scale:",
    grainVert: "↕ Vertical Grain",
    grainHoriz: "↔ Horizontal Grain",
    finishMatte: "Finish: Matte",
    finishSatin: "Finish: Satin",
    finishGloss: "Finish: Gloss",
    finishGlass: "Finish: Glass 60%",
    paintModeBtn: "Apply on 3D Model (Click any Part)",
    paintModeActiveBtn: "3D Paint Mode: ON (Click parts)",
    paintBannerTitle: "3D Material Paint Mode Active",
    paintBannerSub: "Click/tap any door, drawer, countertop, or cabinet in 3D to apply the selected material",
    exitPaintMode: "Done (Exit)",
    applyZoneLabel: "Or apply selected material to a zone:",
    zoneUpperMain: "Upper Front (Left→Right)",
    zoneUpperAll: "All Upper Cabinets",
    zoneDrawers: "All Drawers",
    zoneBaseAll: "Base & Washer Doors",
    zoneTallRight: "Right Tall Columns",
    zoneLeftAll: "Left Pantry & Fridge",
    zonePeninsula: "Peninsula Bar",
    zoneVitrineBody: "Vitrine (Body & Lower)",
    zoneVitrineTop: "Vitrine (Upper Doors)",
    zoneCountertop: "Countertop (Worktop)",
    zoneCarcass: "Kitchen Carcass",
    zonePlinth: "Bottom Plinth",
    interactiveParts: "Interactive Elements (33) — 🖌️ = Apply Material",
    hint: "💡 Tap drawers/doors to open • Upload any wood/stone photo & apply it to any unit!",
    camOverview: "Overview",
    camFront: "Main Wall",
    camCooking: "Oven & Drawers",
    camPeninsula: "Peninsula",
    camSideboard: "Oak Vitrine",
    camLeft: "Left Pantry",
    camTop: "Top Plan",
    autoRotate: "Auto-Orbit",
    statusOpen: "OPEN",
    statusClosed: "CLOSED",
    clickToOpen: "Tap to open",
    clickToClose: "Tap to close",
    clickToPaint: "🖌️ Click to apply material: ",
    appliedToast: "🎨 Applied ",
    cat_drawer: "Drawers & Pull-Out Baskets (6)",
    cat_upper_door: "Upper Wall Cabinets (6)",
    cat_base_door: "Base Cabinets & Appliances (3)",
    cat_tall_door: "Right Tall Columns (5)",
    cat_peninsula_door: "Peninsula Bar Cabinets (4)",
    cat_sideboard_door: "Oak & MDF Sideboard (4)",
    cat_left_door: "Left Pantry & Fridge Wall (5)"
  },
  ru: {
    title: "3D Кухня",
    subtitle: "Нажмите на любой ящик/фасад • Размеры (см) • Загрузите свою текстуру для любой детали",
    openAll: "Открыть всё",
    closeAll: "Закрыть всё",
    inspector: "Меню",
    controlsHeader: "Управление и Материалы",
    quickActions: "Быстрые действия",
    toggleDrawers: "Ящики (6)",
    toggleDoors: "Фасады (27)",
    displayModes: "Режимы просмотра",
    xray: "Прозрачный фасад",
    hideCountertop: "Скрыть столешницу",
    cadEdges: "Контуры деталей",
    dimensionsCm: "Размеры (см)",
    dimModeLabel: "Размеры (см):",
    dimAllSections: "Все секции",
    dimPartOnly: "Только выбранный",
    tapeMeasure: "📐 Рулетка (2 точки)",
    tapeClear: "Сброс",
    dimHintDefault: "Наведите или нажмите на любой ящик/фасад, чтобы увидеть его Ш × В × Г в см",
    tapeHint1: "📐 Рулетка: Нажмите на первую точку (Точка А) на любой детали...",
    tapeHint2: "📐 Точка А выбрана! Нажмите на вторую точку (Точка Б) для замера в см...",
    lblW: "Ш",
    lblH: "В",
    lblD: "Г",
    colorThemes: "Палитра материалов (Пресеты)",
    themeOrig: "Сахара и Дуб",
    themeEgger: "Egger H1369 и AGT",
    lightingStudioTitle: "Освещение (Точка, Тон и Яркость)",
    lightToneLbl: "Тон света:",
    toneWarm: "🕯️ Тёплый 2700K",
    toneNeutral: "☀️ Нейтр. 4000K",
    toneCool: "❄️ Холод. 6000K",
    lightIntensityLbl: "Яркость света:",
    ambientIntensityLbl: "Общий свет:",
    lightAngleLbl: "Точка света (360°):",
    lightHeightLbl: "Высота света:",
    lightDistLbl: "Дистанция:",
    lposFrontRight: "Справа-Спереди",
    lposFrontLeft: "Слева-Спереди",
    lposCeiling: "Потолок (Сверху)",
    lposWindow: "От окна",
    lposLow: "Боковой низкий",
    showLightOrb: "💡 3D Лампа",
    customStudioTitle: "Студия материалов (Автосохранение)",
    uploadTexBtn: "Загрузить фото текстуры",
    pickColorBtn: "Добавить цвет",
    resetWhiteBtn: "🔄 Сбросить мебель в белый",
    deleteAllMatsBtn: "🗑️ Удалить все",
    emptyMatHint: "Нет материалов. Загрузите фото текстуры или выберите цвет выше.",
    texScaleLbl: "Масштаб:",
    grainVert: "↕ Текстура Вертик.",
    grainHoriz: "↔ Текстура Гориз.",
    finishMatte: "Покрытие: Мат",
    finishSatin: "Покрытие: Сатин",
    finishGloss: "Покрытие: Глянец",
    finishGlass: "Стекло 60%",
    paintModeBtn: "Выбрать деталь на 3D-модели",
    paintModeActiveBtn: "Режим покраски 3D: ВКЛ",
    paintBannerTitle: "Режим нанесения материала на 3D",
    paintBannerSub: "Нажмите на любой фасад, ящик, столешницу или корпус в 3D, чтобы применить выбранный материал",
    exitPaintMode: "Готово (Выход)",
    applyZoneLabel: "Или применить материал к группе:",
    zoneUpperMain: "Верх (Лев.→Прав.)",
    zoneUpperAll: "Все верхние шкафы",
    zoneDrawers: "Все ящики",
    zoneBaseAll: "Нижние тумбы",
    zoneTallRight: "Правые пеналы",
    zoneLeftAll: "Левый пенал и холод.",
    zonePeninsula: "Полуостров",
    zoneVitrineBody: "Витрина (Корпус и Низ)",
    zoneVitrineTop: "Витрина (Верхние двери)",
    zoneCountertop: "Столешница",
    zoneCarcass: "Корпус кухни",
    zonePlinth: "Цоколь внизу",
    interactiveParts: "Интерактивные элементы (33) — 🖌️ = Материал",
    hint: "💡 Загрузите фото любого дерева/камня и применяйте к любым деталям мебели!",
    camOverview: "Общий вид",
    camFront: "Фронт",
    camCooking: "Духовка и ящики",
    camPeninsula: "Полуостров",
    camSideboard: "Витрина Дуб",
    camLeft: "Левый пенал",
    camTop: "Сверху",
    autoRotate: "Вращение",
    statusOpen: "ОТКРЫТО",
    statusClosed: "ЗАКРЫТО",
    clickToOpen: "Нажмите, чтобы открыть",
    clickToClose: "Нажмите, чтобы закрыть",
    clickToPaint: "🖌️ Нажмите, чтобы применить: ",
    appliedToast: "🎨 Применено: ",
    cat_drawer: "Выдвижные ящики и корзины (6)",
    cat_upper_door: "Верхние шкафы и сушилка (6)",
    cat_base_door: "Нижние тумбы и духовка (3)",
    cat_tall_door: "Правые пеналы (5)",
    cat_peninsula_door: "Полуостров / барная стойка (4)",
    cat_sideboard_door: "Витрина Дуб Casella (4)",
    cat_left_door: "Левый пенал и холодильник (5)"
  },
  ro: {
    title: "Bucătărie 3D",
    subtitle: "Atingeți orice sertar/ușă • Dimensiuni (cm) • Upload textură proprie pe orice piesă",
    openAll: "Deschide Tot",
    closeAll: "Închide Tot",
    inspector: "Meniu",
    controlsHeader: "Control & Materiale",
    quickActions: "Acțiuni Rapide",
    toggleDrawers: "Sertare (6)",
    toggleDoors: "Uși (27)",
    displayModes: "Moduri Vizualizare",
    xray: "Fronturi Transparente",
    hideCountertop: "Ascunde Blatul",
    cadEdges: "Muchii CAD",
    dimensionsCm: "Dimensiuni (cm)",
    dimModeLabel: "Dimensiuni (cm):",
    dimAllSections: "Toate Secțiunile",
    dimPartOnly: "Doar Piesa Selectată",
    tapeMeasure: "📐 Ruletă (2 Puncte)",
    tapeClear: "Șterge",
    dimHintDefault: "Atingeți sau indicați orice sertar sau ușă pentru a vedea L × Î × A în cm",
    tapeHint1: "📐 Ruletă: Atingeți primul punct (Punctul A) pe modelul 3D...",
    tapeHint2: "📐 Punctul A setat! Atingeți al doilea punct (Punctul B) pentru distanța în cm...",
    lblW: "L",
    lblH: "Î",
    lblD: "A",
    colorThemes: "Paletă Materiale (Preseturi)",
    themeOrig: "Sahara & Stejar",
    themeEgger: "Egger H1369 & AGT",
    lightingStudioTitle: "Studio Iluminare (Punct, Ton & Intensitate)",
    lightToneLbl: "Tonul luminii:",
    toneWarm: "🕯️ Caldă 2700K",
    toneNeutral: "☀️ Neutră 4000K",
    toneCool: "❄️ Rece 6000K",
    lightIntensityLbl: "Intensitate sursă:",
    ambientIntensityLbl: "Lumină ambientală:",
    lightAngleLbl: "Punct (Unghi 360°):",
    lightHeightLbl: "Înălțime sursă:",
    lightDistLbl: "Distanță sursă:",
    lposFrontRight: "Dreapta-Față",
    lposFrontLeft: "Stânga-Față",
    lposCeiling: "Plafon (Sus)",
    lposWindow: "Dinspre Geam",
    lposLow: "Lateral Jos",
    showLightOrb: "💡 Sursă 3D",
    customStudioTitle: "Studio Materiale (Salvat Automat)",
    uploadTexBtn: "Upload Textură / Poză",
    pickColorBtn: "Adaugă Culoare",
    resetWhiteBtn: "🔄 Reset Mobilier la Alb",
    deleteAllMatsBtn: "🗑️ Șterge Materiale",
    emptyMatHint: "Niciun material în listă. Încărcați o poză cu textura sau adăugați o culoare mai sus.",
    texScaleLbl: "Scară fibră:",
    grainVert: "↕ Fibră Verticală",
    grainHoriz: "↔ Fibră Orizontală",
    finishMatte: "Finisaj: Mat",
    finishSatin: "Finisaj: Satinat",
    finishGloss: "Finisaj: Lucios",
    finishGlass: "Finisaj: Sticlă 60%",
    paintModeBtn: "Aplică direct pe 3D (Click pe Piesă)",
    paintModeActiveBtn: "Mod Aplicare pe 3D: PORNIT",
    paintBannerTitle: "Mod Aplicare Material pe 3D Activ",
    paintBannerSub: "Atingeți orice ușă, sertar, blat sau carcasă în 3D pentru a-i aplica materialul selectat",
    exitPaintMode: "Gata (Ieșire)",
    applyZoneLabel: "Sau aplică materialul selectat pe o zonă:",
    zoneUpperMain: "Fațada Sus (Stânga–Dreapta)",
    zoneUpperAll: "Toate Corpuri Sus",
    zoneDrawers: "Toate Sertarele",
    zoneBaseAll: "Bază & Mașină Spălat",
    zoneTallRight: "Coloane Dreapta",
    zoneLeftAll: "Coloană Stânga & Frig.",
    zonePeninsula: "Peninsulă Bar",
    zoneVitrineBody: "Vitrină (Corp & Jos)",
    zoneVitrineTop: "Vitrină (Uși Sus)",
    zoneCountertop: "Blat (Countertop)",
    zoneCarcass: "Carcasă Bucătărie",
    zonePlinth: "Plintă Jos",
    interactiveParts: "Elemente Interactive (33) — 🖌️ = Aplică Material",
    hint: "💡 Atingeți sertarele/ușile • Încărcați orice poză de material și aplicați-o pe orice piesă!",
    camOverview: "Ansamblu",
    camFront: "Vedere Față",
    camCooking: "Cuptor & Sertare",
    camPeninsula: "Peninsulă",
    camSideboard: "Vitrină Stejar",
    camLeft: "Coloană Stânga",
    camTop: "Plan Sus",
    autoRotate: "Auto-Rotire",
    statusOpen: "DESCHIS",
    statusClosed: "ÎNCHIS",
    clickToOpen: "Atingeți pt. deschidere",
    clickToClose: "Atingeți pt. închidere",
    clickToPaint: "🖌️ Click pt. a aplica: ",
    appliedToast: "🎨 Material aplicat: ",
    cat_drawer: "Sertare & Coș Jolly (6)",
    cat_upper_door: "Corpuri Superioare (6)",
    cat_base_door: "Corpuri Bază & Cuptor (3)",
    cat_tall_door: "Coloane Dreapta (5)",
    cat_peninsula_door: "Peninsulă Bar (4)",
    cat_sideboard_door: "Vitrină Stejar Casella (4)",
    cat_left_door: "Coloană Stânga & Frigider (5)"
  }
};

let currentLang = 'ro';

// Collapse side panel by default on mobile phones so full 3D model is visible immediately
const sidePanelEl = document.getElementById('side-panel');
const togglePanelBtn = document.getElementById('btn-toggle-panel');
if (window.innerWidth <= 768) {
  sidePanelEl.classList.add('collapsed');
  togglePanelBtn.classList.remove('active');
}

function fmtCm(valCm) {
  const rounded = Math.round(valCm * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
}

// ============================================================================
// PROCEDURAL TEXTURE GENERATORS (WITH DATA URL PREVIEW FOR MATERIAL STUDIO)
// ============================================================================
function createOakCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#9c5e31';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 512;
    const w = 1 + Math.random() * 3.5;
    const alpha = 0.03 + Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(55, 25, 8, ${alpha})` : `rgba(215, 145, 85, ${alpha * 0.7})`;
    ctx.fillRect(x, 0, w, 512);
  }
  return canvas;
}

function createEggerH1369Canvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b98b5c';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 180; i++) {
    const x = Math.random() * 512;
    const w = 4 + Math.random() * 18;
    const alpha = 0.02 + Math.random() * 0.045;
    ctx.fillStyle = Math.random() > 0.45 ? `rgba(140, 92, 48, ${alpha})` : `rgba(222, 185, 142, ${alpha})`;
    ctx.fillRect(x, 0, w, 512);
  }
  for (let i = 0; i < 650; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const h = 40 + Math.random() * 380;
    const w = 0.7 + Math.random() * 2.0;
    const alpha = 0.05 + Math.random() * 0.11;
    ctx.fillStyle = Math.random() > 0.3 ? `rgba(82, 48, 22, ${alpha})` : `rgba(235, 202, 162, ${alpha * 0.65})`;
    ctx.fillRect(x, y, w, h);
  }
  return canvas;
}

function createStoneCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#52565e';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const r = 0.6 + Math.random() * 2.2;
    const v = 64 + Math.floor(Math.random() * 52);
    ctx.fillStyle = `rgba(${v},${v+3},${v+7},0.22)`;
    ctx.fillRect(x, y, r, r);
  }
  return canvas;
}

function canvasToRepeatingTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.center.set(0.5, 0.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createOvenDisplayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 236, 236);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('12:45', 128, 115);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px sans-serif';
  ctx.fillText('BOSCH  •  180°C', 128, 175);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

async function decompressGzipBase64(b64) {
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const resp = new Response(ds.readable);
  return await resp.arrayBuffer();
}

let toastTimer = null;
function showMobileToast(text) {
  const el = document.getElementById('mobile-toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2200);
}

async function init() {
  const container = document.getElementById('canvas-container');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDevice ? 1.75 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.65;

  const isPortrait = window.innerHeight > window.innerWidth;
  const camera = new THREE.PerspectiveCamera(isPortrait ? 52 : 42, window.innerWidth / window.innerHeight, 0.05, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = isMobileDevice ? 0.75 : 0.9;
  controls.zoomSpeed = 1.1;
  controls.panSpeed = isMobileDevice ? 0.85 : 0.9;
  controls.maxPolarAngle = Math.PI / 2 + 0.08;
  controls.minDistance = 0.4;
  controls.maxDistance = 16;
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };

  // ============================================================================
  // LIGHTING STUDIO (Position, Color Tone in Kelvin & Intensity)
  // ============================================================================
  const LIGHT_CENTER = new THREE.Vector3(1.85, 1.05, 1.10);

  const ambientLight = new THREE.HemisphereLight(0xfff8ed, 0x2a2d35, 0.85);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xfff5e4, 1.65);
  mainLight.position.set(3.5, 4.8, 4.8);
  mainLight.target.position.copy(LIGHT_CENTER);
  scene.add(mainLight.target);
  mainLight.castShadow = true;
  const shadowRes = isMobileDevice ? 1024 : 2048;
  mainLight.shadow.mapSize.set(shadowRes, shadowRes);
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 16;
  const d = 3.8;
  mainLight.shadow.camera.left = -d;
  mainLight.shadow.camera.right = d;
  mainLight.shadow.camera.top = d;
  mainLight.shadow.camera.bottom = -d;
  mainLight.shadow.bias = -0.0005;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.65);
  fillLight.position.set(-3.5, 3.0, 2.5);
  scene.add(fillLight);

  const warmWorktopLight = new THREE.PointLight(0xffdca8, 0.9, 3.5);
  warmWorktopLight.position.set(1.5, 1.42, 0.35);
  scene.add(warmWorktopLight);

  // 3D Visual Light Source Indicator (Glowing Orb + Direction Ray)
  const lightOrbGroup = new THREE.Group();
  lightOrbGroup.visible = false;
  scene.add(lightOrbGroup);

  const orbMat = new THREE.MeshBasicMaterial({ color: 0xfff5e4 });
  const orbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), orbMat);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd89b, transparent: true, opacity: 0.32, depthWrite: false });
  const haloMesh = new THREE.Mesh(new THREE.SphereGeometry(0.20, 20, 20), haloMat);
  orbMesh.add(haloMesh);
  lightOrbGroup.add(orbMesh);

  const rayLineMat = new THREE.LineBasicMaterial({ color: 0xffd89b, transparent: true, opacity: 0.6, depthTest: false });
  const rayLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), LIGHT_CENTER.clone()]);
  const rayLine = new THREE.Line(rayLineGeo, rayLineMat);
  rayLine.renderOrder = 995;
  lightOrbGroup.add(rayLine);

  const lightState = {
    kelvin: 4000,
    mainPct: 100,
    ambientPct: 100,
    angleDeg: 32,
    heightM: 4.8,
    distM: 4.5
  };

  function kelvinToColor(k) {
    // Smooth, realistic interior lighting color temperature curve (2700K warm -> 4000K neutral -> 6500K cool daylight)
    const cWarm = new THREE.Color(0xffbe73);    // 2700K
    const cNeutral = new THREE.Color(0xfff5e4); // 4000K
    const cCool = new THREE.Color(0xd4eaff);    // 6500K
    if (k <= 4000) {
      const t = Math.max(0, Math.min(1, (k - 2700) / (4000 - 2700)));
      return cWarm.clone().lerp(cNeutral, t);
    } else {
      const t = Math.max(0, Math.min(1, (k - 4000) / (6500 - 4000)));
      return cNeutral.clone().lerp(cCool, t);
    }
  }

  function updateLightingFromState() {
    const rad = THREE.MathUtils.degToRad(lightState.angleDeg);
    const lx = LIGHT_CENTER.x + Math.sin(rad) * lightState.distM;
    const lz = LIGHT_CENTER.z + Math.cos(rad) * lightState.distM;
    const ly = lightState.heightM;

    mainLight.position.set(lx, ly, lz);
    mainLight.target.updateMatrixWorld();

    // Update 3D Light Orb Helper position & ray
    orbMesh.position.set(lx, ly, lz);
    rayLineGeo.setFromPoints([new THREE.Vector3(lx, ly, lz), LIGHT_CENTER.clone()]);

    // Update Light Color Tone (Kelvin)
    const toneColor = kelvinToColor(lightState.kelvin);
    mainLight.color.copy(toneColor);
    ambientLight.color.copy(toneColor);
    warmWorktopLight.color.copy(toneColor);
    orbMat.color.copy(toneColor);
    haloMat.color.copy(toneColor);
    rayLineMat.color.copy(toneColor);

    // Update Intensities
    const mainScale = lightState.mainPct / 100.0;
    const ambScale = lightState.ambientPct / 100.0;
    mainLight.intensity = 1.65 * mainScale;
    warmWorktopLight.intensity = 0.90 * mainScale;
    ambientLight.intensity = 0.85 * ambScale;
    fillLight.intensity = 0.65 * ambScale;
    scene.environmentIntensity = 0.65 * ambScale;

    // Update UI Labels
    const kEl = document.getElementById('lbl-light-kelvin');
    if (kEl) {
      let tag = '';
      if (lightState.kelvin <= 3200) tag = currentLang === 'ro' ? ' (Caldă)' : (currentLang === 'ru' ? ' (Тёплый)' : ' (Warm)');
      else if (lightState.kelvin <= 4600) tag = currentLang === 'ro' ? ' (Neutră)' : (currentLang === 'ru' ? ' (Нейтр.)' : ' (Neutral)');
      else tag = currentLang === 'ro' ? ' (Rece)' : (currentLang === 'ru' ? ' (Холод.)' : ' (Cool)');
      kEl.textContent = `${lightState.kelvin}K${tag}`;
    }

    const intEl = document.getElementById('lbl-light-intensity');
    if (intEl) intEl.textContent = `${lightState.mainPct}%`;

    const ambEl = document.getElementById('lbl-ambient-intensity');
    if (ambEl) ambEl.textContent = `${lightState.ambientPct}%`;

    const angEl = document.getElementById('lbl-light-angle');
    if (angEl) angEl.textContent = `${lightState.angleDeg}°`;

    const hEl = document.getElementById('lbl-light-height');
    if (hEl) hEl.textContent = `${lightState.heightM.toFixed(1)}m`;

    const dEl = document.getElementById('lbl-light-dist');
    if (dEl) dEl.textContent = `${lightState.distM.toFixed(1)}m`;

    document.getElementById('slider-light-kelvin').value = String(lightState.kelvin);
    document.getElementById('slider-light-intensity').value = String(lightState.mainPct);
    document.getElementById('slider-ambient-intensity').value = String(lightState.ambientPct);
    document.getElementById('slider-light-angle').value = String(lightState.angleDeg);
    document.getElementById('slider-light-height').value = String(lightState.heightM);
    document.getElementById('slider-light-dist').value = String(lightState.distM);
  }

  document.getElementById('slider-light-kelvin').addEventListener('input', (e) => {
    lightState.kelvin = parseInt(e.target.value, 10) || 4000;
    updateLightingFromState();
    saveWorkspaceState();
  });

  document.querySelectorAll('[data-kelvin]').forEach(btn => {
    btn.addEventListener('click', () => {
      lightState.kelvin = parseInt(btn.dataset.kelvin, 10) || 4000;
      updateLightingFromState();
      saveWorkspaceState();
    });
  });

  document.getElementById('slider-light-intensity').addEventListener('input', (e) => {
    lightState.mainPct = parseInt(e.target.value, 10);
    updateLightingFromState();
    saveWorkspaceState();
  });

  document.getElementById('slider-ambient-intensity').addEventListener('input', (e) => {
    lightState.ambientPct = parseInt(e.target.value, 10);
    updateLightingFromState();
    saveWorkspaceState();
  });

  document.getElementById('slider-light-angle').addEventListener('input', (e) => {
    lightState.angleDeg = parseInt(e.target.value, 10);
    updateLightingFromState();
    saveWorkspaceState();
  });

  document.getElementById('slider-light-height').addEventListener('input', (e) => {
    lightState.heightM = parseFloat(e.target.value);
    updateLightingFromState();
    saveWorkspaceState();
  });

  document.getElementById('slider-light-dist').addEventListener('input', (e) => {
    lightState.distM = parseFloat(e.target.value);
    updateLightingFromState();
    saveWorkspaceState();
  });

  const LIGHT_POS_PRESETS = {
    front_right:  { angleDeg: 32,   heightM: 4.8, distM: 4.5 },
    front_left:   { angleDeg: -42,  heightM: 4.5, distM: 4.5 },
    ceiling:      { angleDeg: 0,    heightM: 6.0, distM: 1.5 },
    window:       { angleDeg: 95,   heightM: 3.2, distM: 5.0 },
    low_dramatic: { angleDeg: -65,  heightM: 1.6, distM: 4.2 }
  };

  document.querySelectorAll('[data-lightpos]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = LIGHT_POS_PRESETS[btn.dataset.lightpos];
      if (!p) return;
      lightState.angleDeg = p.angleDeg;
      lightState.heightM = p.heightM;
      lightState.distM = p.distM;
      updateLightingFromState();
      saveWorkspaceState();
    });
  });

  document.getElementById('btn-show-light-helper').addEventListener('click', (e) => {
    lightOrbGroup.visible = !lightOrbGroup.visible;
    e.currentTarget.classList.toggle('active', lightOrbGroup.visible);
  });

  updateLightingFromState();

  // Studio Floor & Architectural Grid
  const floorGeo = new THREE.PlaneGeometry(18, 18);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x181b21, roughness: 0.82, metalness: 0.08
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(1.8, -0.002, 1.4);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const gridHelper = new THREE.GridHelper(12, 24, 0x3b404c, 0x232730);
  gridHelper.position.set(1.8, -0.001, 1.4);
  scene.add(gridHelper);

  // Build Default White Materials Table (All furniture surfaces start in clean White #f4f4f2)
  const displayTex = createOvenDisplayTexture();
  const DEFAULT_WHITE_HEX = '#f4f4f2';

  const matDefs = [
    new THREE.MeshStandardMaterial({ name: 'Carcasa Alb', color: 0xf4f4f2, roughness: 0.48, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ name: 'Fatada Alb Default', color: 0xf4f4f2, roughness: 0.42, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ name: 'Blat Alb Default', color: 0xf4f4f2, roughness: 0.42, metalness: 0.03 }),
    new THREE.MeshStandardMaterial({ name: 'Vitrina Alb Default', color: 0xf4f4f2, roughness: 0.42, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ name: 'Серый', color: 0x646870, roughness: 0.5, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ name: 'Опора Korret 100мм', color: 0xd8dce0, roughness: 0.4, metalness: 0.25 }),
    new THREE.MeshStandardMaterial({ name: 'Хром', color: 0xe6ebf0, roughness: 0.16, metalness: 0.92 }),
    new THREE.MeshStandardMaterial({ name: 'Нержавейка', color: 0xc8cfd6, roughness: 0.26, metalness: 0.85 }),
    new THREE.MeshStandardMaterial({ name: 'Жаропрочное стекло', color: 0x0c0f14, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.88 }),
    new THREE.MeshStandardMaterial({ name: 'Табло', color: 0xffffff, map: displayTex, emissive: 0x1e3a5f, emissiveMap: displayTex, emissiveIntensity: 0.65, roughness: 0.15 }),
    new THREE.MeshStandardMaterial({ name: 'Черный', color: 0x141619, roughness: 0.4, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ name: 'Ariston Cooktop', color: 0x181a1e, roughness: 0.14, metalness: 0.25 }),
    new THREE.MeshStandardMaterial({ name: 'Burner Ring', color: 0x16181b, roughness: 0.35, metalness: 0.5 }),
    new THREE.MeshStandardMaterial({ name: 'Cast Iron Grates', color: 0x43474d, roughness: 0.42, metalness: 0.72 }),
    new THREE.MeshStandardMaterial({ name: 'Хром 2', color: 0xe6ebf0, roughness: 0.16, metalness: 0.92 }),
    new THREE.MeshStandardMaterial({ name: 'Металл Gola', color: 0x2f3237, roughness: 0.28, metalness: 0.82 }),
    new THREE.MeshStandardMaterial({ name: 'Vitrina Sus Alb Default', color: 0xf4f4f2, roughness: 0.42, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ name: 'Plinta Alb Default', color: 0xf4f4f2, roughness: 0.48, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ name: 'PALMEL ANTRACIT', color: 0x373a40, roughness: 0.55, metalness: 0.05 }),
    new THREE.MeshStandardMaterial({ name: 'Hettich ArciTech Metal', color: 0x555960, roughness: 0.3, metalness: 0.78 }),
    new THREE.MeshStandardMaterial({ name: 'Белый корпус', color: 0xededeb, roughness: 0.5, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ name: 'QUADRO', color: 0x9aa0a8, roughness: 0.28, metalness: 0.82 }),
  ];

  const payload = window.KITCHEN_PAYLOAD;
  const rawBuffer = await decompressGzipBase64(payload.b64);

  const kitchenRoot = new THREE.Group();
  kitchenRoot.scale.set(0.001, 0.001, 0.001);
  scene.add(kitchenRoot);

  const groupContainers = {};
  const interactiveMap = {};
  const interactiveMeshes = [];
  const allKitchenMeshes = [];
  const paintableMeshes = [];
  const staticTargets = {
    countertop: [],
    vitrine_carcass: [],
    carcass: [],
    plinth: []
  };
  const staticZoneAssignments = {
    countertop: null,
    vitrine_carcass: null,
    carcass: null,
    plinth: null
  };
  const edgeLines = [];

  for (const spec of payload.specs) {
    const outer = new THREE.Group();
    outer.name = spec.id;
    let inner = outer;

    if (spec.type === 'rotate') {
      const [px, py, pz] = spec.pivot;
      outer.position.set(px, py, pz);
      inner = new THREE.Group();
      inner.position.set(-px, -py, -pz);
      outer.add(inner);
    }

    kitchenRoot.add(outer);
    groupContainers[spec.id] = inner;
    interactiveMap[spec.id] = {
      spec,
      outer,
      inner,
      isOpen: false,
      progress: 0,
      target: 0,
      meshes: [],
      facadeMeshes: [],
      assignedMatId: null,
      bboxMm: { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] },
      dimsCm: { w: 0, h: 0, d: 0, orientZ: false }
    };
  }

  const staticNames = ['static_carcass', 'static_countertop', 'static_appliances', 'static_gola', 'static_plinth', 'static_hardware'];
  for (const sname of staticNames) {
    const g = new THREE.Group();
    g.name = sname;
    kitchenRoot.add(g);
    groupContainers[sname] = g;
  }

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x1a1917, transparent: true, opacity: 0.24, depthWrite: false
  });

  for (const b of payload.batches) {
    const geom = new THREE.BufferGeometry();
    const posArr = new Float32Array(rawBuffer, b.po, b.vc * 3);
    const normInt8 = new Int8Array(rawBuffer, b.no, b.vc * 3);
    const idxArr = b.u32
      ? new Uint32Array(rawBuffer, b.io, b.ic)
      : new Uint16Array(rawBuffer, b.io, b.ic);

    // Box-projected UV coordinates (500 mm = 1.0 UV unit) so woodgrain & stone textures map cleanly
    const uvArr = new Float32Array(b.vc * 2);
    for (let i = 0; i < b.vc; i++) {
      const px = posArr[i * 3] * 0.002;
      const py = posArr[i * 3 + 1] * 0.002;
      const pz = posArr[i * 3 + 2] * 0.002;
      const nx = Math.abs(normInt8[i * 3]);
      const ny = Math.abs(normInt8[i * 3 + 1]);
      const nz = Math.abs(normInt8[i * 3 + 2]);
      if (ny > nx && ny > nz) {
        uvArr[i * 2] = px;
        uvArr[i * 2 + 1] = pz;
      } else if (nx > nz) {
        uvArr[i * 2] = pz;
        uvArr[i * 2 + 1] = py;
      } else {
        uvArr[i * 2] = px;
        uvArr[i * 2 + 1] = py;
      }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normInt8, 3, true));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    geom.setIndex(new THREE.BufferAttribute(idxArr, 1));
    geom.computeBoundingBox();

    let mat = matDefs[b.m] || matDefs[0];
    const isInteractive = Boolean(interactiveMap[b.g]);
    const isPaintableStatic = ['static_countertop', 'static_carcass', 'static_plinth'].includes(b.g);

    if (isInteractive || isPaintableStatic) {
      mat = mat.clone();
      mat.userData.baseMatIdx = b.m;
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = (b.g !== 'static_hardware');
    mesh.receiveShadow = true;
    mesh.userData.groupId = b.g;
    mesh.userData.matIdx = b.m;

    const parentGroup = groupContainers[b.g] || groupContainers['static_carcass'];
    parentGroup.add(mesh);
    allKitchenMeshes.push(mesh);

    if (isInteractive) {
      const item = interactiveMap[b.g];
      item.meshes.push(mesh);
      interactiveMeshes.push(mesh);
      if ([1, 3, 16, 7, 8].includes(b.m)) {
        item.facadeMeshes.push(mesh);
        paintableMeshes.push(mesh);
      }
      const bb = geom.boundingBox;
      if (bb) {
        item.bboxMm.min[0] = Math.min(item.bboxMm.min[0], bb.min.x);
        item.bboxMm.min[1] = Math.min(item.bboxMm.min[1], bb.min.y);
        item.bboxMm.min[2] = Math.min(item.bboxMm.min[2], bb.min.z);
        item.bboxMm.max[0] = Math.max(item.bboxMm.max[0], bb.max.x);
        item.bboxMm.max[1] = Math.max(item.bboxMm.max[1], bb.max.y);
        item.bboxMm.max[2] = Math.max(item.bboxMm.max[2], bb.max.z);
      }
    } else if (isPaintableStatic) {
      paintableMeshes.push(mesh);
      if (b.g === 'static_countertop') {
        mesh.userData.staticZone = 'countertop';
        staticTargets.countertop.push(mesh);
      } else if (b.g === 'static_plinth') {
        mesh.userData.staticZone = 'plinth';
        staticTargets.plinth.push(mesh);
      } else if (b.g === 'static_carcass') {
        if (b.m === 3) {
          mesh.userData.staticZone = 'vitrine_carcass';
          staticTargets.vitrine_carcass.push(mesh);
        } else {
          mesh.userData.staticZone = 'carcass';
          staticTargets.carcass.push(mesh);
        }
      }
    }

    if (b.vc < 8000 && b.g !== 'static_hardware') {
      const edgesGeo = new THREE.EdgesGeometry(geom, 28);
      const line = new THREE.LineSegments(edgesGeo, edgeMat);
      line.raycast = () => {};
      mesh.add(line);
      edgeLines.push(line);
    }
  }

  // Compute exact Width, Height, Depth in cm for each of the 33 interactive parts
  for (const id in interactiveMap) {
    const item = interactiveMap[id];
    const dxCm = (item.bboxMm.max[0] - item.bboxMm.min[0]) / 10.0;
    const dyCm = (item.bboxMm.max[1] - item.bboxMm.min[1]) / 10.0;
    const dzCm = (item.bboxMm.max[2] - item.bboxMm.min[2]) / 10.0;
    const cat = item.spec.category;
    const orientZ = (cat === 'peninsula_door' || cat === 'left_door');
    item.dimsCm = {
      w: orientZ ? dzCm : dxCm,
      h: dyCm,
      d: orientZ ? dxCm : dzCm,
      dxCm,
      dyCm,
      dzCm,
      orientZ
    };
  }

  // ============================================================================
  // PERSISTENT STORAGE ENGINE (IndexedDB + localStorage Fallback)
  // ============================================================================
  const DB_NAME = 'Bucatarie3DConfiguratorDB_v1';
  const DB_STORE = 'workspace_store';
  const DB_KEY = 'saved_workspace';
  const LS_KEY = 'bucatarie_3d_workspace_v1';
  let isRestoringState = false;

  function openConfigDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('No IndexedDB'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function writePersistedData(dataObj) {
    try {
      const db = await openConfigDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(dataObj, DB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      console.warn('IndexedDB save fallback to localStorage:', err);
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(dataObj));
    } catch (e) {
      // Ignore quota errors on localStorage since IndexedDB handles large textures
    }
  }

  async function readPersistedData() {
    try {
      const db = await openConfigDB();
      const res = await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readonly');
        const req = tx.objectStore(DB_STORE).get(DB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = (e) => reject(e.target.error);
      });
      if (res) return res;
    } catch (err) {
      console.warn('IndexedDB read fallback to localStorage:', err);
    }
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  // ============================================================================
  // CUSTOM MATERIAL STUDIO — ALL MATERIALS DELETABLE & AUTO-SAVED ON REFRESH
  // ============================================================================
  const finishModes = [
    { key: 'matte', roughness: 0.42, metalness: 0.02, transparent: false, opacity: 1.0, i18nKey: 'finishMatte' },
    { key: 'satin', roughness: 0.25, metalness: 0.06, transparent: false, opacity: 1.0, i18nKey: 'finishSatin' },
    { key: 'gloss', roughness: 0.09, metalness: 0.12, transparent: false, opacity: 1.0, i18nKey: 'finishGloss' },
    { key: 'glass', roughness: 0.08, metalness: 0.18, transparent: true,  opacity: 0.60, i18nKey: 'finishGlass' }
  ];

  // Starts with a single deletable default white material (user can delete it or upload any textures)
  const materialLibrary = [
    {
      id: 'mat_default_white',
      name: 'Alb (Default)',
      type: 'color',
      colorHex: DEFAULT_WHITE_HEX,
      dataUrl: null,
      thumbCss: DEFAULT_WHITE_HEX,
      texture: null,
      scale: 1.0,
      rotate90: false,
      finishIdx: 0
    }
  ];

  let activeCustomMatId = 'mat_default_white';
  let paintModeActive = false;
  let xrayActive = false;

  function getActiveCustomMat() {
    return materialLibrary.find(m => m.id === activeCustomMatId) || materialLibrary[0] || null;
  }

  function applyDefaultWhiteToMesh(mesh) {
    if (!mesh || !mesh.material) return;
    mesh.material.color.set(DEFAULT_WHITE_HEX);
    mesh.material.map = null;
    mesh.material.roughness = 0.42;
    mesh.material.metalness = 0.02;
    mesh.material.transparent = xrayActive;
    mesh.material.opacity = xrayActive ? 0.28 : 1.0;
    mesh.material.depthWrite = !xrayActive;
    mesh.material.userData.assignedMatId = null;
    mesh.material.needsUpdate = true;
  }

  function syncTextureTransform(matEntry) {
    if (!matEntry || !matEntry.texture) return;
    const rep = 1.0 / Math.max(0.15, matEntry.scale);
    matEntry.texture.repeat.set(rep, rep);
    matEntry.texture.rotation = matEntry.rotate90 ? (Math.PI / 2) : 0;
    matEntry.texture.needsUpdate = true;
  }

  function applyMatEntryToMesh(mesh, matEntry) {
    if (!mesh || !mesh.material) return;
    if (!matEntry) {
      applyDefaultWhiteToMesh(mesh);
      return;
    }
    const fin = finishModes[matEntry.finishIdx] || finishModes[0];
    syncTextureTransform(matEntry);

    mesh.material.color.set(matEntry.colorHex || '#ffffff');
    mesh.material.map = matEntry.texture || null;
    mesh.material.roughness = fin.roughness;
    mesh.material.metalness = fin.metalness;

    if (fin.transparent) {
      mesh.material.transparent = true;
      mesh.material.opacity = xrayActive ? 0.25 : fin.opacity;
      mesh.material.depthWrite = false;
    } else {
      mesh.material.transparent = xrayActive;
      mesh.material.opacity = xrayActive ? 0.28 : 1.0;
      mesh.material.depthWrite = !xrayActive;
    }
    mesh.material.userData.assignedMatId = matEntry.id;
    mesh.material.needsUpdate = true;
  }

  function saveWorkspaceState() {
    if (isRestoringState) return;
    const serializedMats = materialLibrary.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      colorHex: m.colorHex,
      dataUrl: m.dataUrl || null,
      thumbCss: m.thumbCss,
      scale: m.scale,
      rotate90: m.rotate90,
      finishIdx: m.finishIdx
    }));

    const partAssignments = {};
    const openParts = {};
    for (const spec of payload.specs) {
      const item = interactiveMap[spec.id];
      if (item) {
        if (item.assignedMatId) partAssignments[spec.id] = item.assignedMatId;
        if (item.isOpen) openParts[spec.id] = true;
      }
    }

    const stateObj = {
      version: 1,
      lang: currentLang,
      activeCustomMatId,
      materials: serializedMats,
      partAssignments,
      staticZoneAssignments: { ...staticZoneAssignments },
      openParts,
      lightState: { ...lightState }
    };
    writePersistedData(stateObj);
  }

  function createTextureFromDataUrl(dataUrl) {
    return new Promise((resolve) => {
      if (!dataUrl) return resolve(null);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 512;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 512, 512);
        resolve(canvasToRepeatingTexture(c));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  async function loadWorkspaceState() {
    const saved = await readPersistedData();
    if (!saved || ! saved.version) return false;

    isRestoringState = true;
    try {
      if (saved.lang && I18N[saved.lang]) {
        currentLang = saved.lang;
        document.querySelectorAll('.lang-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.lang === currentLang);
        });
      }

      if (Array.isArray(saved.materials)) {
        materialLibrary.length = 0;
        for (const sm of saved.materials) {
          const tex = sm.type === 'texture' && sm.dataUrl
            ? await createTextureFromDataUrl(sm.dataUrl)
            : null;
          materialLibrary.push({
            id: sm.id,
            name: sm.name,
            type: sm.type,
            colorHex: sm.colorHex || '#ffffff',
            dataUrl: sm.dataUrl || null,
            thumbCss: sm.thumbCss || sm.colorHex || DEFAULT_WHITE_HEX,
            texture: tex,
            scale: typeof sm.scale === 'number' ? sm.scale : 1.0,
            rotate90: Boolean(sm.rotate90),
            finishIdx: typeof sm.finishIdx === 'number' ? sm.finishIdx : 0
          });
        }
      }

      activeCustomMatId = saved.activeCustomMatId || (materialLibrary[0] ? materialLibrary[0].id : null);

      // Restore interactive part materials
      for (const spec of payload.specs) {
        const pid = spec.id;
        const matId = saved.partAssignments ? saved.partAssignments[pid] : null;
        const matEntry = matId ? materialLibrary.find(m => m.id === matId) : null;
        const item = interactiveMap[pid];
        if (item) {
          item.assignedMatId = matEntry ? matEntry.id : null;
          const targets = item.facadeMeshes.length ? item.facadeMeshes : item.meshes;
          for (const m of targets) applyMatEntryToMesh(m, matEntry);
        }
      }

      // Restore static zone materials
      if (saved.staticZoneAssignments) {
        for (const zoneKey of Object.keys(staticTargets)) {
          const matId = saved.staticZoneAssignments[zoneKey];
          const matEntry = matId ? materialLibrary.find(m => m.id === matId) : null;
          staticZoneAssignments[zoneKey] = matEntry ? matEntry.id : null;
          for (const m of staticTargets[zoneKey]) {
            applyMatEntryToMesh(m, matEntry);
          }
        }
      }

      // Restore open/closed doors & drawers
      if (saved.openParts) {
        for (const spec of payload.specs) {
          const isOpen = Boolean(saved.openParts[spec.id]);
          const item = interactiveMap[spec.id];
          if (item) {
            item.isOpen = isOpen;
            item.target = isOpen ? 1 : 0;
            item.progress = isOpen ? 1 : 0;
            if (spec.type === 'slide') {
              item.outer.position.set(
                spec.delta[0] * item.progress,
                spec.delta[1] * item.progress,
                spec.delta[2] * item.progress
              );
            } else if (spec.type === 'rotate') {
              const rad = THREE.MathUtils.degToRad(spec.angle * item.progress);
              item.outer.rotation.set(
                spec.axis === 'x' ? rad : 0,
                spec.axis === 'y' ? rad : 0,
                spec.axis === 'z' ? rad : 0
              );
            }
          }
        }
      }

      // Restore lighting state
      if (saved.lightState) {
        Object.assign(lightState, saved.lightState);
        updateLightingFromState();
      }
    } finally {
      isRestoringState = false;
    }
    return true;
  }

  function applyMaterialToInteractivePart(partId, matEntry, showFeedback = true) {
    const item = interactiveMap[partId];
    if (!item) return;
    if (!matEntry) {
      item.assignedMatId = null;
      const targets = item.facadeMeshes.length ? item.facadeMeshes : item.meshes;
      for (const m of targets) applyDefaultWhiteToMesh(m);
      updatePartsUI();
      saveWorkspaceState();
      return;
    }
    item.assignedMatId = matEntry.id;
    const targets = item.facadeMeshes.length ? item.facadeMeshes : item.meshes;
    for (const m of targets) {
      applyMatEntryToMesh(m, matEntry);
    }
    updatePartsUI();
    saveWorkspaceState();
    if (showFeedback) {
      const dict = I18N[currentLang];
      showMobileToast(`${dict.appliedToast}${matEntry.name} → ${getSpecTitle(item.spec)}`);
    }
  }

  function applyMaterialToStaticZone(zoneKey, matEntry, showFeedback = true) {
    const meshes = staticTargets[zoneKey] || [];
    staticZoneAssignments[zoneKey] = matEntry ? matEntry.id : null;
    for (const m of meshes) {
      applyMatEntryToMesh(m, matEntry);
    }
    saveWorkspaceState();
    if (showFeedback && matEntry) {
      const dict = I18N[currentLang];
      showMobileToast(`${dict.appliedToast}${matEntry.name}`);
    }
  }

  function resetAllFurnitureToWhite() {
    for (const spec of payload.specs) {
      const item = interactiveMap[spec.id];
      if (!item) continue;
      item.assignedMatId = null;
      const targets = item.facadeMeshes.length ? item.facadeMeshes : item.meshes;
      for (const m of targets) applyDefaultWhiteToMesh(m);
    }
    for (const zoneKey of Object.keys(staticTargets)) {
      staticZoneAssignments[zoneKey] = null;
      for (const m of staticTargets[zoneKey]) {
        applyDefaultWhiteToMesh(m);
      }
    }
    updatePartsUI();
    saveWorkspaceState();
    showMobileToast('🔄 Mobilier resetat la nuanța Alb Default');
  }

  const UPPER_EGGER_H1369_IDS = new Set([
    'door_b4',
    'flap_b3_low',
    'flap_b3_top',
    'door_b1',
    'door_b2'
  ]);

  function applyZonePresetAssignment(zoneName) {
    const matEntry = getActiveCustomMat();
    if (!matEntry) {
      showMobileToast('Încărcați mai întâi o textură sau adăugați o culoare!');
      return;
    }

    if (zoneName === 'upper_main') {
      UPPER_EGGER_H1369_IDS.forEach(id => applyMaterialToInteractivePart(id, matEntry, false));
    } else if (zoneName === 'upper_all') {
      payload.specs.filter(s => s.category === 'upper_door').forEach(s => applyMaterialToInteractivePart(s.id, matEntry, false));
    } else if (zoneName === 'drawers') {
      payload.specs.filter(s => s.category === 'drawer').forEach(s => applyMaterialToInteractivePart(s.id, matEntry, false));
    } else if (zoneName === 'base_all') {
      payload.specs.filter(s => s.category === 'base_door' || s.category === 'drawer').forEach(s => applyMaterialToInteractivePart(s.id, matEntry, false));
    } else if (zoneName === 'tall_right') {
      payload.specs.filter(s => s.category === 'tall_door').forEach(s => applyMaterialToInteractivePart(s.id, matEntry, false));
    } else if (zoneName === 'left_all') {
      payload.specs.filter(s => s.category === 'left_door').forEach(s => applyMaterialToInteractivePart(s.id, matEntry, false));
    } else if (zoneName === 'peninsula') {
      payload.specs.filter(s => s.category === 'peninsula_door').forEach(s => applyMaterialToInteractivePart(s.id, matEntry, false));
    } else if (zoneName === 'vitrine_body') {
      applyMaterialToStaticZone('vitrine_carcass', matEntry, false);
      ['door_oak_bot_l', 'door_oak_bot_r'].forEach(id => applyMaterialToInteractivePart(id, matEntry, false));
    } else if (zoneName === 'vitrine_top') {
      ['door_oak_top_l', 'door_oak_top_r'].forEach(id => applyMaterialToInteractivePart(id, matEntry, false));
    } else if (zoneName === 'countertop') {
      applyMaterialToStaticZone('countertop', matEntry, false);
    } else if (zoneName === 'carcass') {
      applyMaterialToStaticZone('carcass', matEntry, false);
    } else if (zoneName === 'plinth') {
      applyMaterialToStaticZone('plinth', matEntry, false);
    }

    const dict = I18N[currentLang];
    showMobileToast(`${dict.appliedToast}${matEntry.name}`);
  }

  function refreshAllMeshesWithAssignedMat(matEntry) {
    if (!matEntry) return;
    for (const m of paintableMeshes) {
      if (m.material && m.material.userData.assignedMatId === matEntry.id) {
        applyMatEntryToMesh(m, matEntry);
      }
    }
    saveWorkspaceState();
  }

  function deleteMaterialById(matId) {
    const idx = materialLibrary.findIndex(x => x.id === matId);
    if (idx === -1) return;
    materialLibrary.splice(idx, 1);

    // Revert any parts or zones using this deleted material back to clean default White
    for (const spec of payload.specs) {
      const item = interactiveMap[spec.id];
      if (item && item.assignedMatId === matId) {
        item.assignedMatId = null;
        const targets = item.facadeMeshes.length ? item.facadeMeshes : item.meshes;
        for (const m of targets) applyDefaultWhiteToMesh(m);
      }
    }
    for (const zoneKey of Object.keys(staticTargets)) {
      if (staticZoneAssignments[zoneKey] === matId) {
        staticZoneAssignments[zoneKey] = null;
        for (const m of staticTargets[zoneKey]) applyDefaultWhiteToMesh(m);
      }
    }

    if (activeCustomMatId === matId) {
      activeCustomMatId = materialLibrary[0] ? materialLibrary[0].id : null;
    }
    renderCustomMaterialGrid();
    syncStudioControlsUI();
    updatePartsUI();
    saveWorkspaceState();
  }

  function renderCustomMaterialGrid() {
    const gridEl = document.getElementById('custom-mat-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    if (materialLibrary.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.gridColumn = '1 / -1';
      emptyMsg.style.fontSize = '11px';
      emptyMsg.style.color = 'var(--text-muted)';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.padding = '8px 4px';
      emptyMsg.textContent = I18N[currentLang].emptyMatHint;
      gridEl.appendChild(emptyMsg);
      return;
    }

    for (const mat of materialLibrary) {
      const card = document.createElement('div');
      card.className = 'mat-card' + (mat.id === activeCustomMatId ? ' active' : '');
      const thumb = document.createElement('div');
      thumb.className = 'mat-thumb';
      thumb.style.background = mat.thumbCss;

      const nameEl = document.createElement('div');
      nameEl.className = 'mat-card-name';
      nameEl.textContent = mat.name;

      card.appendChild(thumb);
      card.appendChild(nameEl);

      // Every material can be deleted!
      const delBtn = document.createElement('button');
      delBtn.className = 'mat-del-btn';
      delBtn.textContent = '×';
      delBtn.title = 'Șterge material';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteMaterialById(mat.id);
      });
      card.appendChild(delBtn);

      card.addEventListener('click', () => {
        activeCustomMatId = mat.id;
        renderCustomMaterialGrid();
        syncStudioControlsUI();
        saveWorkspaceState();
      });

      gridEl.appendChild(card);
    }
  }

  function syncStudioControlsUI() {
    const mat = getActiveCustomMat();
    const dict = I18N[currentLang];

    const scaleSlider = document.getElementById('slider-tex-scale');
    const scaleLbl = document.getElementById('lbl-tex-scale');
    const grainBtn = document.getElementById('btn-grain-dir');
    const finBtn = document.getElementById('btn-finish-mode');

    if (mat) {
      if (scaleSlider && scaleLbl) {
        scaleSlider.disabled = false;
        scaleSlider.value = String(mat.scale);
        scaleLbl.textContent = `${mat.scale.toFixed(2).replace(/\.00$/, '.0')}×`;
      }
      if (grainBtn) {
        grainBtn.disabled = false;
        grainBtn.textContent = mat.rotate90 ? dict.grainHoriz : dict.grainVert;
        grainBtn.classList.toggle('active', mat.rotate90);
      }
      if (finBtn) {
        finBtn.disabled = false;
        const fin = finishModes[mat.finishIdx] || finishModes[0];
        finBtn.textContent = dict[fin.i18nKey] || fin.key;
      }
    } else {
      if (scaleSlider && scaleLbl) {
        scaleSlider.disabled = true;
        scaleLbl.textContent = '1.0×';
      }
      if (grainBtn) grainBtn.disabled = true;
      if (finBtn) finBtn.disabled = true;
    }

    const paintBtn = document.getElementById('btn-paint-mode');
    const paintBanner = document.getElementById('paint-banner');
    if (paintBtn) {
      paintBtn.classList.toggle('active-paint', paintModeActive);
      paintBtn.innerHTML = `🖌️ <span>${paintModeActive ? dict.paintModeActiveBtn : dict.paintModeBtn}</span>`;
    }
    if (paintBanner) {
      paintBanner.classList.toggle('hidden', !paintModeActive);
    }
  }

  // Handle User Image Upload (Woodgrain, Stone, Color Swatch Photo)
  document.getElementById('input-upload-tex').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 512; c.height = 512;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, 512, 512);

          const tex = canvasToRepeatingTexture(c);
          const cleanName = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Textură Custom';
          const newId = 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          const savedDataUrl = c.toDataURL('image/jpeg', 0.82);

          const newMat = {
            id: newId,
            name: cleanName,
            type: 'texture',
            colorHex: '#ffffff',
            dataUrl: savedDataUrl,
            thumbCss: `url(${savedDataUrl})`,
            texture: tex,
            scale: 1.0,
            rotate90: false,
            finishIdx: 0
          };
          materialLibrary.push(newMat);
          activeCustomMatId = newId;
          paintModeActive = true;
          renderCustomMaterialGrid();
          syncStudioControlsUI();
          saveWorkspaceState();
          showMobileToast(`📤 "${cleanName}" salvat! Atingeți orice piesă sau zonă pt. aplicare.`);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  // Handle Solid Color Picker
  document.getElementById('input-pick-color').addEventListener('change', (e) => {
    const hex = e.target.value || '#d4a359';
    const newId = 'color_' + Date.now();
    const newMat = {
      id: newId,
      name: hex.toUpperCase(),
      type: 'color',
      colorHex: hex,
      dataUrl: null,
      thumbCss: hex,
      texture: null,
      scale: 1.0,
      rotate90: false,
      finishIdx: 0
    };
    materialLibrary.push(newMat);
    activeCustomMatId = newId;
    paintModeActive = true;
    renderCustomMaterialGrid();
    syncStudioControlsUI();
    saveWorkspaceState();
  });

  document.getElementById('slider-tex-scale').addEventListener('input', (e) => {
    const mat = getActiveCustomMat();
    if (!mat) return;
    mat.scale = parseFloat(e.target.value) || 1.0;
    syncStudioControlsUI();
    refreshAllMeshesWithAssignedMat(mat);
  });

  document.getElementById('btn-grain-dir').addEventListener('click', () => {
    const mat = getActiveCustomMat();
    if (!mat) return;
    mat.rotate90 = !mat.rotate90;
    syncStudioControlsUI();
    refreshAllMeshesWithAssignedMat(mat);
  });

  document.getElementById('btn-finish-mode').addEventListener('click', () => {
    const mat = getActiveCustomMat();
    if (!mat) return;
    mat.finishIdx = (mat.finishIdx + 1) % finishModes.length;
    syncStudioControlsUI();
    refreshAllMeshesWithAssignedMat(mat);
  });

  document.getElementById('btn-paint-mode').addEventListener('click', () => {
    paintModeActive = !paintModeActive;
    syncStudioControlsUI();
  });

  document.getElementById('btn-exit-paint').addEventListener('click', () => {
    paintModeActive = false;
    syncStudioControlsUI();
  });

  document.querySelectorAll('.zone-chip[data-zone]').forEach(btn => {
    btn.addEventListener('click', () => {
      applyZonePresetAssignment(btn.dataset.zone);
    });
  });

  document.getElementById('btn-reset-white').addEventListener('click', () => {
    resetAllFurnitureToWhite();
  });

  document.getElementById('btn-delete-all-mats').addEventListener('click', () => {
    materialLibrary.length = 0;
    activeCustomMatId = null;
    resetAllFurnitureToWhite();
    renderCustomMaterialGrid();
    syncStudioControlsUI();
    saveWorkspaceState();
    showMobileToast('🗑️ Toate materialele au fost șterse.');
  });

  // ============================================================================
  // 3D CAD DIMENSIONS SYSTEM (IN CM) — Static Sections + Dynamic Part + Tape Measure
  // ============================================================================
  let dimsEnabled = false;
  let dimMode = 'all'; // 'all' | 'part' | 'tape'
  let selectedPartId = 'drawer_b14';

  const dimsRootGroup = new THREE.Group();
  dimsRootGroup.visible = false;
  scene.add(dimsRootGroup);

  const staticDimsGroup = new THREE.Group();
  const partDimsGroup = new THREE.Group();
  const tapeDimsGroup = new THREE.Group();
  dimsRootGroup.add(staticDimsGroup);
  dimsRootGroup.add(partDimsGroup);
  dimsRootGroup.add(tapeDimsGroup);

  function makeBadgeSprite(text, pos, theme = 'gold', scaleMultiplier = 1.0) {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 76;
    const ctx = canvas.getContext('2d');

    const palettes = {
      gold:  { bg: 'rgba(16, 19, 25, 0.92)', border: '#d4a359', text: '#ffd89b' },
      cyan:  { bg: 'rgba(12, 22, 34, 0.94)', border: '#38bdf8', text: '#bae6fd' },
      green: { bg: 'rgba(12, 28, 24, 0.94)', border: '#34d399', text: '#a7f3d0' },
      amber: { bg: 'rgba(28, 20, 10, 0.94)', border: '#fbbf24', text: '#fde68a' },
      rose:  { bg: 'rgba(34, 14, 22, 0.94)', border: '#f43f5e', text: '#fecdd3' }
    };
    const pal = palettes[theme] || palettes.gold;

    ctx.fillStyle = pal.bg;
    ctx.strokeStyle = pal.border;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(6, 6, 308, 64, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pal.text;
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 160, 39);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(pos);
    sprite.scale.set(0.46 * scaleMultiplier, 0.11 * scaleMultiplier, 1);
    sprite.renderOrder = 999;
    sprite.raycast = () => {};
    return sprite;
  }

  function addCadDimLine(targetGroup, p1, p2, labelText, theme = 'gold', tickDir = new THREE.Vector3(0, 1, 0), tickLen = 0.04, scaleMult = 1.0, labelOffset = new THREE.Vector3()) {
    const colorMap = { gold: 0xd4a359, cyan: 0x38bdf8, green: 0x34d399, amber: 0xfbbf24, rose: 0xf43f5e };
    const col = colorMap[theme] || 0xd4a359;
    const lineMat = new THREE.LineBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: 0.92 });

    const t = tickDir.clone().normalize().multiplyScalar(tickLen);
    const pts = [
      p1, p2,
      p1.clone().sub(t), p1.clone().add(t),
      p2.clone().sub(t), p2.clone().add(t)
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.LineSegments(lineGeo, lineMat);
    line.renderOrder = 998;
    line.raycast = () => {};
    targetGroup.add(line);

    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5).add(labelOffset);
    targetGroup.add(makeBadgeSprite(labelText, mid, theme, scaleMult));
  }

  function buildStaticSectionDimensions() {
    addCadDimLine(staticDimsGroup, new THREE.Vector3(-0.395, 2.62, 0), new THREE.Vector3(4.125, 2.62, 0), '452 cm (Total)', 'gold', new THREE.Vector3(0, 1, 0), 0.05, 1.05);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(0.020, 2.54, 0.37), new THREE.Vector3(3.954, 2.54, 0.37), '393.4 cm (Main Wall)', 'gold', new THREE.Vector3(0, 1, 0), 0.04, 0.95);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(4.22, 0, 0), new THREE.Vector3(4.22, 2.49, 0), 'H: 249 cm', 'gold', new THREE.Vector3(1, 0, 0), 0.05, 1.0);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(4.22, 0.02, 0), new THREE.Vector3(4.22, 0.02, 2.956), 'D: 295.6 cm', 'gold', new THREE.Vector3(1, 0, 0), 0.05, 1.0);

    addCadDimLine(staticDimsGroup, new THREE.Vector3(0.24, 0.0, 0.63), new THREE.Vector3(0.24, 0.10, 0.63), '10 cm', 'green', new THREE.Vector3(1, 0, 0), 0.03, 0.78);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(1.54, 0.0, 0.63), new THREE.Vector3(1.54, 0.90, 0.63), 'H: 90 cm', 'green', new THREE.Vector3(1, 0, 0), 0.04, 0.92);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(1.54, 0.90, 0.39), new THREE.Vector3(1.54, 1.50, 0.39), '60 cm', 'green', new THREE.Vector3(1, 0, 0), 0.04, 0.88);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(1.54, 1.50, 0.39), new THREE.Vector3(1.54, 2.49, 0.39), '99 cm', 'green', new THREE.Vector3(1, 0, 0), 0.04, 0.88);

    const yBase = 0.06, zBase = 0.65;
    addCadDimLine(staticDimsGroup, new THREE.Vector3(0.268, yBase, zBase), new THREE.Vector3(0.757, yBase, zBase), '48.9 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.82);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(0.760, yBase, zBase), new THREE.Vector3(1.354, yBase, zBase), '59.4 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.82);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(1.357, yBase, zBase), new THREE.Vector3(1.557, yBase, zBase), '20 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.78, new THREE.Vector3(0, -0.05, 0));
    addCadDimLine(staticDimsGroup, new THREE.Vector3(1.560, yBase, zBase), new THREE.Vector3(2.154, yBase, zBase), '59.4 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.82);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(2.157, yBase, zBase), new THREE.Vector3(2.757, yBase, zBase), '60 cm (Drawers)', 'amber', new THREE.Vector3(0, 1, 0), 0.035, 0.90);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(2.778, yBase, zBase), new THREE.Vector3(3.372, yBase, zBase), '59.4 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.82);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(3.375, yBase, zBase), new THREE.Vector3(3.954, yBase, zBase), '57.9 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.82);

    addCadDimLine(staticDimsGroup, new THREE.Vector3(2.75, 0.10, 0.63), new THREE.Vector3(2.75, 0.464, 0.63), '36.4 cm', 'amber', new THREE.Vector3(1, 0, 0), 0.03, 0.82);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(2.75, 0.494, 0.63), new THREE.Vector3(2.75, 0.858, 0.63), '36.4 cm', 'amber', new THREE.Vector3(1, 0, 0), 0.03, 0.82);

    const yUp = 2.00, zUp = 0.40;
    addCadDimLine(staticDimsGroup, new THREE.Vector3(0.020, yUp, zUp), new THREE.Vector3(0.264, yUp, zUp), '24.4 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.78);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(0.266, yUp, zUp), new THREE.Vector3(0.756, yUp, zUp), '49 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.82);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(0.758, yUp, zUp), new THREE.Vector3(1.556, yUp, zUp), '79.8 cm (Dish Rack)', 'amber', new THREE.Vector3(0, 1, 0), 0.03, 0.88);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(1.558, yUp, zUp), new THREE.Vector3(2.156, yUp, zUp), '59.8 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.82);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(2.158, yUp, zUp), new THREE.Vector3(2.754, yUp, zUp), '59.6 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.82);

    addCadDimLine(staticDimsGroup, new THREE.Vector3(4.15, 0, 1.65), new THREE.Vector3(4.15, 0.792, 1.65), 'H: 79.2 cm', 'green', new THREE.Vector3(0, 0, 1), 0.04, 0.90);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(3.407, 0.81, 2.655), new THREE.Vector3(4.125, 0.81, 2.655), '71.8 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.84);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(3.38, 0.81, 0.624), new THREE.Vector3(3.38, 0.81, 2.655), '203.1 cm (Peninsula)', 'gold', new THREE.Vector3(0, 1, 0), 0.04, 0.95);

    addCadDimLine(staticDimsGroup, new THREE.Vector3(2.856, 2.28, 2.67), new THREE.Vector3(3.830, 2.28, 2.67), '97.4 cm (Vitrine)', 'gold', new THREE.Vector3(0, 1, 0), 0.04, 0.92);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(2.82, 0.10, 2.67), new THREE.Vector3(2.82, 2.25, 2.67), 'H: 215 cm', 'green', new THREE.Vector3(1, 0, 0), 0.04, 0.90);

    addCadDimLine(staticDimsGroup, new THREE.Vector3(0.25, 0.92, 0.603), new THREE.Vector3(0.25, 0.92, 0.977), '37.4 cm', 'cyan', new THREE.Vector3(0, 1, 0), 0.03, 0.82);
    addCadDimLine(staticDimsGroup, new THREE.Vector3(0.25, 2.02, 1.001), new THREE.Vector3(0.25, 2.02, 1.715), '71.4 cm (Fridge)', 'amber', new THREE.Vector3(0, 1, 0), 0.03, 0.88);
  }
  buildStaticSectionDimensions();

  function updatePartDimensions3D(partId) {
    while (partDimsGroup.children.length > 0) {
      partDimsGroup.remove(partDimsGroup.children[0]);
    }
    const readoutTitleEl = document.getElementById('dim-readout-title');
    const readoutBadgesEl = document.getElementById('dim-readout-badges');
    const dict = I18N[currentLang];

    if (!partId || !interactiveMap[partId]) {
      if (dimMode !== 'tape') {
        readoutTitleEl.textContent = dict.dimHintDefault;
        readoutBadgesEl.innerHTML = '';
      }
      return;
    }

    const item = interactiveMap[partId];
    const box = new THREE.Box3();
    for (const m of item.meshes) {
      m.updateWorldMatrix(true, false);
      const geomBox = m.geometry.boundingBox.clone();
      geomBox.applyMatrix4(m.matrixWorld);
      box.union(geomBox);
    }

    const { w, h, d, orientZ } = item.dimsCm;
    const wStr = `${dict.lblW}: ${fmtCm(w)} cm`;
    const hStr = `${dict.lblH}: ${fmtCm(h)} cm`;
    const dStr = `${dict.lblD}: ${fmtCm(d)} cm`;

    if (dimMode !== 'tape') {
      readoutTitleEl.innerHTML = `<strong>${getSpecTitle(item.spec)}</strong>`;
      readoutBadgesEl.innerHTML = `
        <span class="dim-badge w">${wStr}</span>
        <span class="dim-badge h">${hStr}</span>
        <span class="dim-badge d">${dStr}</span>
      `;
    }

    const boxHelper = new THREE.Box3Helper(box, 0x38bdf8);
    boxHelper.material.depthTest = false;
    boxHelper.material.transparent = true;
    boxHelper.material.opacity = 0.65;
    boxHelper.renderOrder = 997;
    boxHelper.raycast = () => {};
    partDimsGroup.add(boxHelper);

    const pad = 0.035;
    if (!orientZ) {
      const zFront = box.max.z + pad;
      addCadDimLine(
        partDimsGroup,
        new THREE.Vector3(box.min.x, box.max.y + pad, zFront),
        new THREE.Vector3(box.max.x, box.max.y + pad, zFront),
        wStr, 'amber', new THREE.Vector3(0, 1, 0), 0.028, 0.92
      );
      addCadDimLine(
        partDimsGroup,
        new THREE.Vector3(box.max.x + pad, box.min.y, zFront),
        new THREE.Vector3(box.max.x + pad, box.max.y, zFront),
        hStr, 'green', new THREE.Vector3(1, 0, 0), 0.028, 0.92
      );
      if (d > 2.5) {
        addCadDimLine(
          partDimsGroup,
          new THREE.Vector3(box.min.x - pad, box.min.y, box.min.z),
          new THREE.Vector3(box.min.x - pad, box.min.y, box.max.z),
          dStr, 'cyan', new THREE.Vector3(1, 0, 0), 0.028, 0.90
        );
      }
    } else {
      const xFront = (item.spec.category === 'peninsula_door') ? (box.min.x - pad) : (box.max.x + pad);
      addCadDimLine(
        partDimsGroup,
        new THREE.Vector3(xFront, box.max.y + pad, box.min.z),
        new THREE.Vector3(xFront, box.max.y + pad, box.max.z),
        wStr, 'amber', new THREE.Vector3(0, 1, 0), 0.028, 0.92
      );
      addCadDimLine(
        partDimsGroup,
        new THREE.Vector3(xFront, box.min.y, box.max.z + pad),
        new THREE.Vector3(xFront, box.max.y, box.max.z + pad),
        hStr, 'green', new THREE.Vector3(0, 0, 1), 0.028, 0.92
      );
    }
  }

  let tapePointA = null;
  function clearTapeMeasure() {
    tapePointA = null;
    while (tapeDimsGroup.children.length > 0) {
      tapeDimsGroup.remove(tapeDimsGroup.children[0]);
    }
    document.getElementById('btn-tape-clear').style.display = 'none';
    if (dimMode === 'tape') {
      document.getElementById('dim-readout-title').textContent = I18N[currentLang].tapeHint1;
      document.getElementById('dim-readout-badges').innerHTML = '';
    }
  }

  function createPinMarker(pos, colorHex = 0xf43f5e) {
    const geo = new THREE.SphereGeometry(0.016, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, depthTest: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    m.renderOrder = 999;
    m.raycast = () => {};
    return m;
  }

  function handleTapeMeasureClick(hitPoint) {
    const dict = I18N[currentLang];
    const readoutTitleEl = document.getElementById('dim-readout-title');
    const readoutBadgesEl = document.getElementById('dim-readout-badges');

    if (!tapePointA) {
      tapePointA = hitPoint.clone();
      tapeDimsGroup.add(createPinMarker(tapePointA, 0xf43f5e));
      readoutTitleEl.textContent = dict.tapeHint2;
      readoutBadgesEl.innerHTML = '';
      document.getElementById('btn-tape-clear').style.display = 'inline-flex';
    } else {
      const ptB = hitPoint.clone();
      tapeDimsGroup.add(createPinMarker(ptB, 0xf43f5e));

      const distCm = tapePointA.distanceTo(ptB) * 100.0;
      const dxCm = Math.abs(ptB.x - tapePointA.x) * 100.0;
      const dyCm = Math.abs(ptB.y - tapePointA.y) * 100.0;
      const dzCm = Math.abs(ptB.z - tapePointA.z) * 100.0;

      const labelStr = `${fmtCm(distCm)} cm`;
      addCadDimLine(
        tapeDimsGroup,
        tapePointA.clone(),
        ptB.clone(),
        labelStr,
        'rose',
        new THREE.Vector3(0, 1, 0),
        0.025,
        1.0
      );

      readoutTitleEl.innerHTML = `<strong>📏 ${labelStr}</strong>`;
      readoutBadgesEl.innerHTML = `
        <span class="dim-badge w">ΔX: ${fmtCm(dxCm)} cm</span>
        <span class="dim-badge h">ΔY: ${fmtCm(dyCm)} cm</span>
        <span class="dim-badge d">ΔZ: ${fmtCm(dzCm)} cm</span>
      `;
      if (window.innerWidth <= 768) {
        showMobileToast(`📏 ${labelStr} (ΔX ${fmtCm(dxCm)} • ΔY ${fmtCm(dyCm)} • ΔZ ${fmtCm(dzCm)} cm)`);
      }
      tapePointA = null;
    }
  }

  function syncDimensionUI() {
    dimsRootGroup.visible = dimsEnabled;
    staticDimsGroup.visible = dimsEnabled && (dimMode === 'all');
    partDimsGroup.visible = dimsEnabled;
    tapeDimsGroup.visible = dimsEnabled;

    document.getElementById('btn-dims').classList.toggle('active', dimsEnabled);
    document.getElementById('btn-top-dims').classList.toggle('active', dimsEnabled);
    document.getElementById('dim-toolbar').classList.toggle('hidden', !dimsEnabled);

    document.getElementById('btn-dim-all').classList.toggle('active', dimMode === 'all');
    document.getElementById('btn-dim-part').classList.toggle('active', dimMode === 'part');
    document.getElementById('btn-tape-measure').classList.toggle('active-cyan', dimMode === 'tape');

    if (dimsEnabled) {
      if (dimMode === 'tape') {
        document.getElementById('dim-readout-title').textContent = tapePointA ? I18N[currentLang].tapeHint2 : I18N[currentLang].tapeHint1;
        document.getElementById('dim-readout-badges').innerHTML = '';
      } else {
        updatePartDimensions3D(hoveredGroupId || selectedPartId);
      }
    }
  }

  function toggleDimensionsMode(force = null) {
    dimsEnabled = force !== null ? force : !dimsEnabled;
    syncDimensionUI();
  }

  // Camera Presets
  let camAnim = null;
  function flyToCamera(pos, target, duration = 650) {
    const portraitScale = window.innerHeight > window.innerWidth ? 1.25 : 1.0;
    const tVec = new THREE.Vector3(...target);
    const pVec = new THREE.Vector3(...pos);
    if (portraitScale > 1.0) {
      const dir = pVec.clone().sub(tVec).multiplyScalar(portraitScale);
      pVec.copy(tVec).add(dir);
    }
    camAnim = {
      startPos: camera.position.clone(),
      endPos: pVec,
      startTarget: controls.target.clone(),
      endTarget: tVec,
      startTime: performance.now(),
      duration
    };
  }

  const CAM_PRESETS = {
    overview:  { pos: [-1.65, 2.35, 4.65], target: [1.85, 1.10, 1.05] },
    front:     { pos: [1.55, 1.38, 3.85],  target: [1.55, 1.22, 0.40] },
    cooking:   { pos: [2.05, 1.15, 2.15],  target: [2.10, 0.55, 0.45] },
    peninsula: { pos: [1.35, 1.35, 2.25],  target: [3.45, 0.60, 1.65] },
    sideboard: { pos: [2.65, 1.45, 1.35],  target: [3.34, 1.15, 2.70] },
    left:      { pos: [2.35, 1.40, 1.65],  target: [0.15, 1.25, 1.05] },
    top:       { pos: [1.85, 6.20, 1.55],  target: [1.85, 0.50, 1.45] }
  };

  flyToCamera(CAM_PRESETS.overview.pos, CAM_PRESETS.overview.target, 1);

  function getSpecTitle(spec) {
    if (currentLang === 'ru') return spec.ru || spec.name;
    if (currentLang === 'ro') return spec.ro || spec.name;
    return spec.name;
  }

  function formatPartDimsText(item) {
    const dict = I18N[currentLang];
    const { w, h, d } = item.dimsCm;
    return `${dict.lblW} ${fmtCm(w)} × ${dict.lblH} ${fmtCm(h)} × ${dict.lblD} ${fmtCm(d)} cm`;
  }

  function toggleInteractive(id, forceState = null, showToast = false) {
    const item = interactiveMap[id];
    if (!item) return;
    selectedPartId = id;
    const nextOpen = forceState !== null ? forceState : !item.isOpen;
    item.isOpen = nextOpen;
    item.target = nextOpen ? 1 : 0;

    if (id === 'drawer_b15' && nextOpen && interactiveMap['drawer_b14'] && !interactiveMap['drawer_b14'].isOpen) {
      interactiveMap['drawer_b14'].isOpen = true;
      interactiveMap['drawer_b14'].target = 1;
    }
    if (id === 'drawer_b14' && !nextOpen && interactiveMap['drawer_b15'] && interactiveMap['drawer_b15'].isOpen) {
      interactiveMap['drawer_b15'].isOpen = false;
      interactiveMap['drawer_b15'].target = 0;
    }

    if (dimsEnabled) {
      updatePartDimensions3D(id);
    }

    if (showToast && window.innerWidth <= 768) {
      const dict = I18N[currentLang];
      const dimInfo = ` (${fmtCm(item.dimsCm.w)}×${fmtCm(item.dimsCm.h)} cm)`;
      showMobileToast(`${getSpecTitle(item.spec)}${dimInfo}: ${nextOpen ? dict.statusOpen : dict.statusClosed}`);
      setHoveredGroup(id);
      setTimeout(() => { if (hoveredGroupId === id) setHoveredGroup(null); }, 650);
    }

    updatePartsUI();
    saveWorkspaceState();
  }

  const partsListEl = document.getElementById('parts-list');
  const categoriesOrder = [
    'drawer', 'upper_door', 'base_door', 'tall_door', 'peninsula_door', 'sideboard_door', 'left_door'
  ];

  function buildPartsListUI() {
    partsListEl.innerHTML = '';
    for (const catKey of categoriesOrder) {
      const catSpecs = payload.specs.filter(s => {
        if (catKey === 'base_door') return s.category === 'base_door' || s.category === 'appliance';
        return s.category === catKey;
      });
      if (!catSpecs.length) continue;

      const catBox = document.createElement('div');
      catBox.className = 'cat-group';

      const header = document.createElement('div');
      header.className = 'cat-header';
      header.innerHTML = `<span>${I18N[currentLang]['cat_' + catKey]}</span><span>▾</span>`;

      const itemsBox = document.createElement('div');
      itemsBox.className = 'cat-items';

      header.addEventListener('click', () => {
        itemsBox.classList.toggle('hidden');
      });

      for (const spec of catSpecs) {
        const item = interactiveMap[spec.id];
        const row = document.createElement('div');
        row.className = 'part-row';
        row.dataset.partId = spec.id;
        row.innerHTML = `
          <div class="part-info">
            <span class="part-name">${getSpecTitle(spec)}</span>
            <span class="part-dims">📏 ${formatPartDimsText(item)}</span>
          </div>
          <div class="part-actions">
            <button class="part-paint-btn" title="Aplică materialul selectat pe această piesă">
              <span class="part-mat-dot"></span>🖌️
            </button>
            <span class="part-status"></span>
          </div>
        `;
        const paintBtn = row.querySelector('.part-paint-btn');
        paintBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          applyMaterialToInteractivePart(spec.id, getActiveCustomMat(), true);
        });
        row.addEventListener('click', () => toggleInteractive(spec.id, null, true));
        row.addEventListener('mouseenter', () => {
          if (!isMobileDevice) {
            setHoveredGroup(spec.id);
            if (dimsEnabled) updatePartDimensions3D(spec.id);
          }
        });
        row.addEventListener('mouseleave', () => {
          if (!isMobileDevice) {
            setHoveredGroup(null);
            if (dimsEnabled) updatePartDimensions3D(selectedPartId);
          }
        });
        itemsBox.appendChild(row);
      }

      catBox.appendChild(header);
      catBox.appendChild(itemsBox);
      partsListEl.appendChild(catBox);
    }
    updatePartsUI();
  }

  function updatePartsUI() {
    const dict = I18N[currentLang];
    let openCount = 0;
    const totalCount = payload.specs.length;

    for (const spec of payload.specs) {
      const item = interactiveMap[spec.id];
      if (item && item.isOpen) openCount++;
      const row = partsListEl.querySelector(`.part-row[data-part-id="${spec.id}"]`);
      if (row && item) {
        row.classList.toggle('open', item.isOpen);
        const st = row.querySelector('.part-status');
        if (st) st.textContent = item.isOpen ? dict.statusOpen : dict.statusClosed;
        const dot = row.querySelector('.part-mat-dot');
        if (dot) {
          const matObj = materialLibrary.find(m => m.id === item.assignedMatId);
          dot.style.background = matObj ? matObj.thumbCss : DEFAULT_WHITE_HEX;
        }
      }
    }

    const counterEl = document.getElementById('open-counter');
    if (counterEl) counterEl.textContent = `${openCount} / ${totalCount} ${dict.statusOpen}`;
  }

  // Hover & Touch-Aware Raycasting
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tooltipEl = document.getElementById('tooltip');
  const ttTitleEl = document.getElementById('tt-title');
  const ttDimsEl = document.getElementById('tt-dims');
  const ttSubEl = document.getElementById('tt-sub');
  let hoveredGroupId = null;

  function setHoveredGroup(gid) {
    if (hoveredGroupId === gid) return;
    if (hoveredGroupId && interactiveMap[hoveredGroupId]) {
      for (const m of interactiveMap[hoveredGroupId].meshes) {
        if (m.material && m.material.emissive && m.userData.matIdx !== 9) {
          m.material.emissive.setHex(0x000000);
          m.material.emissiveIntensity = 0;
        }
      }
    }
    hoveredGroupId = gid;
    if (hoveredGroupId && interactiveMap[hoveredGroupId]) {
      for (const m of interactiveMap[hoveredGroupId].meshes) {
        if (m.material && m.material.emissive && m.userData.matIdx !== 9) {
          m.material.emissive.setHex(paintModeActive ? 0xa855f7 : 0xd4a359);
          m.material.emissiveIntensity = 0.25;
        }
      }
    }
  }

  const activePointers = new Set();
  let hadMultiTouch = false;
  let pointerDownPos = { x: 0, y: 0 };
  let pointerDownTime = 0;

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (dimsEnabled && dimMode === 'tape') {
      renderer.domElement.style.cursor = 'crosshair';
      tooltipEl.classList.remove('visible');
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const targetList = paintModeActive ? paintableMeshes : interactiveMeshes;
    const hits = raycaster.intersectObjects(targetList, false);

    if (hits.length > 0) {
      const hitMesh = hits[0].object;
      const gid = hitMesh.userData.groupId;
      const dict = I18N[currentLang];
      const activeMat = getActiveCustomMat();
      const activeMatLabel = activeMat ? activeMat.name : 'Alb (Default)';

      if (interactiveMap[gid]) {
        setHoveredGroup(gid);
        if (dimsEnabled) updatePartDimensions3D(gid);
        const item = interactiveMap[gid];
        renderer.domElement.style.cursor = 'pointer';
        tooltipEl.style.left = `${e.clientX}px`;
        tooltipEl.style.top = `${e.clientY}px`;
        ttTitleEl.textContent = getSpecTitle(item.spec);
        ttDimsEl.textContent = `📏 ${formatPartDimsText(item)}`;
        ttSubEl.textContent = paintModeActive
          ? `${dict.clickToPaint}${activeMatLabel}`
          : (item.isOpen ? dict.clickToClose : dict.clickToOpen);
        tooltipEl.classList.add('visible');
        return;
      } else if (paintModeActive && hitMesh.userData.staticZone) {
        setHoveredGroup(null);
        renderer.domElement.style.cursor = 'pointer';
        tooltipEl.style.left = `${e.clientX}px`;
        tooltipEl.style.top = `${e.clientY}px`;
        ttTitleEl.textContent = hitMesh.userData.staticZone.toUpperCase();
        ttDimsEl.textContent = '';
        ttSubEl.textContent = `${dict.clickToPaint}${activeMatLabel}`;
        tooltipEl.classList.add('visible');
        return;
      }
    }

    setHoveredGroup(null);
    if (dimsEnabled) updatePartDimensions3D(selectedPartId);
    renderer.domElement.style.cursor = 'grab';
    tooltipEl.classList.remove('visible');
  });

  renderer.domElement.addEventListener('pointerdown', (e) => {
    activePointers.add(e.pointerId);
    if (activePointers.size > 1) {
      hadMultiTouch = true;
      return;
    }
    hadMultiTouch = false;
    pointerDownPos = { x: e.clientX, y: e.clientY };
    pointerDownTime = performance.now();
  });

  renderer.domElement.addEventListener('pointercancel', (e) => {
    activePointers.delete(e.pointerId);
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    activePointers.delete(e.pointerId);
    if (hadMultiTouch) return;

    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    const dist = Math.hypot(dx, dy);
    const dt = performance.now() - pointerDownTime;
    const maxDist = e.pointerType === 'touch' ? 14 : 6;

    if (dist < maxDist && dt < 500) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // 1. Tape Measure Mode
      if (dimsEnabled && dimMode === 'tape') {
        const allHits = raycaster.intersectObjects(allKitchenMeshes, false);
        if (allHits.length > 0) {
          handleTapeMeasureClick(allHits[0].point);
        }
        return;
      }

      // 2. 3D Material Paint Mode (Apply Selected/Uploaded Material to Clicked Unit)
      if (paintModeActive) {
        const paintHits = raycaster.intersectObjects(paintableMeshes, false);
        if (paintHits.length > 0) {
          const hitMesh = paintHits[0].object;
          const gid = hitMesh.userData.groupId;
          const activeMat = getActiveCustomMat();
          if (interactiveMap[gid]) {
            applyMaterialToInteractivePart(gid, activeMat, true);
          } else if (hitMesh.userData.staticZone) {
            applyMaterialToStaticZone(hitMesh.userData.staticZone, activeMat, true);
          }
        }
        return;
      }

      // 3. Normal Open/Close Door & Drawer Mode
      const hits = raycaster.intersectObjects(interactiveMeshes, false);
      if (hits.length > 0) {
        const gid = hits[0].object.userData.groupId;
        toggleInteractive(gid, null, true);
        const item = interactiveMap[gid];
        if (item && e.pointerType !== 'touch') {
          const dict = I18N[currentLang];
          ttSubEl.textContent = item.isOpen ? dict.clickToClose : dict.clickToOpen;
        }
      }
    }
  });

  // UI Buttons Wiring
  document.getElementById('btn-open-all').addEventListener('click', () => {
    payload.specs.forEach(s => toggleInteractive(s.id, true));
  });

  document.getElementById('btn-close-all').addEventListener('click', () => {
    payload.specs.forEach(s => toggleInteractive(s.id, false));
  });

  document.getElementById('btn-toggle-drawers').addEventListener('click', (e) => {
    const drawerSpecs = payload.specs.filter(s => s.category === 'drawer');
    const anyClosed = drawerSpecs.some(s => !interactiveMap[s.id].isOpen);
    drawerSpecs.forEach(s => toggleInteractive(s.id, anyClosed));
    e.currentTarget.classList.toggle('active', anyClosed);
  });

  document.getElementById('btn-toggle-doors').addEventListener('click', (e) => {
    const doorSpecs = payload.specs.filter(s => s.category !== 'drawer');
    const anyClosed = doorSpecs.some(s => !interactiveMap[s.id].isOpen);
    doorSpecs.forEach(s => toggleInteractive(s.id, anyClosed));
    e.currentTarget.classList.toggle('active', anyClosed);
  });

  document.getElementById('btn-xray').addEventListener('click', (e) => {
    xrayActive = !xrayActive;
    e.currentTarget.classList.toggle('active', xrayActive);
    for (const m of interactiveMeshes) {
      const assignedId = m.material.userData.assignedMatId;
      const matEntry = materialLibrary.find(x => x.id === assignedId);
      const isGlass = (m.userData.matIdx === 16) || (matEntry && matEntry.finishIdx === 3);
      if (isGlass) {
        m.material.transparent = true;
        m.material.opacity = xrayActive ? 0.25 : 0.60;
        m.material.depthWrite = false;
        m.material.needsUpdate = true;
      } else if ([1, 3].includes(m.userData.matIdx)) {
        m.material.transparent = xrayActive;
        m.material.opacity = xrayActive ? 0.28 : 1.0;
        m.material.depthWrite = !xrayActive;
        m.material.needsUpdate = true;
      }
    }
  });

  let countertopHidden = false;
  document.getElementById('btn-countertop').addEventListener('click', (e) => {
    countertopHidden = !countertopHidden;
    e.currentTarget.classList.toggle('active', countertopHidden);
    if (groupContainers['static_countertop']) {
      groupContainers['static_countertop'].visible = !countertopHidden;
    }
  });

  let edgesVisible = true;
  document.getElementById('btn-edges').addEventListener('click', (e) => {
    edgesVisible = !edgesVisible;
    e.currentTarget.classList.toggle('active', edgesVisible);
    for (const line of edgeLines) line.visible = edgesVisible;
  });

  document.getElementById('btn-dims').addEventListener('click', () => toggleDimensionsMode());
  document.getElementById('btn-top-dims').addEventListener('click', () => toggleDimensionsMode());

  document.getElementById('btn-dim-all').addEventListener('click', () => {
    dimMode = 'all';
    syncDimensionUI();
  });

  document.getElementById('btn-dim-part').addEventListener('click', () => {
    dimMode = 'part';
    syncDimensionUI();
  });

  document.getElementById('btn-tape-measure').addEventListener('click', () => {
    dimMode = (dimMode === 'tape') ? 'all' : 'tape';
    syncDimensionUI();
  });

  document.getElementById('btn-tape-clear').addEventListener('click', () => {
    clearTapeMeasure();
  });

  function setPanelOpen(open) {
    sidePanelEl.classList.toggle('collapsed', !open);
    togglePanelBtn.classList.toggle('active', open);
  }

  togglePanelBtn.addEventListener('click', () => {
    setPanelOpen(sidePanelEl.classList.contains('collapsed'));
  });

  document.getElementById('btn-close-panel').addEventListener('click', () => {
    setPanelOpen(false);
  });

  document.getElementById('sheet-handle').addEventListener('click', () => {
    setPanelOpen(false);
  });

  document.querySelectorAll('[data-cam]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = CAM_PRESETS[btn.dataset.cam];
      if (preset) flyToCamera(preset.pos, preset.target);
      if (window.innerWidth <= 768 && !sidePanelEl.classList.contains('collapsed')) {
        setPanelOpen(false);
      }
    });
  });

  document.getElementById('btn-autorotate').addEventListener('click', (e) => {
    controls.autoRotate = !controls.autoRotate;
    controls.autoRotateSpeed = 1.2;
    e.currentTarget.classList.toggle('active', controls.autoRotate);
  });

  function applyLanguage(lang) {
    currentLang = lang;
    const dict = I18N[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });
    buildPartsListUI();
    renderCustomMaterialGrid();
    syncStudioControlsUI();
    updateLightingFromState();
    if (dimsEnabled) syncDimensionUI();
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyLanguage(btn.dataset.lang);
      saveWorkspaceState();
    });
  });

  // Restore Saved Workspace from IndexedDB / localStorage (or initialize Default White)
  await loadWorkspaceState();
  applyLanguage(currentLang);
  document.getElementById('loader').classList.add('hidden');

  window.addEventListener('resize', () => {
    const portrait = window.innerHeight > window.innerWidth;
    camera.fov = portrait ? 52 : 42;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let lastTime = performance.now();
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (camAnim) {
      const u = Math.min((now - camAnim.startTime) / camAnim.duration, 1);
      const e = easeInOutCubic(u);
      camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, e);
      controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, e);
      if (u >= 1) camAnim = null;
    }

    const speed = 2.6;
    let activePartAnimating = false;
    for (const id in interactiveMap) {
      const item = interactiveMap[id];
      if (Math.abs(item.progress - item.target) > 0.0005) {
        if (item.progress < item.target) {
          item.progress = Math.min(1, item.progress + speed * dt);
        } else {
          item.progress = Math.max(0, item.progress - speed * dt);
        }
        const eased = easeInOutCubic(item.progress);
        const spec = item.spec;
        if (spec.type === 'slide') {
          item.outer.position.set(
            spec.delta[0] * eased,
            spec.delta[1] * eased,
            spec.delta[2] * eased
          );
        } else if (spec.type === 'rotate') {
          const rad = THREE.MathUtils.degToRad(spec.angle * eased);
          item.outer.rotation.set(
            spec.axis === 'x' ? rad : 0,
            spec.axis === 'y' ? rad : 0,
            spec.axis === 'z' ? rad : 0
          );
        }
        if (id === (hoveredGroupId || selectedPartId)) activePartAnimating = true;
      }
    }

    if (dimsEnabled && activePartAnimating && dimMode !== 'tape') {
      updatePartDimensions3D(hoveredGroupId || selectedPartId);
    }

    controls.update();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

init().catch(err => {
  console.error(err);
  document.getElementById('loader-title').textContent = 'Error loading 3D model';
  document.getElementById('loader-sub').textContent = String(err);
});
</script>
</body>
</html>
"""

final_html = html_template.replace('__PAYLOAD_JSON__', payload_str)
out_path = os.path.join(ROOT_DIR, 'index.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(final_html)

print(f"Updated index.html: {os.path.getsize(out_path):,} bytes")
