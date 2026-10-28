# 01 — Project Overview & Complete History

## 1. Purpose of the Project
This project provides an interactive 3D CAD visualization and customization platform for a custom L-shaped + Peninsula + Sideboard **Kitchen Furniture Model** (originally designed in Bazis-Mebel `.b3d` and exported to `.obj`/`.mtl` and `.glb`), as well as a **Full 3D Apartment Viewer** (`72.80 m²` flat from architectural PDF blueprints) with the 3D kitchen integrated inside.

## 2. Live Links & Infrastructure
- **GitHub Repository**: `https://github.com/RENEGVDE/3design`
- **Firebase Hosting URL**: `https://bucatarie-3d-viewer.web.app`
  - Firebase Project ID: `trysmthwtf`
  - Hosting target/site: `bucatarie-3d-viewer`
  - Configured via `firebase.json` and `.firebaserc`

## 3. Chronological Feature Evolution
1. **3D Kitchen CAD Conversion (`bctr.b3d` / `bctr.glb` → Three.js)**:
   - Parsed 10,275 glTF nodes and 319,086 vertices from `bctr.glb`.
   - Deduplicated vertices and grouped geometry into 88 `(groupId, materialIndex)` batches stored in `public/data/kitchen-payload.json` (~1.06 MB).
   - Configured all **33 interactive doors, drawers, lift-flaps, and appliance doors** with exact hinge pivots and slide vectors, while keeping fixed internal cabinet rails (`FIXED_RAIL_NODES`) stationary.
2. **Mobile & Touch Optimization**:
   - Added 1-finger orbit, 2-finger pan/pinch zoom, touch tap detection (`pointerdown`/`pointerup` distance threshold), bottom-sheet collapsible control panel on mobile screens (`<= 768px`), and mobile toast notifications.
3. **Full 3D Apartment Viewer (`/flat` & `flat/index.html`)**:
   - Built from two architectural PDF blueprints (`flat/new.pdf` for furniture/lighting/sanitary/new layout and `flat/old.pdf` for masonry partition dimensions).
   - Includes all 7 rooms (`72.80 m²` total, `272 cm` ceiling height), toggleable wall heights (`Full 272cm`, `Cutaway 135cm`, `Floorplan Only`), toggleable ceiling LED fixtures (`4000K` / `3000K` / `3500K`), interactive apartment doors, and the full interactive 3D kitchen placed in the Open-Space Kitchen + Living room.
4. **Interactive CAD Dimensions in `cm`**:
   - Added 3D CAD dimension lines and sprites in centimeters (`cm`).
   - Three modes:
     - **All Sections (`Toate Cotele`)**: Shows overall dimensions (`365.4 cm` width, `267.2 cm` height, `329.8 cm` depth) and section breakdowns.
     - **Selected Part Only (`Doar Piesa Selectată`)**: Highlights the hovered/selected door or drawer with a 3D bounding box and shows its exact `L × Î × A cm` (`W × H × D cm`), updating live as it opens or closes.
     - **2-Point Tape Measure (`Ruletă 2 Puncte`)**: Lets the user click any two 3D points on the furniture to measure the exact distance (`cm`) plus `ΔX`, `ΔY`, `ΔZ` components.
5. **Custom Material Studio (Upload & Per-Unit Assignment)**:
   - Removed all fixed preset palettes so the furniture starts in clean **Default White (`#f4f4f2`)**.
   - Users can upload their own wood/stone/material texture photos (`JPG/PNG`) or add solid colors.
   - Box-projected UV coordinates (`500 mm = 1.0 UV unit`) ensure uploaded textures map seamlessly onto every door, drawer, countertop, and panel.
   - Controls for texture grain scale (`0.3x–3.0x`), vertical/horizontal grain direction (`↕ / ↔`), and surface finish (`Matte`, `Satin / ST40`, `High Gloss`, `Tinted Glass 60%`).
   - Materials can be applied via:
     - **3D Click-to-Paint Mode** (click directly on any 3D door, drawer, countertop, carcass, or plinth),
     - **12 Quick Zone Buttons** (`All Facades`, `Upper Doors`, `Lower Facades`, `Drawers Only`, `Base Doors Only`, `Tall Columns`, `Peninsula`, `Vitrine Upper Doors`, `Casella Vitrine Body`, `Countertop & Backsplash`, `Carcass`, `Plinth`),
     - **Per-Part `🖌️` Button** in the Interactive Parts list.
   - Every material in the library is deletable (`×` button on each card + `🗑️ Șterge Materiale` button), and `🔄 Reset Mobilier la Alb` resets all furniture surfaces to Default White.
6. **Lighting Studio (Point of Illumination, Tone & Intensity)**:
   - Interactive controls for **Light Source Position** (5 quick presets + `360°` horizontal angle slider, `0.8m–6.5m` height slider, `1.5m–7.0m` distance slider, and a toggleable 3D glowing orb + direction ray indicator in the scene).
   - **Light Tone (Kelvin)**: Smooth color temperature curve from `2700K` (Warm) to `4000K` (Neutral) to `6500K` (Cool Daylight).
   - **Light Intensity**: Independent sliders for Main Light Intensity (`0%–250%`) and Ambient Brightness (`10%–200%`).
7. **Full Persistence Across Page Refresh (`F5`)**:
   - Powered by `IndexedDB` (`Bucatarie3DConfiguratorDB_v1`) with `localStorage` (`bucatarie_3d_workspace_v1`) fallback.
   - Automatically saves and restores all uploaded textures, colors, surface assignments, open/closed doors & drawers, lighting settings, and language.
8. **Modular Refactor to Vinext**:
   - Migrated the codebase to **Vinext** (`vinext@1.3.1` — Next.js App Router on Vite 8 + React 19 + Three.js) so new features can be developed rapidly in clean, modular React components.
