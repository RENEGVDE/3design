import * as THREE from 'three';

export const UNIVERSAL_FURNITURE_TYPES = [
  {
    id: 'wardrobe_sliding',
    category: 'wardrobe',
    nameRo: '👗 Dressing / Dulap Uși Culisante',
    nameRu: '👗 Шкаф-купе / Гардеробная',
    nameEn: '👗 Sliding Door Wardrobe',
    defaultW: 200,
    defaultH: 240,
    defaultD: 65,
    defaultSections: 2,
    defaultShelves: 3,
    hasRail: true
  },
  {
    id: 'wardrobe_hinged',
    category: 'wardrobe',
    nameRo: '🚪 Dulap Haine Uși Batante',
    nameRu: '🚪 Распашной шкаф для одежды',
    nameEn: '🚪 Hinged Door Wardrobe',
    defaultW: 160,
    defaultH: 220,
    defaultD: 60,
    defaultSections: 2,
    defaultShelves: 2,
    hasRail: true
  },
  {
    id: 'tv_media_unit',
    category: 'living',
    nameRo: '📺 Comodă TV & Consolă Living',
    nameRu: '📺 ТВ-тумба / Консоль для гостиной',
    nameEn: '📺 TV Media Console',
    defaultW: 180,
    defaultH: 50,
    defaultD: 45,
    defaultSections: 3,
    defaultShelves: 1,
    hasRail: false
  },
  {
    id: 'bookcase_shelving',
    category: 'living',
    nameRo: '📚 Bibliotecă & Rafturi Deschise',
    nameRu: '📚 Стеллаж / Книжный шкаф',
    nameEn: '📚 Bookcase & Shelving',
    defaultW: 120,
    defaultH: 200,
    defaultD: 35,
    defaultSections: 3,
    defaultShelves: 4,
    hasRail: false
  },
  {
    id: 'chest_of_drawers',
    category: 'bedroom',
    nameRo: '🗄️ Comodă cu Sertare (Dormitor)',
    nameRu: '🗄️ Комод с выдвижными ящиками',
    nameEn: '🗄️ Chest of Drawers',
    defaultW: 90,
    defaultH: 90,
    defaultD: 48,
    defaultSections: 1,
    defaultShelves: 0,
    hasRail: false
  },
  {
    id: 'nightstand',
    category: 'bedroom',
    nameRo: '🛏️ Noptieră Dormitor',
    nameRu: '🛏️ Прикроватная тумба',
    nameEn: '🛏️ Bedside Nightstand',
    defaultW: 45,
    defaultH: 50,
    defaultD: 40,
    defaultSections: 1,
    defaultShelves: 0,
    hasRail: false
  },
  {
    id: 'office_desk',
    category: 'office',
    nameRo: '💼 Birou de Lucru cu Sertare',
    nameRu: '💼 Письменный / Компьютерный стол',
    nameEn: '💼 Office Workstation Desk',
    defaultW: 140,
    defaultH: 75,
    defaultD: 65,
    defaultSections: 2,
    defaultShelves: 0,
    hasRail: false
  },
  {
    id: 'bathroom_vanity',
    category: 'bathroom',
    nameRo: '🚿 Mobilier Baie Suspendat (Lavoar)',
    nameRu: '🚿 Подвесная тумба для ванной',
    nameEn: '🚿 Floating Bathroom Vanity',
    defaultW: 80,
    defaultH: 55,
    defaultD: 48,
    defaultSections: 2,
    defaultShelves: 0,
    hasRail: false
  },
  {
    id: 'freeform_custom',
    category: 'custom',
    nameRo: '⚙️ Corp Parametric Liber (Custom)',
    nameRu: '⚙️ Свободный параметрический модуль',
    nameEn: '⚙️ Freeform Parametric Cabinet',
    defaultW: 80,
    defaultH: 100,
    defaultD: 50,
    defaultSections: 2,
    defaultShelves: 2,
    hasRail: false
  }
];

function createBoxUVGeometry(wMm, hMm, dMm) {
  const geo = new THREE.BoxGeometry(wMm, hMm, dMm);
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const count = pos.count;
  const uvs = new Float32Array(count * 2);
  const uvScale = 0.002;

  for (let i = 0; i < count; i++) {
    const px = pos.getX(i) * uvScale;
    const py = pos.getY(i) * uvScale;
    const pz = pos.getZ(i) * uvScale;
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));

    if (ny > nx && ny > nz) {
      uvs[i * 2] = px;
      uvs[i * 2 + 1] = pz;
    } else if (nx > nz) {
      uvs[i * 2] = pz;
      uvs[i * 2 + 1] = py;
    } else {
      uvs[i * 2] = px;
      uvs[i * 2 + 1] = py;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeBoundingBox();
  return geo;
}

function createKnobHandle(mat) {
  const g = new THREE.Group();
  g.name = 'Knob';
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 6, 16).rotateX(Math.PI / 2), mat);
  knob.position.set(0, 0, 22);
  g.add(knob);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 20, 12).rotateX(Math.PI / 2), mat);
  stem.position.set(0, 0, 10);
  g.add(stem);
  return g;
}

function createBarHandle(lengthMm, mat) {
  const g = new THREE.Group();
  g.name = 'Handle';
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, lengthMm, 12).rotateZ(Math.PI / 2), mat);
  bar.position.set(0, 0, 24);
  g.add(bar);

  const postL = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 24, 10).rotateX(Math.PI / 2), mat);
  postL.position.set(-(lengthMm - 30) / 2, 0, 12);
  g.add(postL);

  const postR = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 24, 10).rotateX(Math.PI / 2), mat);
  postR.position.set((lengthMm - 30) / 2, 0, 12);
  g.add(postR);
  return g;
}

function getHandleMesh(type = 'bar_black', lengthMm = 160) {
  if (type === 'none') return null;
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x1f2428, roughness: 0.35, metalness: 0.75 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.95 });

  if (type === 'knob_black') return createKnobHandle(blackMat);
  if (type === 'knob_gold') return createKnobHandle(goldMat);
  if (type === 'bar_gold') return createBarHandle(lengthMm, goldMat);
  if (type === 'bar_chrome') return createBarHandle(lengthMm, chromeMat);
  return createBarHandle(lengthMm, blackMat); // default bar_black
}

/**
 * Procedurally generates ANY piece of furniture (wardrobe, TV console, desk, nightstand, etc.)
 * with structural 18mm panels, interactive doors/drawers/sliding doors, and a full engineering cutting list.
 */
export function buildUniversalFurniture(config) {
  const {
    id = `furn_${Date.now()}`,
    name = 'Mobilier Personalizat',
    furnitureTypeId = 'wardrobe_sliding',
    widthCm = 160,
    heightCm = 220,
    depthCm = 60,
    sectionsCount = 2,
    shelvesPerSection = 2,
    mountType = 'floor',
    hasClothesRail = false,
    facadeStyle = 'doors',
    carcassColor = '#f4f4f2',
    facadeColor = '#f4f4f2',
    handleType = 'bar_black',
    legType = 'plinth',
    hasLedGlow = false
  } = config;

  const w = Math.round(widthCm * 10); // mm
  const h = Math.round(heightCm * 10); // mm
  const d = Math.round(depthCm * 10); // mm
  const BOARD_T = 18; // mm

  const isLegs = legType === 'legs_black' || legType === 'legs_gold';
  const isWallHung = legType === 'wall_hung' || mountType === 'floating';
  const plinthH = isWallHung ? 0 : isLegs ? 120 : 80;
  const boxH = h - plinthH;

  const root = new THREE.Group();
  root.name = name;

  const carcassMat = new THREE.MeshStandardMaterial({ color: carcassColor, roughness: 0.42, metalness: 0.02 });
  const facadeMat = new THREE.MeshStandardMaterial({ color: facadeColor, roughness: 0.35, metalness: 0.04 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x22252b, roughness: 0.3, metalness: 0.8 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d8dd, roughness: 0.2, metalness: 0.9 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });

  const panelCuttingList = [];
  const interactiveParts = [];

  const carcassGroup = new THREE.Group(); carcassGroup.name = 'Carcasa_Structura'; root.add(carcassGroup);
  const interiorGroup = new THREE.Group(); interiorGroup.name = 'Interior_Compartimentare'; root.add(interiorGroup);
  const movingPartsGroup = new THREE.Group(); movingPartsGroup.name = 'Fronturi_Mobile'; root.add(movingPartsGroup);

  // 1. CARCASS BOX
  // Laterale
  const leftSide = new THREE.Mesh(createBoxUVGeometry(BOARD_T, boxH, d), carcassMat);
  leftSide.position.set(-w / 2 + BOARD_T / 2, plinthH + boxH / 2, 0);
  carcassGroup.add(leftSide);
  panelCuttingList.push({ cabinet: name, partName: 'Laterală Stânga', lengthMm: boxH, widthMm: d, thicknessMm: 18, qty: 1, material: 'PAL Melaminat 18mm', grain: 'Vertical', edgeBanding: 'Cant ABS 1mm' });

  const rightSide = new THREE.Mesh(createBoxUVGeometry(BOARD_T, boxH, d), carcassMat);
  rightSide.position.set(w / 2 - BOARD_T / 2, plinthH + boxH / 2, 0);
  carcassGroup.add(rightSide);
  panelCuttingList.push({ cabinet: name, partName: 'Laterală Dreapta', lengthMm: boxH, widthMm: d, thicknessMm: 18, qty: 1, material: 'PAL Melaminat 18mm', grain: 'Vertical', edgeBanding: 'Cant ABS 1mm' });

  // Fund & Capac
  const interiorW = w - 2 * BOARD_T;
  const bottom = new THREE.Mesh(createBoxUVGeometry(interiorW, BOARD_T, d), carcassMat);
  bottom.position.set(0, plinthH + BOARD_T / 2, 0);
  carcassGroup.add(bottom);
  panelCuttingList.push({ cabinet: name, partName: 'Fund Bază', lengthMm: interiorW, widthMm: d, thicknessMm: 18, qty: 1, material: 'PAL Melaminat 18mm', grain: 'Orizontal', edgeBanding: 'Cant ABS 1mm' });

  const top = new THREE.Mesh(createBoxUVGeometry(interiorW, BOARD_T, d), carcassMat);
  top.position.set(0, plinthH + boxH - BOARD_T / 2, 0);
  carcassGroup.add(top);
  panelCuttingList.push({ cabinet: name, partName: 'Capac Superior', lengthMm: interiorW, widthMm: d, thicknessMm: 18, qty: 1, material: 'PAL Melaminat 18mm', grain: 'Orizontal', edgeBanding: 'Cant ABS 1mm' });

  // Spate HDF 4mm
  const backHDF = new THREE.Mesh(createBoxUVGeometry(w - 12, boxH - 12, 4), backMat);
  backHDF.position.set(0, plinthH + boxH / 2, -d / 2 + 10);
  carcassGroup.add(backHDF);
  panelCuttingList.push({ cabinet: name, partName: 'Spate PFL / HDF', lengthMm: boxH - 12, widthMm: w - 12, thicknessMm: 4, qty: 1, material: 'HDF Alb 4mm', grain: 'Vertical', edgeBanding: 'Fără cant' });

  // Soclu Plintă sau Picioare Decorative
  if (!isWallHung) {
    if (isLegs) {
      const legColor = legType === 'legs_gold' ? 0xd4af37 : 0x1f2428;
      const legMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.3, metalness: 0.85 });
      const legPositions = [
        [-w / 2 + 50, plinthH / 2, -d / 2 + 50],
        [w / 2 - 50, plinthH / 2, -d / 2 + 50],
        [-w / 2 + 50, plinthH / 2, d / 2 - 50],
        [w / 2 - 50, plinthH / 2, d / 2 - 50]
      ];
      if (w > 1600) {
        legPositions.push([0, plinthH / 2, -d / 2 + 50]);
        legPositions.push([0, plinthH / 2, d / 2 - 50]);
      }
      legPositions.forEach((pos, idx) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(14, 8, plinthH, 16), legMat);
        leg.position.set(pos[0], pos[1], pos[2]);
        leg.name = 'Picior_Metal_' + (idx + 1);
        carcassGroup.add(leg);
      });
      panelCuttingList.push({ cabinet: name, partName: 'Picioare Metalice Design (' + legPositions.length + ' buc)', lengthMm: plinthH, widthMm: 28, thicknessMm: 28, qty: legPositions.length, material: legType === 'legs_gold' ? 'Metal Auriu Periat' : 'Metal Negru Mat', grain: 'Vertical', edgeBanding: 'Feronerie' });
    } else {
      const plinth = new THREE.Mesh(createBoxUVGeometry(w, plinthH, BOARD_T), carcassMat);
      plinth.position.set(0, plinthH / 2, d / 2 - 30);
      carcassGroup.add(plinth);
      panelCuttingList.push({ cabinet: name, partName: 'Soclu / Plintă', lengthMm: w, widthMm: plinthH, thicknessMm: 18, qty: 1, material: 'PAL Melaminat 18mm', grain: 'Lungime', edgeBanding: 'Cant ABS 1mm' });
    }
  }

  // LED Glow Ambient Strip
  if (hasLedGlow) {
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xfffae0,
      emissive: 0xffe082,
      emissiveIntensity: 1.6,
      roughness: 0.2
    });
    const ledStrip = new THREE.Mesh(createBoxUVGeometry(w - 20, 6, 14), ledMat);
    ledStrip.position.set(0, plinthH + 3, d / 2 - 18);
    ledStrip.name = 'Banda_LED_Ambient';
    interiorGroup.add(ledStrip);
  }

  // 2. VERTICAL DIVIDERS (Despărțituri / Montanți)
  const numDiv = Math.max(0, sectionsCount - 1);
  const sectionW = (interiorW - numDiv * BOARD_T) / sectionsCount;
  const interiorH = boxH - 2 * BOARD_T;

  for (let i = 1; i <= numDiv; i++) {
    const divX = -interiorW / 2 + i * (sectionW + BOARD_T) - BOARD_T / 2;
    const divider = new THREE.Mesh(createBoxUVGeometry(BOARD_T, interiorH, d - 20), carcassMat);
    divider.position.set(divX, plinthH + BOARD_T + interiorH / 2, -10);
    interiorGroup.add(divider);
    panelCuttingList.push({ cabinet: name, partName: `Montant Vertical ${i}`, lengthMm: interiorH, widthMm: d - 20, thicknessMm: 18, qty: 1, material: 'PAL Melaminat 18mm', grain: 'Vertical', edgeBanding: 'Cant ABS 1mm' });
  }

  // 3. SHELVES & CLOTHES RAILS PER SECTION
  for (let s = 0; s < sectionsCount; s++) {
    const secCenterX = -interiorW / 2 + s * (sectionW + BOARD_T) + sectionW / 2;

    // Clothes rail in section 0 or 1 if enabled
    const useRailHere = hasClothesRail && (s === 0 || sectionsCount === 1);
    if (useRailHere) {
      // Top shelf above rail
      const shelfTop = new THREE.Mesh(createBoxUVGeometry(sectionW - 2, BOARD_T, d - 40), carcassMat);
      shelfTop.position.set(secCenterX, plinthH + boxH - 350, -10);
      interiorGroup.add(shelfTop);
      panelCuttingList.push({ cabinet: name, partName: `Poliță Pălării Secțiunea ${s + 1}`, lengthMm: sectionW - 2, widthMm: d - 40, thicknessMm: 18, qty: 1, material: 'PAL Melaminat 18mm', grain: 'Orizontal', edgeBanding: 'Cant ABS 1mm' });

      // Chrome hanging rail
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, sectionW - 10, 16).rotateZ(Math.PI / 2), chromeMat);
      rail.position.set(secCenterX, plinthH + boxH - 420, 0);
      interiorGroup.add(rail);
    } else if (shelvesPerSection > 0) {
      const spacing = interiorH / (shelvesPerSection + 1);
      for (let sh = 1; sh <= shelvesPerSection; sh++) {
        const shelf = new THREE.Mesh(createBoxUVGeometry(sectionW - 2, BOARD_T, d - 30), carcassMat);
        shelf.position.set(secCenterX, plinthH + BOARD_T + sh * spacing, -10);
        interiorGroup.add(shelf);
        panelCuttingList.push({ cabinet: name, partName: `Poliță Secțiunea ${s + 1} (#${sh})`, lengthMm: sectionW - 2, widthMm: d - 30, thicknessMm: 18, qty: 1, material: 'PAL Melaminat 18mm', grain: 'Orizontal', edgeBanding: 'Cant ABS 1mm' });
      }
    }
  }

  // 4. FACADES & DOORS / SLIDING / DRAWERS
  const facadeZ = d / 2 + BOARD_T / 2;

  if (facadeStyle === 'sliding' || furnitureTypeId === 'wardrobe_sliding') {
    // Sliding Doors (Uși Culisante / Glisante)
    const doorCount = Math.max(2, sectionsCount);
    const overlap = 30; // 30mm overlap
    const slidingDoorW = (w + (doorCount - 1) * overlap) / doorCount;
    const slidingDoorH = boxH - 10;

    for (let dIdx = 0; dIdx < doorCount; dIdx++) {
      const doorPivot = new THREE.Group();
      doorPivot.name = `Usa_Glisanta_${dIdx + 1}`;
      const trackOffsetZ = dIdx % 2 === 0 ? facadeZ : facadeZ + 25;
      const startX = -w / 2 + slidingDoorW / 2 + dIdx * (slidingDoorW - overlap);

      doorPivot.position.set(startX, plinthH + slidingDoorH / 2, trackOffsetZ);

      // Aluminum profile frame + center panel
      const doorPanel = new THREE.Mesh(createBoxUVGeometry(slidingDoorW - 4, slidingDoorH - 4, BOARD_T), facadeMat);
      doorPanel.name = `Panou_Usa_Glisanta_${dIdx + 1}`;
      doorPivot.add(doorPanel);

      // Vertical handle profile
      const profL = new THREE.Mesh(createBoxUVGeometry(12, slidingDoorH, 24), metalMat);
      profL.position.set(-slidingDoorW / 2 + 6, 0, 0);
      doorPivot.add(profL);
      const profR = new THREE.Mesh(createBoxUVGeometry(12, slidingDoorH, 24), metalMat);
      profR.position.set(slidingDoorW / 2 - 6, 0, 0);
      doorPivot.add(profR);

      // Sliding Kinematics: slides along X
      doorPivot.userData.mechType = 'drawer'; // Uses slide delta
      doorPivot.userData.slideDelta = [dIdx % 2 === 0 ? slidingDoorW * 0.8 : -slidingDoorW * 0.8, 0, 0];
      doorPivot.userData.isOpen = false;
      doorPivot.userData.progress = 0;

      movingPartsGroup.add(doorPivot);
      interactiveParts.push(doorPivot);
      panelCuttingList.push({ cabinet: name, partName: `Ușă Culisantă ${dIdx + 1}`, lengthMm: slidingDoorH - 4, widthMm: slidingDoorW - 4, thicknessMm: 18, qty: 1, material: 'PAL / MDF / Oglindă', grain: 'Vertical', edgeBanding: 'Profil Aluminiu Mâner' });
    }
  } else if (facadeStyle === 'drawers' || furnitureTypeId === 'chest_of_drawers' || furnitureTypeId === 'nightstand') {
    // Chest of Drawers (Comodă cu sertare)
    const numDrawers = furnitureTypeId === 'nightstand' ? 2 : 4;
    const dH = (boxH - (numDrawers + 1) * 3) / numDrawers;
    let curY = plinthH + boxH - 2;

    for (let dr = 0; dr < numDrawers; dr++) {
      const drawerPivot = new THREE.Group();
      drawerPivot.name = `Sertar_${dr + 1}`;
      curY -= dH / 2;
      drawerPivot.position.set(0, curY, facadeZ);
      curY -= dH / 2 + 3;

      const front = new THREE.Mesh(createBoxUVGeometry(interiorW + 2 * BOARD_T - 4, dH - 3, BOARD_T), facadeMat);
      front.name = `Front_Sertar_${dr + 1}`;
      drawerPivot.add(front);

      // Inner Drawer Box
      const boxW = interiorW - 30;
      const boxD = d - 60;
      const boxH = Math.max(60, dH - 35);
      const sideL = new THREE.Mesh(createBoxUVGeometry(16, boxH, boxD), carcassMat);
      sideL.position.set(-boxW / 2 + 8, 0, -boxD / 2 - 9);
      drawerPivot.add(sideL);

      const sideR = new THREE.Mesh(createBoxUVGeometry(16, boxH, boxD), carcassMat);
      sideR.position.set(boxW / 2 - 8, 0, -boxD / 2 - 9);
      drawerPivot.add(sideR);

      const handle = getHandleMesh(handleType, 160);
      if (handle) {
        handle.position.set(0, 0, BOARD_T / 2);
        drawerPivot.add(handle);
      }

      drawerPivot.userData.mechType = 'drawer';
      drawerPivot.userData.slideDelta = [0, 0, Math.min(420, d - 80)];
      drawerPivot.userData.isOpen = false;
      drawerPivot.userData.progress = 0;

      movingPartsGroup.add(drawerPivot);
      interactiveParts.push(drawerPivot);
      panelCuttingList.push({ cabinet: name, partName: `Front Sertar ${dr + 1}`, lengthMm: dH - 3, widthMm: interiorW + 2 * BOARD_T - 4, thicknessMm: 18, qty: 1, material: 'MDF Vopsit / Înfoliat 18mm', grain: 'Orizontal', edgeBanding: 'Cant ABS 2mm' });
    }
  } else if (facadeStyle === 'doors' || furnitureTypeId === 'wardrobe_hinged' || furnitureTypeId === 'tv_media_unit' || furnitureTypeId === 'bathroom_vanity') {
    // Hinged Doors (Uși Batante pe Balamale)
    for (let s = 0; s < sectionsCount; s++) {
      const secCenterX = -interiorW / 2 + s * (sectionW + BOARD_T) + sectionW / 2;
      const doorW = sectionW + (s === 0 || s === sectionsCount - 1 ? BOARD_T : 0) - 4;
      const doorH = boxH - 4;

      const hingeSide = s % 2 === 0 ? 'left' : 'right';
      const doorPivot = new THREE.Group();
      doorPivot.name = `Usa_${s + 1}`;
      const hingeX = hingeSide === 'left' ? secCenterX - doorW / 2 : secCenterX + doorW / 2;
      doorPivot.position.set(hingeX, plinthH + boxH / 2, facadeZ);

      const doorMesh = new THREE.Mesh(createBoxUVGeometry(doorW, doorH, BOARD_T), facadeMat);
      doorMesh.name = `Front_Usa_${s + 1}`;
      doorMesh.position.set(hingeSide === 'left' ? doorW / 2 : -doorW / 2, 0, 0);
      doorPivot.add(doorMesh);

      const handle = getHandleMesh(handleType, 160);
      if (handle) {
        handle.position.set(hingeSide === 'left' ? doorW - 35 : -doorW + 35, 0, BOARD_T / 2);
        doorPivot.add(handle);
      }

      doorPivot.userData.mechType = hingeSide === 'left' ? 'door_left' : 'door_right';
      doorPivot.userData.maxAngle = hingeSide === 'left' ? 95 : -95;
      doorPivot.userData.isOpen = false;
      doorPivot.userData.progress = 0;

      movingPartsGroup.add(doorPivot);
      interactiveParts.push(doorPivot);
      panelCuttingList.push({ cabinet: name, partName: `Ușă Batantă Secțiunea ${s + 1}`, lengthMm: doorH, widthMm: doorW, thicknessMm: 18, qty: 1, material: 'MDF Vopsit / Înfoliat 18mm', grain: 'Vertical', edgeBanding: 'Cant ABS 2mm' });
    }
  }

  // Convert to Three.js meter scale (0.001)
  root.scale.set(0.001, 0.001, 0.001);

  return {
    root,
    panelCuttingList,
    interactiveParts,
    dimensionsCm: {
      widthCm: Math.round(w / 10),
      heightCm: Math.round(h / 10),
      depthCm: Math.round(d / 10)
    }
  };
}

