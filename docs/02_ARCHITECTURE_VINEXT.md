# 02 — Modular Vinext Architecture & Developer Guide

## 1. Tech Stack
- **Framework**: [`vinext`](https://www.npmjs.com/package/vinext) (`v1.3.1`) — Next.js App Router API surface running natively on **Vite 8**.
- **UI Library**: **React 19** (`react`, `react-dom`, `@vitejs/plugin-react`, `@vitejs/plugin-rsc`).
- **3D Engine**: **Three.js** (`three@^0.160.0`), using `OrbitControls`, `TransformControls`, and `RoomEnvironment`.
- **Storage**: Browser `IndexedDB` + `localStorage` fallback (`src/utils/storage.js`).
- **Build / Deployment**: Pure Node.js / Vite build (`dist/client`) with `output: 'export'` in `next.config.mjs` deployed directly to Firebase Hosting.

---

## 2. Directory & File Structure

```text
3design/
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Actions pipeline (builds & deploys on push to main)
├── AGENTS.md                        # Root AI context entry point (auto-read by Antigravity/Cursor/Claude)
├── package.json                     # Scripts (dev, build, start, deploy) & dependencies
├── next.config.mjs                  # Next.js configuration (output: 'export' for static distribution)
├── vite.config.js                   # Vite config with plugins: [vinext()]
├── firebase.json                    # Firebase Hosting configuration (pointing to dist/client)
├── .firebaserc                      # Firebase project alias (trysmthwtf)
│
├── docs/                            # Technical architecture & CAD documentation
│   ├── 01_PROJECT_OVERVIEW.md
│   ├── 02_ARCHITECTURE_VINEXT.md
│   ├── 03_3D_KITCHEN_CAD_SPECS.md
│   └── 05_STATE_AND_PERSISTENCE.md
│
├── public/                          # Static assets served at "/"
│   └── data/
│       └── kitchen-payload.json     # Compressed 3D geometry batches & 33 interactive part specs
│
└── src/                             # Modular Vinext Source Code
    ├── app/                         # Next.js / Vinext App Router
    │   ├── layout.jsx               # Root HTML layout & metadata
    │   ├── globals.css              # Complete responsive UI & glassmorphism styles
    │   └── page.jsx                 # "/" route -> renders <KitchenViewer />
    │
    ├── components/                  # Modular React UI & 3D Components
    │   ├── KitchenViewer.jsx        # Main 3D scene orchestrator, raycasting, state, history & render loop
    │   ├── TopBar.jsx               # Header bar, Undo/Redo, language switcher (RO/EN/RU), dims toggle
    │   ├── DimensionToolbar.jsx     # Floating CAD dimension mode selector & live W×H×D / Tape readout
    │   ├── ParametricCabinetSection.jsx # Non-pro parametric furniture builder & CSV cutting list
    │   ├── MaterialStudioSection.jsx# Texture upload, color picker, delete, reset white, grain & zones
    │   ├── GlbImporterSection.jsx   # 3D model uploader, gizmo controls, resizing, mechanisms & painting
    │   ├── LightingStudioSection.jsx# Kelvin tone, intensity, 360° light position & 3D orb helper
    │   ├── InteractivePartsSection.jsx # Categorized list of 33 doors/drawers with dims & 🖌️ paint button
    │   └── CameraPresetsBar.jsx     # Bottom floating camera preset buttons & Auto-Rotate toggle
    │
    ├── i18n/
    │   └── translations.js          # RO / EN / RU translations, CATEGORIES_ORDER, ZONE_BUTTONS
    │
    └── utils/
        ├── storage.js               # IndexedDB + localStorage persistence engine with debounced saves
        ├── textures.js              # Default white material table, texture loader, Kelvin color math
        ├── dimensions3d.js          # 3D CAD dimension lines, sprites, bounding boxes & tape measure
        ├── parametricCabinet.js     # Procedural 18mm board generator, kinematics, GLB & CSV cutting list
        └── glbImporter.js           # GLTF parser, UV generator, follower map, auto-mechanisms, VRAM disposal
```

---

## 3. Automated CI/CD Pipeline
Every commit pushed to the `main` branch triggers `.github/workflows/deploy.yml`:
1. Checks out the code.
2. Sets up Node 20 with npm caching.
3. Installs dependencies using `npm ci --legacy-peer-deps`.
4. Runs `npm run build` to prerender static assets to `dist/client`.
5. Automatically deploys to Firebase Hosting (`site: bucatarie-3d-viewer`, project: `trysmthwtf`) using either the repository secret `FIREBASE_SERVICE_ACCOUNT_TRYSMTHWTF` (or `FIREBASE_SERVICE_ACCOUNT`) or `FIREBASE_TOKEN`.

---

## 4. How to Add New Features in Vinext

### Adding a New Sidebar Control Section
1. Create a new component in `src/components/MyNewSection.jsx`.
2. Add any new UI labels to `src/i18n/translations.js` under `en`, `ru`, and `ro`.
3. Import and render `<MyNewSection />` inside `<aside id="side-panel">` in `src/components/KitchenViewer.jsx`.
4. If the new feature has user state that should survive a page refresh (`F5`), include its state key inside `persistWorkspace()` and the `readPersistedData()` restoration block in `src/components/KitchenViewer.jsx`.

### Commands
```bash
npm run dev      # Local Vite dev server with instant HMR
npm run build    # Compile production bundle to dist/client
npm run deploy   # Compile & deploy to Firebase Hosting
```
