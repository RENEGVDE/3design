# 05 — Workspace Persistence & State Schema (`IndexedDB` + `localStorage`)

## 1. Why Dual Storage (`IndexedDB` + `localStorage`) Is Used
- Users can upload high-resolution texture photos (woodgrain, marble, MDF finishes) which are normalized onto a `512×512` HTML5 Canvas and compressed as JPEG DataURLs (`~40–90 KB` per texture).
- Standard `localStorage` has a ~5 MB browser limit, whereas `IndexedDB` supports hundreds of megabytes of DataURLs reliably across desktop and mobile browsers.
- `src/utils/storage.js` writes to **both** `IndexedDB` (primary) and `localStorage` (fallback) on every state change, and reads from `IndexedDB` first (falling back to `localStorage` if needed).

---

## 2. Database & Key Identifiers
- **IndexedDB Database Name**: `Bucatarie3DConfiguratorDB_v1`
- **Object Store Name**: `workspace_store`
- **Record Key**: `saved_workspace`
- **localStorage Fallback Key**: `bucatarie_3d_workspace_v1`

---

## 3. Persisted JSON Schema (`version: 1`)

```json
{
  "version": 1,
  "lang": "ro",
  "activeCustomMatId": "custom_tex_1730118000_412",
  "materials": [
    {
      "id": "mat_default_white",
      "name": "Alb (Default)",
      "type": "color",
      "colorHex": "#f4f4f2",
      "dataUrl": null,
      "thumbCss": "#f4f4f2",
      "scale": 1.0,
      "rotate90": false,
      "finishIdx": 0
    },
    {
      "id": "custom_tex_1730118000_412",
      "name": "Stejar Casella",
      "type": "texture",
      "colorHex": "#ffffff",
      "dataUrl": "data:image/jpeg;base64,...",
      "thumbCss": "url(data:image/jpeg;base64,...) center/cover",
      "scale": 1.2,
      "rotate90": false,
      "finishIdx": 1
    }
  ],
  "partAssignments": {
    "door_b4": "custom_tex_1730118000_412",
    "drawer_b13": "mat_default_white"
  },
  "staticZoneAssignments": {
    "countertop": null,
    "carcass": null,
    "vitrine_carcass": "custom_tex_1730118000_412",
    "plinth": null
  },
  "openParts": {
    "drawer_b13": true,
    "door_b4": true
  },
  "lightState": {
    "kelvin": 4000,
    "mainPct": 100,
    "ambientPct": 100,
    "angleDeg": 32,
    "heightM": 4.8,
    "distM": 4.5
  }
}
```

---

## 4. Material Deletion & Reset Rules
1. **Individual Material Deletion (`deleteMaterial(matId)`)**:
   - Any material in `materials` (including `mat_default_white`) can be deleted via its `×` button.
   - Any interactive part (`partAssignments[partId] === matId`) or static zone (`staticZoneAssignments[zone] === matId`) using that deleted material is immediately reverted to **Default White (`#f4f4f2`)** (`assignedMatId = null`), and the updated state is saved to `IndexedDB` + `localStorage`.
2. **Clear All Materials (`handleDeleteAllMaterials`)**:
   - Empties the `materials` array (`[]`), resets all furniture surfaces to Default White (`#f4f4f2`), and persists the empty library.
3. **Reset Furniture to White (`handleResetFurnitureToWhite`)**:
   - Clears `partAssignments` and `staticZoneAssignments` so the entire kitchen returns to Default White (`#f4f4f2`), while keeping all uploaded materials intact in the library for continued use.
