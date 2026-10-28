import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT_DIR, 'public', 'data', 'kitchen-payload.json'), 'r', encoding='utf-8') as f:
    payload_str = f.read()

html_template = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#101217" />
<title>3D Apartment Interactive Viewer (73.2 m²) — Full Flat + Bazis Kitchen</title>
<style>
  :root {
    --bg-dark: #0f1116;
    --panel-bg: rgba(18, 21, 27, 0.88);
    --panel-border: rgba(255, 255, 255, 0.12);
    --accent: #d4a359;
    --accent-hover: #e3b56b;
    --accent-glow: rgba(212, 163, 89, 0.25);
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
    background: radial-gradient(circle at 50% 35%, #232832 0%, #0f1116 100%);
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
    background: radial-gradient(circle at 50% 40%, #1c2029 0%, #0d0f13 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 24px; text-align: center;
    transition: opacity 0.45s ease, visibility 0.45s ease;
  }
  #loader.hidden { opacity: 0; visibility: hidden; pointer-events: none; }
  .spinner {
    width: 56px; height: 56px; border-radius: 50%;
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
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.38);
  }
  .brand-icon {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    background: linear-gradient(135deg, #d4a359, #9e6334);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; color: #fff;
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
    cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
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
  .btn-primary {
    background: var(--accent); color: #141414; border-color: var(--accent); font-weight: 600;
  }
  .btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

  /* Side Panel (Desktop Right Sidebar -> Mobile Bottom Sheet) */
  #side-panel {
    position: fixed;
    top: calc(68px + var(--safe-top));
    right: calc(14px + var(--safe-right));
    bottom: calc(74px + var(--safe-bottom));
    width: 335px; z-index: 30;
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
    transform: translateX(365px);
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
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }

  /* Room Cards Grid */
  .room-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  }
  .room-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 8px; padding: 7px 9px;
    cursor: pointer; transition: all 0.16s;
    display: flex; align-items: center; justify-content: space-between;
  }
  .room-card:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.22); }
  .room-card.active { background: var(--accent-glow); border-color: var(--accent); }
  .rc-left { display: flex; flex-direction: column; gap: 1px; }
  .rc-name { font-size: 11px; font-weight: 600; color: var(--text-main); }
  .rc-area { font-size: 10px; color: var(--accent); font-weight: 500; }

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
    padding: 7px 8px; border-radius: 6px; font-size: 12px;
    cursor: pointer; transition: background 0.15s;
  }
  .part-row:hover { background: rgba(255,255,255,0.08); }
  .part-row.open { background: rgba(52, 211, 153, 0.12); }
  .part-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px; }
  .part-status {
    font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 99px;
    background: rgba(255,255,255,0.08); color: var(--text-muted);
  }
  .part-row.open .part-status {
    background: rgba(52, 211, 153, 0.22); color: var(--success);
  }

  /* Bottom Room Camera Bar */
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
    box-shadow: 0 8px 32px rgba(0,0,0,0.42);
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
    background: rgba(15, 17, 22, 0.92);
    border: 1px solid var(--accent);
    border-radius: 8px; padding: 6px 10px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    transform: translate(14px, 14px);
    opacity: 0; transition: opacity 0.12s ease;
    white-space: nowrap;
  }
  #tooltip.visible { opacity: 1; }
  .tt-title { font-size: 12px; font-weight: 600; color: #fff; }
  .tt-sub { font-size: 11px; color: var(--accent); margin-top: 2px; }

  /* Mobile Action Toast */
  #mobile-toast {
    position: fixed;
    top: calc(68px + var(--safe-top));
    left: 50%; transform: translateX(-50%) translateY(-10px);
    z-index: 45; pointer-events: none;
    background: rgba(17, 20, 26, 0.92);
    border: 1px solid var(--accent);
    border-radius: 99px;
    padding: 7px 16px;
    font-size: 12px; font-weight: 600; color: #fff;
    box-shadow: 0 6px 24px rgba(0,0,0,0.45);
    opacity: 0; transition: opacity 0.22s ease, transform 0.22s ease;
    white-space: nowrap; max-width: 90vw; overflow: hidden; text-overflow: ellipsis;
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
  }

  @media (max-width: 768px) {
    #top-bar { gap: 6px; }
    .brand-pill { padding: 6px 10px; gap: 8px; }
    .brand-icon { width: 26px; height: 26px; font-size: 11px; }
    .brand-text h1 { font-size: 13px; }
    .brand-text p { display: none; }
    .top-controls { padding: 5px 8px; gap: 5px; flex: 1; justify-content: flex-end; }
    .btn { padding: 7px 9px; font-size: 11px; }
    .lang-btn { padding: 4px 6px; font-size: 10px; }

    #side-panel {
      top: auto; left: 0; right: 0; bottom: 0;
      width: 100%; height: 60dvh;
      border-radius: 20px 20px 0 0; border-bottom: none;
      padding-bottom: var(--safe-bottom); z-index: 40;
    }
    #side-panel.collapsed { transform: translateY(105%); opacity: 1; }
    .sheet-handle { display: block; }
    .panel-close-btn { display: inline-flex; }
    #tooltip { display: none !important; }
  }

  @media (max-width: 480px) {
    .brand-text h1 { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }
</style>
</head>
<body>

<div id="loader">
  <div class="spinner"></div>
  <div class="loader-title" id="loader-title">Building 3D Apartment (73.2 m²) & Bazis Kitchen...</div>
  <div class="loader-sub" id="loader-sub">Constructing 8 rooms, architectural lighting & 44 interactive doors/drawers</div>
</div>

<div id="canvas-container"></div>

<div id="tooltip">
  <div class="tt-title" id="tt-title">Door</div>
  <div class="tt-sub" id="tt-sub">Click to open</div>
</div>

<div id="mobile-toast"></div>

<div id="top-bar">
  <div class="brand-pill">
    <div class="brand-icon">73m²</div>
    <div class="brand-text">
      <h1 data-i18n="title">3D Flat & New Kitchen</h1>
      <p data-i18n="subtitle">8 Rooms (73.2 m²) • Tap any door, cabinet, or kitchen drawer to interact</p>
    </div>
  </div>

  <div class="top-controls">
    <button class="btn" id="btn-wall-mode" data-i18n="wallCutaway">Walls: Cutaway</button>
    <button class="btn btn-primary" id="btn-open-all" data-i18n="openAll">Open All</button>
    <button class="btn" id="btn-close-all" data-i18n="closeAll">Close All</button>
    <div class="lang-group">
      <button class="lang-btn active" data-lang="en">EN</button>
      <button class="lang-btn" data-lang="ru">RU</button>
      <button class="lang-btn" data-lang="ro">RO</button>
    </div>
    <button class="btn active" id="btn-toggle-panel" data-i18n="inspector">Menu</button>
  </div>
</div>

<div id="side-panel">
  <div class="sheet-handle" id="sheet-handle"></div>
  <div class="panel-header">
    <h2 data-i18n="controlsHeader">Apartment & Kitchen Controls</h2>
    <div style="display:flex; align-items:center; gap:8px;">
      <span id="open-counter" style="font-size:11px; color:var(--accent); font-weight:600;">0 Open</span>
      <button class="panel-close-btn" id="btn-close-panel" aria-label="Close panel">✕</button>
    </div>
  </div>
  <div class="panel-body">
    <div>
      <div class="section-label">
        <span data-i18n="roomsTitle">Rooms (73.2 m² Total)</span>
      </div>
      <div class="room-grid" id="room-grid">
        <div class="room-card" data-cam="antreu"><div class="rc-left"><span class="rc-name" data-i18n="r1">1. Antreu (Hall)</span><span class="rc-area">14.15 m²</span></div><span>→</span></div>
        <div class="room-card" data-cam="wc"><div class="rc-left"><span class="rc-name" data-i18n="r2">2. WC / Shower</span><span class="rc-area">2.62 m²</span></div><span>→</span></div>
        <div class="room-card" data-cam="living"><div class="rc-left"><span class="rc-name" data-i18n="r3">3. Living & Office</span><span class="rc-area">18.89 m²</span></div><span>→</span></div>
        <div class="room-card" data-cam="kitchen"><div class="rc-left"><span class="rc-name" data-i18n="r4">4. Kitchen (New)</span><span class="rc-area">12.57 m²</span></div><span>→</span></div>
        <div class="room-card" data-cam="bedroom"><div class="rc-left"><span class="rc-name" data-i18n="r5">5. Bedroom</span><span class="rc-area">13.81 m²</span></div><span>→</span></div>
        <div class="room-card" data-cam="balcony"><div class="rc-left"><span class="rc-name" data-i18n="r6">6. Balcony</span><span class="rc-area">4.81 m²</span></div><span>→</span></div>
        <div class="room-card" data-cam="baie"><div class="rc-left"><span class="rc-name" data-i18n="r7">7. Main Bath</span><span class="rc-area">3.33 m²</span></div><span>→</span></div>
        <div class="room-card" data-cam="garderob"><div class="rc-left"><span class="rc-name" data-i18n="r8">8. Walk-In Closet</span><span class="rc-area">3.02 m²</span></div><span>→</span></div>
      </div>
    </div>

    <div>
      <div class="section-label"><span data-i18n="archControls">Architecture & Views</span></div>
      <div class="grid-2">
        <button class="btn active" id="btn-labels" data-i18n="roomLabels">Room Labels</button>
        <button class="btn" id="btn-ceiling" data-i18n="showCeiling">Ceiling & Lights</button>
        <button class="btn" id="btn-xray" data-i18n="xray">X-Ray Kitchen</button>
        <button class="btn active" id="btn-edges" data-i18n="cadEdges">CAD Edges</button>
      </div>
    </div>

    <div>
      <div class="section-label"><span data-i18n="quickActions">Interactive Doors & Drawers</span></div>
      <div class="grid-2">
        <button class="btn" id="btn-toggle-flat-doors" data-i18n="toggleFlatDoors">Room Doors (11)</button>
        <button class="btn" id="btn-toggle-kitchen" data-i18n="toggleKitchen">Kitchen All (33)</button>
      </div>
    </div>

    <div>
      <div class="section-label"><span data-i18n="interactiveParts">All Interactive Elements (44)</span></div>
      <div id="parts-list" style="display:flex; flex-direction:column; gap:8px;"></div>
    </div>
  </div>
</div>

<div id="hint-pill" data-i18n="hint">💡 Tap any room door, wardrobe, or kitchen drawer/cabinet to open • Use bottom bar to jump between rooms</div>

<div id="bottom-bar">
  <button class="btn active" data-cam="overview" data-i18n="camOverview">Dollhouse</button>
  <button class="btn" data-cam="top" data-i18n="camTop">Floor Plan</button>
  <button class="btn" data-cam="kitchen" data-i18n="camKitchen">4. Kitchen (Bazis)</button>
  <button class="btn" data-cam="living" data-i18n="camLiving">3. Living & Office</button>
  <button class="btn" data-cam="antreu" data-i18n="camAntreu">1. Antreu</button>
  <button class="btn" data-cam="bedroom" data-i18n="camBedroom">5. Bedroom</button>
  <button class="btn" data-cam="garderob" data-i18n="camGarderob">8. Closet</button>
  <button class="btn" data-cam="wc" data-i18n="camWC">2. WC</button>
  <button class="btn" data-cam="baie" data-i18n="camBaie">7. Bath</button>
  <button class="btn" data-cam="balcony" data-i18n="camBalcony">6. Balcony</button>
</div>

<!-- Embedded Compressed 3D Kitchen Model Data -->
<script>
window.KITCHEN_PAYLOAD = __PAYLOAD_JSON__;
</script>

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
    title: "3D Flat & Bazis Kitchen",
    subtitle: "8 Rooms (73.2 m²) • Tap any door, cabinet, or kitchen drawer to interact",
    wallCutaway: "Walls: Half",
    wallFull: "Walls: Full",
    wallLow: "Walls: Low",
    openAll: "Open All",
    closeAll: "Close All",
    inspector: "Menu",
    controlsHeader: "Apartment & Kitchen Controls",
    roomsTitle: "Rooms (73.2 m² Total)",
    r1: "1. Antreu (Hall)",
    r2: "2. WC / Shower",
    r3: "3. Living & Office",
    r4: "4. Kitchen (New)",
    r5: "5. Bedroom",
    r6: "6. Balcony",
    r7: "7. Main Bath",
    r8: "8. Walk-In Closet",
    archControls: "Architecture & Views",
    roomLabels: "Room Labels",
    showCeiling: "Ceiling & Track",
    xray: "X-Ray Kitchen",
    cadEdges: "CAD Edges",
    quickActions: "Quick Actions",
    toggleFlatDoors: "Room Doors (11)",
    toggleKitchen: "Kitchen All (33)",
    interactiveParts: "Interactive Doors & Drawers (44)",
    hint: "💡 Tap any room door, wardrobe, or kitchen drawer/cabinet to open • Select any room below",
    camOverview: "Dollhouse",
    camTop: "Floor Plan",
    camKitchen: "4. Kitchen",
    camLiving: "3. Living & Office",
    camAntreu: "1. Antreu",
    camBedroom: "5. Bedroom",
    camGarderob: "8. Closet",
    camWC: "2. WC",
    camBaie: "7. Bath",
    camBalcony: "6. Balcony",
    statusOpen: "OPEN",
    statusClosed: "CLOSED",
    clickToOpen: "Tap to open",
    clickToClose: "Tap to close",
    cat_flat_door: "Apartment Doors & Wardrobes (11)",
    cat_drawer: "Kitchen Drawers & Bottle Rack (6)",
    cat_upper_door: "Kitchen Upper Cabinets (6)",
    cat_base_door: "Kitchen Base & Bosch Oven (3)",
    cat_tall_door: "Kitchen Tall Columns (5)",
    cat_peninsula_door: "Kitchen Peninsula Counter (4)",
    cat_sideboard_door: "Kitchen Oak Vitrine Sideboard (4)",
    cat_left_door: "Kitchen Left Pantry & Fridge (5)"
  },
  ru: {
    title: "3D Квартира и Новая Кухня",
    subtitle: "8 зон (73.2 м²) • Нажимайте на двери, шкафы и ящики кухни",
    wallCutaway: "Стены: Половина",
    wallFull: "Стены: Полные",
    wallLow: "Стены: Низкие",
    openAll: "Открыть всё",
    closeAll: "Закрыть всё",
    inspector: "Меню",
    controlsHeader: "Управление Квартирой и Кухней",
    roomsTitle: "Комнаты (Всего 73.2 м²)",
    r1: "1. Прихожая (Antreu)",
    r2: "2. Санузел с душем",
    r3: "3. Гостиная и Кабинет",
    r4: "4. Кухня (Новая)",
    r5: "5. Спальня",
    r6: "6. Балкон / Лоджия",
    r7: "7. Ванная комната",
    r8: "8. Гардеробная",
    archControls: "Архитектура и Вид",
    roomLabels: "Метки комнат",
    showCeiling: "Потолок и треки",
    xray: "Прозрачная кухня",
    cadEdges: "Контуры CAD",
    quickActions: "Быстрые действия",
    toggleFlatDoors: "Двери квартиры (11)",
    toggleKitchen: "Вся кухня (33)",
    interactiveParts: "Интерактивные элементы (44)",
    hint: "💡 Нажимайте на межкомнатные двери, шкафы и ящики кухни • Выбирайте комнаты внизу",
    camOverview: "Общий 3D",
    camTop: "План сверху",
    camKitchen: "4. Кухня",
    camLiving: "3. Гостиная",
    camAntreu: "1. Прихожая",
    camBedroom: "5. Спальня",
    camGarderob: "8. Гардероб",
    camWC: "2. Санузел",
    camBaie: "7. Ванная",
    camBalcony: "6. Балкон",
    statusOpen: "ОТКРЫТО",
    statusClosed: "ЗАКРЫТО",
    clickToOpen: "Нажмите, чтобы открыть",
    clickToClose: "Нажмите, чтобы закрыть",
    cat_flat_door: "Двери и шкафы квартиры (11)",
    cat_drawer: "Кухня: Ящики и бутылочница (6)",
    cat_upper_door: "Кухня: Верхние шкафы (6)",
    cat_base_door: "Кухня: Нижние тумбы и духовка (3)",
    cat_tall_door: "Кухня: Правые пеналы (5)",
    cat_peninsula_door: "Кухня: Полуостров (4)",
    cat_sideboard_door: "Кухня: Витрина Дуб Casella (4)",
    cat_left_door: "Кухня: Левый пенал и холодильник (5)"
  },
  ro: {
    title: "Apartament 3D & Bucătărie",
    subtitle: "8 Zone (73.2 m²) • Atingeți orice ușă, dulap sau sertar pentru interacțiune",
    wallCutaway: "Pereți: Jumătate",
    wallFull: "Pereți: Întregi",
    wallLow: "Pereți: Joși",
    openAll: "Deschide Tot",
    closeAll: "Închide Tot",
    inspector: "Meniu",
    controlsHeader: "Control Apartament & Bucătărie",
    roomsTitle: "Încăperi (Total 73.2 m²)",
    r1: "1. Antreu (Hol)",
    r2: "2. WC / Duș",
    r3: "3. Living & Birou",
    r4: "4. Bucătărie (Nouă)",
    r5: "5. Dormitor",
    r6: "6. Balcon",
    r7: "7. Baie Principală",
    r8: "8. Garderobă",
    archControls: "Arhitectură & Vizualizare",
    roomLabels: "Etichete Camere",
    showCeiling: "Tavan & Șine LED",
    xray: "Bucătărie X-Ray",
    cadEdges: "Muchii CAD",
    quickActions: "Acțiuni Rapide",
    toggleFlatDoors: "Uși Apartament (11)",
    toggleKitchen: "Toată Bucătăria (33)",
    interactiveParts: "Elemente Interactive (44)",
    hint: "💡 Atingeți orice ușă, dulap sau sertar din bucătărie • Selectați camera din bara de jos",
    camOverview: "Ansamblu 3D",
    camTop: "Plan 2D/3D",
    camKitchen: "4. Bucătărie",
    camLiving: "3. Living & Birou",
    camAntreu: "1. Antreu",
    camBedroom: "5. Dormitor",
    camGarderob: "8. Garderobă",
    camWC: "2. WC",
    camBaie: "7. Baie",
    camBalcony: "6. Balcon",
    statusOpen: "DESCHIS",
    statusClosed: "ÎNCHIS",
    clickToOpen: "Atingeți pt. deschidere",
    clickToClose: "Atingeți pt. închidere",
    cat_flat_door: "Uși & Dulapuri Apartament (11)",
    cat_drawer: "Bucătărie: Sertare & Coș Jolly (6)",
    cat_upper_door: "Bucătărie: Corpuri Superioare (6)",
    cat_base_door: "Bucătărie: Bază & Cuptor Bosch (3)",
    cat_tall_door: "Bucătărie: Coloane Dreapta (5)",
    cat_peninsula_door: "Bucătărie: Peninsulă (4)",
    cat_sideboard_door: "Bucătărie: Vitrină Stejar (4)",
    cat_left_door: "Bucătărie: Coloană Stânga & Frigider (5)"
  }
};

let currentLang = 'en';

const sidePanelEl = document.getElementById('side-panel');
const togglePanelBtn = document.getElementById('btn-toggle-panel');
if (window.innerWidth <= 768) {
  sidePanelEl.classList.add('collapsed');
  togglePanelBtn.classList.remove('active');
}

// Procedural Textures for Flat & Kitchen
function createMarbleTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f2f0ec';
  ctx.fillRect(0, 0, 512, 512);
  // Subtle Calacatta gold/grey veins
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    let x = Math.random() * 512, y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.35) * 140;
      y += (Math.random() - 0.35) * 140;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(168, 120, 75, 0.16)' : 'rgba(130, 135, 145, 0.15)';
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.stroke();
  }
  // Tile grout lines (2x2 grid)
  ctx.strokeStyle = 'rgba(180, 178, 172, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeRect(256, 0, 256, 256);
  ctx.strokeRect(0, 256, 256, 256);
  ctx.strokeRect(256, 256, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createParquetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5a4230';
  ctx.fillRect(0, 0, 512, 512);
  const rows = 8, cols = 4;
  const rw = 512 / cols, rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const off = (r % 2) * (rw / 2);
      const x = (c * rw + off) % 512;
      const y = r * rh;
      const shade = (Math.random() - 0.5) * 18;
      ctx.fillStyle = `rgb(${90 + shade}, ${66 + shade * 0.8}, ${48 + shade * 0.6})`;
      ctx.fillRect(x, y, rw - 2, rh - 2);
      ctx.strokeStyle = 'rgba(30, 18, 10, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, rw, rh);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDarkStoneTileTexture(baseHex = '#3a3836', veinColor = 'rgba(195,165,130,0.16)') {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    let x = Math.random() * 512, y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.4) * 150;
      y += (Math.random() - 0.4) * 150;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = veinColor;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(25,25,25,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeRect(256, 256, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createOakTexture() {
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#25272a';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3500; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const r = 0.5 + Math.random() * 1.8;
    const v = 25 + Math.floor(Math.random() * 45);
    ctx.fillStyle = `rgba(${v},${v+2},${v+5},0.18)`;
    ctx.fillRect(x, y, r, r);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
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

function createRibbedRugTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e5e0d8';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    ctx.fillStyle = 'rgba(110, 100, 90, 0.22)';
    ctx.fillRect(0, y, 256, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 6);
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
  toastTimer = setTimeout(() => el.classList.remove('visible'), 1800);
}

async function init() {
  const container = document.getElementById('canvas-container');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDevice ? 1.75 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const isPortrait = window.innerHeight > window.innerWidth;
  const camera = new THREE.PerspectiveCamera(isPortrait ? 52 : 42, window.innerWidth / window.innerHeight, 0.08, 60);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = isMobileDevice ? 0.75 : 0.9;
  controls.zoomSpeed = 1.1;
  controls.panSpeed = isMobileDevice ? 0.85 : 0.9;
  controls.maxPolarAngle = Math.PI / 2 + 0.05;
  controls.minDistance = 0.5;
  controls.maxDistance = 24;
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };

  // Lighting
  const ambientLight = new THREE.HemisphereLight(0xfff9f0, 0x282c34, 0.88);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.55);
  sunLight.position.set(8.5, 11.0, 9.5);
  sunLight.castShadow = true;
  const shadowRes = isMobileDevice ? 1024 : 2048;
  sunLight.shadow.mapSize.set(shadowRes, shadowRes);
  sunLight.shadow.camera.near = 1.0;
  sunLight.shadow.camera.far = 28;
  const sd = 7.5;
  sunLight.shadow.camera.left = -sd;
  sunLight.shadow.camera.right = sd;
  sunLight.shadow.camera.top = sd;
  sunLight.shadow.camera.bottom = -sd;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.55);
  fillLight.position.set(-4.0, 6.0, -3.0);
  scene.add(fillLight);

  // Room Warm Interior Point Lights
  const roomLights = [
    new THREE.PointLight(0xffe4b8, 0.75, 5.5), // Living
    new THREE.PointLight(0xffe4b8, 0.85, 5.0), // Kitchen
    new THREE.PointLight(0xffe4b8, 0.75, 5.5), // Antreu
    new THREE.PointLight(0xffe4b8, 0.75, 5.5), // Bedroom
    new THREE.PointLight(0xffdca8, 0.65, 3.5), // WC
    new THREE.PointLight(0xffdca8, 0.65, 3.5), // Baie
  ];
  roomLights[0].position.set(1.8, 2.4, 2.2);
  roomLights[1].position.set(5.2, 2.4, 2.2);
  roomLights[2].position.set(4.3, 2.4, 5.7);
  roomLights[3].position.set(8.2, 2.4, 3.5);
  roomLights[4].position.set(1.0, 2.4, 6.5);
  roomLights[5].position.set(7.5, 2.4, 6.5);
  roomLights.forEach(l => scene.add(l));

  // Studio Base Ground
  const groundGeo = new THREE.PlaneGeometry(32, 32);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.88, metalness: 0.05 });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(4.9, -0.02, 3.8);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const gridHelper = new THREE.GridHelper(22, 44, 0x333844, 0x1c2029);
  gridHelper.position.set(4.9, -0.015, 3.8);
  scene.add(gridHelper);

  // Shared Materials for Apartment Architecture & Furniture
  const marbleTex = createMarbleTileTexture();
  const parquetTex = createParquetTexture();
  const wcStoneTex = createDarkStoneTileTexture('#3d342e', 'rgba(205,165,120,0.18)');
  const baieStoneTex = createDarkStoneTileTexture('#383a3d', 'rgba(200,205,210,0.14)');
  const oakTex = createOakTexture();
  const stoneTex = createStoneTexture();
  const displayTex = createOvenDisplayTexture();
  const rugTex = createRibbedRugTexture();

  const MAT = {
    wallPaint: new THREE.MeshStandardMaterial({ color: 0xe2ddd5, roughness: 0.72 }),
    wallOuter: new THREE.MeshStandardMaterial({ color: 0xc8c2b8, roughness: 0.78 }),
    wallDarkBathroom: new THREE.MeshStandardMaterial({ map: wcStoneTex, roughness: 0.35, metalness: 0.06 }),
    wallBaieStone: new THREE.MeshStandardMaterial({ map: baieStoneTex, roughness: 0.4, metalness: 0.05 }),
    floorMarble: new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.25, metalness: 0.05 }),
    floorParquet: new THREE.MeshStandardMaterial({ map: parquetTex, roughness: 0.45, metalness: 0.04 }),
    floorBalcony: new THREE.MeshStandardMaterial({ color: 0xd8cfc2, roughness: 0.5 }),
    rugCream: new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.85 }),
    rugBedroom: new THREE.MeshStandardMaterial({ color: 0xc8c2ba, roughness: 0.88 }),
    doorWhite: new THREE.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.4 }),
    cashmere: new THREE.MeshStandardMaterial({ color: 0xbcb2a2, roughness: 0.42 }),
    darkWalnut: new THREE.MeshStandardMaterial({ map: oakTex, color: 0x7a4e2d, roughness: 0.48 }),
    sofaCharcoal: new THREE.MeshStandardMaterial({ color: 0x2c2e33, roughness: 0.82 }),
    pillowRust: new THREE.MeshStandardMaterial({ color: 0x8c4a27, roughness: 0.65 }),
    bedFabric: new THREE.MeshStandardMaterial({ color: 0xb8b3ac, roughness: 0.78 }),
    bedSheet: new THREE.MeshStandardMaterial({ color: 0xeae6df, roughness: 0.7 }),
    whiteMatte: new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.35 }),
    blackMetal: new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.28, metalness: 0.82 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe6ebf0, roughness: 0.15, metalness: 0.92 }),
    copperBronze: new THREE.MeshStandardMaterial({ color: 0xb86f42, roughness: 0.25, metalness: 0.88 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xd8e2eb, roughness: 0.04, metalness: 0.96 }),
    glassClear: new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false }),
    glassFluted: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.48, depthWrite: false }),
    tvScreen: new THREE.MeshStandardMaterial({ color: 0x090b0e, roughness: 0.08, metalness: 0.3 }),
    ledGlow: new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffd28a, emissiveIntensity: 1.4 }),
    plantGreen: new THREE.MeshStandardMaterial({ color: 0x3f6238, roughness: 0.75 }),
    frescoWall: new THREE.MeshStandardMaterial({ color: 0xd4cbc0, roughness: 0.65 })
  };

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x1a1917, transparent: true, opacity: 0.22, depthWrite: false
  });
  const edgeLines = [];

  function addBox(parent, w, h, d, x, y, z, mat, addEdges = true, castShadow = true) {
    const geom = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (addEdges) {
      const eg = new THREE.EdgesGeometry(geom, 28);
      const line = new THREE.LineSegments(eg, edgeMat);
      line.raycast = () => {};
      mesh.add(line);
      edgeLines.push(line);
    }
    return mesh;
  }

  // Interactive Registry (supports both Flat doors/wardrobes and all 33 Bazis Kitchen elements!)
  const interactiveMap = {};
  const interactiveMeshes = [];
  const allSpecs = [];

  function registerInteractiveItem(spec, outerGroup, meshesList) {
    allSpecs.push(spec);
    interactiveMap[spec.id] = {
      spec,
      outer: outerGroup,
      isOpen: false,
      progress: 0,
      target: 0,
      meshes: meshesList
    };
    for (const m of meshesList) {
      m.userData.groupId = spec.id;
      interactiveMeshes.push(m);
    }
  }

  // Helper to create an interactive hinged or sliding door in the flat
  function createFlatDoor({ id, name, ru, ro, pivotX, pivotY, pivotZ, w, h, d, offsetX, offsetY, offsetZ, mat, handleMat = MAT.blackMetal, type = 'rotate', angle = 90, axis = 'y', delta = [0,0,0] }) {
    const outer = new THREE.Group();
    outer.position.set(pivotX, pivotY, pivotZ);
    scene.add(outer);

    const doorMat = mat.clone();
    const panel = addBox(outer, w, h, d, offsetX, offsetY, offsetZ, doorMat, true, true);
    const meshes = [panel];

    // Add sleek door handle
    const hx = offsetX * 1.75;
    const hz = offsetZ * 1.75;
    const handle = addBox(outer, Math.max(0.03, Math.abs(w) > 0.2 ? 0.12 : 0.04), 0.04, Math.max(0.03, Math.abs(d) > 0.2 ? 0.12 : 0.04), hx, 0, hz, handleMat.clone(), false, false);
    meshes.push(handle);

    registerInteractiveItem({
      id, name, ru, ro, category: 'flat_door', type, axis, angle, delta
    }, outer, meshes);
  }

  // ============================================================================
  // 1. FLOORS FOR ALL 8 ROOMS
  // ============================================================================
  const floorsGroup = new THREE.Group();
  scene.add(floorsGroup);

  // Room 3: Living & Office Parquet (X=0..3.62, Z=0..5.75)
  addBox(floorsGroup, 3.62, 0.04, 5.00, 1.81, -0.02, 2.50, MAT.floorParquet, false, false);
  addBox(floorsGroup, 2.00, 0.04, 0.75, 1.00, -0.02, 5.375, MAT.floorParquet, false, false);
  // Room 4: Kitchen Marble Tile (X=3.62..6.66, Z=0..4.52)
  addBox(floorsGroup, 3.04, 0.04, 4.52, 5.14, -0.02, 2.26, MAT.floorMarble, false, false);
  // Room 1: Antreu Marble Tile (X=2.00..6.66, Z=4.52..6.95)
  addBox(floorsGroup, 4.66, 0.04, 2.43, 4.33, -0.02, 5.735, MAT.floorMarble, false, false);
  // Room 2: WC Dark Stone Tile (X=0..2.00, Z=5.75..7.55)
  addBox(floorsGroup, 2.00, 0.04, 1.80, 1.00, -0.02, 6.65, MAT.wallDarkBathroom, false, false);
  // Room 5: Master Bedroom Parquet (X=6.66..9.78, Z=1.57..5.52)
  addBox(floorsGroup, 3.12, 0.04, 3.95, 8.22, -0.02, 3.545, MAT.floorParquet, false, false);
  // Room 6: Balcony Laminate (X=6.32..9.78, Z=0..1.57)
  addBox(floorsGroup, 3.46, 0.04, 1.57, 8.05, -0.02, 0.785, MAT.floorBalcony, false, false);
  // Room 7: Main Bathroom Stone Tile (X=6.66..8.36, Z=5.52..7.55)
  addBox(floorsGroup, 1.70, 0.04, 2.03, 7.51, -0.02, 6.535, MAT.wallBaieStone, false, false);
  // Room 8: Walk-In Closet Parquet (X=8.36..9.78, Z=5.52..7.55)
  addBox(floorsGroup, 1.42, 0.04, 2.03, 9.07, -0.02, 6.535, MAT.floorParquet, false, false);

  // ============================================================================
  // 2. ARCHITECTURAL WALLS (WITH CUTAWAY / HEIGHT SCALING SUPPORT)
  // ============================================================================
  const wallsGroup = new THREE.Group();
  scene.add(wallsGroup);
  const wallMeshes = [];

  function addWall(x1, z1, x2, z2, thickness = 0.14, mat = MAT.wallPaint, height = 2.70, yBase = 0) {
    const w = Math.max(thickness, Math.abs(x2 - x1));
    const d = Math.max(thickness, Math.abs(z2 - z1));
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const mesh = addBox(wallsGroup, w, height, d, cx, yBase + height / 2, cz, mat, true, true);
    mesh.userData.fullHeight = height;
    mesh.userData.yBase = yBase;
    wallMeshes.push(mesh);
    return mesh;
  }

  // Exterior West Wall (X = 0.00, Z = 0.00..7.55)
  addWall(0, 0, 0, 7.55, 0.18, MAT.wallOuter);
  // Exterior North Wall — Living Room Window Wall (Z = 0.00, X = 0..3.62)
  addWall(0, 0, 0.55, 0, 0.18, MAT.wallOuter);
  addWall(0.55, 0, 2.35, 0, 0.18, MAT.wallOuter, 0.90, 0); // Window sill
  addBox(wallsGroup, 1.80, 1.55, 0.04, 1.45, 1.675, 0, MAT.glassClear, true, false); // Living Window Glass
  addWall(2.35, 0, 3.62, 0, 0.18, MAT.wallOuter);

  // Exterior North Wall — Kitchen Window Wall (Z = 0.00, X = 3.62..6.32)
  addWall(3.62, 0, 4.35, 0, 0.18, MAT.wallOuter);
  addWall(4.35, 0, 5.85, 0, 0.18, MAT.wallOuter, 0.85, 0); // Kitchen window sill
  addBox(wallsGroup, 1.50, 1.60, 0.04, 5.10, 1.65, 0, MAT.glassClear, true, false); // Kitchen Window Glass
  addWall(5.85, 0, 6.32, 0, 0.18, MAT.wallOuter);

  // Balcony North & East Glazing (Z = 0.00, X = 6.32..9.78)
  addWall(6.32, 0, 9.78, 0, 0.14, MAT.wallOuter, 0.92, 0);
  addBox(wallsGroup, 3.46, 1.65, 0.04, 8.05, 1.745, 0, MAT.glassClear, true, false);
  addWall(9.78, 0, 9.78, 1.57, 0.18, MAT.wallOuter);

  // Wall between Balcony & Bedroom (Z = 1.57, X = 6.66..9.78 with door + window)
  addWall(6.66, 1.57, 7.05, 1.57, 0.18, MAT.wallPaint);
  // Balcony Door (X = 7.05..7.80)
  addWall(7.80, 1.57, 9.60, 1.57, 0.18, MAT.wallPaint, 0.90, 0);
  addBox(wallsGroup, 1.80, 1.55, 0.04, 8.70, 1.675, 1.57, MAT.glassClear, true, false);

  // Exterior East Wall (X = 9.78, Z = 1.57..7.55)
  addWall(9.78, 1.57, 9.78, 7.55, 0.18, MAT.wallOuter);

  // Exterior South Wall (Z = 6.95 for Antreu, Z = 7.55 for WC, Baie, Garderob)
  addWall(0, 7.55, 2.00, 7.55, 0.18, MAT.wallDarkBathroom);
  addWall(2.00, 6.95, 4.15, 6.95, 0.18, MAT.wallOuter);
  // Entrance Door at X = 4.15..5.10, Z = 6.95
  addWall(5.10, 6.95, 6.66, 6.95, 0.18, MAT.wallOuter);
  addWall(6.66, 7.55, 9.78, 7.55, 0.18, MAT.wallOuter);

  // Interior Partition: Living vs Kitchen (X = 3.63, Z = 0.00..4.99)
  addWall(3.63, 0.00, 3.63, 4.99, 0.14, MAT.wallPaint);

  // Interior Partition: Living vs Antreu (Z = 4.99, X = 1.88..3.63, door at X = 2.35..3.20)
  addWall(1.88, 4.99, 2.35, 4.99, 0.12, MAT.wallPaint);
  addWall(3.20, 4.99, 3.63, 4.99, 0.12, MAT.wallPaint);

  // Interior Partition: Home Office South Wall (Z = 5.75, X = 0.00..2.00)
  addWall(0.00, 5.75, 2.00, 5.75, 0.14, MAT.wallPaint);

  // Home Office Black-Framed Glass Partition (PERETE DIN STICLA: Z = 3.95, X = 0..1.88 & X = 1.88, Z = 3.95..5.75)
  addBox(wallsGroup, 1.88, 2.50, 0.03, 0.94, 1.25, 3.95, MAT.glassClear, true, false);
  addBox(wallsGroup, 1.88, 0.04, 0.05, 0.94, 2.48, 3.95, MAT.blackMetal, false, false);
  addBox(wallsGroup, 0.03, 2.50, 1.02, 1.88, 1.25, 5.24, MAT.glassClear, true, false);

  // Interior Partition: WC vs Antreu (X = 2.00, Z = 4.99..7.55, door at Z = 6.00..6.75)
  addWall(2.00, 4.99, 2.00, 6.00, 0.12, MAT.wallPaint);
  addWall(2.00, 6.75, 2.00, 7.55, 0.12, MAT.wallPaint);

  // Interior Partition: Kitchen vs Antreu & Fridge Pocket (Z = 4.52, X = 3.63..5.55, door at X = 5.55..6.45)
  addWall(3.63, 4.52, 5.55, 4.52, 0.12, MAT.wallPaint);
  addWall(5.48, 3.88, 5.48, 4.52, 0.10, MAT.wallPaint); // Fridge pocket side wall

  // Interior Partition: Kitchen/Antreu vs Bedroom/Baie (X = 6.66, Z = 0.00..7.55)
  // Doors: Bedroom door at Z = 4.62..5.42, Main Bathroom door at Z = 5.75..6.50
  addWall(6.66, 0.00, 6.66, 4.62, 0.14, MAT.wallPaint);
  addWall(6.66, 5.42, 6.66, 5.75, 0.14, MAT.wallPaint);
  addWall(6.66, 6.50, 6.66, 7.55, 0.14, MAT.wallPaint);

  // Interior Partition: Bedroom vs Baie & Garderob (Z = 5.52, X = 6.66..8.36 solid, X = 8.36..9.78 fluted glass!)
  addWall(6.66, 5.52, 8.36, 5.52, 0.12, MAT.wallPaint);
  // Fluted glass partition between Bedroom & Walk-In Closet (Garderob)
  addBox(wallsGroup, 0.72, 2.55, 0.04, 9.42, 1.275, 5.52, MAT.glassFluted, true, false);

  // Interior Partition: Baie vs Garderob (X = 8.36, Z = 5.52..7.55)
  addWall(8.36, 5.52, 8.36, 7.55, 0.12, MAT.wallBaieStone);

  // ============================================================================
  // 3. INTERACTIVE APARTMENT DOORS (11 DOORS & WARDROBES)
  // ============================================================================
  // 1. Main Entrance Door
  createFlatDoor({
    id: 'flat_door_entry', name: 'Main Entrance Door', ru: 'Входная дверь', ro: 'Ușă Intrare',
    pivotX: 4.15, pivotY: 1.05, pivotZ: 6.95, w: 0.92, h: 2.10, d: 0.05, offsetX: 0.46, offsetY: 0, offsetZ: 0,
    mat: MAT.doorWhite, angle: 85
  });
  // 2. Living Room Door
  createFlatDoor({
    id: 'flat_door_living', name: 'Living Room Door', ru: 'Дверь в гостиную', ro: 'Ușă Living',
    pivotX: 2.35, pivotY: 1.05, pivotZ: 4.99, w: 0.85, h: 2.10, d: 0.04, offsetX: 0.425, offsetY: 0, offsetZ: 0,
    mat: MAT.doorWhite, angle: 88
  });
  // 3. Kitchen Door
  createFlatDoor({
    id: 'flat_door_kitchen', name: 'Kitchen Door', ru: 'Дверь на кухню', ro: 'Ușă Bucătărie',
    pivotX: 6.45, pivotY: 1.05, pivotZ: 4.52, w: 0.86, h: 2.10, d: 0.04, offsetX: -0.43, offsetY: 0, offsetZ: 0,
    mat: MAT.doorWhite, angle: -88
  });
  // 4. Master Bedroom Door
  createFlatDoor({
    id: 'flat_door_bedroom', name: 'Master Bedroom Door', ru: 'Дверь в спальню', ro: 'Ușă Dormitor',
    pivotX: 6.66, pivotY: 1.05, pivotZ: 4.62, w: 0.04, h: 2.10, d: 0.80, offsetX: 0, offsetY: 0, offsetZ: 0.40,
    mat: MAT.doorWhite, angle: 88
  });
  // 5. WC / Guest Bathroom Door
  createFlatDoor({
    id: 'flat_door_wc', name: 'WC / Shower Door', ru: 'Дверь в санузел', ro: 'Ușă WC / Duș',
    pivotX: 2.00, pivotY: 1.05, pivotZ: 6.00, w: 0.04, h: 2.10, d: 0.75, offsetX: 0, offsetY: 0, offsetZ: 0.375,
    mat: MAT.doorWhite, angle: 85
  });
  // 6. Main Bathroom (Baie) Door
  createFlatDoor({
    id: 'flat_door_baie', name: 'Main Bathroom Door', ru: 'Дверь в ванную', ro: 'Ușă Baie',
    pivotX: 6.66, pivotY: 1.05, pivotZ: 5.75, w: 0.04, h: 2.10, d: 0.75, offsetX: 0, offsetY: 0, offsetZ: 0.375,
    mat: MAT.doorWhite, angle: -85
  });
  // 7. Balcony Glazed Door
  createFlatDoor({
    id: 'flat_door_balcony', name: 'Balcony Glazed Door', ru: 'Дверь на балкон', ro: 'Ușă Balcon',
    pivotX: 7.05, pivotY: 1.05, pivotZ: 1.57, w: 0.75, h: 2.10, d: 0.04, offsetX: 0.375, offsetY: 0, offsetZ: 0,
    mat: MAT.doorWhite, angle: -85
  });
  // 8. Home Office Glass Door (PERETE DIN STICLA)
  createFlatDoor({
    id: 'flat_door_office', name: 'Home Office Glass Door', ru: 'Стеклянная дверь кабинета', ro: 'Ușă Sticlă Birou',
    pivotX: 1.88, pivotY: 1.25, pivotZ: 3.95, w: 0.03, h: 2.50, d: 0.78, offsetX: 0, offsetY: 0, offsetZ: 0.39,
    mat: MAT.glassClear, angle: -85
  });
  // 9. Walk-In Closet Fluted Glass Sliding Door (Garderob)
  createFlatDoor({
    id: 'flat_door_garderob', name: 'Walk-In Closet Sliding Door', ru: 'Раздвижная дверь гардеробной', ro: 'Ușă Glisantă Garderobă',
    pivotX: 8.72, pivotY: 1.275, pivotZ: 5.50, w: 0.70, h: 2.55, d: 0.03, offsetX: 0, offsetY: 0, offsetZ: 0,
    mat: MAT.glassFluted, type: 'slide', delta: [0.65, 0, 0]
  });
  // 10. Antreu Built-In Wardrobe Left & Right Doors
  createFlatDoor({
    id: 'flat_wardrobe_l', name: 'Hallway Wardrobe Left Door', ru: 'Шкаф в прихожей (лев.)', ro: 'Dulap Antreu (stânga)',
    pivotX: 4.30, pivotY: 1.30, pivotZ: 5.12, w: 0.58, h: 2.60, d: 0.02, offsetX: 0.29, offsetY: 0, offsetZ: 0,
    mat: MAT.cashmere, angle: -95
  });
  createFlatDoor({
    id: 'flat_wardrobe_r', name: 'Hallway Wardrobe Right Door', ru: 'Шкаф в прихожей (прав.)', ro: 'Dulap Antreu (dreapta)',
    pivotX: 5.46, pivotY: 1.30, pivotZ: 5.12, w: 0.58, h: 2.60, d: 0.02, offsetX: -0.29, offsetY: 0, offsetZ: 0,
    mat: MAT.cashmere, angle: 95
  });

  // ============================================================================
  // 4. EMBEDDED BAZIS-MEBELSHIK 3D KITCHEN IN ROOM 4 (BUCĂTĂRIE)
  // ============================================================================
  const payload = window.KITCHEN_PAYLOAD;
  const rawBuffer = await decompressGzipBase64(payload.b64);

  // Place kitchenRoot in Room 4 (X=3.70..6.66, Z=0.00..4.52) rotated +90 deg around Y!
  const kitchenWorldRoot = new THREE.Group();
  kitchenWorldRoot.position.set(3.70, 0.0, 4.125);
  kitchenWorldRoot.rotation.y = Math.PI / 2;
  kitchenWorldRoot.scale.set(0.001, 0.001, 0.001);
  scene.add(kitchenWorldRoot);

  const kMatDefs = [
    new THREE.MeshStandardMaterial({ name: '6933 VL 18', color: 0xb5a895, roughness: 0.58, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ name: 'AGT 3019 Sahara Cream', color: 0xcdc2b0, roughness: 0.38, metalness: 0.03 }),
    new THREE.MeshStandardMaterial({ name: 'HPL Lentos/Negru 0581 FH', color: 0x2b2d30, map: stoneTex, roughness: 0.36, metalness: 0.08 }),
    new THREE.MeshStandardMaterial({ name: 'Brown Casella Oak', color: 0xb8733e, map: oakTex, roughness: 0.48, metalness: 0.04 }),
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
    new THREE.MeshStandardMaterial({ name: 'MDF 22MM REZALT', color: 0xbe7942, map: oakTex, roughness: 0.44, metalness: 0.04 }),
    new THREE.MeshStandardMaterial({ name: 'HPL Patina Zinn/Negru', color: 0x222428, roughness: 0.48, metalness: 0.25 }),
    new THREE.MeshStandardMaterial({ name: 'PALMEL ANTRACIT', color: 0x373a40, roughness: 0.55, metalness: 0.05 }),
    new THREE.MeshStandardMaterial({ name: 'Hettich ArciTech Metal', color: 0x555960, roughness: 0.3, metalness: 0.78 }),
    new THREE.MeshStandardMaterial({ name: 'Белый корпус', color: 0xededeb, roughness: 0.5, metalness: 0.02 }),
    new THREE.MeshStandardMaterial({ name: 'QUADRO', color: 0x9aa0a8, roughness: 0.28, metalness: 0.82 }),
  ];

  const groupContainers = {};
  const kitchenFacadeMeshes = [];

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

    kitchenWorldRoot.add(outer);
    groupContainers[spec.id] = inner;
    registerInteractiveItem(spec, outer, []);
  }

  const staticNames = ['static_carcass', 'static_countertop', 'static_appliances', 'static_gola', 'static_plinth', 'static_hardware'];
  for (const sname of staticNames) {
    const g = new THREE.Group();
    g.name = sname;
    kitchenWorldRoot.add(g);
    groupContainers[sname] = g;
  }

  for (const b of payload.batches) {
    const geom = new THREE.BufferGeometry();
    const posArr = new Float32Array(rawBuffer, b.po, b.vc * 3);
    const normInt8 = new Int8Array(rawBuffer, b.no, b.vc * 3);
    const idxArr = b.u32
      ? new Uint32Array(rawBuffer, b.io, b.ic)
      : new Uint16Array(rawBuffer, b.io, b.ic);

    geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normInt8, 3, true));
    geom.setIndex(new THREE.BufferAttribute(idxArr, 1));

    let mat = kMatDefs[b.m] || kMatDefs[0];
    const isInteractive = Boolean(interactiveMap[b.g]);
    if (isInteractive) {
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

    if (isInteractive) {
      interactiveMap[b.g].meshes.push(mesh);
      interactiveMeshes.push(mesh);
      if ([1, 3, 16].includes(b.m)) kitchenFacadeMeshes.push(mesh);
    }

    if (b.vc < 8000 && b.g !== 'static_hardware') {
      const edgesGeo = new THREE.EdgesGeometry(geom, 28);
      const line = new THREE.LineSegments(edgesGeo, edgeMat);
      line.raycast = () => {};
      mesh.add(line);
      edgeLines.push(line);
    }
  }

  // Also add sleek black built-in Fridge inside the Bazis Fridge Niche (X=4.06..4.66, Z=3.88..4.48, Y=0..2.04)
  addBox(scene, 0.58, 2.02, 0.58, 4.35, 1.01, 4.18, MAT.tvScreen);
  // Kitchen Marble Backsplash & Under-Cabinet Warm LED Strip along main kitchen wall (X=3.71, Z=1.40..3.85, Y=0.90..1.50)
  addBox(scene, 0.02, 0.60, 2.45, 3.71, 1.20, 2.62, MAT.floorMarble, false, false);
  addBox(scene, 0.03, 0.02, 2.40, 3.98, 1.49, 2.62, MAT.ledGlow, false, false);
  // Under-mount Kitchen Sink & Black Gooseneck Faucet on the Bazis worktop (at X=4.00, Z=3.62, Y=0.90)
  addBox(scene, 0.42, 0.01, 0.48, 4.00, 0.902, 3.62, MAT.blackMetal);
  addBox(scene, 0.03, 0.32, 0.03, 3.82, 1.06, 3.62, MAT.blackMetal);
  addBox(scene, 0.18, 0.03, 0.03, 3.90, 1.21, 3.62, MAT.blackMetal);

  // ============================================================================
  // 5. FURNITURE & FIXTURES FOR ALL OTHER ROOMS (FROM NEW.PDF & OLD.PDF)
  // ============================================================================
  const furnGroup = new THREE.Group();
  scene.add(furnGroup);

  // --- ROOM 4 (KITCHEN DINING ZONE): Oval Calacatta Marble Dining Table & 4 Chairs ---
  const tableCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.73, 24), MAT.cashmere);
  tableCyl.position.set(5.55, 0.365, 2.55);
  tableCyl.castShadow = true;
  furnGroup.add(tableCyl);
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.03, 32), MAT.floorMarble);
  tableTop.scale.set(1.0, 1.0, 1.28);
  tableTop.position.set(5.55, 0.745, 2.55);
  tableTop.castShadow = true;
  furnGroup.add(tableTop);

  // 4 Upholstered Dining Chairs around Table
  const chairOffsets = [[-0.58, -0.38, 0.6], [-0.58, 0.38, 2.5], [0.58, -0.38, -0.6], [0.58, 0.38, -2.5]];
  for (const [cx, cz, rot] of chairOffsets) {
    const cg = new THREE.Group();
    cg.position.set(5.55 + cx, 0, 2.55 + cz);
    cg.rotation.y = rot;
    addBox(cg, 0.46, 0.06, 0.46, 0, 0.45, 0, MAT.bedFabric);
    addBox(cg, 0.46, 0.34, 0.07, 0, 0.64, -0.20, MAT.bedFabric);
    addBox(cg, 0.04, 0.45, 0.04, -0.19, 0.225, -0.19, MAT.darkWalnut, false);
    addBox(cg, 0.04, 0.45, 0.04,  0.19, 0.225, -0.19, MAT.darkWalnut, false);
    addBox(cg, 0.04, 0.45, 0.04, -0.19, 0.225,  0.19, MAT.darkWalnut, false);
    addBox(cg, 0.04, 0.45, 0.04,  0.19, 0.225,  0.19, MAT.darkWalnut, false);
    furnGroup.add(cg);
  }

  // --- ROOM 3 (LIVING ROOM & HOME OFFICE NICHE) ---
  // Large Ribbed Cream Area Rug
  addBox(furnGroup, 2.45, 0.015, 3.20, 1.55, 0.008, 2.15, MAT.rugCream, false, false);
  // Charcoal L-Shaped Modular Sectional Sofa (X=0.18..1.72, Z=0.55..3.30)
  addBox(furnGroup, 1.02, 0.42, 2.75, 0.69, 0.21, 1.925, MAT.sofaCharcoal); // Main sofa base
  addBox(furnGroup, 0.58, 0.42, 1.15, 1.49, 0.21, 2.725, MAT.sofaCharcoal); // Chaise lounge extension
  addBox(furnGroup, 0.22, 0.78, 2.75, 0.29, 0.39, 1.925, MAT.sofaCharcoal); // Sofa backrest
  addBox(furnGroup, 0.95, 0.62, 0.18, 0.66, 0.31, 0.64, MAT.sofaCharcoal);  // Left armrest
  addBox(furnGroup, 0.95, 0.62, 0.18, 0.66, 0.31, 3.21, MAT.sofaCharcoal);  // Right armrest
  // Rust-Brown Velvet Throw Pillows on Sofa
  addBox(furnGroup, 0.16, 0.38, 0.45, 0.48, 0.56, 1.25, MAT.pillowRust);
  addBox(furnGroup, 0.16, 0.38, 0.45, 0.48, 0.56, 2.55, MAT.pillowRust);

  // Living Room TV Wall (East wall X=3.56): Tall Bookcase + Low 3-Drawer Console + 65" TV + Soundbar
  // Tall 2-Column Open Bookcase (X=3.18..3.55, Z=0.15..1.05, Y=0..2.45)
  addBox(furnGroup, 0.36, 2.45, 0.88, 3.36, 1.225, 0.60, MAT.cashmere);
  for (let sy = 0.45; sy <= 2.1; sy += 0.42) {
    addBox(furnGroup, 0.38, 0.025, 0.86, 3.35, sy, 0.60, MAT.blackMetal);
  }
  // Low White 3-Drawer Media Unit (X=3.14..3.55, Z=1.12..3.12, Y=0..0.42)
  addBox(furnGroup, 0.42, 0.42, 2.00, 3.34, 0.21, 2.12, MAT.whiteMatte);
  // Soundbar & 65" Wall-Mounted OLED TV
  addBox(furnGroup, 0.08, 0.06, 1.10, 3.42, 0.45, 2.12, MAT.blackMetal);
  addBox(furnGroup, 0.04, 0.88, 1.52, 3.53, 1.25, 2.12, MAT.tvScreen);

  // Home Office Study Niche (X=0.09..1.88, Z=3.95..5.68)
  // Dark Walnut Wood Accent Back Wall (Z=5.66)
  addBox(furnGroup, 1.76, 2.68, 0.03, 0.97, 1.34, 5.66, MAT.darkWalnut);
  // White Desk (1800 x 650 mm, H=750 mm)
  addBox(furnGroup, 1.76, 0.04, 0.65, 0.97, 0.74, 5.32, MAT.whiteMatte);
  addBox(furnGroup, 0.04, 0.74, 0.60, 0.14, 0.37, 5.32, MAT.whiteMatte);
  addBox(furnGroup, 0.04, 0.74, 0.60, 1.80, 0.37, 5.32, MAT.whiteMatte);
  // 2 iMac Monitors on Office Desk
  addBox(furnGroup, 0.56, 0.38, 0.03, 0.60, 1.02, 5.45, MAT.tvScreen);
  addBox(furnGroup, 0.14, 0.10, 0.12, 0.60, 0.80, 5.48, MAT.chrome);
  addBox(furnGroup, 0.56, 0.38, 0.03, 1.32, 1.02, 5.45, MAT.tvScreen);
  addBox(furnGroup, 0.14, 0.10, 0.12, 1.32, 0.80, 5.48, MAT.chrome);
  // Overhead Dark Storage Cabinet + Linear LED Bar
  addBox(furnGroup, 1.76, 0.68, 0.38, 0.97, 2.34, 5.47, MAT.sofaCharcoal);
  addBox(furnGroup, 1.40, 0.025, 0.03, 0.97, 1.85, 5.25, MAT.ledGlow);
  // Ergonomic Mesh Office Chair
  addBox(furnGroup, 0.48, 0.06, 0.48, 1.05, 0.48, 4.75, MAT.blackMetal);
  addBox(furnGroup, 0.46, 0.58, 0.05, 1.05, 0.80, 4.53, MAT.blackMetal);
  addBox(furnGroup, 0.06, 0.45, 0.06, 1.05, 0.24, 4.75, MAT.blackMetal);

  // --- ROOM 1 (ANTREU / ENTRANCE HALLWAY & LOUNGE) ---
  // Built-in Wardrobe Carcass + Shoe Bench Niche (X=3.70..5.46, Z=4.58..5.12)
  addBox(furnGroup, 1.16, 2.60, 0.52, 4.88, 1.30, 4.85, MAT.cashmere); // Wardrobe body behind interactive doors
  addBox(furnGroup, 0.60, 0.52, 0.52, 4.00, 2.34, 4.85, MAT.cashmere); // Upper cabinet over shoe bench
  addBox(furnGroup, 0.60, 1.60, 0.03, 4.00, 1.28, 4.60, MAT.darkWalnut); // Wood slat coat panel
  addBox(furnGroup, 0.60, 0.46, 0.50, 4.00, 0.23, 4.85, MAT.darkWalnut); // Shoe bench base
  addBox(furnGroup, 0.60, 0.08, 0.50, 4.00, 0.48, 4.85, MAT.bedFabric);  // Upholstered bench cushion

  // Antreu TV Media Console & Wall-Mounted TV (X=2.07..2.42, Z=5.10..6.00)
  addBox(furnGroup, 0.36, 0.44, 1.25, 2.25, 0.22, 5.45, MAT.cashmere);
  addBox(furnGroup, 0.04, 0.72, 1.15, 2.09, 1.25, 5.45, MAT.tvScreen);

  // 2 Designer Lounge Armchairs in Antreu (Pages 1, 2, 4, 5, 8, 9)
  const loungePositions = [[3.35, 5.35, -2.5], [3.35, 6.20, -2.8]];
  for (const [lx, lz, lrot] of loungePositions) {
    const lg = new THREE.Group();
    lg.position.set(lx, 0, lz);
    lg.rotation.y = lrot;
    addBox(lg, 0.68, 0.14, 0.68, 0, 0.38, 0, MAT.bedFabric); // Seat cushion
    addBox(lg, 0.68, 0.45, 0.14, 0, 0.65, -0.26, MAT.bedFabric); // Back cushion
    addBox(lg, 0.72, 0.35, 0.10, 0, 0.55, -0.34, MAT.darkWalnut); // Outer shell
    addBox(lg, 0.62, 0.36, 0.62, 0, 0.18, 0, MAT.blackMetal, false); // Wire base
    furnGroup.add(lg);
  }

  // Antreu Floating Vanity Console, Full-Height LED Mirror & Pouf (South wall X=5.15..6.35, Z=6.55..6.86)
  addBox(furnGroup, 0.32, 2.45, 0.38, 6.28, 1.225, 6.67, MAT.cashmere); // Narrow tall cabinet with lit shelves
  addBox(furnGroup, 0.88, 2.55, 0.02, 5.65, 1.275, 6.84, MAT.mirror);   // Floor-to-ceiling mirror
  addBox(furnGroup, 0.02, 2.55, 0.03, 5.20, 1.275, 6.83, MAT.ledGlow);  // Left vertical LED strip
  addBox(furnGroup, 0.02, 2.55, 0.03, 6.10, 1.275, 6.83, MAT.ledGlow);  // Right vertical LED strip
  addBox(furnGroup, 0.92, 0.16, 0.36, 5.65, 0.76, 6.68, MAT.darkWalnut); // Floating vanity drawer console
  addBox(furnGroup, 0.56, 0.42, 0.38, 5.65, 0.21, 6.55, MAT.sofaCharcoal); // Grey pouf ottoman

  // --- ROOM 2 (WC / GUEST BATHROOM WITH WALK-IN SHOWER) ---
  // Walk-In Shower Glass Partition (X=0.90, Z=5.75..7.55)
  addBox(furnGroup, 0.02, 2.50, 1.78, 0.90, 1.25, 6.65, MAT.glassClear, true, false);
  addBox(furnGroup, 0.04, 2.50, 0.04, 0.90, 1.25, 6.45, MAT.blackMetal);
  // Bronze Rainfall Showerhead on West wall
  addBox(furnGroup, 0.32, 0.02, 0.32, 0.42, 2.35, 6.35, MAT.copperBronze);
  // Floating Wood Vanity & Rectangular White Basin (North wall of WC: Z=6.00, X=1.42)
  addBox(furnGroup, 0.82, 0.24, 0.46, 1.42, 0.74, 6.02, MAT.darkWalnut);
  addBox(furnGroup, 0.52, 0.05, 0.32, 1.42, 0.87, 6.02, MAT.whiteMatte);
  addBox(furnGroup, 0.82, 0.36, 0.46, 1.42, 0.18, 6.02, MAT.darkWalnut);
  // Pill-Shaped Oval LED Mirror above Vanity
  addBox(furnGroup, 0.54, 1.05, 0.02, 1.42, 1.55, 5.83, MAT.mirror);
  // Wall-Hung White Toilet & Upper Wood Storage Cabinet (South wall of WC: Z=7.25, X=1.42)
  addBox(furnGroup, 0.38, 0.40, 0.52, 1.42, 0.32, 7.22, MAT.whiteMatte);
  addBox(furnGroup, 0.82, 1.15, 0.28, 1.42, 1.95, 7.34, MAT.darkWalnut);

  // --- ROOM 5 (MASTER BEDROOM) & ROOM 8 (WALK-IN CLOSET / GARDEROB) ---
  // Bedroom Area Rug
  addBox(furnGroup, 2.50, 0.015, 2.85, 8.15, 0.008, 3.45, MAT.rugBedroom, false, false);
  // Upholstered King Bed (1800 x 2000 mm, East wall X=9.68, Z=2.45..4.35)
  addBox(furnGroup, 2.10, 0.34, 1.90, 8.62, 0.17, 3.40, MAT.bedFabric); // Bed frame
  addBox(furnGroup, 1.95, 0.24, 1.76, 8.58, 0.44, 3.40, MAT.bedSheet);  // Mattress & duvet
  addBox(furnGroup, 0.14, 1.12, 1.96, 9.61, 0.56, 3.40, MAT.bedFabric); // Headboard
  addBox(furnGroup, 0.32, 0.16, 0.68, 9.32, 0.62, 2.95, MAT.bedFabric); // Pillow L
  addBox(furnGroup, 0.32, 0.16, 0.68, 9.32, 0.62, 3.85, MAT.bedFabric); // Pillow R
  // Decorative Fresco Panel & Cove LED Behind Bed (X=9.68)
  addBox(furnGroup, 0.02, 2.55, 1.85, 9.67, 1.275, 3.40, MAT.frescoWall);
  addBox(furnGroup, 0.04, 0.03, 1.85, 9.64, 2.52, 3.40, MAT.ledGlow);
  // Left Floating Nightstand (Z=2.12)
  addBox(furnGroup, 0.46, 0.42, 0.50, 9.42, 0.25, 2.12, MAT.cashmere);
  // Right Floating Makeup Vanity Desk, Arched Mirror & Cylinder Pouf (Z=4.85)
  addBox(furnGroup, 0.46, 0.14, 1.05, 9.42, 0.74, 4.92, MAT.cashmere);
  addBox(furnGroup, 0.02, 1.25, 0.56, 9.66, 1.50, 4.92, MAT.mirror);
  const poufMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 24), MAT.bedFabric);
  poufMesh.position.set(9.25, 0.21, 4.95);
  furnGroup.add(poufMesh);
  // Opposite Wall: Fluted White Media Console & Wall-Mounted TV (X=6.75, Z=2.50..4.20)
  addBox(furnGroup, 0.38, 0.48, 1.75, 6.94, 0.28, 3.40, MAT.whiteMatte);
  addBox(furnGroup, 0.04, 0.85, 1.48, 6.76, 1.35, 3.40, MAT.tvScreen);

  // Room 8: Walk-In Closet (Garderob, X=8.36..9.78, Z=5.52..7.55)
  addBox(furnGroup, 1.32, 2.55, 0.48, 9.05, 1.275, 7.22, MAT.cashmere); // South closet shelves
  addBox(furnGroup, 0.48, 2.55, 1.45, 9.45, 1.275, 6.30, MAT.cashmere); // East closet shelves

  // --- ROOM 7 (BAIE / MAIN BATHROOM, X=6.66..8.36, Z=5.52..7.55) ---
  // Built-in Bathtub (1700 x 700 mm, along North wall Z=5.58..6.28, X=6.73..8.30)
  addBox(furnGroup, 1.56, 0.56, 0.70, 7.51, 0.28, 5.93, MAT.wallBaieStone);
  addBox(furnGroup, 1.42, 0.06, 0.56, 7.51, 0.55, 5.93, MAT.whiteMatte);
  // Glass Bath Screen & Copper Shower Column
  addBox(furnGroup, 0.72, 1.55, 0.02, 7.92, 1.34, 6.28, MAT.glassClear, true, false);
  addBox(furnGroup, 0.28, 0.02, 0.28, 8.05, 2.25, 5.93, MAT.copperBronze);
  // Floating Wood Vanity, Lower Cabinet, Black-Framed LED Mirror & Tall Towel Column (South wall Z=7.10..7.46)
  addBox(furnGroup, 0.88, 0.24, 0.48, 7.42, 0.74, 7.22, MAT.darkWalnut);
  addBox(furnGroup, 0.56, 0.04, 0.32, 7.42, 0.87, 7.22, MAT.whiteMatte);
  addBox(furnGroup, 0.88, 0.42, 0.48, 7.42, 0.21, 7.22, MAT.darkWalnut);
  addBox(furnGroup, 0.76, 1.18, 0.03, 7.42, 1.58, 7.44, MAT.mirror);
  addBox(furnGroup, 0.38, 2.50, 0.42, 8.08, 1.25, 7.25, MAT.sofaCharcoal); // Tall towel column

  // --- ROOM 6 (BALCONY / LOGGIA, X=6.32..9.78, Z=0.00..1.57) ---
  // Tall & Low Anthracite Storage Cabinets on East End (X=9.15..9.68)
  addBox(furnGroup, 0.48, 2.55, 0.55, 9.42, 1.275, 1.20, MAT.sofaCharcoal);
  addBox(furnGroup, 0.48, 0.85, 0.65, 9.42, 0.425, 0.55, MAT.sofaCharcoal);
  // Potted Olive Plants on West End of Balcony (X=6.65, Z=0.45)
  const pot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.36, 18), MAT.cashmere);
  pot1.position.set(6.68, 0.18, 0.45);
  furnGroup.add(pot1);
  const foliage1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), MAT.plantGreen);
  foliage1.position.set(6.68, 0.68, 0.45);
  furnGroup.add(foliage1);

  // ============================================================================
  // 6. CEILING & MAGNETIC TRACK LIGHTING GROUP (TOGGLEABLE)
  // ============================================================================
  const ceilingGroup = new THREE.Group();
  ceilingGroup.visible = false;
  scene.add(ceilingGroup);

  // Magnetic Track Lights (ȘINA MAGNETICA) in Living, Antreu, Kitchen Chandelier
  addBox(ceilingGroup, 0.05, 0.04, 4.40, 1.85, 2.68, 2.20, MAT.blackMetal);
  addBox(ceilingGroup, 0.04, 0.02, 1.20, 1.85, 2.66, 1.40, MAT.ledGlow);
  addBox(ceilingGroup, 0.04, 0.02, 1.20, 1.85, 2.66, 3.10, MAT.ledGlow);
  addBox(ceilingGroup, 2.80, 0.04, 0.05, 4.20, 2.68, 5.65, MAT.blackMetal);
  addBox(ceilingGroup, 1.10, 0.02, 0.04, 3.80, 2.66, 5.65, MAT.ledGlow);

  // Dining Chandelier (LUSTRA) in Kitchen above Dining Table
  addBox(ceilingGroup, 0.03, 0.65, 0.03, 5.55, 2.35, 2.55, MAT.copperBronze);
  for (const [gx, gz] of [[-0.25, 0], [0.25, 0], [0, -0.25], [0, 0.25], [0, -0.1]]) {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), MAT.ledGlow);
    globe.position.set(5.55 + gx, 2.05 + (gx === 0 && gz === -0.1 ? -0.15 : 0), 2.55 + gz);
    ceilingGroup.add(globe);
  }

  // ============================================================================
  // 7. 3D FLOATING ROOM LABELS (1..8 WITH AREAS IN m²)
  // ============================================================================
  const labelsGroup = new THREE.Group();
  scene.add(labelsGroup);

  function createRoomBadge(title, area, pos) {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 88;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(16, 19, 25, 0.88)';
    ctx.strokeStyle = '#d4a359';
    ctx.lineWidth = 3;
    ctx.roundRect(6, 6, 308, 76, 16);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 160, 38);
    ctx.fillStyle = '#ffd89b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(area, 160, 66);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(...pos);
    sprite.scale.set(1.05, 0.29, 1);
    sprite.renderOrder = 999;
    return sprite;
  }

  const ROOM_BADGES = [
    { key: 'r1', area: '14.15 m²', pos: [4.30, 1.85, 5.75] },
    { key: 'r2', area: '2.62 m²',  pos: [1.10, 1.85, 6.65] },
    { key: 'r3', area: '18.89 m²', pos: [1.75, 1.85, 2.30] },
    { key: 'r4', area: '12.57 m²', pos: [5.15, 2.15, 2.35] },
    { key: 'r5', area: '13.81 m²', pos: [8.20, 1.85, 3.40] },
    { key: 'r6', area: '4.81 m²',  pos: [8.05, 1.85, 0.78] },
    { key: 'r7', area: '3.33 m²',  pos: [7.50, 1.85, 6.50] },
    { key: 'r8', area: '3.02 m²',  pos: [9.08, 1.85, 6.50] },
  ];

  function rebuildRoomBadges() {
    while (labelsGroup.children.length) labelsGroup.remove(labelsGroup.children[0]);
    const dict = I18N[currentLang];
    for (const rb of ROOM_BADGES) {
      labelsGroup.add(createRoomBadge(dict[rb.key], rb.area, rb.pos));
    }
  }
  rebuildRoomBadges();

  // ============================================================================
  // 8. WALL CUTAWAY MODES (HALF / FULL / LOW)
  // ============================================================================
  let wallMode = 'half'; // 'half' (1.15m cutaway), 'full' (2.70m), 'low' (0.35m)
  function applyWallMode(mode) {
    wallMode = mode;
    const scaleY = mode === 'full' ? 1.0 : (mode === 'half' ? 0.42 : 0.14);
    for (const wm of wallMeshes) {
      const fh = wm.userData.fullHeight;
      const yb = wm.userData.yBase;
      if (yb > 0.1) {
        wm.visible = (mode === 'full');
      } else {
        wm.scale.y = scaleY;
        wm.position.y = (fh * scaleY) / 2;
      }
    }
    const dict = I18N[currentLang];
    const btn = document.getElementById('btn-wall-mode');
    if (btn) {
      btn.textContent = mode === 'half' ? dict.wallCutaway : (mode === 'full' ? dict.wallFull : dict.wallLow);
      btn.classList.toggle('active', mode !== 'full');
    }
  }
  applyWallMode('half');

  document.getElementById('btn-wall-mode').addEventListener('click', () => {
    const next = wallMode === 'half' ? 'full' : (wallMode === 'full' ? 'low' : 'half');
    applyWallMode(next);
  });

  // ============================================================================
  // 9. CAMERA PRESETS FOR ALL 8 ROOMS & DOLLHOUSE
  // ============================================================================
  let camAnim = null;
  function flyToCamera(pos, target, duration = 680) {
    const portraitScale = window.innerHeight > window.innerWidth ? 1.24 : 1.0;
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
    overview: { pos: [4.90, 9.20, 12.20], target: [4.90, 0.80, 3.80] },
    top:      { pos: [4.90, 14.20, 3.85], target: [4.90, 0.00, 3.80] },
    kitchen:  { pos: [6.45, 2.35, 3.85],  target: [4.45, 1.05, 1.85] },
    living:   { pos: [0.65, 2.55, 5.45],  target: [2.10, 0.95, 2.15] },
    antreu:   { pos: [5.95, 2.35, 6.65],  target: [3.65, 1.00, 5.35] },
    bedroom:  { pos: [6.95, 2.35, 5.15],  target: [8.65, 0.95, 3.35] },
    garderob: { pos: [8.55, 2.55, 4.85],  target: [9.10, 1.10, 6.65] },
    wc:       { pos: [2.35, 2.65, 6.65],  target: [1.05, 0.95, 6.55] },
    baie:     { pos: [6.55, 2.75, 5.35],  target: [7.55, 0.95, 6.65] },
    balcony:  { pos: [6.15, 2.15, 1.35],  target: [8.45, 1.00, 0.75] }
  };

  flyToCamera(CAM_PRESETS.overview.pos, CAM_PRESETS.overview.target, 1);

  // ============================================================================
  // 10. INTERACTIVE TOGGLE & UI WIRING
  // ============================================================================
  function getSpecTitle(spec) {
    if (currentLang === 'ru') return spec.ru || spec.name;
    if (currentLang === 'ro') return spec.ro || spec.name;
    return spec.name;
  }

  function toggleInteractive(id, forceState = null, showToast = false) {
    const item = interactiveMap[id];
    if (!item) return;
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

    if (showToast && window.innerWidth <= 768) {
      const dict = I18N[currentLang];
      showMobileToast(`${getSpecTitle(item.spec)}: ${nextOpen ? dict.statusOpen : dict.statusClosed}`);
      setHoveredGroup(id);
      setTimeout(() => { if (hoveredGroupId === id) setHoveredGroup(null); }, 650);
    }

    updatePartsUI();
  }

  const partsListEl = document.getElementById('parts-list');
  const categoriesOrder = [
    'flat_door', 'drawer', 'upper_door', 'base_door', 'tall_door', 'peninsula_door', 'sideboard_door', 'left_door'
  ];

  function buildPartsListUI() {
    partsListEl.innerHTML = '';
    for (const catKey of categoriesOrder) {
      const catSpecs = allSpecs.filter(s => {
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
        const row = document.createElement('div');
        row.className = 'part-row';
        row.dataset.partId = spec.id;
        row.innerHTML = `
          <span class="part-name">${getSpecTitle(spec)}</span>
          <span class="part-status"></span>
        `;
        row.addEventListener('click', () => toggleInteractive(spec.id, null, true));
        row.addEventListener('mouseenter', () => { if (!isMobileDevice) setHoveredGroup(spec.id); });
        row.addEventListener('mouseleave', () => { if (!isMobileDevice) setHoveredGroup(null); });
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
    const totalCount = allSpecs.length;

    for (const spec of allSpecs) {
      const item = interactiveMap[spec.id];
      if (item && item.isOpen) openCount++;
      const row = partsListEl.querySelector(`.part-row[data-part-id="${spec.id}"]`);
      if (row && item) {
        row.classList.toggle('open', item.isOpen);
        const st = row.querySelector('.part-status');
        if (st) st.textContent = item.isOpen ? dict.statusOpen : dict.statusClosed;
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
          m.material.emissive.setHex(0xd4a359);
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

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(interactiveMeshes, false);

    if (hits.length > 0) {
      const gid = hits[0].object.userData.groupId;
      setHoveredGroup(gid);
      const item = interactiveMap[gid];
      if (item) {
        const dict = I18N[currentLang];
        renderer.domElement.style.cursor = 'pointer';
        tooltipEl.style.left = `${e.clientX}px`;
        tooltipEl.style.top = `${e.clientY}px`;
        ttTitleEl.textContent = getSpecTitle(item.spec);
        ttSubEl.textContent = item.isOpen ? dict.clickToClose : dict.clickToOpen;
        tooltipEl.classList.add('visible');
        return;
      }
    }

    setHoveredGroup(null);
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
    allSpecs.forEach(s => toggleInteractive(s.id, true));
  });

  document.getElementById('btn-close-all').addEventListener('click', () => {
    allSpecs.forEach(s => toggleInteractive(s.id, false));
  });

  document.getElementById('btn-toggle-flat-doors').addEventListener('click', (e) => {
    const specs = allSpecs.filter(s => s.category === 'flat_door');
    const anyClosed = specs.some(s => !interactiveMap[s.id].isOpen);
    specs.forEach(s => toggleInteractive(s.id, anyClosed));
    e.currentTarget.classList.toggle('active', anyClosed);
  });

  document.getElementById('btn-toggle-kitchen').addEventListener('click', (e) => {
    const specs = allSpecs.filter(s => s.category !== 'flat_door');
    const anyClosed = specs.some(s => !interactiveMap[s.id].isOpen);
    specs.forEach(s => toggleInteractive(s.id, anyClosed));
    e.currentTarget.classList.toggle('active', anyClosed);
  });

  document.getElementById('btn-labels').addEventListener('click', (e) => {
    labelsGroup.visible = !labelsGroup.visible;
    e.currentTarget.classList.toggle('active', labelsGroup.visible);
  });

  document.getElementById('btn-ceiling').addEventListener('click', (e) => {
    ceilingGroup.visible = !ceilingGroup.visible;
    e.currentTarget.classList.toggle('active', ceilingGroup.visible);
  });

  let xrayActive = false;
  document.getElementById('btn-xray').addEventListener('click', (e) => {
    xrayActive = !xrayActive;
    e.currentTarget.classList.toggle('active', xrayActive);
    for (const m of kitchenFacadeMeshes) {
      m.material.transparent = xrayActive;
      m.material.opacity = xrayActive ? 0.28 : 1.0;
      m.material.depthWrite = !xrayActive;
      m.material.needsUpdate = true;
    }
  });

  let edgesVisible = true;
  document.getElementById('btn-edges').addEventListener('click', (e) => {
    edgesVisible = !edgesVisible;
    e.currentTarget.classList.toggle('active', edgesVisible);
    for (const line of edgeLines) line.visible = edgesVisible;
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
      const camKey = btn.dataset.cam;
      const preset = CAM_PRESETS[camKey];
      if (preset) {
        flyToCamera(preset.pos, preset.target);
        document.querySelectorAll('#bottom-bar [data-cam], .room-card[data-cam]').forEach(b => {
          b.classList.toggle('active', b.dataset.cam === camKey);
        });
      }
      if (window.innerWidth <= 768 && !sidePanelEl.classList.contains('collapsed')) {
        setPanelOpen(false);
      }
    });
  });

  function applyLanguage(lang) {
    currentLang = lang;
    const dict = I18N[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });
    applyWallMode(wallMode);
    rebuildRoomBadges();
    buildPartsListUI();
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyLanguage(btn.dataset.lang);
    });
  });

  buildPartsListUI();
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
          if (spec.category === 'flat_door') {
            item.outer.position.x = 8.72 + spec.delta[0] * eased;
          } else {
            item.outer.position.set(
              spec.delta[0] * eased,
              spec.delta[1] * eased,
              spec.delta[2] * eased
            );
          }
        } else if (spec.type === 'rotate') {
          const rad = THREE.MathUtils.degToRad(spec.angle * eased);
          item.outer.rotation.set(
            spec.axis === 'x' ? rad : 0,
            spec.axis === 'y' ? rad : 0,
            spec.axis === 'z' ? rad : 0
          );
        }
      }
    }

    controls.update();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

init().catch(err => {
  console.error(err);
  document.getElementById('loader-title').textContent = 'Error loading 3D apartment';
  document.getElementById('loader-sub').textContent = String(err);
});
</script>
</body>
</html>
"""

final_html = html_template.replace('__PAYLOAD_JSON__', payload_str)
out_path = os.path.join(ROOT_DIR, 'flat', 'index.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(final_html)

pub_flat_path = os.path.join(ROOT_DIR, 'public', 'flat-viewer.html')
with open(pub_flat_path, 'w', encoding='utf-8') as f:
    f.write(final_html)

print(f"Created flat/index.html & public/flat-viewer.html: {os.path.getsize(out_path):,} bytes")
