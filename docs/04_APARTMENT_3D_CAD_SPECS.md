# 04 — Full Apartment 3D CAD Specifications (`flat/index.html` & `/flat`)

## 1. Blueprint Sources (`flat/new.pdf` & `flat/old.pdf`)
- **`flat/new.pdf`** (Primary, most current design — 5 pages):
  - Page 1: Title page.
  - Page 2: Plan Mobilare (Furniture layout + Room areas totaling `72.80 m²`).
  - Page 3: Plan Iluminat (Ceiling LED tracks, spots, chandeliers, Kelvin temperatures `4000K`, `3500K`, `3000K`).
  - Page 4: Plan Prize & Întrerupătoare (Electrical sockets & switches with heights).
  - Page 5: Plan Instalații Sanitare (Plumbing fixtures & coordinates).
- **`flat/old.pdf`** (16 pages — supplementary masonry schematics):
  - Pages 2–5 provide exact structural wall thicknesses (`300 mm` exterior, `120 mm` interior partitions), demolition & newly built walls, and ceiling height (`H = 2720 mm`).

---

## 2. Apartment Coordinate System & Room Breakdown
- **Origin `(0, 0, 0)`**: Top-Left (North-West) interior corner of the apartment.
- **`+X` (East)**: Runs left-to-right across the `12.67 m` (`12670 mm`) apartment width.
- **`+Z` (South)**: Runs top-to-bottom across the `6.91 m` (`6910 mm`) apartment depth.
- **`+Y` (Up)**: Floor (`Y = 0`) to ceiling (`Y = 2.72 m`).

| Room # | Room Name (RO / EN) | Area (`new.pdf`) | X Range (`m`) | Z Range (`m`) | Key Features |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | Antreu / Entrance Hallway | `8.50 m²` | `5.86 – 7.45` | `1.54 – 6.22` | Armored entrance door (`Z = 6.22`), mirror, bench, wardrobe |
| **02** | Baie / Main Bathroom | `4.70 m²` | `5.86 – 7.97` | `0.00 – 1.98` | Bathtub `170×75cm`, vanity sink, wall-hung WC, heated towel rail |
| **03** | Dormitor / Master Bedroom | `14.52 m²` | `7.97 – 12.15` | `0.00 – 3.48` | Queen bed `172×214cm`, nightstands, vanity desk, walk-in closet (`1.48×2.12m`) |
| **04** | Camera Copilului / Kids Room | `13.44 m²` | `7.45 – 12.15` | `3.60 – 6.22` | Sofa-bed, study desk by East window, wardrobe, shelving |
| **05** | Bloc Sanitar / Guest WC & Laundry | `2.83 m²` | `4.19 – 5.74` | `4.49 – 6.22` | Walk-in glass shower `90×90cm`, WC, sink, washer/dryer tower |
| **06** | Bucătărie + Living (Open-Space) | `24.80 m²` | `0.00 – 5.74` | `0.00 – 6.22` | **Full 3D Bazis Kitchen** + dining table (`6 chairs`) + L-sofa + TV wall |
| **07** | Balcon / Loggia | `4.00 m²` | `0.00 – 3.00` | `0.00 – 1.35` | Panoramic glazing, lounge armchair, coffee table |

---

## 3. Exact Placement of the 3D Kitchen Inside Room 06
- The 3D Kitchen (`kitchenRoot`) is placed along the West (`X = 0`) and South (`Z = 6.22 m`) walls of the Open-Space Kitchen + Living room:
  - Position: `kitchenRoot.position.set(0.02, 0.0, 6.20)`
  - Rotation: `kitchenRoot.rotation.y = Math.PI / 2` (`+90°` around `Y`), so:
    - The main `365.4 cm` kitchen back wall (`local +X`) runs South-to-North along the West wall (`X = 0.02 m`, from `Z = 6.20 m` to `Z = 2.55 m`).
    - The kitchen depth (`local +Z`) extends East (`+X`) into the room, including the peninsula and glass vitrine sideboard separating the kitchen zone from the living room sofa.
- All 33 interactive kitchen doors and drawers work identically inside the Full Apartment Viewer (`/flat` and `flat/index.html`).
