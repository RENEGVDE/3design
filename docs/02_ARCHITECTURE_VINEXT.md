# 02 — Modular Vinext Architecture & Developer Guide

## 1. Tech Stack
- **Framework**: [`vinext`](https://www.npmjs.com/package/vinext) (`v1.3.1`) — Next.js App Router API surface running natively on **Vite 8**.
- **UI Library**: **React 19** (`react`, `react-dom`, `@vitejs/plugin-react`, `@vitejs/plugin-rsc`).
- **3D Engine**: **Three.js** (`three@^0.160.0`), using `OrbitControls` and `RoomEnvironment`.
- **Storage**: Browser `IndexedDB` + `localStorage` fallback (`src/utils/storage.js`).

---

## 2. Directory & File Structure

```text
3design/
├── AGENTS.md                        # Root AI context entry point (auto-read by Antigravity/Cursor/Claude)
├── package.json                     # Vinext scripts (dev, build, start) & dependencies
├── vite.config.js                   # Vite config with plugins: [vinext()]
├── firebase.json                    # Firebase Hosting configuration
├── .firebaserc                      # Firebase project alias (trysmthwtf)
│
├── docs/                            # Comprehensive project & CAD documentation
│   ├── 01_PROJECT_OVERVIEW.md
│   ├── 02_ARCHITECTURE_VINEXT.md
│   ├── 03_3D_KITCHEN_CAD_SPECS.md
│   ├── 04_APARTMENT_3D_CAD_SPECS.md
│   └── 05_STATE_AND_PERSISTENCE.md
│
├── public/                          # Static assets served at "/"
│   ├── data/
│   │   └── kitchen-payload.json     # Compressed 3D geometry batches & 33 interactive part specs
│   └── flat-viewer.html             # Full 3D Apartment viewer served inside /flat route
│
├── src/                             # Modular Vinext Source Code
│   ├── app/                         # Next.js / Vinext App Router
│   │   ├── layout.jsx               # Root HTML layout & metadata
│   │   ├── globals.css              # Complete responsive UI & glassmorphism styles
│   │   ├── page.jsx                 # "/" route -> renders <KitchenViewer />
│   │   └── flat/
│   │       └── page.jsx             # "/flat" route -> Full 3D Apartment Viewer with back link
│   │
│   ├── components/                  # Modular React UI & 3D Components
│   │   ├── KitchenViewer.jsx        # Main 3D scene orchestrator, raycasting, state & animation loop
│   │   ├── TopBar.jsx               # Header bar, language switcher (RO/EN/RU), /flat link, dims toggle
│   │   ├── DimensionToolbar.jsx     # Floating CAD dimension mode selector & live W×H×D / Tape readout
│   │   ├── MaterialStudioSection.jsx# Texture upload, color picker, delete, reset white, grain & zones
│   │   ├── LightingStudioSection.jsx# Kelvin tone, intensity, 360° light position & 3D orb helper
│   │   ├── InteractivePartsSection.jsx # Categorized list of 33 doors/drawers with dims & 🖌️ paint button
│   │   └── CameraPresetsBar.jsx     # Bottom floating camera preset buttons & Auto-Rotate toggle
│   │
│   ├── i18n/
│   │   └── translations.js          # RO / EN / RU translations, CATEGORIES_ORDER, ZONE_BUTTONS
│   │
│   └── utils/
│       ├── storage.js               # IndexedDB + localStorage persistence engine
│       ├── textures.js              # Default white material table, texture loader, Kelvin color math
│       └── dimensions3d.js          # 3D CAD dimension lines, sprites, bounding boxes & tape measure
│
└── scripts/                         # Python CAD extraction & standalone HTML builders
    ├── generate_viewer_data.py      # Extracts 3D batches & specs from bctr.glb
    ├── build_html.py                # Rebuilds standalone single-file index.html
    ├── build_flat_html.py           # Rebuilds standalone flat/index.html & public/flat-viewer.html
    └── facades_and_blocks.txt       # Original Bazis-Mebel block hierarchy dump
```

---

## 3. How to Add New Features in Vinext

### Adding a New Sidebar Control Section
1. Create a new component in `src/components/MyNewSection.jsx`.
2. Add any new UI labels to `src/i18n/translations.js` under `en`, `ru`, and `ro`.
3. Import and render `<MyNewSection />` inside `<aside id="side-panel">` in `src/components/KitchenViewer.jsx`.
4. If the new feature has user state that should survive a page refresh (`F5`), include its state key inside `persistWorkspace()` and the `readPersistedData()` restoration block in `src/components/KitchenViewer.jsx`.

### Adding a New Page / Route
- Create `src/app/<route-name>/page.jsx` — Vinext automatically routes `/<route-name>` using file-system routing with full Vite HMR.
