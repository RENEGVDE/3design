# 03 — 3D Kitchen CAD Specifications & Interactive Parts

## 1. Source CAD Files & Coordinate System
- **Original Files in Repo Root**:
  - `bctr.b3d` (32.4 MB) — Original Bazis-Mebel 3D project file.
  - `bctr.obj` (29.2 MB) & `bctr.mtl` — Wavefront OBJ export.
  - `bctr.glb` (13.1 MB) — Binary glTF 2.0 export (10,275 nodes, 319,086 vertices).
- **Coordinate System**:
  - Raw vertex coordinates in `public/data/kitchen-payload.json` are in **millimeters (`mm`)**.
  - Inside Three.js, `kitchenRoot` has `scale.set(0.001, 0.001, 0.001)` so `1 Three.js world unit = 1 meter`.
  - **Overall Kitchen Bounding Box**:
    - Width (`X` along main back wall): `365.4 cm` (`3654 mm`)
    - Total Height (`Y` floor to top cornice): `267.2 cm` (`2672 mm`)
    - Total Depth (`Z` back wall to front of glass vitrine): `329.8 cm` (`3298 mm`)

---

## 2. Compressed Geometry Payload (`public/data/kitchen-payload.json`)
- Contains **61 geometry batches** (`payload.batches`) and **33 interactive specifications** (`payload.specs`).
- Each batch `b` has:
  - `g`: Group ID (`static_carcass`, `static_countertop`, `static_appliances`, `static_plinth`, `static_hardware`, or one of the 33 interactive part IDs).
  - `m`: Material slot index (`0..16`).
  - `vc`: Vertex count.
  - `p`: Base64-encoded `Int16Array` of vertex positions (`x, y, z` in `mm`, length `vc * 3`).
  - `n`: Base64-encoded `Int8Array` of vertex normals (`nx, ny, nz` scaled by `127`, length `vc * 3`).
  - `i`: Base64-encoded `Uint16Array` (or `Uint32Array` when `b.it === 'uint32'`) of triangle indices.
- **Box-Projected UV Coordinates**:
  - Generated on load so uploaded woodgrain and stone textures map at realistic scale (`500 mm = 1.0 UV unit`, i.e., `coord_mm * 0.002`).

---

## 3. Material Slots (`matDefs[0..16]`)
All customizable furniture surfaces start in clean **Default White (`#f4f4f2`)**:
| Index | Role | Default Appearance | Paintable / Customizable? |
| :--- | :--- | :--- | :--- |
| `0` | Cabinet Carcass (`static_carcass`) | `#f4f4f2` Matte White | Yes (`carcass` zone / 3D Paint) |
| `1` | Main Facades (Doors & Drawers) | `#f4f4f2` Matte White | Yes (Per-part / Zone / 3D Paint) |
| `2` | Countertop & Backsplash (`static_countertop`) | `#f4f4f2` Matte White | Yes (`countertop` zone / 3D Paint) |
| `3` | Secondary / Vitrine Panels | `#f4f4f2` Matte White | Yes (`vitrine_body` / Per-part) |
| `4` | Brushed Stainless Steel | `#bec4cc` Metallic | Hardware / Appliance |
| `5` | Dark Appliance Glass | `#16181d` Gloss | Hardware / Appliance |
| `6` | Bottom Plinth (`static_plinth`) | `#f4f4f2` Matte White | Yes (`plinth` zone / 3D Paint) |
| `7` | Light Panel | `#f4f4f2` Matte White | Yes |
| `8` | Panel Accent | `#f4f4f2` Matte White | Yes |
| `9` | Bosch Oven LED Display | Canvas Texture `12:45 180°C` | Emissive Display |
| `10` | Induction Hob Glass | `#0d0f12` Gloss Black | Appliance |
| `11` | Chrome Faucet | `#d4d8dd` Chrome | Hardware |
| `12` | Dark Hardware / Hinges | `#22252b` | Hardware |
| `13` | Inox Kitchen Sink | `#9fa6b0` Metallic | Hardware |
| `14` | Anodized Aluminum Frame | `#262930` | Hardware |
| `15` | Dark Rubber Gasket | `#1c1e24` | Hardware |
| `16` | Vitrine Glass Doors | `#f4f4f2` Transparent (`0.60`) | Yes (`vitrine_glass` / Per-part) |

---

## 4. Complete Table of the 33 Interactive Parts (`payload.specs`)

> **Coupled Drawer Rule**: `drawer_b15` (Inner Cutlery Drawer) is physically inside `drawer_b14` (Upper Deep Drawer). Opening `drawer_b15` automatically opens `drawer_b14` if closed; closing `drawer_b14` automatically closes `drawer_b15` if open.

| # | ID | Category | Type | Axis / Delta (mm) | Pivot (mm) | Angle | Romanian Name (`ro`) |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `drawer_b13` | `drawer` | `slide` | `[0, 0, 420]` | — | — | Sertar adânc jos (ArciTech) |
| 2 | `drawer_b14` | `drawer` | `slide` | `[0, 0, 420]` | — | — | Sertar adânc sus (ArciTech) |
| 3 | `drawer_b15` | `drawer` | `slide` | `[0, 0, 380]` | — | — | Sertar interior tacâmuri (ArciTech) |
| 4 | `drawer_b16` | `drawer` | `slide` | `[0, 0, 380]` | — | — | Sertar sub cuptor (Quadro) |
| 5 | `drawer_b17` | `drawer` | `slide` | `[0, 0, 380]` | — | — | Sertar coloană (Quadro) |
| 6 | `cargo_200` | `drawer` | `slide` | `[0, 0, 400]` | — | — | Coș Jolly 2 niveluri (200mm) |
| 7 | `oven_door` | `appliance` | `rotate` | `x` | `[1857.1, 260.2, 580.0]` | `78°` | Ușă cuptor Bosch |
| 8 | `flap_b3_low` | `upper_door` | `rotate` | `x` | `[1157.0, 1992.0, 360.0]` | `-85°` | Front inferior picurător (Aventos) |
| 9 | `flap_b3_top` | `upper_door` | `rotate` | `x` | `[1157.0, 2490.0, 360.0]` | `-85°` | Front superior picurător (Aventos) |
| 10 | `door_u_left_corner` | `upper_door` | `rotate` | `y` | `[20.0, 1995.0, 362.0]` | `-95°` | Ușă superioară colț stânga |
| 11 | `door_b4` | `upper_door` | `rotate` | `y` | `[266.5, 1995.0, 360.0]` | `-95°` | Corp superior stânga |
| 12 | `door_b1` | `upper_door` | `rotate` | `y` | `[1558.5, 1995.0, 360.0]` | `-95°` | Corp superior hotă |
| 13 | `door_b2` | `upper_door` | `rotate` | `y` | `[2754.5, 1995.0, 360.0]` | `95°` | Corp superior dreapta |
| 14 | `door_base_sink` | `base_door` | `rotate` | `y` | `[268.0, 479.0, 580.0]` | `-95°` | Ușă mască chiuvetă |
| 15 | `door_b5_washer` | `base_door` | `rotate` | `y` | `[760.0, 479.0, 580.0]` | `-95°` | Ușă mașină de spălat (450mm) |
| 16 | `door_col1_bot` | `tall_door` | `rotate` | `y` | `[2778.0, 479.0, 601.0]` | `-95°` | Coloană 1 — ușă jos |
| 17 | `door_col1_top` | `tall_door` | `rotate` | `y` | `[2778.0, 1995.0, 601.0]` | `-95°` | Coloană 1 — ușă sus (centrală) |
| 18 | `door_col2_bot` | `tall_door` | `rotate` | `y` | `[3954.0, 479.0, 601.0]` | `95°` | Coloană 2 — ușă jos |
| 19 | `door_col2_mid` | `tall_door` | `rotate` | `y` | `[3954.0, 1567.5, 601.0]` | `95°` | Coloană 2 — ușă mijloc |
| 20 | `door_col2_top` | `tall_door` | `rotate` | `x` | `[3635.0, 2490.0, 601.0]` | `-85°` | Coloană 2 — suprapozabil |
| 21 | `door_pen_1` | `peninsula_door` | `rotate` | `y` | `[3407.0, 438.5, 624.0]` | `-95°` | Peninsulă — ușa 1 |
| 22 | `door_pen_2` | `peninsula_door` | `rotate` | `y` | `[3407.0, 438.5, 1636.0]` | `95°` | Peninsulă — ușa 2 |
| 23 | `door_pen_3` | `peninsula_door` | `rotate` | `y` | `[3407.0, 438.5, 1639.0]` | `-95°` | Peninsulă — ușa 3 |
| 24 | `door_pen_4` | `peninsula_door` | `rotate` | `y` | `[3407.0, 438.5, 2652.0]` | `95°` | Peninsulă — ușa 4 |
| 25 | `door_oak_bot_l` | `sideboard_door` | `rotate` | `y` | `[2856.0, 479.0, 2659.0]` | `95°` | Vitrină Stejar — jos stânga |
| 26 | `door_oak_bot_r` | `sideboard_door` | `rotate` | `y` | `[3830.0, 479.0, 2659.0]` | `-95°` | Vitrină Stejar — jos dreapta |
| 27 | `door_oak_top_l` | `sideboard_door` | `rotate` | `y` | `[2856.0, 1569.0, 2655.0]` | `95°` | Vitrină Stejar — sus stânga |
| 28 | `door_oak_top_r` | `sideboard_door` | `rotate` | `y` | `[3830.0, 1569.0, 2655.0]` | `-95°` | Vitrină Stejar — sus dreapta |
| 29 | `door_left_upper` | `left_door` | `rotate` | `y` | `[243.0, 1995.0, 384.0]` | `95°` | Corp colț stânga sus |
| 30 | `door_left_bot` | `left_door` | `rotate` | `y` | `[243.0, 479.0, 977.0]` | `-95°` | Coloană stânga — ușă jos |
| 31 | `door_left_mid` | `left_door` | `rotate` | `y` | `[243.0, 1549.0, 977.0]` | `-95°` | Coloană stânga — ușă mijloc |
| 32 | `door_left_top` | `left_door` | `rotate` | `z` | `[243.0, 2490.0, 790.0]` | `85°` | Coloană stânga — suprapozabil |
| 33 | `door_fridge_top` | `left_door` | `rotate` | `z` | `[243.0, 2490.0, 1358.0]` | `85°` | Corp deasupra frigiderului |
