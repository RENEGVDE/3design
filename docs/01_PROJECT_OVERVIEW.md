# 01 — Project Overview & Complete History

## 1. Purpose of the Project
This project provides an interactive 3D CAD visualization and customization platform for a custom L-shaped + Peninsula + Sideboard **Kitchen Furniture Model** (originally designed in Bazis-Mebel `.b3d` and exported to `.obj`/`.mtl` and `.glb`).

## 2. Live Links & Infrastructure
- **GitHub Repository**: `https://github.com/RENEGVDE/3design`
- **Firebase Hosting URL**: `https://bucatarie-3d-viewer.web.app`
  - Firebase Project ID: `trysmthwtf`
  - Hosting target/site: `bucatarie-3d-viewer`
  - Configured via `firebase.json` (`dist/client` static output from Vinext)

## 3. Chronological Feature Evolution
1. **3D Kitchen CAD Conversion (`bctr.b3d` / `bctr.glb` → Three.js)**:
   - Parsed 10,275 glTF nodes and 319,086 vertices from `bctr.glb`.
   - Deduplicated vertices and grouped geometry into 88 `(groupId, materialIndex)` batches stored in `public/data/kitchen-payload.json` (~1.06 MB).
   - Configured all **33 interactive doors, drawers, lift-flaps, and appliance doors** with exact hinge pivots and slide vectors, while keeping fixed internal cabinet rails (`FIXED_RAIL_NODES`) stationary.
2. **Mobile & Touch Optimization**:
   - Added 1-finger orbit, 2-finger pan/pinch zoom, touch tap detection (`pointerdown`/`pointerup` distance threshold), bottom-sheet collapsible control panel on mobile screens (`<= 768px`), and mobile toast notifications.
3. **Interactive CAD Dimensions in `cm`**:
   - Added 3D CAD dimension lines and sprites in centimeters (`cm`).
   - Three modes:
     - **All Sections (`Toate Cotele`)**: Shows overall dimensions (`365.4 cm` width, `267.2 cm` height, `329.8 cm` depth) and section breakdowns.
     - **Selected Part Only (`Doar Piesa Selectată`)**: Highlights the hovered/selected door or drawer with a 3D bounding box and shows its exact `L × Î × A cm` (`W × H × D cm`), updating live as it opens or closes.
     - **2-Point Tape Measure (`Ruletă 2 Puncte`)**: Lets the user click any two 3D points on the furniture to measure the exact distance (`cm`) plus `ΔX`, `ΔY`, `ΔZ` components.
4. **Custom Material Studio (Upload & Per-Unit Assignment)**:
   - Removed all fixed preset palettes so the furniture starts in clean **Default White (`#f4f4f2`)**.
   - Users can upload their own wood/stone/material texture photos (`JPG/PNG`) or add solid colors.
   - Box-projected UV coordinates (`500 mm = 1.0 UV unit`) ensure uploaded textures map seamlessly onto every door, drawer, countertop, and panel.
   - Controls for texture grain scale (`0.3x–3.0x`), vertical/horizontal grain direction (`↕ / ↔`), and surface finish (`Matte`, `Satin / ST40`, `High Gloss`, `Tinted Glass 60%`).
   - Materials can be applied via:
     - **3D Click-to-Paint Mode** (click directly on any 3D door, drawer, countertop, carcass, or plinth),
     - **12 Quick Zone Buttons** (`All Facades`, `Upper Doors`, `Lower Facades`, `Drawers Only`, `Base Doors Only`, `Tall Columns`, `Peninsula`, `Vitrine Upper Doors`, `Casella Vitrine Body`, `Countertop & Backsplash`, `Carcass`, `Plinth`),
     - **Per-Part `🖌️` Button** in the Interactive Parts list.
   - Every material in the library is deletable (`×` button on each card + `🗑️ Șterge Materiale` button), and `🔄 Reset Mobilier la Alb` resets all furniture surfaces to Default White.
5. **Lighting Studio (Point of Illumination, Tone & Intensity)**:
   - Interactive controls for **Light Source Position** (5 quick presets + `360°` horizontal angle slider, `0.8m–6.5m` height slider, `1.5m–7.0m` distance slider, and a toggleable 3D glowing orb + direction ray indicator in the scene).
   - **Light Tone (Kelvin)**: Smooth color temperature curve from `2700K` (Warm) to `4000K` (Neutral) to `6500K` (Cool Daylight).
   - **Light Intensity**: Independent sliders for Main Light Intensity (`0%–250%`) and Ambient Brightness (`10%–200%`).
6. **Full Persistence Across Page Refresh (`F5`)**:
   - Powered by `IndexedDB` (`Bucatarie3DConfiguratorDB_v1`) with `localStorage` (`bucatarie_3d_workspace_v1`) fallback.
   - Automatically saves and restores all uploaded textures, colors, surface assignments, open/closed doors & drawers, lighting settings, and language.
7. **Modular Refactor to 100% Vinext**:
   - Migrated the entire application to **Vinext** (`vinext@1.3.1` — Next.js App Router on Vite 8 + React 19 + Three.js).
   - Clean, unified build pipeline using `output: 'export'` in `next.config.mjs` generating prerendered static assets in `dist/client`.
   - Eliminated all Python builder scripts and standalone HTML file duplications.
8. **3D `.glb` / `.gltf` Model Importer (Placement, Resize & Material Customization)**:
   - Users can upload any `.glb` or `.gltf` 3D model (appliances, chairs, tables, lamps, decor) directly into the 3D scene (`src/utils/glbImporter.js`, `src/components/GlbImporterSection.jsx`).
   - **Auto-Unit & Bottom-Center Normalization**: Automatically detects `mm` / `cm` / `m` scale and shifts the model's pivot to its bottom-center so `Y = 0` sits flush on the floor and `Y = 90 cm` sits flush on the countertop.
   - **Interactive Placement**: Includes a 3D `TransformControls` gizmo (`Move W`, `Rotate E`, `Scale R`), **Click-on-Surface Placement** (click any floor, countertop, or shelf to place the model there), quick snap buttons (`Floor Y=0`, `Countertop Y=90cm`, `±45°`), and `X / Y / Z / RotY` sliders.
   - **Resize in `cm` & Scale**: Uniform scale slider (`0.1x–5.0x`), 3D scale gizmo, and direct `Width (X cm) × Height (Y cm) × Depth (Z cm)` numeric inputs.
   - **Colors & Materials**: Apply any uploaded texture photo or solid color from the Material Studio to the entire `.glb` model or to individual sub-meshes (including via 3D Click-to-Paint mode), pick custom colors per sub-mesh, or restore original `.glb` materials.
   - **Interactive Furniture Mechanisms (Doors, Drawers & Flaps)**:
     - **Smart CAD Auto-Detection**: Automatically analyzes `.glb` node names and 3D bounding-box geometry (`16–24 mm` front slabs, height/width ratios, sibling door pairs) to configure `door_left`, `door_right`, `flap_up` (Aventos), `flap_down`, and `drawer` mechanisms with exact edge-hinge pivots, while automatically linking attached handles, edge-banding strips, and inner drawer boxes (`buildFollowerMap`) so they move together with the facade.
     - **Manual Per-Part Mechanism Selector**: Users can set or change the mechanism of any sub-part (`🔒 Fix`, `🚪 Ușă Stânga 90°`, `🚪 Ușă Dreapta 90°`, `⬆️ Ușă Ridicare Sus / Aventos`, `⬇️ Ușă Rabatabilă Jos`, `🗄️ Sertar +Față`, `🗄️ Sertar -Spate`) and open/close individual parts by clicking directly on them in 3D or via the `🔓/🔒` buttons.
     - **Native `.glb` Animations**: If the `.glb` contains embedded `gltf.animations`, a `THREE.AnimationMixer` plays/reverses them on demand.
9. **Undo & Redo System**:
   - Stack of up to 40 steps covering all material changes, door/drawer operations, light modifications, and imported 3D models.
   - Keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`) and UI buttons in TopBar and Quick Actions.
10. **High-Performance Rendering**:
    - Tooltip decoupled from React state to eliminate hover re-renders.
    - Throttled raycaster on `pointermove` and precalculated bounding spheres on imported meshes.
    - On-demand shadow map updates (`autoUpdate = false`).
11. **Full BAZIS-Mebelshchik (БАЗИС-Мебельщик) Suite Integration**:
    - **Model Structural Tree (Структурное дерево модели)**: Dedicated `🌲 БАЗИС-CAD` tab with a live hierarchical tree of all products, assemblies, panels, and hardware. Supports node inspection, 3D highlights, and individual part visibility toggles (`👁️`).
    - **Exploded Assembly View (Разнесение сборки / Взрыв-схема)**: Interactive `0%–100%` slider that dynamically offsets all panels outward along their normal vectors, revealing internal cabinet joints, shelves, and construction.
    - **3D Fasteners & Drilling Patterns (Крепеж и присадка System 32)**: Toggleable 3D procedural hardware models (Confirmat screws, Minifix Rastex cams, beech wood dowels, shelf support pins, and 35mm hinge cups) positioned according to European System 32 manufacturing standards.
    - **2D Cutting Optimization & Nesting (БАЗИС-Раскрой)**: Multi-sheet 2D guillotine packing engine with master board support ($2800\times 2070$, $2440\times 1830$), kerf width ($4\text{ mm}$), trim margin ($15\text{ mm}$), live calculation of the Material Utilization Coefficient (**К.И.М. %**), scrap area ($m^2$), and total cutting blade distance (m).
    - **2D Workshop Panel Blueprint (Чертёж детали)**: Interactive technical drawing canvas with dimension lines and arrows, color-coded edge banding indicators per edge (ABS 2mm red, ABS 1mm yellow, ABS 0.4mm cyan), hole crosshairs ($\varnothing 5, \varnothing 7, \varnothing 8, \varnothing 15, \varnothing 35$), and standard engineering title block.
    - **CNC Drilling Export (БАЗИС-ЧПУ)**: Drilling operations table with coordinates ($X, Y$), diameter, depth, and face, exportable to CNC CSV / G-code format.
    - **Free Panel CAD Modeler (Создать произвольную деталь)**: Parametric tool for generating custom horizontal, vertical, or frontal panels in mm space with custom edge banding and dimensions.
