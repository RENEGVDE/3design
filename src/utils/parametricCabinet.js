import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Standard furniture manufacturing dimensions in millimeters (mm)
export const BOARD_THICKNESS = 18; // 18mm melamine-faced chipboard / MDF
export const BACK_THICKNESS = 4;   // 4mm HDF back panel
export const BACK_INSET = 16;      // Inset from back edge
export const SHELF_FRONT_SETBACK = 20; // 20mm setback for internal shelves
export const DOOR_GAP = 2;         // 2mm perimeter gap around facades
export const DEFAULT_HANDLE_LENGTH = 160; // 160mm hole-to-hole bar handle

export const CABINET_ARCHETYPES = [
  {
    id: 'base_single_door',
    i18nKey: 'archetypeBaseSingle',
    defaultWidthCm: 60,
    defaultHeightCm: 82,
    defaultDepthCm: 56,
    defaultShelves: 1,
    defaultPlinthCm: 10,
    category: 'base'
  },
  {
    id: 'base_double_door',
    i18nKey: 'archetypeBaseDouble',
    defaultWidthCm: 80,
    defaultHeightCm: 82,
    defaultDepthCm: 56,
    defaultShelves: 1,
    defaultPlinthCm: 10,
    category: 'base'
  },
  {
    id: 'base_drawers_3',
    i18nKey: 'archetypeBaseDrawers',
    defaultWidthCm: 60,
    defaultHeightCm: 82,
    defaultDepthCm: 56,
    defaultShelves: 0,
    defaultPlinthCm: 10,
    category: 'base'
  },
  {
    id: 'base_sink',
    i18nKey: 'archetypeBaseSink',
    defaultWidthCm: 80,
    defaultHeightCm: 82,
    defaultDepthCm: 56,
    defaultShelves: 0,
    defaultPlinthCm: 10,
    category: 'base'
  },
  {
    id: 'upper_single_door',
    i18nKey: 'archetypeUpperSingle',
    defaultWidthCm: 60,
    defaultHeightCm: 72,
    defaultDepthCm: 32,
    defaultShelves: 2,
    defaultPlinthCm: 0,
    category: 'upper'
  },
  {
    id: 'upper_double_door',
    i18nKey: 'archetypeUpperDouble',
    defaultWidthCm: 80,
    defaultHeightCm: 72,
    defaultDepthCm: 32,
    defaultShelves: 2,
    defaultPlinthCm: 0,
    category: 'upper'
  },
  {
    id: 'upper_aventos',
    i18nKey: 'archetypeUpperAventos',
    defaultWidthCm: 80,
    defaultHeightCm: 72,
    defaultDepthCm: 32,
    defaultShelves: 1,
    defaultPlinthCm: 0,
    category: 'upper'
  },
  {
    id: 'tall_column',
    i18nKey: 'archetypeTallColumn',
    defaultWidthCm: 60,
    defaultHeightCm: 210,
    defaultDepthCm: 56,
    defaultShelves: 4,
    defaultPlinthCm: 10,
    category: 'tall'
  },
  {
    id: 'open_shelf',
    i18nKey: 'archetypeOpenShelf',
    defaultWidthCm: 40,
    defaultHeightCm: 72,
    defaultDepthCm: 30,
    defaultShelves: 2,
    defaultPlinthCm: 0,
    category: 'upper'
  }
];

/**
 * Creates box geometry in millimeter space centered at (0, 0, 0)
 * with box-projected UV mapping (500mm = 1.0 UV unit).
 */
function createSlabGeometry(wMm, hMm, dMm) {
  const geo = new THREE.BoxGeometry(wMm, hMm, dMm);
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const count = pos.count;
  const uvs = new Float32Array(count * 2);
  const uvScale = 0.002; // 500mm = 1 UV

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

/**
 * Procedurally generates a modern bar handle.
 */
function createHandleMesh(lengthMm, material) {
  const group = new THREE.Group();
  group.name = 'Handle';

  // Crossbar
  const barGeo = new THREE.CylinderGeometry(5, 5, lengthMm, 16);
  barGeo.rotateZ(Math.PI / 2);
  const barMesh = new THREE.Mesh(barGeo, material);
  barMesh.position.set(0, 0, 25);
  group.add(barMesh);

  // Standoff posts
  const postDist = (lengthMm - 32) / 2;
  const postGeo = new THREE.CylinderGeometry(4, 4, 25, 12);
  postGeo.rotateX(Math.PI / 2);

  const postL = new THREE.Mesh(postGeo, material);
  postL.position.set(-postDist, 0, 12.5);
  group.add(postL);

  const postR = new THREE.Mesh(postGeo, material);
  postR.position.set(postDist, 0, 12.5);
  group.add(postR);

  return group;
}

/**
 * Builds a full 3D parametric cabinet Three.js hierarchy in meter-space.
 */
export function buildParametricCabinetHierarchy(config) {
  const {
    name = 'Corp Mobilier',
    archetypeId = 'base_single_door',
    widthCm = 60,
    heightCm = 82,
    depthCm = 56,
    shelvesCount = 1,
    plinthHeightCm = 10,
    handleType = 'bar', // 'bar' | 'none'
    carcassColor = '#f4f4f2',
    facadeColor = '#f4f4f2'
  } = config;

  const w = widthCm * 10; // mm
  const hTotal = heightCm * 10; // mm
  const d = depthCm * 10; // mm
  const plinthH = plinthHeightCm * 10; // mm
  const boxH = hTotal - plinthH; // Height of carcass box

  const cabinetRoot = new THREE.Group();
  cabinetRoot.name = name;

  // Carcass Material
  const carcassMat = new THREE.MeshStandardMaterial({
    color: carcassColor,
    roughness: 0.42,
    metalness: 0.02
  });
  carcassMat.name = 'Mat_Carcass';

  // Facade Material
  const facadeMat = new THREE.MeshStandardMaterial({
    color: facadeColor,
    roughness: 0.35,
    metalness: 0.04
  });
  facadeMat.name = 'Mat_Facade';

  // Hardware / Metal Material
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x22252b,
    roughness: 0.3,
    metalness: 0.8
  });
  metalMat.name = 'Mat_Hardware';

  // Back panel material (White HDF)
  const backMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.6,
    metalness: 0.01
  });
  backMat.name = 'Mat_BackHDF';

  const carcassGroup = new THREE.Group();
  carcassGroup.name = 'Carcasa';
  cabinetRoot.add(carcassGroup);

  const interiorW = w - 2 * BOARD_THICKNESS;

  // 1. Left Side
  const leftSideGeo = createSlabGeometry(BOARD_THICKNESS, boxH, d);
  const leftSide = new THREE.Mesh(leftSideGeo, carcassMat);
  leftSide.name = 'Laterala_Stanga';
  leftSide.position.set(
    -w / 2 + BOARD_THICKNESS / 2,
    plinthH + boxH / 2,
    0
  );
  carcassGroup.add(leftSide);

  // 2. Right Side
  const rightSideGeo = createSlabGeometry(BOARD_THICKNESS, boxH, d);
  const rightSide = new THREE.Mesh(rightSideGeo, carcassMat);
  rightSide.name = 'Laterala_Dreapta';
  rightSide.position.set(
    w / 2 - BOARD_THICKNESS / 2,
    plinthH + boxH / 2,
    0
  );
  carcassGroup.add(rightSide);

  // 3. Bottom Panel (Fund)
  const bottomGeo = createSlabGeometry(interiorW, BOARD_THICKNESS, d);
  const bottom = new THREE.Mesh(bottomGeo, carcassMat);
  bottom.name = 'Fund';
  bottom.position.set(
    0,
    plinthH + BOARD_THICKNESS / 2,
    0
  );
  carcassGroup.add(bottom);

  // 4. Top Panel or Stretchers (Capac / Legaturi)
  const isUpper = archetypeId.startsWith('upper') || archetypeId === 'open_shelf';
  if (isUpper) {
    // Full solid top panel for upper cabinets
    const topGeo = createSlabGeometry(interiorW, BOARD_THICKNESS, d);
    const topMesh = new THREE.Mesh(topGeo, carcassMat);
    topMesh.name = 'Capac_Superior';
    topMesh.position.set(
      0,
      plinthH + boxH - BOARD_THICKNESS / 2,
      0
    );
    carcassGroup.add(topMesh);
  } else {
    // Top front & back tie rails for base cabinets
    const railW = interiorW;
    const railH = BOARD_THICKNESS;
    const railD = 100;

    const frontRailGeo = createSlabGeometry(railW, railH, railD);
    const frontRail = new THREE.Mesh(frontRailGeo, carcassMat);
    frontRail.name = 'Legatura_Fata';
    frontRail.position.set(
      0,
      plinthH + boxH - railH / 2,
      d / 2 - railD / 2
    );
    carcassGroup.add(frontRail);

    const backRailGeo = createSlabGeometry(railW, railH, railD);
    const backRail = new THREE.Mesh(backRailGeo, carcassMat);
    backRail.name = 'Legatura_Spate';
    backRail.position.set(
      0,
      plinthH + boxH - railH / 2,
      -d / 2 + railD / 2
    );
    carcassGroup.add(backRail);
  }

  // 5. Back Panel (Spate PFL 4mm)
  if (archetypeId !== 'open_shelf') {
    const backW = w - 2 * 6; // Inset into side grooves
    const backH = boxH - 2 * 6;
    const backGeo = createSlabGeometry(backW, backH, BACK_THICKNESS);
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.name = 'Spate_PFL';
    backMesh.position.set(
      0,
      plinthH + boxH / 2,
      -d / 2 + BACK_INSET
    );
    carcassGroup.add(backMesh);
  }

  // 6. Shelves (Polite)
  if (shelvesCount > 0) {
    const shelfGeo = createSlabGeometry(
      interiorW - 2, // 2mm clearance
      BOARD_THICKNESS,
      d - BACK_INSET - SHELF_FRONT_SETBACK
    );
    const usableH = boxH - 2 * BOARD_THICKNESS;
    const spacing = usableH / (shelvesCount + 1);

    for (let i = 1; i <= shelvesCount; i++) {
      const shelf = new THREE.Mesh(shelfGeo, carcassMat);
      shelf.name = `Polita_${i}`;
      shelf.position.set(
        0,
        plinthH + BOARD_THICKNESS + i * spacing,
        -SHELF_FRONT_SETBACK / 2 + 5
      );
      carcassGroup.add(shelf);
    }
  }

  // 7. Plinth / Legs (Soclu)
  if (plinthH > 0) {
    const plinthW = w;
    const plinthGeo = createSlabGeometry(plinthW, plinthH, BOARD_THICKNESS);
    const plinthMesh = new THREE.Mesh(plinthGeo, carcassMat);
    plinthMesh.name = 'Soclu_Plinta';
    plinthMesh.position.set(
      0,
      plinthH / 2,
      d / 2 - 35 // Inset 35mm from front
    );
    carcassGroup.add(plinthMesh);
  }

  // 8. Facades & Doors with exact edge-hinge pivots
  const movingPartsGroup = new THREE.Group();
  movingPartsGroup.name = 'Fronturi_Mobile';
  cabinetRoot.add(movingPartsGroup);

  const facadeZ = d / 2 + BOARD_THICKNESS / 2;

  if (archetypeId === 'base_single_door' || archetypeId === 'upper_single_door') {
    // Single door swinging to left (hinge at left edge)
    const doorW = w - DOOR_GAP * 2;
    const doorH = boxH - DOOR_GAP * 2;

    const doorPivot = new THREE.Group();
    doorPivot.name = 'Usa_Stanga';
    doorPivot.position.set(-w / 2 + DOOR_GAP, plinthH + boxH / 2, facadeZ);

    const doorGeo = createSlabGeometry(doorW, doorH, BOARD_THICKNESS);
    const doorMesh = new THREE.Mesh(doorGeo, facadeMat);
    doorMesh.name = 'Front_Usa';
    doorMesh.position.set(doorW / 2, 0, 0);
    doorPivot.add(doorMesh);

    if (handleType === 'bar') {
      const handle = createHandleMesh(DEFAULT_HANDLE_LENGTH, metalMat);
      handle.position.set(doorW - 45, isUpper ? -doorH / 2 + 100 : doorH / 2 - 100, BOARD_THICKNESS / 2);
      doorPivot.add(handle);
    }

    // Set kinematic metadata for our engine
    doorPivot.userData.mechType = 'door_left';
    doorPivot.userData.maxAngle = 95;
    movingPartsGroup.add(doorPivot);
  } else if (archetypeId === 'base_double_door' || archetypeId === 'upper_double_door' || archetypeId === 'base_sink') {
    // Pair of doors: Left Door & Right Door
    const pairW = (w - DOOR_GAP * 3) / 2;
    const doorH = boxH - DOOR_GAP * 2;

    // Left Door
    const leftPivot = new THREE.Group();
    leftPivot.name = 'Usa_Stanga';
    leftPivot.position.set(-w / 2 + DOOR_GAP, plinthH + boxH / 2, facadeZ);

    const leftGeo = createSlabGeometry(pairW, doorH, BOARD_THICKNESS);
    const leftMesh = new THREE.Mesh(leftGeo, facadeMat);
    leftMesh.name = 'Front_Usa_Stanga';
    leftMesh.position.set(pairW / 2, 0, 0);
    leftPivot.add(leftMesh);

    if (handleType === 'bar') {
      const handleL = createHandleMesh(DEFAULT_HANDLE_LENGTH, metalMat);
      handleL.position.set(pairW - 35, isUpper ? -doorH / 2 + 100 : doorH / 2 - 100, BOARD_THICKNESS / 2);
      leftPivot.add(handleL);
    }
    leftPivot.userData.mechType = 'door_left';
    leftPivot.userData.maxAngle = 95;
    movingPartsGroup.add(leftPivot);

    // Right Door
    const rightPivot = new THREE.Group();
    rightPivot.name = 'Usa_Dreapta';
    rightPivot.position.set(w / 2 - DOOR_GAP, plinthH + boxH / 2, facadeZ);

    const rightGeo = createSlabGeometry(pairW, doorH, BOARD_THICKNESS);
    const rightMesh = new THREE.Mesh(rightGeo, facadeMat);
    rightMesh.name = 'Front_Usa_Dreapta';
    rightMesh.position.set(-pairW / 2, 0, 0);
    rightPivot.add(rightMesh);

    if (handleType === 'bar') {
      const handleR = createHandleMesh(DEFAULT_HANDLE_LENGTH, metalMat);
      handleR.position.set(-pairW + 35, isUpper ? -doorH / 2 + 100 : doorH / 2 - 100, BOARD_THICKNESS / 2);
      rightPivot.add(handleR);
    }
    rightPivot.userData.mechType = 'door_right';
    rightPivot.userData.maxAngle = 95;
    movingPartsGroup.add(rightPivot);
  } else if (archetypeId === 'base_drawers_3') {
    // 3 Sliding Drawers (1 Cutlery top, 2 deep lower drawers)
    const drawerW = w - DOOR_GAP * 2;
    const topH = 140;
    const lowerH = (boxH - topH - DOOR_GAP * 4) / 2;
    const drawerHeights = [topH, lowerH, lowerH];

    let currentY = plinthH + boxH - DOOR_GAP;

    drawerHeights.forEach((dH, idx) => {
      const centerY = currentY - dH / 2;
      currentY -= dH + DOOR_GAP;

      const drawerGroup = new THREE.Group();
      drawerGroup.name = `Sertar_${idx + 1}`;
      drawerGroup.position.set(0, centerY, facadeZ);

      // Front slab
      const frontGeo = createSlabGeometry(drawerW, dH, BOARD_THICKNESS);
      const frontMesh = new THREE.Mesh(frontGeo, facadeMat);
      frontMesh.name = `Front_Sertar_${idx + 1}`;
      drawerGroup.add(frontMesh);

      // Inner Drawer Box (Cutie Sertar PAL 16mm)
      const boxDepth = d - 80;
      const boxWidth = interiorW - 30;
      const boxHeight = Math.max(60, dH - 45);

      const sideGeo = createSlabGeometry(16, boxHeight, boxDepth);
      const sideL = new THREE.Mesh(sideGeo, carcassMat);
      sideL.position.set(-boxWidth / 2 + 8, -dH / 2 + boxHeight / 2 + 10, -boxDepth / 2 - BOARD_THICKNESS / 2);
      drawerGroup.add(sideL);

      const sideR = new THREE.Mesh(sideGeo, carcassMat);
      sideR.position.set(boxWidth / 2 - 8, -dH / 2 + boxHeight / 2 + 10, -boxDepth / 2 - BOARD_THICKNESS / 2);
      drawerGroup.add(sideR);

      const backGeo = createSlabGeometry(boxWidth - 32, boxHeight, 16);
      const backBox = new THREE.Mesh(backGeo, carcassMat);
      backBox.position.set(0, -dH / 2 + boxHeight / 2 + 10, -boxDepth - BOARD_THICKNESS / 2 + 8);
      drawerGroup.add(backBox);

      // Handle
      if (handleType === 'bar') {
        const handle = createHandleMesh(DEFAULT_HANDLE_LENGTH, metalMat);
        handle.position.set(0, 0, BOARD_THICKNESS / 2);
        drawerGroup.add(handle);
      }

      drawerGroup.userData.mechType = 'drawer';
      drawerGroup.userData.slideDelta = [0, 0, 420];
      movingPartsGroup.add(drawerGroup);
    });
  } else if (archetypeId === 'upper_aventos') {
    // Lift-flap door swinging upward (Aventos)
    const doorW = w - DOOR_GAP * 2;
    const doorH = boxH - DOOR_GAP * 2;

    const flapPivot = new THREE.Group();
    flapPivot.name = 'Usa_Rabatabila_Aventos';
    flapPivot.position.set(0, plinthH + boxH - DOOR_GAP, facadeZ);

    const flapGeo = createSlabGeometry(doorW, doorH, BOARD_THICKNESS);
    const flapMesh = new THREE.Mesh(flapGeo, facadeMat);
    flapMesh.name = 'Front_Aventos';
    flapMesh.position.set(0, -doorH / 2, 0);
    flapPivot.add(flapMesh);

    if (handleType === 'bar') {
      const handle = createHandleMesh(DEFAULT_HANDLE_LENGTH, metalMat);
      handle.position.set(0, -doorH + 45, BOARD_THICKNESS / 2);
      flapPivot.add(handle);
    }

    flapPivot.userData.mechType = 'flap_up';
    flapPivot.userData.maxAngle = -85;
    movingPartsGroup.add(flapPivot);
  } else if (archetypeId === 'tall_column') {
    // Tall larder column with lower door & upper door
    const doorW = w - DOOR_GAP * 2;
    const lowerH = 720;
    const upperH = boxH - lowerH - DOOR_GAP * 3;

    // Lower door
    const lowerPivot = new THREE.Group();
    lowerPivot.name = 'Usa_Coloana_Jos';
    lowerPivot.position.set(-w / 2 + DOOR_GAP, plinthH + lowerH / 2, facadeZ);
    const lowerGeo = createSlabGeometry(doorW, lowerH, BOARD_THICKNESS);
    const lowerMesh = new THREE.Mesh(lowerGeo, facadeMat);
    lowerMesh.position.set(doorW / 2, 0, 0);
    lowerPivot.add(lowerMesh);

    if (handleType === 'bar') {
      const handle = createHandleMesh(DEFAULT_HANDLE_LENGTH, metalMat);
      handle.position.set(doorW - 45, lowerH / 2 - 100, BOARD_THICKNESS / 2);
      lowerPivot.add(handle);
    }
    lowerPivot.userData.mechType = 'door_left';
    lowerPivot.userData.maxAngle = 95;
    movingPartsGroup.add(lowerPivot);

    // Upper door
    const upperPivot = new THREE.Group();
    upperPivot.name = 'Usa_Coloana_Sus';
    upperPivot.position.set(-w / 2 + DOOR_GAP, plinthH + lowerH + DOOR_GAP + upperH / 2, facadeZ);
    const upperGeo = createSlabGeometry(doorW, upperH, BOARD_THICKNESS);
    const upperMesh = new THREE.Mesh(upperGeo, facadeMat);
    upperMesh.position.set(doorW / 2, 0, 0);
    upperPivot.add(upperMesh);

    if (handleType === 'bar') {
      const handle = createHandleMesh(DEFAULT_HANDLE_LENGTH, metalMat);
      handle.position.set(doorW - 45, -upperH / 2 + 100, BOARD_THICKNESS / 2);
      upperPivot.add(handle);
    }
    upperPivot.userData.mechType = 'door_left';
    upperPivot.userData.maxAngle = 95;
    movingPartsGroup.add(upperPivot);
  }

  // Convert millimeter coordinates to Three.js meter space (scale: 0.001)
  cabinetRoot.scale.set(0.001, 0.001, 0.001);

  // Store metadata on root
  cabinetRoot.userData.isParametric = true;
  cabinetRoot.userData.config = { ...config };
  cabinetRoot.userData.baseDimsCm = {
    w: widthCm,
    h: heightCm,
    d: depthCm
  };

  return cabinetRoot;
}

/**
 * Builds the Bill of Materials / Cutting List (Listă de debitare)
 * for CNC / panel cutting software (Cutting 3, Bazis-Raskroy, Giben, Cut Rite).
 */
export function buildCuttingList(config) {
  const {
    name = 'Corp Mobilier',
    archetypeId = 'base_single_door',
    widthCm = 60,
    heightCm = 82,
    depthCm = 56,
    shelvesCount = 1,
    plinthHeightCm = 10,
    carcassMatName = 'PAL Melaminat Alb 18mm',
    facadeMatName = 'MDF Înfoliat 18mm',
    backMatName = 'HDF Alb 4mm'
  } = config;

  const w = Math.round(widthCm * 10);
  const hTotal = Math.round(heightCm * 10);
  const d = Math.round(depthCm * 10);
  const plinthH = Math.round(plinthHeightCm * 10);
  const boxH = hTotal - plinthH;
  const interiorW = w - 2 * BOARD_THICKNESS;

  const parts = [];

  // 1. Laterale
  parts.push({
    cabinet: name,
    partName: 'Laterală Stânga',
    lengthMm: boxH,
    widthMm: d,
    thicknessMm: 18,
    qty: 1,
    material: carcassMatName,
    grain: 'Vertical',
    edgeBanding: 'Cant ABS 1mm (Față)'
  });
  parts.push({
    cabinet: name,
    partName: 'Laterală Dreapta',
    lengthMm: boxH,
    widthMm: d,
    thicknessMm: 18,
    qty: 1,
    material: carcassMatName,
    grain: 'Vertical',
    edgeBanding: 'Cant ABS 1mm (Față)'
  });

  // 2. Fund
  parts.push({
    cabinet: name,
    partName: 'Fund (Bază)',
    lengthMm: interiorW,
    widthMm: d,
    thicknessMm: 18,
    qty: 1,
    material: carcassMatName,
    grain: 'Orizontal',
    edgeBanding: 'Cant ABS 1mm (Față)'
  });

  // 3. Capac sau Legături
  const isUpper = archetypeId.startsWith('upper') || archetypeId === 'open_shelf';
  if (isUpper) {
    parts.push({
      cabinet: name,
      partName: 'Capac Superior',
      lengthMm: interiorW,
      widthMm: d,
      thicknessMm: 18,
      qty: 1,
      material: carcassMatName,
      grain: 'Orizontal',
      edgeBanding: 'Cant ABS 1mm (Față)'
    });
  } else {
    parts.push({
      cabinet: name,
      partName: 'Legătură Blat Față',
      lengthMm: interiorW,
      widthMm: 100,
      thicknessMm: 18,
      qty: 1,
      material: carcassMatName,
      grain: 'Lungime',
      edgeBanding: 'Cant Melamină'
    });
    parts.push({
      cabinet: name,
      partName: 'Legătură Blat Spate',
      lengthMm: interiorW,
      widthMm: 100,
      thicknessMm: 18,
      qty: 1,
      material: carcassMatName,
      grain: 'Lungime',
      edgeBanding: 'Cant Melamină'
    });
  }

  // 4. Polițe
  if (shelvesCount > 0) {
    parts.push({
      cabinet: name,
      partName: 'Poliță Interioară',
      lengthMm: interiorW - 2,
      widthMm: d - BACK_INSET - SHELF_FRONT_SETBACK,
      thicknessMm: 18,
      qty: shelvesCount,
      material: carcassMatName,
      grain: 'Orizontal',
      edgeBanding: 'Cant ABS 1mm (Față)'
    });
  }

  // 5. Spate PFL
  if (archetypeId !== 'open_shelf') {
    parts.push({
      cabinet: name,
      partName: 'Spate PFL',
      lengthMm: boxH - 12,
      widthMm: w - 12,
      thicknessMm: 4,
      qty: 1,
      material: backMatName,
      grain: 'Vertical',
      edgeBanding: 'Fără cant'
    });
  }

  // 6. Soclu
  if (plinthH > 0) {
    parts.push({
      cabinet: name,
      partName: 'Soclu / Plintă',
      lengthMm: w,
      widthMm: plinthH,
      thicknessMm: 18,
      qty: 1,
      material: carcassMatName,
      grain: 'Lungime',
      edgeBanding: 'Cant ABS 1mm (Sus/Jos)'
    });
  }

  // 7. Fronturi
  if (archetypeId === 'base_single_door' || archetypeId === 'upper_single_door') {
    parts.push({
      cabinet: name,
      partName: 'Ușă Mobilier',
      lengthMm: boxH - DOOR_GAP * 2,
      widthMm: w - DOOR_GAP * 2,
      thicknessMm: 18,
      qty: 1,
      material: facadeMatName,
      grain: 'Vertical',
      edgeBanding: 'Cant ABS 2mm (Perimetral 4 laturi)'
    });
  } else if (archetypeId === 'base_double_door' || archetypeId === 'upper_double_door' || archetypeId === 'base_sink') {
    parts.push({
      cabinet: name,
      partName: 'Ușă Dublă',
      lengthMm: boxH - DOOR_GAP * 2,
      widthMm: Math.round((w - DOOR_GAP * 3) / 2),
      thicknessMm: 18,
      qty: 2,
      material: facadeMatName,
      grain: 'Vertical',
      edgeBanding: 'Cant ABS 2mm (Perimetral 4 laturi)'
    });
  } else if (archetypeId === 'base_drawers_3') {
    const topH = 140;
    const lowerH = Math.round((boxH - topH - DOOR_GAP * 4) / 2);
    parts.push({
      cabinet: name,
      partName: 'Front Sertar Mic (Tacâmuri)',
      lengthMm: topH,
      widthMm: w - DOOR_GAP * 2,
      thicknessMm: 18,
      qty: 1,
      material: facadeMatName,
      grain: 'Orizontal',
      edgeBanding: 'Cant ABS 2mm (Perimetral)'
    });
    parts.push({
      cabinet: name,
      partName: 'Front Sertar Adânc',
      lengthMm: lowerH,
      widthMm: w - DOOR_GAP * 2,
      thicknessMm: 18,
      qty: 2,
      material: facadeMatName,
      grain: 'Orizontal',
      edgeBanding: 'Cant ABS 2mm (Perimetral)'
    });
  } else if (archetypeId === 'upper_aventos') {
    parts.push({
      cabinet: name,
      partName: 'Front Rabatabil Aventos',
      lengthMm: boxH - DOOR_GAP * 2,
      widthMm: w - DOOR_GAP * 2,
      thicknessMm: 18,
      qty: 1,
      material: facadeMatName,
      grain: 'Orizontal',
      edgeBanding: 'Cant ABS 2mm (Perimetral)'
    });
  } else if (archetypeId === 'tall_column') {
    parts.push({
      cabinet: name,
      partName: 'Ușă Coloană Jos',
      lengthMm: 720,
      widthMm: w - DOOR_GAP * 2,
      thicknessMm: 18,
      qty: 1,
      material: facadeMatName,
      grain: 'Vertical',
      edgeBanding: 'Cant ABS 2mm (Perimetral)'
    });
    parts.push({
      cabinet: name,
      partName: 'Ușă Coloană Sus',
      lengthMm: boxH - 720 - DOOR_GAP * 3,
      widthMm: w - DOOR_GAP * 2,
      thicknessMm: 18,
      qty: 1,
      material: facadeMatName,
      grain: 'Vertical',
      edgeBanding: 'Cant ABS 2mm (Perimetral)'
    });
  }

  return parts;
}

/**
 * Converts a list of cutting parts into a standard CSV format with BOM calculations.
 */
export function generateCuttingListCsv(partsList) {
  const headers = [
    'Corp / Modul',
    'Denumire Piesă',
    'Lungime (mm)',
    'Lățime (mm)',
    'Grosime (mm)',
    'Bucăți',
    'Suprafață (mp)',
    'Material',
    'Fibră / Orientare',
    'Cant ABS'
  ];

  let totalSqM = 0;
  let totalParts = 0;

  const rows = partsList.map((p) => {
    const sqM = ((p.lengthMm * p.widthMm) / 1000000) * p.qty;
    totalSqM += sqM;
    totalParts += p.qty;

    return [
      `"${p.cabinet}"`,
      `"${p.partName}"`,
      p.lengthMm,
      p.widthMm,
      p.thicknessMm,
      p.qty,
      sqM.toFixed(3),
      `"${p.material}"`,
      `"${p.grain}"`,
      `"${p.edgeBanding}"`
    ].join(';');
  });

  // Summary Row
  rows.push('');
  rows.push(`"TOTAL";"Piese: ${totalParts}";;;;${totalParts};${totalSqM.toFixed(3)};"PAL / MDF Total mp";;`);

  return '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
}

/**
 * Triggers a file download in the browser.
 */
export function downloadFile(content, fileName, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports a Three.js Object3D into a binary .GLB ArrayBuffer.
 */
export function exportToGlbArrayBuffer(object3D) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      object3D,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          // If JSON returned, stringify to blob arraybuffer
          const str = JSON.stringify(result);
          const buf = new TextEncoder().encode(str).buffer;
          resolve(buf);
        }
      },
      (error) => reject(error),
      { binary: true }
    );
  });
}

