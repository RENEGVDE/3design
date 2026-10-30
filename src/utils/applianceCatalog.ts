/**
 * CAD Appliance Catalog & Procedural 3D Generator
 * Industrial-grade built-in and freestanding kitchen appliances.
 * Completely procedural Three.js geometry with realistic materials, fine details,
 * snap points, and engineering specifications for BOM / technical reports.
 */

import * as THREE from 'three';

export type ApplianceType =
  | 'oven_60'
  | 'microwave_60'
  | 'hob_induction_60'
  | 'hob_induction_90'
  | 'sink_single_tap'
  | 'sink_double_tap'
  | 'hood_telescopic_60'
  | 'hood_box_60'
  | 'dishwasher_60'
  | 'dishwasher_45'
  | 'refrigerator_tall_60'
  | 'coffee_machine_60';

export interface ApplianceDefinition {
  type: ApplianceType;
  category: 'cooking' | 'cleaning' | 'cooling' | 'ventilation';
  nameRo: string;
  nameEn: string;
  nameRu: string;
  defaultDimensions: { width: number; depth: number; height: number }; // in mm
  nicheDimensions: { width: number; depth: number; height: number }; // required cabinet cutout in mm
  powerKw: number;
  waterSupply: boolean;
  waterDrain: boolean;
  gasSupply: boolean;
  exhaustDiameterMm?: number;
  mountingType: 'niche' | 'countertop_cutout' | 'upper_cabinet' | 'tall_cabinet';
  finishes: string[];
}

export const APPLIANCE_CATALOG: ApplianceDefinition[] = [
  {
    type: 'oven_60',
    category: 'cooking',
    nameRo: 'Cuptor Încorporabil 60cm',
    nameEn: 'Built-in Oven 60cm',
    nameRu: 'Встраиваемый духовой шкаф 60см',
    defaultDimensions: { width: 595, depth: 565, height: 595 },
    nicheDimensions: { width: 560, depth: 550, height: 590 },
    powerKw: 3.5,
    waterSupply: false,
    waterDrain: false,
    gasSupply: false,
    mountingType: 'niche',
    finishes: ['Sticlă Neagră & Inox', 'Full Black Glass', 'Alb Lucios', 'Graphite Mat']
  },
  {
    type: 'microwave_60',
    category: 'cooking',
    nameRo: 'Cuptor Microunde Încorporabil 60cm',
    nameEn: 'Built-in Microwave 60cm',
    nameRu: 'Встраиваемая микроволновая печь 60см',
    defaultDimensions: { width: 595, depth: 345, height: 382 },
    nicheDimensions: { width: 560, depth: 320, height: 380 },
    powerKw: 1.25,
    waterSupply: false,
    waterDrain: false,
    gasSupply: false,
    mountingType: 'niche',
    finishes: ['Sticlă Neagră & Inox', 'Full Black Glass', 'Alb Lucios']
  },
  {
    type: 'hob_induction_60',
    category: 'cooking',
    nameRo: 'Plită cu Inducție 60cm (4 Zone)',
    nameEn: 'Induction Hob 60cm (4 Zones)',
    nameRu: 'Индукционная варочная панель 60см',
    defaultDimensions: { width: 590, depth: 520, height: 55 },
    nicheDimensions: { width: 560, depth: 490, height: 60 },
    powerKw: 7.4,
    waterSupply: false,
    waterDrain: false,
    gasSupply: false,
    mountingType: 'countertop_cutout',
    finishes: ['Sticlă Ceramică Neagră', 'Sticlă Ceramică Albă']
  },
  {
    type: 'hob_induction_90',
    category: 'cooking',
    nameRo: 'Plită cu Inducție 90cm (5 Zone Flex)',
    nameEn: 'Induction Hob 90cm (5 Zones Flex)',
    nameRu: 'Индукционная варочная панель 90см Flex',
    defaultDimensions: { width: 880, depth: 520, height: 55 },
    nicheDimensions: { width: 850, depth: 490, height: 60 },
    powerKw: 11.1,
    waterSupply: false,
    waterDrain: false,
    gasSupply: false,
    mountingType: 'countertop_cutout',
    finishes: ['Sticlă Ceramică Neagră']
  },
  {
    type: 'sink_single_tap',
    category: 'cleaning',
    nameRo: 'Chiuvetă Inox + Picurător & Baterie Înaltă',
    nameEn: 'Stainless Sink + Drainer & High Tap',
    nameRu: 'Мойка нержавеющая сталь с крылом и смесителем',
    defaultDimensions: { width: 780, depth: 500, height: 210 },
    nicheDimensions: { width: 750, depth: 470, height: 220 },
    powerKw: 0,
    waterSupply: true,
    waterDrain: true,
    gasSupply: false,
    mountingType: 'countertop_cutout',
    finishes: ['Inox Periat Satin', 'Compozit Granit Negru', 'Compozit Granit Bej']
  },
  {
    type: 'sink_double_tap',
    category: 'cleaning',
    nameRo: 'Chiuvetă Dublă Granit Compozit & Baterie',
    nameEn: 'Double Bowl Granite Sink & Mixer Tap',
    nameRu: 'Двойная гранитная мойка со смесителем',
    defaultDimensions: { width: 860, depth: 500, height: 220 },
    nicheDimensions: { width: 830, depth: 470, height: 230 },
    powerKw: 0,
    waterSupply: true,
    waterDrain: true,
    gasSupply: false,
    mountingType: 'countertop_cutout',
    finishes: ['Compozit Granit Negru', 'Compozit Granit Gri Ciment', 'Inox Periat']
  },
  {
    type: 'hood_telescopic_60',
    category: 'ventilation',
    nameRo: 'Hotă Telescopică Încorporabilă 60cm',
    nameEn: 'Telescopic Cooker Hood 60cm',
    nameRu: 'Телескопическая вытяжка 60см',
    defaultDimensions: { width: 598, depth: 300, height: 180 },
    nicheDimensions: { width: 600, depth: 320, height: 400 },
    powerKw: 0.25,
    waterSupply: false,
    waterDrain: false,
    gasSupply: false,
    exhaustDiameterMm: 150,
    mountingType: 'upper_cabinet',
    finishes: ['Inox & Sticlă Neagră', 'Full Black Mat', 'Alb']
  },
  {
    type: 'hood_box_60',
    category: 'ventilation',
    nameRo: 'Hotă Decorativă Încorporată 60cm',
    nameEn: 'Integrated Box Cooker Hood 60cm',
    nameRu: 'Встраиваемая вытяжка скрытого монтажа 60см',
    defaultDimensions: { width: 598, depth: 290, height: 280 },
    nicheDimensions: { width: 600, depth: 320, height: 360 },
    powerKw: 0.28,
    waterSupply: false,
    waterDrain: false,
    gasSupply: false,
    exhaustDiameterMm: 150,
    mountingType: 'upper_cabinet',
    finishes: ['Inox Periat', 'Negru Mat']
  },
  {
    type: 'dishwasher_60',
    category: 'cleaning',
    nameRo: 'Mașină Spălat Vase Total Încorporabilă 60cm',
    nameEn: 'Fully Integrated Dishwasher 60cm',
    nameRu: 'Полновстраиваемая посудомоечная машина 60см',
    defaultDimensions: { width: 598, depth: 550, height: 815 },
    nicheDimensions: { width: 600, depth: 570, height: 820 },
    powerKw: 2.1,
    waterSupply: true,
    waterDrain: true,
    gasSupply: false,
    mountingType: 'niche',
    finishes: ['Panou Control Inox In-Door']
  },
  {
    type: 'dishwasher_45',
    category: 'cleaning',
    nameRo: 'Mașină Spălat Vase Total Încorporabilă 45cm',
    nameEn: 'Fully Integrated Dishwasher 45cm',
    nameRu: 'Полновстраиваемая посудомоечная машина 45см',
    defaultDimensions: { width: 448, depth: 550, height: 815 },
    nicheDimensions: { width: 450, depth: 570, height: 820 },
    powerKw: 1.9,
    waterSupply: true,
    waterDrain: true,
    gasSupply: false,
    mountingType: 'niche',
    finishes: ['Panou Control Inox In-Door']
  },
  {
    type: 'refrigerator_tall_60',
    category: 'cooling',
    nameRo: 'Frigider Combină Încorporabil 178cm',
    nameEn: 'Built-in Fridge-Freezer 178cm',
    nameRu: 'Встраиваемый двухкамерный холодильник 178см',
    defaultDimensions: { width: 540, depth: 545, height: 1772 },
    nicheDimensions: { width: 560, depth: 550, height: 1780 },
    powerKw: 0.18,
    waterSupply: false,
    waterDrain: false,
    gasSupply: false,
    mountingType: 'tall_cabinet',
    finishes: ['Montaj Uși Glisante / Pantograf']
  },
  {
    type: 'coffee_machine_60',
    category: 'cooking',
    nameRo: 'Espressor Automat Încorporabil 60x45cm',
    nameEn: 'Built-in Automatic Coffee Machine 60x45cm',
    nameRu: 'Встраиваемая кофемашина 60х45см',
    defaultDimensions: { width: 595, depth: 455, height: 455 },
    nicheDimensions: { width: 560, depth: 550, height: 450 },
    powerKw: 1.5,
    waterSupply: false,
    waterDrain: false,
    gasSupply: false,
    mountingType: 'niche',
    finishes: ['Sticlă Neagră & Inox', 'Full Black Mat']
  }
];

export interface ApplianceInstance {
  id: string;
  type: ApplianceType;
  name: string;
  position: { x: number; y: number; z: number }; // in meters (Three.js world coords)
  rotation: { x: number; y: number; z: number }; // in radians
  dimensions: { width: number; depth: number; height: number }; // in mm
  finish: string;
  attachedToCabinetId?: string;
  powerKw: number;
}

// ============================================================================
// Procedural Materials Pool
// ============================================================================
function createMaterialPalette(finish: string) {
  const isBlack = finish.toLowerCase().includes('black') || finish.toLowerCase().includes('negru');
  const isWhite = finish.toLowerCase().includes('alb') || finish.toLowerCase().includes('white');

  const blackGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x121316),
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 0.95
  });

  const tintedGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x1a2228),
    roughness: 0.1,
    transmission: 0.6,
    opacity: 0.85,
    transparent: true,
    reflectivity: 0.9
  });

  const inoxMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xd6d8dc),
    roughness: 0.32,
    metalness: 0.88
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xf0f2f5),
    roughness: 0.1,
    metalness: 0.98
  });

  const darkBodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x282a2e),
    roughness: 0.6,
    metalness: 0.4
  });

  const ledBlueMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x38bdf8)
  });

  const ledRedMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xef4444)
  });

  const ceramicHobMat = new THREE.MeshPhysicalMaterial({
    color: isWhite ? new THREE.Color(0xf5f6f8) : new THREE.Color(0x0d0e11),
    roughness: 0.04,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03
  });

  const graniteBlackMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x222428),
    roughness: 0.75,
    metalness: 0.1
  });

  return {
    blackGlassMat,
    tintedGlassMat,
    inoxMat,
    chromeMat,
    darkBodyMat,
    ledBlueMat,
    ledRedMat,
    ceramicHobMat,
    graniteBlackMat
  };
}

// ============================================================================
// Procedural Appliance 3D Generators
// ============================================================================

/**
 * Builds a 3D Three.js Group for any appliance type
 */
export function buildAppliance3DModel(instance: ApplianceInstance): THREE.Group {
  const root = new THREE.Group();
  root.name = `appliance_${instance.type}_${instance.id}`;
  root.userData = {
    isAppliance: true,
    applianceId: instance.id,
    applianceType: instance.type,
    name: instance.name
  };

  const mats = createMaterialPalette(instance.finish || '');
  const w = instance.dimensions.width / 1000;
  const d = instance.dimensions.depth / 1000;
  const h = instance.dimensions.height / 1000;

  switch (instance.type) {
    case 'oven_60':
      buildOven60(root, w, d, h, mats);
      break;
    case 'microwave_60':
      buildMicrowave60(root, w, d, h, mats);
      break;
    case 'hob_induction_60':
    case 'hob_induction_90':
      buildInductionHob(root, w, d, h, mats, instance.type === 'hob_induction_90');
      break;
    case 'sink_single_tap':
    case 'sink_double_tap':
      buildKitchenSink(root, w, d, h, mats, instance.type === 'sink_double_tap');
      break;
    case 'hood_telescopic_60':
    case 'hood_box_60':
      buildCookerHood(root, w, d, h, mats, instance.type === 'hood_telescopic_60');
      break;
    case 'dishwasher_60':
    case 'dishwasher_45':
      buildDishwasher(root, w, d, h, mats);
      break;
    case 'refrigerator_tall_60':
      buildIntegratedFridge(root, w, d, h, mats);
      break;
    case 'coffee_machine_60':
      buildCoffeeMachine(root, w, d, h, mats);
      break;
    default:
      buildGenericApplianceBox(root, w, d, h, mats);
      break;
  }

  // Set position & rotation
  root.position.set(instance.position.x, instance.position.y, instance.position.z);
  root.rotation.set(instance.rotation.x, instance.rotation.y, instance.rotation.z);

  return root;
}

// ----------------------------------------------------------------------------
// 1. Built-in Oven 60cm
// ----------------------------------------------------------------------------
function buildOven60(
  root: THREE.Group,
  w: number,
  d: number,
  h: number,
  mats: ReturnType<typeof createMaterialPalette>
) {
  // Main niche insert body (recessed back into cabinet)
  const bodyDepth = d - 0.025; // 25mm front overlap
  const bodyWidth = w - 0.035;
  const bodyHeight = h - 0.02;
  const bodyGeom = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
  const bodyMesh = new THREE.Mesh(bodyGeom, mats.darkBodyMat);
  bodyMesh.position.set(0, h / 2, -bodyDepth / 2);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // Front glass door (flush with cabinet front at z = 0)
  const doorThickness = 0.025;
  const doorGeom = new THREE.BoxGeometry(w, h, doorThickness);
  const doorMesh = new THREE.Mesh(doorGeom, mats.blackGlassMat);
  doorMesh.position.set(0, h / 2, doorThickness / 2);
  doorMesh.castShadow = true;
  root.add(doorMesh);

  // Oven viewing window (tinted inner glass)
  const windowGeom = new THREE.BoxGeometry(w * 0.72, h * 0.52, 0.005);
  const windowMesh = new THREE.Mesh(windowGeom, mats.tintedGlassMat);
  windowMesh.position.set(0, h * 0.42, doorThickness / 2 + 0.013);
  root.add(windowMesh);

  // Upper control panel display (Black glass + digital clock)
  const displayGeom = new THREE.BoxGeometry(w * 0.28, 0.032, 0.002);
  const displayMesh = new THREE.Mesh(displayGeom, mats.ledBlueMat);
  displayMesh.position.set(0, h * 0.88, doorThickness / 2 + 0.014);
  root.add(displayMesh);

  // Control knobs (2 stainless steel rotary encoders)
  const knobGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.018, 24);
  knobGeom.rotateX(Math.PI / 2);
  const knobLeft = new THREE.Mesh(knobGeom, mats.inoxMat);
  knobLeft.position.set(-w * 0.36, h * 0.88, doorThickness / 2 + 0.018);
  const knobRight = new THREE.Mesh(knobGeom, mats.inoxMat);
  knobRight.position.set(w * 0.36, h * 0.88, doorThickness / 2 + 0.018);
  root.add(knobLeft, knobRight);

  // Solid horizontal door handle
  const handleBarGeom = new THREE.CylinderGeometry(0.009, 0.009, w * 0.76, 16);
  handleBarGeom.rotateZ(Math.PI / 2);
  const handleBar = new THREE.Mesh(handleBarGeom, mats.inoxMat);
  handleBar.position.set(0, h * 0.74, doorThickness / 2 + 0.045);
  handleBar.castShadow = true;

  // Handle standoffs
  const standoffGeom = new THREE.CylinderGeometry(0.008, 0.008, 0.032, 16);
  standoffGeom.rotateX(Math.PI / 2);
  const standLeft = new THREE.Mesh(standoffGeom, mats.inoxMat);
  standLeft.position.set(-w * 0.33, h * 0.74, doorThickness / 2 + 0.026);
  const standRight = new THREE.Mesh(standoffGeom, mats.inoxMat);
  standRight.position.set(w * 0.33, h * 0.74, doorThickness / 2 + 0.026);
  root.add(handleBar, standLeft, standRight);
}

// ----------------------------------------------------------------------------
// 2. Built-in Microwave 60cm
// ----------------------------------------------------------------------------
function buildMicrowave60(
  root: THREE.Group,
  w: number,
  d: number,
  h: number,
  mats: ReturnType<typeof createMaterialPalette>
) {
  const bodyDepth = d - 0.022;
  const bodyWidth = w - 0.035;
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, h - 0.02, bodyDepth), mats.darkBodyMat);
  bodyMesh.position.set(0, h / 2, -bodyDepth / 2);
  root.add(bodyMesh);

  // Front bezel frame
  const doorThickness = 0.022;
  const frontFrame = new THREE.Mesh(new THREE.BoxGeometry(w, h, doorThickness), mats.blackGlassMat);
  frontFrame.position.set(0, h / 2, doorThickness / 2);
  root.add(frontFrame);

  // Door window (offset to left)
  const winW = w * 0.62;
  const winH = h * 0.7;
  const winMesh = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.004), mats.tintedGlassMat);
  winMesh.position.set(-w * 0.14, h / 2, doorThickness / 2 + 0.012);
  root.add(winMesh);

  // Side touch / dial panel (offset to right)
  const dialGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.012, 24);
  dialGeom.rotateX(Math.PI / 2);
  const dialMesh = new THREE.Mesh(dialGeom, mats.inoxMat);
  dialMesh.position.set(w * 0.34, h * 0.45, doorThickness / 2 + 0.014);

  const displayMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, 0.03, 0.002), mats.ledBlueMat);
  displayMesh.position.set(w * 0.34, h * 0.78, doorThickness / 2 + 0.012);

  // Push button door opener
  const buttonMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, 0.04, 0.008), mats.inoxMat);
  buttonMesh.position.set(w * 0.34, h * 0.18, doorThickness / 2 + 0.012);

  root.add(dialMesh, displayMesh, buttonMesh);
}

// ----------------------------------------------------------------------------
// 3. Induction Hob (60cm / 90cm)
// ----------------------------------------------------------------------------
function buildInductionHob(
  root: THREE.Group,
  w: number,
  d: number,
  h: number,
  mats: ReturnType<typeof createMaterialPalette>,
  is90cm: boolean
) {
  // Ultra-thin top ceramic glass plate
  const glassThickness = 0.006;
  const plateGeom = new THREE.BoxGeometry(w, glassThickness, d);
  const plateMesh = new THREE.Mesh(plateGeom, mats.ceramicHobMat);
  plateMesh.position.set(0, glassThickness / 2, 0);
  plateMesh.receiveShadow = true;
  root.add(plateMesh);

  // Underside casing (drops below countertop)
  const underBox = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.04, h, d - 0.04),
    mats.darkBodyMat
  );
  underBox.position.set(0, -h / 2, 0);
  root.add(underBox);

  // Cooking zones (procedural ring decals / cylinders)
  const zoneMat = mats.ledRedMat;
  const createRing = (radius: number, cx: number, cz: number) => {
    const ringGeom = new THREE.RingGeometry(radius - 0.006, radius, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeom, zoneMat);
    ringMesh.position.set(cx, glassThickness + 0.0005, cz);
    root.add(ringMesh);

    // Crosshairs in the center of ring
    const cross1 = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.003), zoneMat);
    cross1.rotateX(-Math.PI / 2);
    cross1.position.set(cx, glassThickness + 0.0006, cz);
    const cross2 = new THREE.Mesh(new THREE.PlaneGeometry(0.003, 0.024), zoneMat);
    cross2.rotateX(-Math.PI / 2);
    cross2.position.set(cx, glassThickness + 0.0006, cz);
    root.add(cross1, cross2);
  };

  if (!is90cm) {
    // 4 zones for 60cm
    createRing(0.09, -w * 0.25, -d * 0.22);
    createRing(0.075, w * 0.26, -d * 0.22);
    createRing(0.075, -w * 0.25, d * 0.18);
    createRing(0.105, w * 0.26, d * 0.18);
  } else {
    // 5 zones for 90cm (Central large paella zone + bridge zones)
    createRing(0.13, 0, -d * 0.05);
    createRing(0.085, -w * 0.32, -d * 0.22);
    createRing(0.085, -w * 0.32, d * 0.18);
    createRing(0.085, w * 0.32, -d * 0.22);
    createRing(0.085, w * 0.32, d * 0.18);
  }

  // Front touch controls slider strip
  const sliderMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.32, 0.016),
    mats.ledRedMat
  );
  sliderMesh.rotateX(-Math.PI / 2);
  sliderMesh.position.set(0, glassThickness + 0.0006, d * 0.42);
  root.add(sliderMesh);
}

// ----------------------------------------------------------------------------
// 4. Kitchen Sink with Drainboard & Mixer Tap
// ----------------------------------------------------------------------------
function buildKitchenSink(
  root: THREE.Group,
  w: number,
  d: number,
  h: number,
  mats: ReturnType<typeof createMaterialPalette>,
  isDouble: boolean
) {
  const rimThickness = 0.008;
  const rimMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, rimThickness, d),
    mats.inoxMat
  );
  rimMesh.position.set(0, rimThickness / 2, 0);
  root.add(rimMesh);

  // Basin basin drop-down box
  const bowlW = isDouble ? w * 0.4 : w * 0.48;
  const bowlD = d * 0.76;
  const bowlH = h;
  const bowl1 = new THREE.Mesh(
    new THREE.BoxGeometry(bowlW, bowlH, bowlD),
    mats.inoxMat
  );
  bowl1.position.set(isDouble ? -w * 0.22 : -w * 0.18, -bowlH / 2, 0);
  root.add(bowl1);

  if (isDouble) {
    const bowl2 = new THREE.Mesh(
      new THREE.BoxGeometry(bowlW, bowlH, bowlD),
      mats.inoxMat
    );
    bowl2.position.set(w * 0.22, -bowlH / 2, 0);
    root.add(bowl2);
  } else {
    // Ribbed drainboard lines on the right side
    const numRibs = 7;
    for (let i = 0; i < numRibs; i++) {
      const ribX = w * 0.12 + (i * (w * 0.3)) / numRibs;
      const rib = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, d * 0.65, 8),
        mats.chromeMat
      );
      rib.position.set(ribX, rimThickness + 0.002, 0);
      rib.rotateZ(Math.PI / 2);
      rib.rotateY(Math.PI / 2);
      root.add(rib);
    }
  }

  // Metallic Drain strainer in bowl bottom
  const drainStrainer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.004, 24),
    mats.chromeMat
  );
  drainStrainer.position.set(isDouble ? -w * 0.22 : -w * 0.18, -bowlH + 0.002, 0);
  root.add(drainStrainer);

  // Swan-neck Mixer Tap
  buildSwivelMixerTap(root, isDouble ? 0 : -w * 0.18, d * 0.38, mats.chromeMat);
}

function buildSwivelMixerTap(parent: THREE.Group, x: number, z: number, mat: THREE.Material) {
  const tapGroup = new THREE.Group();
  tapGroup.position.set(x, 0.008, z);

  // Base collar
  const baseGeom = new THREE.CylinderGeometry(0.024, 0.028, 0.035, 24);
  const base = new THREE.Mesh(baseGeom, mat);
  base.position.set(0, 0.0175, 0);
  tapGroup.add(base);

  // Vertical stem
  const stemGeom = new THREE.CylinderGeometry(0.014, 0.014, 0.22, 24);
  const stem = new THREE.Mesh(stemGeom, mat);
  stem.position.set(0, 0.14, 0);
  tapGroup.add(stem);

  // Arched neck (torus curve)
  const neckGeom = new THREE.TorusGeometry(0.08, 0.013, 16, 32, Math.PI);
  const neck = new THREE.Mesh(neckGeom, mat);
  neck.position.set(0.08, 0.25, 0);
  neck.rotateZ(Math.PI);
  tapGroup.add(neck);

  // Aerator nozzle tip
  const nozzleGeom = new THREE.CylinderGeometry(0.015, 0.013, 0.035, 16);
  const nozzle = new THREE.Mesh(nozzleGeom, mat);
  nozzle.position.set(0.16, 0.22, 0);
  tapGroup.add(nozzle);

  // Control single lever
  const leverHubGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 16);
  leverHubGeom.rotateZ(Math.PI / 2);
  const leverHub = new THREE.Mesh(leverHubGeom, mat);
  leverHub.position.set(-0.028, 0.065, 0);
  const leverRodGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.085, 12);
  leverRodGeom.rotateX(0.2);
  const leverRod = new THREE.Mesh(leverRodGeom, mat);
  leverRod.position.set(-0.035, 0.1, 0.01);
  tapGroup.add(leverHub, leverRod);

  parent.add(tapGroup);
}

// ----------------------------------------------------------------------------
// 5. Cooker Hood (Telescopic & Box)
// ----------------------------------------------------------------------------
function buildCookerHood(
  root: THREE.Group,
  w: number,
  d: number,
  h: number,
  mats: ReturnType<typeof createMaterialPalette>,
  isTelescopic: boolean
) {
  // Main body box inside upper cabinet
  const bodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.02, h, d - 0.02),
    mats.inoxMat
  );
  bodyMesh.position.set(0, h / 2, 0);
  root.add(bodyMesh);

  // Lower filter grilles
  const filterMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.88, 0.01, d * 0.78),
    mats.inoxMat
  );
  filterMesh.position.set(0, 0.005, 0);
  root.add(filterMesh);

  // LED spotlights on underside
  const spotGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.005, 16);
  const spot1 = new THREE.Mesh(spotGeom, mats.ledBlueMat);
  spot1.position.set(-w * 0.28, 0.002, -d * 0.3);
  const spot2 = new THREE.Mesh(spotGeom, mats.ledBlueMat);
  spot2.position.set(w * 0.28, 0.002, -d * 0.3);
  root.add(spot1, spot2);

  // Front pull-out visor strip (if telescopic)
  if (isTelescopic) {
    const visorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.038, 0.035),
      mats.inoxMat
    );
    visorMesh.position.set(0, 0.019, d / 2 + 0.017);
    root.add(visorMesh);
  }
}

// ----------------------------------------------------------------------------
// 6. Built-in Dishwasher
// ----------------------------------------------------------------------------
function buildDishwasher(
  root: THREE.Group,
  w: number,
  d: number,
  h: number,
  mats: ReturnType<typeof createMaterialPalette>
) {
  // Galvanized steel chassis
  const chassisMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.01, h - 0.01, d - 0.02),
    mats.darkBodyMat
  );
  chassisMesh.position.set(0, h / 2, -d / 2);
  root.add(chassisMesh);

  // Top concealed control strip (visible when door cracked open)
  const stripH = 0.085;
  const topStrip = new THREE.Mesh(
    new THREE.BoxGeometry(w, stripH, 0.03),
    mats.inoxMat
  );
  topStrip.position.set(0, h - stripH / 2, 0.015);
  root.add(topStrip);

  // LED indicators on control strip
  const ledMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.25, 0.015, 0.002), mats.ledRedMat);
  ledMesh.position.set(0, h - stripH / 2, 0.031);
  root.add(ledMesh);

  // Front mounting panel indicator outline (shows furniture panel attachment)
  const panelOutline = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.004, h - stripH - 0.004, 0.018),
    mats.darkBodyMat
  );
  panelOutline.position.set(0, (h - stripH) / 2, 0.009);
  root.add(panelOutline);
}

// ----------------------------------------------------------------------------
// 7. Built-in Refrigerator / Tall Column
// ----------------------------------------------------------------------------
function buildIntegratedFridge(
  root: THREE.Group,
  w: number,
  d: number,
  h: number,
  mats: ReturnType<typeof createMaterialPalette>
) {
  const bodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mats.darkBodyMat
  );
  bodyMesh.position.set(0, h / 2, -d / 2);
  root.add(bodyMesh);

  // Split doors (upper fridge 65%, lower freezer 35%)
  const freezerH = h * 0.35;
  const fridgeH = h * 0.64;

  const freezerDoor = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.01, freezerH, 0.02),
    mats.inoxMat
  );
  freezerDoor.position.set(0, freezerH / 2, 0.01);

  const fridgeDoor = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.01, fridgeH, 0.02),
    mats.inoxMat
  );
  fridgeDoor.position.set(0, freezerH + 0.01 + fridgeH / 2, 0.01);

  root.add(freezerDoor, fridgeDoor);

  // Bottom ventilation plinth grille
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.04, 0.06, 0.015),
    mats.darkBodyMat
  );
  grille.position.set(0, -0.03, 0.007);
  root.add(grille);
}

// ----------------------------------------------------------------------------
// 8. Built-in Automatic Coffee Machine
// ----------------------------------------------------------------------------
function buildCoffeeMachine(
  root: THREE.Group,
  w: number,
  d: number,
  h: number,
  mats: ReturnType<typeof createMaterialPalette>
) {
  // Body inside cabinet
  const bodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.03, h - 0.02, d - 0.03),
    mats.darkBodyMat
  );
  bodyMesh.position.set(0, h / 2, -d / 2);
  root.add(bodyMesh);

  // Front glass & inox fascia
  const frontFascia = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.024),
    mats.blackGlassMat
  );
  frontFascia.position.set(0, h / 2, 0.012);
  root.add(frontFascia);

  // LCD display in center upper
  const lcd = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.32, 0.055, 0.002),
    mats.ledBlueMat
  );
  lcd.position.set(0, h * 0.78, 0.025);
  root.add(lcd);

  // Dispenser alcove recess
  const alcoveGeom = new THREE.BoxGeometry(w * 0.65, h * 0.44, 0.1);
  const alcoveMesh = new THREE.Mesh(alcoveGeom, mats.darkBodyMat);
  alcoveMesh.position.set(0, h * 0.42, 0);
  root.add(alcoveMesh);

  // Dual coffee dispensing nozzles
  const nozzleGeom = new THREE.CylinderGeometry(0.008, 0.008, 0.035, 16);
  const noz1 = new THREE.Mesh(nozzleGeom, mats.chromeMat);
  noz1.position.set(-0.02, h * 0.52, 0.015);
  const noz2 = new THREE.Mesh(nozzleGeom, mats.chromeMat);
  noz2.position.set(0.02, h * 0.52, 0.015);
  root.add(noz1, noz2);

  // Stainless drip tray grille
  const dripTray = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.62, 0.015, 0.09),
    mats.inoxMat
  );
  dripTray.position.set(0, h * 0.21, 0.015);
  root.add(dripTray);
}

// ----------------------------------------------------------------------------
// Generic Fallback
// ----------------------------------------------------------------------------
function buildGenericApplianceBox(
  root: THREE.Group,
  w: number,
  d: number,
  h: number,
  mats: ReturnType<typeof createMaterialPalette>
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.inoxMat);
  mesh.position.set(0, h / 2, 0);
  root.add(mesh);
}

