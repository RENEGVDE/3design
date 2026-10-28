# 🧠 AI Agent & Developer Context Guide (`3design`)

> **Important for Antigravity IDE / Cursor / Claude / Copilot / Any AI Assistant:**
> Read this file and the `docs/` directory first before making any changes. It contains the complete architectural, 3D CAD, material, lighting, and persistence context of the project.

---

## 1. Quick Summary of the Project
- **Repository**: [https://github.com/RENEGVDE/3design](https://github.com/RENEGVDE/3design)
- **Live Firebase Hosting URL**: [https://bucatarie-3d-viewer.web.app](https://bucatarie-3d-viewer.web.app) (Firebase Project ID: `trysmthwtf`, site: `bucatarie-3d-viewer`)
- **Primary User Language**: Romanian (`ro`), with multi-language UI support in **RO / EN / RU**.
- **Framework**: **Vinext** (`vinext@1.3.1` — Next.js App Router running on **Vite 8** + **React 19** + **Three.js r160**), alongside standalone single-file HTML builds (`index.html` and `flat/index.html`) for instant static/Firebase hosting.

---

## 2. Documentation Index (`docs/`)
All detailed technical knowledge is stored in `docs/`:
1. [`docs/01_PROJECT_OVERVIEW.md`](./docs/01_PROJECT_OVERVIEW.md) — Chronological history of features, user requirements, and design rules.
2. [`docs/02_ARCHITECTURE_VINEXT.md`](./docs/02_ARCHITECTURE_VINEXT.md) — Modular **Vinext** directory structure (`src/app`, `src/components`, `src/utils`, `src/i18n`, `public/data`) and guide for adding new features.
3. [`docs/03_3D_KITCHEN_CAD_SPECS.md`](./docs/03_3D_KITCHEN_CAD_SPECS.md) — Complete 3D CAD geometry specification, coordinate system (`mm` vs `m`), UV mapping, 17 material slots, and all **33 interactive doors & drawers** (IDs, pivots, axes, angles, slide deltas).
4. [`docs/04_APARTMENT_3D_CAD_SPECS.md`](./docs/04_APARTMENT_3D_CAD_SPECS.md) — Full `72.80 m²` Apartment 3D architectural specifications extracted from `flat/new.pdf` and `flat/old.pdf`, including room dimensions and kitchen placement.
5. [`docs/05_STATE_AND_PERSISTENCE.md`](./docs/05_STATE_AND_PERSISTENCE.md) — Exact schema for `IndexedDB` (`Bucatarie3DConfiguratorDB_v1`) and `localStorage` (`bucatarie_3d_workspace_v1`) so all user uploads and changes survive page refresh (`F5`).

---

## 3. Essential Commands

### Development & Build (Vinext + Vite)
```bash
npm install --legacy-peer-deps   # Install dependencies
npm run dev                      # Start Vinext + Vite dev server with HMR
npm run build                    # Build production Vinext bundle (dist/)
npm run start                    # Run production Vinext server
npx vinext check                 # Check Next.js / Vinext compatibility
```

### Rebuilding Standalone Single-File HTML (for Firebase Static Hosting)
If you want to regenerate the standalone `index.html` or `flat/index.html`:
```bash
python scripts/build_html.py       # Generates root index.html from public/data/kitchen-payload.json
python scripts/build_flat_html.py  # Generates flat/index.html and public/flat-viewer.html
firebase deploy --only hosting     # Deploys to https://bucatarie-3d-viewer.web.app
```

---

## 4. Core Design & Product Rules (Must Be Preserved)
1. **No Preset Material Palettes**: The furniture starts in clean **Default White (`#f4f4f2`)**. Do not re-add hardcoded preset themes (`Sahara & Stejar`, `Nordic White`, etc.).
2. **User-Driven Material Studio**: Users upload their own texture photos (`JPG/PNG`) or pick solid colors, adjust texture grain scale (`0.3x–3.0x`), toggle vertical/horizontal grain (`↕ / ↔`), select surface finish (`Matte`, `Satin`, `High Gloss`, `Tinted Glass 60%`), and apply materials either per-zone (12 zones) or per-individual unit (via 3D Click-to-Paint mode or the `🖌️` button on each of the 33 parts).
3. **All Materials Must Be Deletable**: Every material in the library (including `Alb (Default)`) has a `×` delete button, plus a `🗑️ Șterge Materiale` button to clear all materials and a `🔄 Reset Mobilier la Alb` button.
4. **100% Persistence Across Page Refresh (`F5`)**: Every change—uploaded texture photos, added colors, surface assignments, open/closed doors & drawers, lighting position/Kelvin/intensity, and active language—is automatically saved to `IndexedDB` + `localStorage` and restored on page load.
