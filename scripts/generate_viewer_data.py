import struct, json, zlib, base64, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('bctr.glb', 'rb') as f:
    magic, version, length = struct.unpack('<4sII', f.read(12))
    chunk_len, chunk_type = struct.unpack('<II', f.read(8))
    gltf = json.loads(f.read(chunk_len).decode('utf-8'))
    bin_len, bin_type = struct.unpack('<II', f.read(8))
    bin_data = f.read(bin_len)

nodes = gltf['nodes']
meshes = gltf['meshes']
accessors = gltf['accessors']
bufferViews = gltf['bufferViews']
materials = gltf['materials']

FIXED_RAIL_NODES = {472, 4144, 7495, 10248, 10264}
OVEN_DOOR_NODES = {159, 161, 163, 165, 167}

INTERACTIVE_SPECS = [
    # Drawers & pull-outs
    {"id": "drawer_b13", "name": "Bottom Deep Drawer (ArciTech)", "ru": "Нижний ящик ArciTech", "ro": "Sertar adânc jos (ArciTech)", "category": "drawer", "roots": [464], "exclude": FIXED_RAIL_NODES, "type": "slide", "delta": [0, 0, 420]},
    {"id": "drawer_b14", "name": "Upper Deep Drawer (ArciTech)", "ru": "Верхний ящик ArciTech", "ro": "Sertar adânc sus (ArciTech)", "category": "drawer", "roots": [4135], "exclude": FIXED_RAIL_NODES, "type": "slide", "delta": [0, 0, 420]},
    {"id": "drawer_b15", "name": "Inner Cutlery Drawer (ArciTech)", "ru": "Внутренний лоток ArciTech", "ro": "Sertar interior tacâmuri (ArciTech)", "category": "drawer", "roots": [7294], "exclude": FIXED_RAIL_NODES, "type": "slide", "delta": [0, 0, 380]},
    {"id": "drawer_b16", "name": "Under-Oven Drawer (Quadro)", "ru": "Ящик под духовкой Quadro", "ro": "Sertar sub cuptor (Quadro)", "category": "drawer", "roots": [10238], "exclude": FIXED_RAIL_NODES, "type": "slide", "delta": [0, 0, 380]},
    {"id": "drawer_b17", "name": "Pantry Column Drawer (Quadro)", "ru": "Ящик пенала Quadro", "ro": "Sertar coloană (Quadro)", "category": "drawer", "roots": [10252], "exclude": FIXED_RAIL_NODES, "type": "slide", "delta": [0, 0, 380]},
    {"id": "cargo_200",  "name": "2-Tier Pull-Out Bottle Rack", "ru": "Бутылочница выкатная 200мм", "ro": "Coș Jolly 2 niveluri (200mm)", "category": "drawer", "roots": [113, 127], "exclude": set(), "type": "slide", "delta": [0, 0, 400]},

    # Appliance Door
    {"id": "oven_door",  "name": "Bosch Oven Door", "ru": "Дверца духовки Bosch", "ro": "Ușă cuptor Bosch", "category": "appliance", "roots": list(OVEN_DOOR_NODES), "exclude": set(), "type": "rotate", "axis": "x", "pivot": [1857.1, 260.2, 580.0], "angle": 78},

    # Upper Wall Cabinet Doors & Flaps
    {"id": "flap_b3_low", "name": "Dish Rack Lower Lift-Flap", "ru": "Нижний фасад сушилки (Aventos)", "ro": "Front inferior picurător (Aventos)", "category": "upper_door", "roots": [429], "exclude": set(), "type": "rotate", "axis": "x", "pivot": [1157.0, 1992.0, 360.0], "angle": -85},
    {"id": "flap_b3_top", "name": "Dish Rack Upper Lift-Flap", "ru": "Верхний фасад сушилки (Aventos)", "ro": "Front superior picurător (Aventos)", "category": "upper_door", "roots": [431], "exclude": set(), "type": "rotate", "axis": "x", "pivot": [1157.0, 2490.0, 360.0], "angle": -85},
    {"id": "door_u_left_corner", "name": "Upper Left Corner Door", "ru": "Верхний угловой фасад (лев.)", "ro": "Ușă superioară colț stânga", "category": "upper_door", "roots": [109], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [20.0, 1995.0, 362.0], "angle": -95},
    {"id": "door_b4", "name": "Upper Left Cabinet Door", "ru": "Верхний левый шкаф", "ro": "Corp superior stânga", "category": "upper_door", "roots": [433], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [266.5, 1995.0, 360.0], "angle": -95},
    {"id": "door_b1", "name": "Range Hood Cabinet Door", "ru": "Шкаф над вытяжкой", "ro": "Corp superior hotă", "category": "upper_door", "roots": [422], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [1558.5, 1995.0, 360.0], "angle": -95},
    {"id": "door_b2", "name": "Upper Right Cabinet Door", "ru": "Верхний правый шкаф", "ro": "Corp superior dreapta", "category": "upper_door", "roots": [425], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [2754.5, 1995.0, 360.0], "angle": 95},

    # Base Cabinet Doors (Main Wall)
    {"id": "door_base_sink", "name": "Under-Sink Cabinet Door", "ru": "Тумба под мойку", "ro": "Ușă mască chiuvetă", "category": "base_door", "roots": [111], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [268.0, 479.0, 580.0], "angle": -95},
    {"id": "door_b5_washer", "name": "Washing Machine Door", "ru": "Фасад стиральной машины", "ro": "Ușă mașină de spălat (450mm)", "category": "base_door", "roots": [436], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [760.0, 479.0, 580.0], "angle": -95},

    # Right Tall Columns Doors
    {"id": "door_col1_bot", "name": "Tall Column 1 Lower Door", "ru": "Пенал 1 — нижняя дверь", "ro": "Coloană 1 — ușă jos", "category": "tall_door", "roots": [439], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [2778.0, 479.0, 601.0], "angle": -95},
    {"id": "door_col1_top", "name": "Tall Column 1 Upper Door", "ru": "Пенал 1 — верхняя дверь (бойлер)", "ro": "Coloană 1 — ușă sus (centrală)", "category": "tall_door", "roots": [264], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [2778.0, 1995.0, 601.0], "angle": -95},
    {"id": "door_col2_bot", "name": "Tall Column 2 Lower Door", "ru": "Пенал 2 — нижняя дверь", "ro": "Coloană 2 — ușă jos", "category": "tall_door", "roots": [262], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [3954.0, 479.0, 601.0], "angle": 95},
    {"id": "door_col2_mid", "name": "Tall Column 2 Middle Door", "ru": "Пенал 2 — средняя дверь", "ro": "Coloană 2 — ușă mijloc", "category": "tall_door", "roots": [105], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [3954.0, 1567.5, 601.0], "angle": 95},
    {"id": "door_col2_top", "name": "Tall Column 2 Top Flap", "ru": "Пенал 2 — антресоль", "ro": "Coloană 2 — suprapozabil", "category": "tall_door", "roots": [266], "exclude": set(), "type": "rotate", "axis": "x", "pivot": [3635.0, 2490.0, 601.0], "angle": -85},

    # Peninsula Cabinet Doors (Facing -X)
    {"id": "door_pen_1", "name": "Peninsula Cabinet Door 1", "ru": "Полуостров — секция 1", "ro": "Peninsulă — ușa 1", "category": "peninsula_door", "roots": [444], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [3407.0, 438.5, 624.0], "angle": -95},
    {"id": "door_pen_2", "name": "Peninsula Cabinet Door 2", "ru": "Полуостров — секция 2", "ro": "Peninsulă — ușa 2", "category": "peninsula_door", "roots": [441], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [3407.0, 438.5, 1636.0], "angle": 95},
    {"id": "door_pen_3", "name": "Peninsula Cabinet Door 3", "ru": "Полуостров — секция 3", "ro": "Peninsulă — ușa 3", "category": "peninsula_door", "roots": [447], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [3407.0, 438.5, 1639.0], "angle": -95},
    {"id": "door_pen_4", "name": "Peninsula Cabinet Door 4", "ru": "Полуостров — секция 4", "ro": "Peninsulă — ușa 4", "category": "peninsula_door", "roots": [450], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [3407.0, 438.5, 2652.0], "angle": 95},

    # Oak Sideboard Cabinet Doors (Facing -Z)
    {"id": "door_oak_bot_l", "name": "Oak Sideboard Lower Left", "ru": "Витрина Дуб — нижняя левая", "ro": "Vitrină Stejar — jos stânga", "category": "sideboard_door", "roots": [296], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [2856.0, 479.0, 2659.0], "angle": 95},
    {"id": "door_oak_bot_r", "name": "Oak Sideboard Lower Right", "ru": "Витрина Дуб — нижняя правая", "ro": "Vitrină Stejar — jos dreapta", "category": "sideboard_door", "roots": [298], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [3830.0, 479.0, 2659.0], "angle": -95},
    {"id": "door_oak_top_l", "name": "Oak Sideboard Upper Left", "ru": "Витрина Дуб — верхняя левая", "ro": "Vitrină Stejar — sus stânga", "category": "sideboard_door", "roots": [300], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [2856.0, 1569.0, 2655.0], "angle": 95},
    {"id": "door_oak_top_r", "name": "Oak Sideboard Upper Right", "ru": "Витрина Дуб — верхняя правая", "ro": "Vitrină Stejar — sus dreapta", "category": "sideboard_door", "roots": [302], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [3830.0, 1569.0, 2655.0], "angle": -95},

    # Left Pantry & Fridge Wall Doors (Facing +X)
    {"id": "door_left_upper", "name": "Left Corner Upper Door", "ru": "Левый угловой шкаф", "ro": "Corp colț stânga sus", "category": "left_door", "roots": [236], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [243.0, 1995.0, 384.0], "angle": 95},
    {"id": "door_left_bot", "name": "Left Pantry Lower Door", "ru": "Левый пенал — нижняя дверь", "ro": "Coloană stânga — ușă jos", "category": "left_door", "roots": [232], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [243.0, 479.0, 977.0], "angle": -95},
    {"id": "door_left_mid", "name": "Left Pantry Middle Door", "ru": "Левый пенал — средняя дверь", "ro": "Coloană stânga — ușă mijloc", "category": "left_door", "roots": [462], "exclude": set(), "type": "rotate", "axis": "y", "pivot": [243.0, 1549.0, 977.0], "angle": -95},
    {"id": "door_left_top", "name": "Left Pantry Top Flap", "ru": "Левый пенал — антресоль", "ro": "Coloană stânga — suprapozabil", "category": "left_door", "roots": [372], "exclude": set(), "type": "rotate", "axis": "z", "pivot": [243.0, 2490.0, 790.0], "angle": 85},
    {"id": "door_fridge_top", "name": "Over-Fridge Cabinet Flap", "ru": "Антресоль над холодильником", "ro": "Corp deasupra frigiderului", "category": "left_door", "roots": [234], "exclude": set(), "type": "rotate", "axis": "z", "pivot": [243.0, 2490.0, 1358.0], "angle": 85},
]

STATIC_GROUPS = [
    ("static_countertop", [61, 93]),
    ("static_appliances", [156, 189, 222, 330, 117, 119, 121, 123, 125]),
    ("static_gola", [240, 270]),
    ("static_plinth", [374, 376, 378, 380, 382]),
    ("static_hardware", list(FIXED_RAIL_NODES)),
]

node_to_group = {}
def mark_subtree(node_idx, group_id, exclude_set=set()):
    if node_idx in exclude_set:
        return
    node_to_group[node_idx] = group_id
    for c in nodes[node_idx].get('children', []):
        mark_subtree(c, group_id, exclude_set)

for s_id, s_roots in STATIC_GROUPS:
    for r in s_roots:
        mark_subtree(r, s_id)

for spec in INTERACTIVE_SPECS:
    for r in spec['roots']:
        mark_subtree(r, spec['id'], spec['exclude'])

def read_f32_vec3(acc_idx):
    acc = accessors[acc_idx]
    bv = bufferViews[acc['bufferView']]
    offset = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    count = acc['count']
    stride = bv.get('byteStride', 12)
    return [struct.unpack_from('<3f', bin_data, offset + i * stride) for i in range(count)]

grouped_geoms = {}
def collect_nodes(node_idx):
    n = nodes[node_idx]
    gid = node_to_group.get(node_idx, 'static_carcass')
    if 'mesh' in n:
        m = meshes[n['mesh']]
        for p in m.get('primitives', []):
            mat_idx = p.get('material', 0)
            pos_list = read_f32_vec3(p['attributes']['POSITION'])
            norm_list = read_f32_vec3(p['attributes']['NORMAL']) if 'NORMAL' in p['attributes'] else [(0.0, 1.0, 0.0)] * len(pos_list)
            key = (gid, mat_idx)
            if key not in grouped_geoms:
                grouped_geoms[key] = {'verts': [], 'vmap': {}, 'indices': []}
            g = grouped_geoms[key]
            vmap = g['vmap']
            verts = g['verts']
            indices = g['indices']
            for (px, py, pz), (nx, ny, nz) in zip(pos_list, norm_list):
                vkey = (round(px, 1), round(py, 1), round(pz, 1), round(nx, 2), round(ny, 2), round(nz, 2))
                idx = vmap.get(vkey)
                if idx is None:
                    idx = len(verts)
                    vmap[vkey] = idx
                    verts.append((px, py, pz, nx, ny, nz))
                indices.append(idx)
    for c in n.get('children', []):
        collect_nodes(c)

collect_nodes(0)

buf = bytearray()
batch_meta = []
for (gid, mat_idx), g in grouped_geoms.items():
    verts = g['verts']
    indices = g['indices']
    vcount = len(verts)
    icount = len(indices)
    pos_bytes = bytearray(vcount * 12)
    norm_bytes = bytearray(vcount * 3)
    for i, (px, py, pz, nx, ny, nz) in enumerate(verts):
        struct.pack_into('<3f', pos_bytes, i * 12, px, py, pz)
        struct.pack_into('<3b', norm_bytes, i * 3,
                         max(-127, min(127, int(round(nx * 127)))),
                         max(-127, min(127, int(round(ny * 127)))),
                         max(-127, min(127, int(round(nz * 127)))))
    use_u32 = vcount > 65535
    idx_bytes = bytearray(icount * (4 if use_u32 else 2))
    fmt = f'<{icount}I' if use_u32 else f'<{icount}H'
    struct.pack_into(fmt, idx_bytes, 0, *indices)
    
    while len(buf) % 4 != 0: buf.append(0)
    pos_off = len(buf); buf.extend(pos_bytes)
    norm_off = len(buf); buf.extend(norm_bytes)
    while len(buf) % 4 != 0: buf.append(0)
    idx_off = len(buf); buf.extend(idx_bytes)
    
    batch_meta.append({
        'g': gid, 'm': mat_idx,
        'vc': vcount, 'ic': icount, 'u32': 1 if use_u32 else 0,
        'po': pos_off, 'no': norm_off, 'io': idx_off
    })

comp_obj = zlib.compressobj(level=9, method=zlib.DEFLATED, wbits=31)
gzipped = comp_obj.compress(bytes(buf)) + comp_obj.flush()
b64 = base64.b64encode(gzipped).decode('ascii')

# Clean interactive specs for JSON
clean_specs = []
for s in INTERACTIVE_SPECS:
    cs = {k: v for k, v in s.items() if k not in ('roots', 'exclude')}
    clean_specs.append(cs)

payload = {
    'materials': [m.get('name', f'Mat_{i}') for i, m in enumerate(materials)],
    'specs': clean_specs,
    'batches': batch_meta,
    'b64': b64
}

with open(r'C:\Users\DCgWs\.gemini\antigravity-cli\brain\fa311998-ad05-4203-849c-1dc0daa5e19d\scratch\viewer_payload.json', 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False)

print(f"Saved viewer_payload.json: {len(batch_meta)} batches, b64 len={len(b64):,} bytes")
