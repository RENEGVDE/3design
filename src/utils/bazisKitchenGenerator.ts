import * as THREE from 'three';

export const BOARD_THICKNESS = 18; // 18mm standard PAL / MDF
export const BACK_THICKNESS = 4;   // 4mm HDF back panel
export const COUNTERTOP_THICKNESS = 38; // 38mm standard kitchen worktop
export const COUNTERTOP_OVERHANG = 25;  // 25mm front overhang
export const PLINTH_HEIGHT_DEFAULT = 100; // 100mm plinth
export const BASE_CARCASS_HEIGHT = 720;   // 720mm standard European base carcass
export const UPPER_CARCASS_HEIGHT = 720;  // 720mm standard upper carcass
export const SPLASHBACK_CLEARANCE = 550;  // 550mm standard backsplash height
export const BASE_DEPTH = 560;           // 560mm carcass depth (600mm with countertop)
export const UPPER_DEPTH = 320;          // 320mm upper carcass depth

export const KITCHEN_LAYOUT_TYPES = [
  {
    id: 'l_peninsula',
    nameRo: 'L-Formă + Peninsulă (Model Complet)',
    nameRu: 'Угловая + Полуостров (Полная модель)',
    nameEn: 'L-Shape + Peninsula (Complete)',
    hasReturnWall: true,
    hasPeninsula: true
  },
  {
    id: 'l_corner',
    nameRo: 'Bucătărie pe Colț (L-Formă)',
    nameRu: 'Угловая кухня (L-образная)',
    nameEn: 'L-Shape Corner Kitchen',
    hasReturnWall: true,
    hasPeninsula: false
  },
  {
    id: 'linear',
    nameRo: 'Bucătărie Liniară (Dreaptă)',
    nameRu: 'Прямая линейная кухня',
    nameEn: 'Straight Linear Kitchen',
    hasReturnWall: false,
    hasPeninsula: false
  },
  {
    id: 'u_shape',
    nameRo: 'Bucătărie în Formă de U',
    nameRu: 'П-образная кухня',
    nameEn: 'U-Shaped Kitchen',
    hasReturnWall: true,
    hasPeninsula: true
  }
];

function createBoxUVGeometry(wMm, hMm, dMm) {
  const geo = new THREE.BoxGeometry(wMm, hMm, dMm);
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const count = pos.count;
  const uvs = new Float32Array(count * 2);
  const uvScale = 0.002; // 500mm = 1.0 UV

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

/**
 * Builds a complete Bazis-Mebel kitchen layout structure with all modules,
 * continuous countertop, plinths, and interactive doors & drawers.
 */
export function buildBazisKitchenComposition(config) {
  const {
    layoutType = 'l_peninsula',
    mainWallWidthCm = 360,
    returnWallDepthCm = 240,
    peninsulaLengthCm = 200,
    roomHeightCm = 265,
    carcassColor = '#f4f4f2',
    facadeColor = '#f4f4f2',
    countertopColor = '#f4f4f2',
    plinthColor = '#f4f4f2'
  } = config;

  const mainW = mainWallWidthCm * 10; // mm
  const returnD = returnWallDepthCm * 10; // mm
  const peninL = peninsulaLengthCm * 10; // mm
  const roomH = roomHeightCm * 10; // mm

  const root = new THREE.Group();
  root.name = 'Bazis_Kitchen_Composition';

  const carcassMat = new THREE.MeshStandardMaterial({ color: carcassColor, roughness: 0.42, metalness: 0.02 });
  const facadeMat = new THREE.MeshStandardMaterial({ color: facadeColor, roughness: 0.35, metalness: 0.04 });
  const worktopMat = new THREE.MeshStandardMaterial({ color: countertopColor, roughness: 0.38, metalness: 0.03 });
  const plinthMat = new THREE.MeshStandardMaterial({ color: plinthColor, roughness: 0.45, metalness: 0.02 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x22252b, roughness: 0.3, metalness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.55 });
  const hobGlassMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.1, metalness: 0.3 });
  const inoxSinkMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.25, metalness: 0.85 });

  const panelCuttingList = [];
  const interactiveParts = [];

  const baseUnitsGroup = new THREE.Group(); baseUnitsGroup.name = 'Corpuri_Baza'; root.add(baseUnitsGroup);
  const upperUnitsGroup = new THREE.Group(); upperUnitsGroup.name = 'Corpuri_Suspendate'; root.add(upperUnitsGroup);
  const tallUnitsGroup = new THREE.Group(); tallUnitsGroup.name = 'Coloane_Inalte'; root.add(tallUnitsGroup);
  const countertopsGroup = new THREE.Group(); countertopsGroup.name = 'Blat_Continuu'; root.add(countertopsGroup);
  const plinthsGroup = new THREE.Group(); plinthsGroup.name = 'Socluri'; root.add(plinthsGroup);
  const appliancesGroup = new THREE.Group(); appliancesGroup.name = 'Electrocasnice'; root.add(appliancesGroup);

  // Helper to generate a single cabinet module
  function buildModuleCarcass(name, width, height, depth, posX, posY, posZ, rotY = 0, shelves = 1, isUpper = false) {
    const mod = new THREE.Group();
    mod.name = name;
    mod.position.set(posX, posY, posZ);
    mod.rotation.y = rotY;

    const intW = width - 2 * BOARD_THICKNESS;

    // Left Side
    const leftSide = new THREE.Mesh(createBoxUVGeometry(BOARD_THICKNESS, height, depth), carcassMat);
    leftSide.position.set(-width / 2 + BOARD_THICKNESS / 2, height / 2, 0);
    mod.add(leftSide);
    panelCuttingList.push({ cabinet: name, partName: 'Laterală Stânga', lengthMm: height, widthMm: depth, thicknessMm: 18, qty: 1, material: 'PAL Melaminat Alb 18mm', grain: 'Vertical', edgeBanding: 'Cant ABS 1mm' });

    // Right Side
    const rightSide = new THREE.Mesh(createBoxUVGeometry(BOARD_THICKNESS, height, depth), carcassMat);
    rightSide.position.set(width / 2 - BOARD_THICKNESS / 2, height / 2, 0);
    mod.add(rightSide);
    panelCuttingList.push({ cabinet: name, partName: 'Laterală Dreapta', lengthMm: height, widthMm: depth, thicknessMm: 18, qty: 1, material: 'PAL Melaminat Alb 18mm', grain: 'Vertical', edgeBanding: 'Cant ABS 1mm' });

    // Bottom
    const bottom = new THREE.Mesh(createBoxUVGeometry(intW, BOARD_THICKNESS, depth), carcassMat);
    bottom.position.set(0, BOARD_THICKNESS / 2, 0);
    mod.add(bottom);
    panelCuttingList.push({ cabinet: name, partName: 'Fund Bază', lengthMm: intW, widthMm: depth, thicknessMm: 18, qty: 1, material: 'PAL Melaminat Alb 18mm', grain: 'Orizontal', edgeBanding: 'Cant ABS 1mm' });

    // Top
    if (isUpper) {
      const top = new THREE.Mesh(createBoxUVGeometry(intW, BOARD_THICKNESS, depth), carcassMat);
      top.position.set(0, height - BOARD_THICKNESS / 2, 0);
      mod.add(top);
      panelCuttingList.push({ cabinet: name, partName: 'Capac Superior', lengthMm: intW, widthMm: depth, thicknessMm: 18, qty: 1, material: 'PAL Melaminat Alb 18mm', grain: 'Orizontal', edgeBanding: 'Cant ABS 1mm' });
    } else {
      const tieF = new THREE.Mesh(createBoxUVGeometry(intW, BOARD_THICKNESS, 100), carcassMat);
      tieF.position.set(0, height - BOARD_THICKNESS / 2, depth / 2 - 50);
      mod.add(tieF);
      const tieB = new THREE.Mesh(createBoxUVGeometry(intW, BOARD_THICKNESS, 100), carcassMat);
      tieB.position.set(0, height - BOARD_THICKNESS / 2, -depth / 2 + 50);
      mod.add(tieB);
      panelCuttingList.push({ cabinet: name, partName: 'Legături Blat (Față/Spate)', lengthMm: intW, widthMm: 100, thicknessMm: 18, qty: 2, material: 'PAL Melaminat Alb 18mm', grain: 'Lungime', edgeBanding: 'Cant Melamină' });
    }

    // Back Panel HDF
    const backHDF = new THREE.Mesh(createBoxUVGeometry(width - 10, height - 10, BACK_THICKNESS), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 }));
    backHDF.position.set(0, height / 2, -depth / 2 + 10);
    mod.add(backHDF);
    panelCuttingList.push({ cabinet: name, partName: 'Spate PFL / HDF', lengthMm: height - 10, widthMm: width - 10, thicknessMm: 4, qty: 1, material: 'HDF Alb 4mm', grain: 'Vertical', edgeBanding: 'Fără cant' });

    // Shelves
    if (shelves > 0) {
      const spacing = (height - 2 * BOARD_THICKNESS) / (shelves + 1);
      for (let s = 1; s <= shelves; s++) {
        const sh = new THREE.Mesh(createBoxUVGeometry(intW - 2, BOARD_THICKNESS, depth - 30), carcassMat);
        sh.position.set(0, BOARD_THICKNESS + s * spacing, -10);
        mod.add(sh);
        panelCuttingList.push({ cabinet: name, partName: `Poliță Mobilă ${s}`, lengthMm: intW - 2, widthMm: depth - 30, thicknessMm: 18, qty: 1, material: 'PAL Melaminat Alb 18mm', grain: 'Orizontal', edgeBanding: 'Cant ABS 1mm' });
      }
    }

    return mod;
  }

  // Helper to add interactive door
  function attachDoor(parentMod, name, w, h, hingeSide = 'left', posX, posY, posZ, isUpper = false) {
    const pivot = new THREE.Group();
    pivot.name = name;
    const hingeX = hingeSide === 'left' ? -w / 2 : w / 2;
    pivot.position.set(posX + hingeX, posY, posZ);

    const doorMesh = new THREE.Mesh(createBoxUVGeometry(w - 4, h - 4, BOARD_THICKNESS), facadeMat);
    doorMesh.name = name + '_Front';
    doorMesh.position.set(hingeSide === 'left' ? (w - 4) / 2 : -(w - 4) / 2, 0, 0);
    pivot.add(doorMesh);

    const handle = createBarHandle(160, metalMat);
    const handleX = hingeSide === 'left' ? w - 40 : -w + 40;
    const handleY = isUpper ? -h / 2 + 80 : h / 2 - 80;
    handle.position.set(handleX, handleY, BOARD_THICKNESS / 2);
    pivot.add(handle);

    pivot.userData.mechType = hingeSide === 'left' ? 'door_left' : 'door_right';
    pivot.userData.maxAngle = hingeSide === 'left' ? 95 : -95;
    pivot.userData.isOpen = false;
    pivot.userData.progress = 0;

    parentMod.add(pivot);
    interactiveParts.push(pivot);
    panelCuttingList.push({ cabinet: parentMod.name, partName: `Ușă Front (${hingeSide})`, lengthMm: h - 4, widthMm: w - 4, thicknessMm: 18, qty: 1, material: 'MDF Înfoliat / Vopsit 18mm', grain: 'Vertical', edgeBanding: 'Cant ABS 2mm (4 laturi)' });
  }

  // Helper to add interactive drawers
  function attachDrawers(parentMod, name, w, totalH, posX, posY, posZ) {
    const topH = 140;
    const lowerH = (totalH - topH - 8) / 2;
    const heights = [topH, lowerH, lowerH];
    let curY = posY + totalH / 2;

    heights.forEach((dH, idx) => {
      const drawerPivot = new THREE.Group();
      drawerPivot.name = `${name}_Sertar_${idx + 1}`;
      curY -= dH / 2;
      drawerPivot.position.set(posX, curY, posZ);
      curY -= dH / 2 + 3;

      const front = new THREE.Mesh(createBoxUVGeometry(w - 4, dH - 3, BOARD_THICKNESS), facadeMat);
      front.name = `${name}_Front_${idx + 1}`;
      drawerPivot.add(front);

      // Inner Drawer Box
      const boxW = w - 40;
      const boxD = BASE_DEPTH - 70;
      const boxH = Math.max(70, dH - 40);
      const sideL = new THREE.Mesh(createBoxUVGeometry(16, boxH, boxD), carcassMat);
      sideL.position.set(-boxW / 2 + 8, -dH / 2 + boxH / 2 + 8, -boxD / 2 - 9);
      drawerPivot.add(sideL);

      const sideR = new THREE.Mesh(createBoxUVGeometry(16, boxH, boxD), carcassMat);
      sideR.position.set(boxW / 2 - 8, -dH / 2 + boxH / 2 + 8, -boxD / 2 - 9);
      drawerPivot.add(sideR);

      const handle = createBarHandle(160, metalMat);
      handle.position.set(0, 0, BOARD_THICKNESS / 2);
      drawerPivot.add(handle);

      drawerPivot.userData.mechType = 'drawer';
      drawerPivot.userData.slideDelta = [0, 0, 420];
      drawerPivot.userData.isOpen = false;
      drawerPivot.userData.progress = 0;

      parentMod.add(drawerPivot);
      interactiveParts.push(drawerPivot);
      panelCuttingList.push({ cabinet: parentMod.name, partName: `Front Sertar ${idx + 1}`, lengthMm: dH - 3, widthMm: w - 4, thicknessMm: 18, qty: 1, material: 'MDF Înfoliat / Vopsit 18mm', grain: 'Orizontal', edgeBanding: 'Cant ABS 2mm (4 laturi)' });
    });
  }

  // ==========================================
  // 1. MAIN WALL RUN (Along X axis, from 0 to mainW)
  // ==========================================
  // Layout from left to right:
  // - Sink Cabinet (800mm)
  // - Dishwasher Front (600mm)
  // - Cooking / Hob Drawers (900mm)
  // - Tall Column 1: Oven + Microwave (600mm)
  // - Tall Column 2: Integrated Refrigerator (600mm)

  let curX = 0;
  const plinthY = PLINTH_HEIGHT_DEFAULT;
  const baseBoxH = BASE_CARCASS_HEIGHT;
  const baseCenterY = plinthY + baseBoxH / 2;
  const facadeZ = BASE_DEPTH / 2 + BOARD_THICKNESS / 2;

  // A. Sink Base Cabinet (800mm)
  const sinkMod = buildModuleCarcass('Corp_Baza_Chiuveta', 800, baseBoxH, BASE_DEPTH, curX + 400, plinthY, 0, 0, 0);
  attachDoor(sinkMod, 'Usa_Chiuveta_Stanga', 400, baseBoxH, 'left', -200, baseBoxH / 2, facadeZ);
  attachDoor(sinkMod, 'Usa_Chiuveta_Dreapta', 400, baseBoxH, 'right', 200, baseBoxH / 2, facadeZ);
  baseUnitsGroup.add(sinkMod);

  // Inox Sink cutout mesh on top
  const sinkMesh = new THREE.Mesh(createBoxUVGeometry(760, 20, 480), inoxSinkMat);
  sinkMesh.name = 'Chiuveta_Inox';
  sinkMesh.position.set(curX + 400, plinthY + baseBoxH + COUNTERTOP_THICKNESS + 5, 10);
  appliancesGroup.add(sinkMesh);

  // Chrome Faucet
  const faucetGroup = new THREE.Group();
  faucetGroup.name = 'Baterie_Chiuveta';
  const faucetPole = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 280, 16), metalMat);
  faucetPole.position.set(curX + 400, plinthY + baseBoxH + COUNTERTOP_THICKNESS + 140, -180);
  faucetGroup.add(faucetPole);
  appliancesGroup.add(faucetGroup);

  curX += 800;

  // B. Integrated Dishwasher (600mm)
  const washerMod = buildModuleCarcass('Masina_Spalat_Vase', 600, baseBoxH, BASE_DEPTH, curX + 300, plinthY, 0, 0, 0);
  attachDoor(washerMod, 'Front_Masina_Spalat', 600, baseBoxH, 'left', 0, baseBoxH / 2, facadeZ);
  baseUnitsGroup.add(washerMod);

  curX += 600;

  // C. 3-Drawer Cooking Unit (900mm) with Induction Hob on top
  const cookMod = buildModuleCarcass('Corp_Sertare_Plita', 900, baseBoxH, BASE_DEPTH, curX + 450, plinthY, 0, 0, 0);
  attachDrawers(cookMod, 'Plita', 900, baseBoxH, 0, baseBoxH / 2, facadeZ);
  baseUnitsGroup.add(cookMod);

  // Induction Hob
  const hobMesh = new THREE.Mesh(createBoxUVGeometry(590, 8, 520), hobGlassMat);
  hobMesh.name = 'Plita_Inductie';
  hobMesh.position.set(curX + 450, plinthY + baseBoxH + COUNTERTOP_THICKNESS + 4, 10);
  appliancesGroup.add(hobMesh);

  curX += 900;

  // D. Tall Column: Oven + Microwave (600mm, height: roomH - 100)
  const tallH = roomH - plinthY - 50;
  const colOven = buildModuleCarcass('Coloana_Cuptor', 600, tallH, BASE_DEPTH + 20, curX + 300, plinthY, 10, 0, 3);
  attachDoor(colOven, 'Usa_Coloana_Jos', 600, 480, 'left', 0, 240, facadeZ + 10);
  attachDoor(colOven, 'Usa_Coloana_Sus', 600, tallH - 1200, 'left', 0, tallH - (tallH - 1200) / 2, facadeZ + 10);
  tallUnitsGroup.add(colOven);

  // Bosch Built-in Oven
  const ovenMesh = new THREE.Mesh(createBoxUVGeometry(595, 595, 540), new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.15, metalness: 0.8 }));
  ovenMesh.name = 'Cuptor_Bosch';
  ovenMesh.position.set(curX + 300, plinthY + 480 + 297, 20);
  appliancesGroup.add(ovenMesh);

  curX += 600;

  // E. Tall Column: Integrated Refrigerator (600mm)
  const colFridge = buildModuleCarcass('Coloana_Frigider', 600, tallH, BASE_DEPTH + 20, curX + 300, plinthY, 10, 0, 3);
  attachDoor(colFridge, 'Usa_Frigider_Jos', 600, 720, 'left', 0, 360, facadeZ + 10);
  attachDoor(colFridge, 'Usa_Frigider_Sus', 600, tallH - 720, 'left', 0, 720 + (tallH - 720) / 2, facadeZ + 10);
  tallUnitsGroup.add(colFridge);

  const totalMainRunLength = curX + 600;

  // ==========================================
  // 2. UPPER WALL CABINET ROW (Along Main Run)
  // ==========================================
  const upperY = plinthY + baseBoxH + SPLASHBACK_CLEARANCE;
  const upperH = UPPER_CARCASS_HEIGHT;
  const upperDepth = UPPER_DEPTH;
  const upperZ = -BASE_DEPTH / 2 + upperDepth / 2;

  // Upper 1: Dish Drainer over Sink (800mm Aventos Bi-Fold)
  const upperDrainer = buildModuleCarcass('Corp_Suspendat_Picurator', 800, upperH, upperDepth, 400, upperY, upperZ, 0, 2, true);
  attachDoor(upperDrainer, 'Usa_Suspendat_1', 400, upperH, 'left', -200, upperH / 2, upperDepth / 2 + 9, true);
  attachDoor(upperDrainer, 'Usa_Suspendat_2', 400, upperH, 'right', 200, upperH / 2, upperDepth / 2 + 9, true);
  upperUnitsGroup.add(upperDrainer);

  // Upper 2: Integrated Hood over Hob (900mm)
  const upperHood = buildModuleCarcass('Corp_Suspendat_Hota', 900, upperH, upperDepth, 1400 + 450, upperY, upperZ, 0, 1, true);
  attachDoor(upperHood, 'Usa_Hota_Stanga', 450, upperH, 'left', -225, upperH / 2, upperDepth / 2 + 9, true);
  attachDoor(upperHood, 'Usa_Hota_Dreapta', 450, upperH, 'right', 225, upperH / 2, upperDepth / 2 + 9, true);
  upperUnitsGroup.add(upperHood);

  // ==========================================
  // 3. CONTINUOUS COUNTERTOP & PLINTH (Main Run)
  // ==========================================
  const baseRunLength = 2300; // 800 (sink) + 600 (washer) + 900 (cook)
  const worktopW = baseRunLength + 20;
  const worktopD = BASE_DEPTH + COUNTERTOP_OVERHANG;

  const mainCountertop = new THREE.Mesh(
    createBoxUVGeometry(worktopW, COUNTERTOP_THICKNESS, worktopD),
    worktopMat
  );
  mainCountertop.name = 'Blat_Principal_Continuu';
  mainCountertop.position.set(
    worktopW / 2 - 10,
    plinthY + baseBoxH + COUNTERTOP_THICKNESS / 2,
    COUNTERTOP_OVERHANG / 2
  );
  countertopsGroup.add(mainCountertop);
  panelCuttingList.push({ cabinet: 'Blat Bucătărie', partName: 'Blat Lucru Principal (Termorezistent 38mm)', lengthMm: worktopW, widthMm: worktopD, thicknessMm: 38, qty: 1, material: 'Blat Termorezistent 38mm', grain: 'Lungime', edgeBanding: 'Cant Termorezistent / Postforming' });

  // Continuous Plinth (Main Run)
  const mainPlinth = new THREE.Mesh(
    createBoxUVGeometry(totalMainRunLength, plinthY, BOARD_THICKNESS),
    plinthMat
  );
  mainPlinth.name = 'Plinta_Principala';
  mainPlinth.position.set(
    totalMainRunLength / 2,
    plinthY / 2,
    BASE_DEPTH / 2 - 35
  );
  plinthsGroup.add(mainPlinth);
  panelCuttingList.push({ cabinet: 'Socluri', partName: 'Plintă Față Principală', lengthMm: totalMainRunLength, widthMm: plinthY, thicknessMm: 18, qty: 1, material: 'PVC / PAL cu Garnitură Silicon', grain: 'Lungime', edgeBanding: 'Cant ABS 1mm' });

  // Backsplash Wall Panel (Șorț de bucătărie)
  const splashbackMesh = new THREE.Mesh(
    createBoxUVGeometry(baseRunLength, SPLASHBACK_CLEARANCE, 10),
    new THREE.MeshStandardMaterial({ color: countertopColor, roughness: 0.25, metalness: 0.05 })
  );
  splashbackMesh.name = 'Panou_Sort_Perete';
  splashbackMesh.position.set(
    baseRunLength / 2,
    plinthY + baseBoxH + SPLASHBACK_CLEARANCE / 2,
    -BASE_DEPTH / 2 + 5
  );
  countertopsGroup.add(splashbackMesh);
  panelCuttingList.push({ cabinet: 'Șorț Perete', partName: 'Panou Protecție Perete (Faianță / Sticlă / MDF)', lengthMm: baseRunLength, widthMm: SPLASHBACK_CLEARANCE, thicknessMm: 10, qty: 1, material: 'Panou Decorativ 10mm', grain: 'Lungime', edgeBanding: 'Profil Aluminiu' });

  // ==========================================
  // 4. PENINSULA / ISLAND EXTENSION (Optional)
  // ==========================================
  if (config.layoutType === 'l_peninsula' || config.layoutType === 'u_shape') {
    const peninW = peninL;
    const peninD = 900; // 900mm wide peninsula with seating bar overhang
    const peninX = -BASE_DEPTH / 2 + 100;
    const peninZ = BASE_DEPTH / 2 + peninW / 2;

    const peninCarcass = buildModuleCarcass('Corp_Peninsula_2Usi', 800, baseBoxH, BASE_DEPTH, peninX, plinthY, peninZ, Math.PI / 2, 2);
    attachDoor(peninCarcass, 'Usa_Peninsula_1', 400, baseBoxH, 'left', -200, baseBoxH / 2, facadeZ);
    attachDoor(peninCarcass, 'Usa_Peninsula_2', 400, baseBoxH, 'right', 200, baseBoxH / 2, facadeZ);
    baseUnitsGroup.add(peninCarcass);

    // Continuous Peninsula Worktop with 300mm bar seating overhang
    const peninWorktop = new THREE.Mesh(
      createBoxUVGeometry(peninD, COUNTERTOP_THICKNESS, peninW),
      worktopMat
    );
    peninWorktop.name = 'Blat_Peninsula_Bar';
    peninWorktop.position.set(
      peninX - 100,
      plinthY + baseBoxH + COUNTERTOP_THICKNESS / 2,
      peninZ
    );
    countertopsGroup.add(peninWorktop);
    panelCuttingList.push({ cabinet: 'Peninsulă', partName: 'Blat Masă Bar Peninsulă', lengthMm: peninW, widthMm: peninD, thicknessMm: 38, qty: 1, material: 'Blat Termorezistent 38mm', grain: 'Lungime', edgeBanding: 'Cant ABS 2mm (4 laturi)' });

    // Waterfall leg on peninsula end
    const waterfallLeg = new THREE.Mesh(
      createBoxUVGeometry(peninD, plinthY + baseBoxH + COUNTERTOP_THICKNESS, COUNTERTOP_THICKNESS),
      worktopMat
    );
    waterfallLeg.name = 'Picior_Cascada_Peninsula';
    waterfallLeg.position.set(
      peninX - 100,
      (plinthY + baseBoxH + COUNTERTOP_THICKNESS) / 2,
      peninZ + peninW / 2 - COUNTERTOP_THICKNESS / 2
    );
    countertopsGroup.add(waterfallLeg);
    panelCuttingList.push({ cabinet: 'Peninsulă', partName: 'Picior Cascadă Blat', lengthMm: plinthY + baseBoxH + COUNTERTOP_THICKNESS, widthMm: peninD, thicknessMm: 38, qty: 1, material: 'Blat Termorezistent 38mm', grain: 'Vertical', edgeBanding: 'Cant ABS 2mm' });
  }

  // Convert mm to Three.js meter scale (0.001)
  root.scale.set(0.001, 0.001, 0.001);

  return {
    root,
    panelCuttingList,
    interactiveParts,
    dimensionsCm: {
      widthCm: Math.round(totalMainRunLength / 10),
      heightCm: Math.round(roomH / 10),
      depthCm: config.layoutType === 'l_peninsula' ? Math.round((peninL + BASE_DEPTH) / 10) : 60
    }
  };
}

