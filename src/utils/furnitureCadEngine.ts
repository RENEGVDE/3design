import * as THREE from 'three';

export type EdgeThickness = 'none' | '0.4mm' | '1mm' | '2mm';
export type PartRole =
  | 'carcass'
  | 'front'
  | 'back'
  | 'countertop'
  | 'plinth'
  | 'shelf'
  | 'hardware';
export type PartShape =
  | 'rect'
  | 'l_cut'
  | 'chamfer'
  | 'rounded'
  | 'mansard_slope';
export type PartMotionType =
  | 'none'
  | 'hinge_l'
  | 'hinge_r'
  | 'drawer'
  | 'sliding'
  | 'lift';
export type CompartmentFill =
  | 'open'
  | 'shelves'
  | 'drawers'
  | 'door_left'
  | 'door_right'
  | 'door_double'
  | 'door_lift'
  | 'door_sliding'
  | 'rail';
export type FurnitureTemplateId =
  | 'blank'
  | 'base_cabinet'
  | 'upper_cabinet'
  | 'tall_column'
  | 'wardrobe_sliding'
  | 'wardrobe_hinged'
  | 'chest_drawers'
  | 'tv_console'
  | 'bookcase'
  | 'office_desk'
  | 'l_desk'
  | 'bathroom_vanity'
  | 'mansard_wardrobe';

export interface ShapeParams {
  cutWidthMm?: number;
  cutDepthMm?: number;
  chamferMm?: number;
  radiusMm?: number;
  slopeDropMm?: number;
}

export interface CadPart {
  id: string;
  name: string;
  role: PartRole;
  shape: PartShape;
  shapeParams?: ShapeParams;
  /** length = local X span (mm), width = local Z span (mm), thickness = local Y span (mm) */
  dimensionsMm: {
    length: number;
    width: number;
    thickness: number;
  };
  /** Center position relative to assembly origin (floor center X=0, Y=0 floor, Z=0 center) in mm */
  localPosMm: {
    x: number;
    y: number;
    z: number;
  };
  localRotDeg: {
    x: number;
    y: number;
    z: number;
  };
  grain: 'length' | 'width' | 'none';
  edges: {
    top: EdgeThickness;
    bottom: EdgeThickness;
    left: EdgeThickness;
    right: EdgeThickness;
  };
  motion: {
    type: PartMotionType;
    openAmount?: number;
  };
  materialId?: string | null;
  sourceNodeId?: string;
}

export interface CompartmentNode {
  id: string;
  label?: string;
  splitAxis?: 'vertical' | 'horizontal' | null;
  children?: CompartmentNode[];
  ratios?: number[];
  fill?: CompartmentFill;
  shelvesCount?: number;
  drawersCount?: number;
  hasRail?: boolean;
}

export interface FurnitureAssembly {
  id: string;
  name: string;
  templateId: FurnitureTemplateId;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  boardThicknessMm: number;
  backThicknessMm: number;
  plinthHeightMm: number;
  hasTopPanel: boolean;
  hasBottomPanel: boolean;
  hasBackPanel: boolean;
  hasCountertop: boolean;
  handleType: 'none' | 'bar' | 'knob' | 'gola';
  rootNode: CompartmentNode;
  parts: CadPart[];
}

export interface FurnitureTemplateMeta {
  id: FurnitureTemplateId;
  category: 'custom' | 'kitchen' | 'wardrobe' | 'living' | 'bedroom' | 'office';
  nameRo: string;
  nameEn: string;
  nameRu: string;
  defaultW: number;
  defaultH: number;
  defaultD: number;
  plinthMm: number;
  hasTop: boolean;
  hasBottom: boolean;
  hasBack: boolean;
  hasCountertop: boolean;
}

export const FURNITURE_TEMPLATES: FurnitureTemplateMeta[] = [
  {
    id: 'blank',
    category: 'custom',
    nameRo: 'Asamblare Liberă (Blank)',
    nameEn: 'Blank Custom Assembly',
    nameRu: 'Свободная сборка',
    defaultW: 800,
    defaultH: 800,
    defaultD: 500,
    plinthMm: 0,
    hasTop: false,
    hasBottom: false,
    hasBack: false,
    hasCountertop: false
  },
  {
    id: 'base_cabinet',
    category: 'kitchen',
    nameRo: 'Corp Bază Bucătărie',
    nameEn: 'Kitchen Base Cabinet',
    nameRu: 'Нижний шкаф кухни',
    defaultW: 600,
    defaultH: 820,
    defaultD: 560,
    plinthMm: 100,
    hasTop: true,
    hasBottom: true,
    hasBack: true,
    hasCountertop: true
  },
  {
    id: 'upper_cabinet',
    category: 'kitchen',
    nameRo: 'Corp Suspendat',
    nameEn: 'Upper Wall Cabinet',
    nameRu: 'Навесной шкаф',
    defaultW: 800,
    defaultH: 720,
    defaultD: 320,
    plinthMm: 0,
    hasTop: true,
    hasBottom: true,
    hasBack: true,
    hasCountertop: false
  },
  {
    id: 'tall_column',
    category: 'kitchen',
    nameRo: 'Coloană Înaltă Soldat',
    nameEn: 'Tall Column Unit',
    nameRu: 'Высокий пенал',
    defaultW: 600,
    defaultH: 2100,
    defaultD: 560,
    plinthMm: 100,
    hasTop: true,
    hasBottom: true,
    hasBack: true,
    hasCountertop: false
  },
  {
    id: 'wardrobe_sliding',
    category: 'wardrobe',
    nameRo: 'Dressing Uși Culisante',
    nameEn: 'Sliding Wardrobe',
    nameRu: 'Шкаф-купе',
    defaultW: 2000,
    defaultH: 2400,
    defaultD: 650,
    plinthMm: 80,
    hasTop: true,
    hasBottom: true,
    hasBack: true,
    hasCountertop: false
  },
  {
    id: 'wardrobe_hinged',
    category: 'wardrobe',
    nameRo: 'Dulap Uși Batante',
    nameEn: 'Hinged Wardrobe',
    nameRu: 'Распашной шкаф',
    defaultW: 1200,
    defaultH: 2200,
    defaultD: 600,
    plinthMm: 80,
    hasTop: true,
    hasBottom: true,
    hasBack: true,
    hasCountertop: false
  },
  {
    id: 'mansard_wardrobe',
    category: 'wardrobe',
    nameRo: 'Dulap Mansardă (Înclinat)',
    nameEn: 'Sloped Mansard Wardrobe',
    nameRu: 'Мансардный шкаф',
    defaultW: 1600,
    defaultH: 2100,
    defaultD: 600,
    plinthMm: 80,
    hasTop: false,
    hasBottom: true,
    hasBack: true,
    hasCountertop: false
  },
  {
    id: 'chest_drawers',
    category: 'bedroom',
    nameRo: 'Comodă cu Sertare',
    nameEn: 'Chest of Drawers',
    nameRu: 'Комод',
    defaultW: 900,
    defaultH: 880,
    defaultD: 480,
    plinthMm: 60,
    hasTop: true,
    hasBottom: true,
    hasBack: true,
    hasCountertop: false
  },
  {
    id: 'tv_console',
    category: 'living',
    nameRo: 'Comodă TV Living',
    nameEn: 'TV Media Console',
    nameRu: 'ТВ-тумба',
    defaultW: 1800,
    defaultH: 480,
    defaultD: 420,
    plinthMm: 100,
    hasTop: true,
    hasBottom: true,
    hasBack: true,
    hasCountertop: false
  },
  {
    id: 'bookcase',
    category: 'living',
    nameRo: 'Bibliotecă & Rafturi',
    nameEn: 'Bookcase Shelving',
    nameRu: 'Книжный стеллаж',
    defaultW: 1200,
    defaultH: 2000,
    defaultD: 350,
    plinthMm: 60,
    hasTop: true,
    hasBottom: true,
    hasBack: true,
    hasCountertop: false
  },
  {
    id: 'office_desk',
    category: 'office',
    nameRo: 'Birou de Lucru',
    nameEn: 'Office Desk',
    nameRu: 'Письменный стол',
    defaultW: 1400,
    defaultH: 750,
    defaultD: 650,
    plinthMm: 0,
    hasTop: true,
    hasBottom: false,
    hasBack: false,
    hasCountertop: false
  },
  {
    id: 'l_desk',
    category: 'office',
    nameRo: 'Birou Colțar (Formă L)',
    nameEn: 'L-Shape Corner Desk',
    nameRu: 'Угловой стол L-формы',
    defaultW: 1600,
    defaultH: 750,
    defaultD: 1200,
    plinthMm: 0,
    hasTop: true,
    hasBottom: false,
    hasBack: false,
    hasCountertop: false
  },
  {
    id: 'bathroom_vanity',
    category: 'custom',
    nameRo: 'Mobilier Baie Suspendat',
    nameEn: 'Floating Bathroom Vanity',
    nameRu: 'Тумба в ванную',
    defaultW: 800,
    defaultH: 520,
    defaultD: 460,
    plinthMm: 0,
    hasTop: true,
    hasBottom: true,
    hasBack: true,
    hasCountertop: true
  }
];

function makeId(prefix = 'node'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36).slice(-4)}`;
}

function defaultRootNodeForTemplate(templateId: FurnitureTemplateId): CompartmentNode {
  switch (templateId) {
    case 'blank':
      return { id: makeId('root'), label: 'Spațiu Principal', fill: 'open' };
    case 'base_cabinet':
      return { id: makeId('root'), label: 'Corp Bază', fill: 'door_single' as unknown as CompartmentFill };
    case 'upper_cabinet':
      return { id: makeId('root'), label: 'Suspendat', fill: 'door_double', shelvesCount: 2 };
    case 'tall_column':
      return {
        id: makeId('root'),
        label: 'Coloană',
        splitAxis: 'horizontal',
        ratios: [0.35, 0.65],
        children: [
          { id: makeId('bay'), label: 'Zona Inferioară', fill: 'drawers', drawersCount: 3 },
          { id: makeId('bay'), label: 'Zona Superioară', fill: 'door_left', shelvesCount: 3 }
        ]
      };
    case 'wardrobe_sliding':
      return {
        id: makeId('root'),
        label: 'Dressing',
        splitAxis: 'vertical',
        ratios: [0.5, 0.5],
        children: [
          { id: makeId('bay'), label: 'Secțiune Stânga', fill: 'door_sliding', shelvesCount: 1, hasRail: true },
          { id: makeId('bay'), label: 'Secțiune Dreapta', fill: 'door_sliding', shelvesCount: 4, hasRail: false }
        ]
      };
    case 'wardrobe_hinged':
      return {
        id: makeId('root'),
        label: 'Dulap',
        splitAxis: 'vertical',
        ratios: [0.5, 0.5],
        children: [
          { id: makeId('bay'), label: 'Ușă Stânga', fill: 'door_left', shelvesCount: 1, hasRail: true },
          { id: makeId('bay'), label: 'Ușă Dreapta', fill: 'door_right', shelvesCount: 4 }
        ]
      };
    case 'mansard_wardrobe':
      return {
        id: makeId('root'),
        label: 'Mansardă',
        splitAxis: 'vertical',
        ratios: [0.5, 0.5],
        children: [
          { id: makeId('bay'), label: 'Bay Înalt', fill: 'door_left', shelvesCount: 3 },
          { id: makeId('bay'), label: 'Bay Înclinat', fill: 'shelves', shelvesCount: 2 }
        ]
      };
    case 'chest_drawers':
      return { id: makeId('root'), label: 'Sertare', fill: 'drawers', drawersCount: 4 };
    case 'tv_console':
      return {
        id: makeId('root'),
        label: 'Comodă TV',
        splitAxis: 'vertical',
        ratios: [0.33, 0.34, 0.33],
        children: [
          { id: makeId('bay'), label: 'Stânga', fill: 'door_left', shelvesCount: 1 },
          { id: makeId('bay'), label: 'Centru Media', fill: 'shelves', shelvesCount: 1 },
          { id: makeId('bay'), label: 'Dreapta', fill: 'door_right', shelvesCount: 1 }
        ]
      };
    case 'bookcase':
      return {
        id: makeId('root'),
        label: 'Rafturi',
        splitAxis: 'vertical',
        ratios: [0.5, 0.5],
        children: [
          { id: makeId('bay'), label: 'Coloană 1', fill: 'shelves', shelvesCount: 4 },
          { id: makeId('bay'), label: 'Coloană 2', fill: 'shelves', shelvesCount: 4 }
        ]
      };
    case 'office_desk':
    case 'l_desk':
      return {
        id: makeId('root'),
        label: 'Birou',
        splitAxis: 'vertical',
        ratios: [0.68, 0.32],
        children: [
          { id: makeId('bay'), label: 'Loc Picioare', fill: 'open' },
          { id: makeId('bay'), label: 'Rollbox Sertare', fill: 'drawers', drawersCount: 3 }
        ]
      };
    case 'bathroom_vanity':
      return { id: makeId('root'), label: 'Lavoar', fill: 'drawers', drawersCount: 2 };
    default:
      return { id: makeId('root'), label: 'Corp', fill: 'open' };
  }
}

export function createAssemblyFromTemplate(
  templateId: FurnitureTemplateId,
  customName?: string,
  overrides?: Partial<FurnitureAssembly>
): FurnitureAssembly {
  const meta =
    FURNITURE_TEMPLATES.find((t) => t.id === templateId) || FURNITURE_TEMPLATES[1];

  let rootNode = defaultRootNodeForTemplate(templateId);
  if (templateId === 'base_cabinet') {
    rootNode = { id: makeId('root'), label: 'Corp Bază', fill: 'door_left', shelvesCount: 1 };
  }

  const base: FurnitureAssembly = {
    id: makeId('asm'),
    name: customName || meta.nameRo,
    templateId,
    widthMm: meta.defaultW,
    heightMm: meta.defaultH,
    depthMm: meta.defaultD,
    boardThicknessMm: 18,
    backThicknessMm: 4,
    plinthHeightMm: meta.plinthMm,
    hasTopPanel: meta.hasTop,
    hasBottomPanel: meta.hasBottom,
    hasBackPanel: meta.hasBack,
    hasCountertop: meta.hasCountertop,
    handleType: 'bar',
    rootNode,
    parts: [],
    ...overrides
  };

  return regenerateAssemblyParts(base);
}

const DEFAULT_EDGES = (
  all: EdgeThickness = '1mm',
  front: EdgeThickness = '2mm'
): CadPart['edges'] => ({
  top: front,
  bottom: all,
  left: all,
  right: all
});

export function regenerateAssemblyParts(
  assembly: FurnitureAssembly
): FurnitureAssembly {
  const manualParts = (assembly.parts || []).filter((p) => !p.sourceNodeId);
  const generated: CadPart[] = [];

  const W = Math.max(120, assembly.widthMm);
  const H = Math.max(120, assembly.heightMm);
  const D = Math.max(120, assembly.depthMm);
  const T = Math.max(8, assembly.boardThicknessMm || 18);
  const BT = Math.max(3, assembly.backThicknessMm || 4);
  const plinth = Math.max(0, assembly.plinthHeightMm || 0);

  if (assembly.templateId === 'blank') {
    // Blank assembly starts empty (or with only manual parts) so user has full manual control
    return { ...assembly, parts: manualParts };
  }

  const isDesk = assembly.templateId === 'office_desk' || assembly.templateId === 'l_desk';
  const isMansard = assembly.templateId === 'mansard_wardrobe';
  const bodyBottomY = plinth;
  const bodyTopY = assembly.hasCountertop ? H - 38 : H;
  const bodyHeight = Math.max(100, bodyTopY - bodyBottomY);

  // 1. Left & Right Carcass Sides
  const leftHeight = bodyHeight;
  const rightHeight = isMansard ? Math.max(400, bodyHeight - 550) : bodyHeight;

  generated.push({
    id: `${assembly.id}_side_l`,
    name: 'Laterală Stânga',
    role: 'carcass',
    shape: 'rect',
    dimensionsMm: { length: leftHeight, width: D, thickness: T },
    localPosMm: { x: -W / 2 + T / 2, y: bodyBottomY + leftHeight / 2, z: 0 },
    localRotDeg: { x: 0, y: 0, z: 90 },
    grain: 'length',
    edges: { top: '2mm', bottom: '1mm', left: '1mm', right: '1mm' },
    motion: { type: 'none' },
    sourceNodeId: '__carcass__'
  });

  generated.push({
    id: `${assembly.id}_side_r`,
    name: 'Laterală Dreapta',
    role: 'carcass',
    shape: 'rect',
    dimensionsMm: { length: rightHeight, width: D, thickness: T },
    localPosMm: { x: W / 2 - T / 2, y: bodyBottomY + rightHeight / 2, z: 0 },
    localRotDeg: { x: 0, y: 0, z: 90 },
    grain: 'length',
    edges: { top: '2mm', bottom: '1mm', left: '1mm', right: '1mm' },
    motion: { type: 'none' },
    sourceNodeId: '__carcass__'
  });

  // 2. Bottom Panel
  if (assembly.hasBottomPanel) {
    generated.push({
      id: `${assembly.id}_bottom`,
      name: 'Placă Bază',
      role: 'carcass',
      shape: 'rect',
      dimensionsMm: { length: W - 2 * T, width: D, thickness: T },
      localPosMm: { x: 0, y: bodyBottomY + T / 2, z: 0 },
      localRotDeg: { x: 0, y: 0, z: 0 },
      grain: 'length',
      edges: DEFAULT_EDGES('none', '2mm'),
      motion: { type: 'none' },
      sourceNodeId: '__carcass__'
    });
  }

  // 3. Top Panel (or Desk Top / L-Desk Top)
  if (assembly.hasTopPanel) {
    if (assembly.templateId === 'l_desk') {
      generated.push({
        id: `${assembly.id}_top`,
        name: 'Blat Birou Formă L',
        role: 'countertop',
        shape: 'l_cut',
        shapeParams: {
          cutWidthMm: Math.round(W * 0.45),
          cutDepthMm: Math.round(D * 0.45)
        },
        dimensionsMm: { length: W, width: D, thickness: Math.max(T, 25) },
        localPosMm: { x: 0, y: bodyTopY - Math.max(T, 25) / 2, z: 0 },
        localRotDeg: { x: 0, y: 0, z: 0 },
        grain: 'length',
        edges: { top: '2mm', bottom: '2mm', left: '2mm', right: '2mm' },
        motion: { type: 'none' },
        sourceNodeId: '__carcass__'
      });
    } else {
      const topLen = isDesk ? W : W - 2 * T;
      const topY = isDesk ? bodyTopY - T / 2 : bodyTopY - T / 2;
      generated.push({
        id: `${assembly.id}_top`,
        name: isDesk ? 'Blat Birou' : 'Placă Superioară',
        role: isDesk ? 'countertop' : 'carcass',
        shape: 'rect',
        dimensionsMm: { length: topLen, width: D, thickness: T },
        localPosMm: { x: 0, y: topY, z: 0 },
        localRotDeg: { x: 0, y: 0, z: 0 },
        grain: 'length',
        edges: DEFAULT_EDGES(isDesk ? '2mm' : 'none', '2mm'),
        motion: { type: 'none' },
        sourceNodeId: '__carcass__'
      });
    }
  }

  // 4. Mansard Sloped Top
  if (isMansard) {
    const slopeDrop = leftHeight - rightHeight;
    const slopeLen = Math.hypot(W - 2 * T, slopeDrop);
    const angleDeg = -THREE.MathUtils.radToDeg(Math.atan2(slopeDrop, W - 2 * T));
    generated.push({
      id: `${assembly.id}_mansard_top`,
      name: 'Capac Înclinat Mansardă',
      role: 'carcass',
      shape: 'rect',
      dimensionsMm: { length: slopeLen, width: D, thickness: T },
      localPosMm: {
        x: 0,
        y: bodyBottomY + (leftHeight + rightHeight) / 2 - T / 2,
        z: 0
      },
      localRotDeg: { x: 0, y: 0, z: angleDeg },
      grain: 'length',
      edges: DEFAULT_EDGES('1mm', '2mm'),
      motion: { type: 'none' },
      sourceNodeId: '__carcass__'
    });
  }

  // 5. Back Panel
  if (assembly.hasBackPanel) {
    generated.push({
      id: `${assembly.id}_back`,
      name: 'Panou Spate HDF',
      role: 'back',
      shape: isMansard ? 'mansard_slope' : 'rect',
      shapeParams: isMansard ? { slopeDropMm: leftHeight - rightHeight } : undefined,
      dimensionsMm: {
        length: W - 6,
        width: bodyHeight - 6,
        thickness: BT
      },
      localPosMm: {
        x: 0,
        y: bodyBottomY + bodyHeight / 2,
        z: -D / 2 + BT / 2 + 12
      },
      localRotDeg: { x: 90, y: 0, z: 0 },
      grain: 'none',
      edges: { top: 'none', bottom: 'none', left: 'none', right: 'none' },
      motion: { type: 'none' },
      sourceNodeId: '__carcass__'
    });
  }

  // 6. Plinth
  if (plinth > 0) {
    generated.push({
      id: `${assembly.id}_plinth`,
      name: 'Plintă Frontală',
      role: 'plinth',
      shape: 'rect',
      dimensionsMm: { length: W, width: plinth, thickness: T },
      localPosMm: { x: 0, y: plinth / 2, z: D / 2 - 45 },
      localRotDeg: { x: 90, y: 0, z: 0 },
      grain: 'length',
      edges: { top: '1mm', bottom: '1mm', left: '1mm', right: '1mm' },
      motion: { type: 'none' },
      sourceNodeId: '__carcass__'
    });
  }

  // 7. Countertop
  if (assembly.hasCountertop) {
    generated.push({
      id: `${assembly.id}_countertop`,
      name: 'Blat Lucru 38mm',
      role: 'countertop',
      shape: 'rect',
      dimensionsMm: { length: W + 4, width: D + 40, thickness: 38 },
      localPosMm: { x: 0, y: H - 19, z: 10 },
      localRotDeg: { x: 0, y: 0, z: 0 },
      grain: 'length',
      edges: { top: '2mm', bottom: '2mm', left: '2mm', right: '2mm' },
      motion: { type: 'none' },
      sourceNodeId: '__carcass__'
    });
  }

  // 8. Recursive Interior Compartment Solver
  const innerMinX = -W / 2 + T;
  const innerMaxX = W / 2 - T;
  const innerMinY = bodyBottomY + (assembly.hasBottomPanel ? T : 0);
  const innerMaxY = bodyTopY - (assembly.hasTopPanel || isMansard ? T : 0);
  const innerDepth = Math.max(80, D - (assembly.hasBackPanel ? 24 : 0));

  function solveNode(
    node: CompartmentNode,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ) {
    const spanW = maxX - minX;
    const spanH = maxY - minY;
    if (spanW < 40 || spanH < 40) return;

    if (node.splitAxis && node.children && node.children.length > 1) {
      const count = node.children.length;
      const rawRatios =
        node.ratios && node.ratios.length === count
          ? node.ratios
          : Array(count).fill(1 / count);
      const sumR = rawRatios.reduce((a, b) => a + b, 0) || 1;
      const normRatios = rawRatios.map((r) => r / sumR);

      if (node.splitAxis === 'vertical') {
        const usableW = spanW - T * (count - 1);
        let cursorX = minX;
        node.children.forEach((child, idx) => {
          const childW = usableW * normRatios[idx];
          solveNode(child, cursorX, cursorX + childW, minY, maxY);
          cursorX += childW;
          if (idx < count - 1) {
            generated.push({
              id: `${node.id}_div_${idx}`,
              name: `Montant Intermediar ${idx + 1}`,
              role: 'carcass',
              shape: 'rect',
              dimensionsMm: { length: spanH, width: innerDepth, thickness: T },
              localPosMm: {
                x: cursorX + T / 2,
                y: minY + spanH / 2,
                z: assembly.hasBackPanel ? 8 : 0
              },
              localRotDeg: { x: 0, y: 0, z: 90 },
              grain: 'length',
              edges: { top: '2mm', bottom: 'none', left: 'none', right: 'none' },
              motion: { type: 'none' },
              sourceNodeId: node.id
            });
            cursorX += T;
          }
        });
      } else {
        const usableH = spanH - T * (count - 1);
        let cursorY = minY;
        node.children.forEach((child, idx) => {
          const childH = usableH * normRatios[idx];
          solveNode(child, minX, maxX, cursorY, cursorY + childH);
          cursorY += childH;
          if (idx < count - 1) {
            generated.push({
              id: `${node.id}_hdiv_${idx}`,
              name: `Poliță Fixă ${idx + 1}`,
              role: 'shelf',
              shape: 'rect',
              dimensionsMm: { length: spanW, width: innerDepth, thickness: T },
              localPosMm: {
                x: minX + spanW / 2,
                y: cursorY + T / 2,
                z: assembly.hasBackPanel ? 8 : 0
              },
              localRotDeg: { x: 0, y: 0, z: 0 },
              grain: 'length',
              edges: DEFAULT_EDGES('none', '2mm'),
              motion: { type: 'none' },
              sourceNodeId: node.id
            });
            cursorY += T;
          }
        });
      }
      return;
    }

    // Leaf Compartment
    const cx = minX + spanW / 2;
    const cy = minY + spanH / 2;
    const shelves = Math.max(0, node.shelvesCount || 0);

    for (let s = 1; s <= shelves; s++) {
      const sy = minY + (spanH / (shelves + 1)) * s;
      generated.push({
        id: `${node.id}_shelf_${s}`,
        name: `Poliță ${s}`,
        role: 'shelf',
        shape: 'rect',
        dimensionsMm: {
          length: spanW - 2,
          width: Math.max(60, innerDepth - 20),
          thickness: T
        },
        localPosMm: { x: cx, y: sy, z: assembly.hasBackPanel ? 2 : -10 },
        localRotDeg: { x: 0, y: 0, z: 0 },
        grain: 'length',
        edges: DEFAULT_EDGES('none', '1mm'),
        motion: { type: 'none' },
        sourceNodeId: node.id
      });
    }

    if (node.hasRail) {
      generated.push({
        id: `${node.id}_rail`,
        name: 'Bară Umerașe Crom',
        role: 'hardware',
        shape: 'rect',
        dimensionsMm: { length: spanW - 8, width: 25, thickness: 15 },
        localPosMm: { x: cx, y: maxY - 60, z: 0 },
        localRotDeg: { x: 0, y: 0, z: 0 },
        grain: 'none',
        edges: { top: 'none', bottom: 'none', left: 'none', right: 'none' },
        motion: { type: 'none' },
        sourceNodeId: node.id
      });
    }

    const frontZ = D / 2 + T / 2 + 2;
    const fill = node.fill || 'open';

    if (fill === 'drawers') {
      const dCount = Math.max(1, node.drawersCount || 3);
      const gap = 3;
      const dHeight = (spanH - gap * (dCount - 1)) / dCount;
      for (let d = 0; d < dCount; d++) {
        const dy = minY + d * (dHeight + gap) + dHeight / 2;
        generated.push({
          id: `${node.id}_drawer_${d + 1}`,
          name: `Front Sertar ${d + 1}`,
          role: 'front',
          shape: 'rect',
          dimensionsMm: { length: spanW + T - 4, width: dHeight, thickness: T },
          localPosMm: { x: cx, y: dy, z: frontZ },
          localRotDeg: { x: 90, y: 0, z: 0 },
          grain: 'length',
          edges: { top: '2mm', bottom: '2mm', left: '2mm', right: '2mm' },
          motion: { type: 'drawer', openAmount: 0 },
          sourceNodeId: node.id
        });
      }
    } else if (fill === 'door_double') {
      const leafW = (spanW + T - 6) / 2;
      generated.push({
        id: `${node.id}_door_l`,
        name: 'Ușă Stânga',
        role: 'front',
        shape: 'rect',
        dimensionsMm: { length: leafW, width: spanH + T - 4, thickness: T },
        localPosMm: { x: cx - leafW / 2 - 1.5, y: cy, z: frontZ },
        localRotDeg: { x: 90, y: 0, z: 0 },
        grain: 'width',
        edges: { top: '2mm', bottom: '2mm', left: '2mm', right: '2mm' },
        motion: { type: 'hinge_l', openAmount: 0 },
        sourceNodeId: node.id
      });
      generated.push({
        id: `${node.id}_door_r`,
        name: 'Ușă Dreapta',
        role: 'front',
        shape: 'rect',
        dimensionsMm: { length: leafW, width: spanH + T - 4, thickness: T },
        localPosMm: { x: cx + leafW / 2 + 1.5, y: cy, z: frontZ },
        localRotDeg: { x: 90, y: 0, z: 0 },
        grain: 'width',
        edges: { top: '2mm', bottom: '2mm', left: '2mm', right: '2mm' },
        motion: { type: 'hinge_r', openAmount: 0 },
        sourceNodeId: node.id
      });
    } else if (
      fill === 'door_left' ||
      fill === 'door_right' ||
      fill === 'door_lift' ||
      fill === 'door_sliding'
    ) {
      const motionType: PartMotionType =
        fill === 'door_left'
          ? 'hinge_l'
          : fill === 'door_right'
            ? 'hinge_r'
            : fill === 'door_lift'
              ? 'lift'
              : 'sliding';
      generated.push({
        id: `${node.id}_door`,
        name:
          fill === 'door_sliding'
            ? 'Ușă Culisantă'
            : fill === 'door_lift'
              ? 'Ușă Rabatabilă'
              : 'Ușă',
        role: 'front',
        shape: 'rect',
        dimensionsMm: { length: spanW + T - 4, width: spanH + T - 4, thickness: T },
        localPosMm: { x: cx, y: cy, z: frontZ },
        localRotDeg: { x: 90, y: 0, z: 0 },
        grain: 'width',
        edges: { top: '2mm', bottom: '2mm', left: '2mm', right: '2mm' },
        motion: { type: motionType, openAmount: 0 },
        sourceNodeId: node.id
      });
    }
  }

  solveNode(assembly.rootNode, innerMinX, innerMaxX, innerMinY, innerMaxY);

  return {
    ...assembly,
    parts: [...generated, ...manualParts]
  };
}

export function splitCompartmentNode(
  root: CompartmentNode,
  targetId: string,
  axis: 'vertical' | 'horizontal',
  count = 2
): CompartmentNode {
  if (root.id === targetId) {
    const safeCount = Math.max(2, Math.min(6, count));
    const ratio = 1 / safeCount;
    const children: CompartmentNode[] = Array.from({ length: safeCount }, (_, i) => ({
      id: makeId('bay'),
      label: `${axis === 'vertical' ? 'Secțiune' : 'Zonă'} ${i + 1}`,
      fill: 'open',
      shelvesCount: 1
    }));
    return {
      ...root,
      splitAxis: axis,
      ratios: Array(safeCount).fill(ratio),
      children
    };
  }
  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map((c) => splitCompartmentNode(c, targetId, axis, count))
  };
}

export function updateCompartmentNode(
  root: CompartmentNode,
  targetId: string,
  patch: Partial<CompartmentNode>
): CompartmentNode {
  if (root.id === targetId) {
    return { ...root, ...patch };
  }
  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map((c) => updateCompartmentNode(c, targetId, patch))
  };
}

export function addManualPart(
  assembly: FurnitureAssembly,
  preset: 'vertical' | 'horizontal' | 'front' | 'back' | 'custom' = 'horizontal'
): { assembly: FurnitureAssembly; part: CadPart } {
  const T = assembly.boardThicknessMm || 18;
  const part: CadPart = {
    id: makeId('part'),
    name:
      preset === 'vertical'
        ? 'Panou Vertical Custom'
        : preset === 'front'
          ? 'Front / Ușă Custom'
          : preset === 'back'
            ? 'Panou Spate Custom'
            : 'Poliță / Panou Custom',
    role: preset === 'front' ? 'front' : preset === 'back' ? 'back' : 'carcass',
    shape: 'rect',
    dimensionsMm:
      preset === 'vertical'
        ? { length: Math.min(600, assembly.heightMm), width: assembly.depthMm - 20, thickness: T }
        : preset === 'front'
          ? { length: Math.min(500, assembly.widthMm - 4), width: Math.min(700, assembly.heightMm - 4), thickness: T }
          : { length: Math.max(200, assembly.widthMm - 2 * T), width: Math.max(150, assembly.depthMm - 20), thickness: T },
    localPosMm:
      preset === 'front'
        ? { x: 0, y: assembly.heightMm / 2, z: assembly.depthMm / 2 + T / 2 + 2 }
        : { x: 0, y: assembly.heightMm / 2, z: 0 },
    localRotDeg:
      preset === 'vertical'
        ? { x: 0, y: 0, z: 90 }
        : preset === 'front' || preset === 'back'
          ? { x: 90, y: 0, z: 0 }
          : { x: 0, y: 0, z: 0 },
    grain: 'length',
    edges: DEFAULT_EDGES('1mm', '2mm'),
    motion: { type: preset === 'front' ? 'hinge_l' : 'none', openAmount: 0 }
  };

  return {
    assembly: { ...assembly, parts: [...assembly.parts, part] },
    part
  };
}

export function updateCadPart(
  assembly: FurnitureAssembly,
  partId: string,
  patch: Partial<CadPart>
): FurnitureAssembly {
  return {
    ...assembly,
    parts: assembly.parts.map((p) => {
      if (p.id !== partId) return p;
      // If user edits a generated part directly, detach it from sourceNodeId so edits persist
      const { sourceNodeId: _detached, ...rest } = p;
      return { ...rest, ...patch };
    })
  };
}

export function duplicateCadPart(
  assembly: FurnitureAssembly,
  partId: string
): { assembly: FurnitureAssembly; part: CadPart | null } {
  const src = assembly.parts.find((p) => p.id === partId);
  if (!src) return { assembly, part: null };
  const copy: CadPart = {
    ...src,
    id: makeId('part'),
    name: `${src.name} (Copie)`,
    sourceNodeId: undefined,
    localPosMm: {
      x: src.localPosMm.x + 40,
      y: src.localPosMm.y + 40,
      z: src.localPosMm.z
    }
  };
  return {
    assembly: { ...assembly, parts: [...assembly.parts, copy] },
    part: copy
  };
}

export function removeCadPart(
  assembly: FurnitureAssembly,
  partId: string
): FurnitureAssembly {
  return {
    ...assembly,
    parts: assembly.parts.filter((p) => p.id !== partId)
  };
}

export function createShapeGeometryMm(part: CadPart): THREE.BufferGeometry {
  const L = Math.max(10, part.dimensionsMm.length) * 0.001;
  const W = Math.max(10, part.dimensionsMm.width) * 0.001;
  const T = Math.max(2, part.dimensionsMm.thickness) * 0.001;

  if (part.shape === 'rect') {
    const geo = new THREE.BoxGeometry(L, T, W);
    geo.computeBoundingBox();
    return geo;
  }

  const shape = new THREE.Shape();
  const hw = L / 2;
  const hd = W / 2;

  if (part.shape === 'l_cut') {
    const cw = Math.min(L * 0.8, Math.max(0.05, (part.shapeParams?.cutWidthMm || 400) * 0.001));
    const cd = Math.min(W * 0.8, Math.max(0.05, (part.shapeParams?.cutDepthMm || 400) * 0.001));
    shape.moveTo(-hw, -hd);
    shape.lineTo(hw, -hd);
    shape.lineTo(hw, hd - cd);
    shape.lineTo(hw - cw, hd - cd);
    shape.lineTo(hw - cw, hd);
    shape.lineTo(-hw, hd);
    shape.closePath();
  } else if (part.shape === 'chamfer') {
    const ch = Math.min(hw * 0.8, hd * 0.8, Math.max(0.02, (part.shapeParams?.chamferMm || 120) * 0.001));
    shape.moveTo(-hw, -hd);
    shape.lineTo(hw - ch, -hd);
    shape.lineTo(hw, -hd + ch);
    shape.lineTo(hw, hd);
    shape.lineTo(-hw, hd);
    shape.closePath();
  } else if (part.shape === 'rounded') {
    const r = Math.min(hw * 0.45, hd * 0.45, Math.max(0.01, (part.shapeParams?.radiusMm || 40) * 0.001));
    shape.moveTo(-hw + r, -hd);
    shape.lineTo(hw - r, -hd);
    shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
    shape.lineTo(hw, hd - r);
    shape.quadraticCurveTo(hw, hd, hw - r, hd);
    shape.lineTo(-hw + r, hd);
    shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
    shape.lineTo(-hw, -hd + r);
    shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  } else {
    // mansard_slope
    const drop = Math.min(W * 0.8, Math.max(0.05, (part.shapeParams?.slopeDropMm || 450) * 0.001));
    shape.moveTo(-hw, -hd);
    shape.lineTo(hw, -hd);
    shape.lineTo(hw, hd - drop);
    shape.lineTo(-hw, hd);
    shape.closePath();
  }

  const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -T / 2, 0);
  geo.computeBoundingBox();
  return geo;
}

export function buildAssemblyThreeGroup(
  assembly: FurnitureAssembly,
  defaultHex = '#f4f4f2'
): THREE.Group {
  const root = new THREE.Group();
  root.name = assembly.name;
  root.userData.assemblyId = assembly.id;
  root.userData.isCadAssembly = true;

  for (const part of assembly.parts) {
    const geo = createShapeGeometryMm(part);
    const isMetal = part.role === 'hardware';
    const mat = new THREE.MeshStandardMaterial({
      color: isMetal ? '#b4bcc6' : defaultHex,
      roughness: isMetal ? 0.25 : 0.45,
      metalness: isMetal ? 0.85 : 0.03
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = part.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(
      part.localPosMm.x * 0.001,
      part.localPosMm.y * 0.001,
      part.localPosMm.z * 0.001
    );
    mesh.rotation.set(
      THREE.MathUtils.degToRad(part.localRotDeg.x),
      THREE.MathUtils.degToRad(part.localRotDeg.y),
      THREE.MathUtils.degToRad(part.localRotDeg.z)
    );
    mesh.userData.cadPartId = part.id;
    mesh.userData.partRole = part.role;
    mesh.userData.assignedMatId = part.materialId || null;
    root.add(mesh);
  }

  return root;
}

export interface AssemblyBomSummary {
  totalParts: number;
  carcassSqM: number;
  facadeSqM: number;
  backSqM: number;
  countertopSqM: number;
  edgeMeters: number;
  hingesCount: number;
  slidesCount: number;
  handlesCount: number;
}

export function computeAssemblyBom(assembly: FurnitureAssembly): AssemblyBomSummary {
  let carcassSqM = 0;
  let facadeSqM = 0;
  let backSqM = 0;
  let countertopSqM = 0;
  let edgeMeters = 0;
  let hingesCount = 0;
  let slidesCount = 0;
  let handlesCount = 0;

  for (const p of assembly.parts) {
    if (p.role === 'hardware') continue;
    const sqM = (p.dimensionsMm.length * p.dimensionsMm.width) / 1_000_000;
    if (p.role === 'front') {
      facadeSqM += sqM;
      if (p.motion.type === 'hinge_l' || p.motion.type === 'hinge_r' || p.motion.type === 'lift') {
        hingesCount += p.dimensionsMm.width > 1400 ? 4 : p.dimensionsMm.width > 900 ? 3 : 2;
      } else if (p.motion.type === 'drawer') {
        slidesCount += 1;
      }
      if (assembly.handleType !== 'none') handlesCount += 1;
    } else if (p.role === 'back') {
      backSqM += sqM;
    } else if (p.role === 'countertop') {
      countertopSqM += sqM;
    } else {
      carcassSqM += sqM;
    }

    if (p.edges.top !== 'none') edgeMeters += p.dimensionsMm.length / 1000;
    if (p.edges.bottom !== 'none') edgeMeters += p.dimensionsMm.length / 1000;
    if (p.edges.left !== 'none') edgeMeters += p.dimensionsMm.width / 1000;
    if (p.edges.right !== 'none') edgeMeters += p.dimensionsMm.width / 1000;
  }

  return {
    totalParts: assembly.parts.filter((p) => p.role !== 'hardware').length,
    carcassSqM: Number(carcassSqM.toFixed(2)),
    facadeSqM: Number(facadeSqM.toFixed(2)),
    backSqM: Number(backSqM.toFixed(2)),
    countertopSqM: Number(countertopSqM.toFixed(2)),
    edgeMeters: Number(edgeMeters.toFixed(1)),
    hingesCount,
    slidesCount,
    handlesCount
  };
}

export function assemblyToPanelCuttingList(assembly: FurnitureAssembly) {
  return assembly.parts
    .filter((p) => p.role !== 'hardware')
    .map((p) => {
      const edgeList = [
        p.edges.top !== 'none' ? `Sus:${p.edges.top}` : '',
        p.edges.bottom !== 'none' ? `Jos:${p.edges.bottom}` : '',
        p.edges.left !== 'none' ? `Stg:${p.edges.left}` : '',
        p.edges.right !== 'none' ? `Dr:${p.edges.right}` : ''
      ].filter(Boolean);

      return {
        partName: p.name,
        lengthMm: Math.round(p.dimensionsMm.length),
        widthMm: Math.round(p.dimensionsMm.width),
        thicknessMm: Math.round(p.dimensionsMm.thickness),
        qty: 1,
        material:
          p.role === 'front'
            ? `MDF ${p.dimensionsMm.thickness}mm`
            : p.role === 'back'
              ? `HDF ${p.dimensionsMm.thickness}mm`
              : p.role === 'countertop'
                ? `Blat ${p.dimensionsMm.thickness}mm`
                : `PAL ${p.dimensionsMm.thickness}mm`,
        grain:
          p.grain === 'length'
            ? 'Pe Lungime'
            : p.grain === 'width'
              ? 'Pe Lățime'
              : 'Fără Fibră',
        edgeBanding: edgeList.length > 0 ? edgeList.join(' | ') : 'Fără Cant'
      };
    });
}

export interface PlacedAssemblyUnit {
  assembly: FurnitureAssembly;
  position: [number, number, number];
  rotationYDeg: number;
}

export function createKitchenLayoutAssemblies(options: {
  layoutType: 'linear' | 'l_corner' | 'u_shape' | 'l_peninsula';
  mainWallWidthMm: number;
  returnWallDepthMm: number;
  peninsulaLengthMm: number;
  includeOvenCol: boolean;
  includeFridgeCol: boolean;
  includeDishwasher: boolean;
}): PlacedAssemblyUnit[] {
  const units: PlacedAssemblyUnit[] = [];
  const baseZ = 0.35;
  let cursorX = 0.2;

  const pushBase = (
    name: string,
    templateId: FurnitureTemplateId,
    wMm: number,
    hMm: number,
    dMm: number,
    posX: number,
    posY: number,
    posZ: number,
    rotYDeg = 0
  ) => {
    const asm = createAssemblyFromTemplate(templateId, name, {
      widthMm: wMm,
      heightMm: hMm,
      depthMm: dMm
    });
    units.push({
      assembly: asm,
      position: [posX, posY, posZ],
      rotationYDeg: rotYDeg
    });
  };

  if (options.includeFridgeCol) {
    pushBase('Coloană Frigorifică 60cm', 'tall_column', 600, 2100, 580, cursorX + 0.3, 0, baseZ);
    cursorX += 0.6;
  }
  if (options.includeOvenCol) {
    pushBase('Coloană Cuptor 60cm', 'tall_column', 600, 2100, 580, cursorX + 0.3, 0, baseZ);
    cursorX += 0.6;
  }

  const remainingMainMm = Math.max(
    1200,
    options.mainWallWidthMm - (options.includeFridgeCol ? 600 : 0) - (options.includeOvenCol ? 600 : 0)
  );
  const segCount = Math.max(2, Math.round(remainingMainMm / 700));
  const segW = Math.round(remainingMainMm / segCount);

  for (let i = 0; i < segCount; i++) {
    const cx = cursorX + (segW * 0.001) / 2;
    const isDw = options.includeDishwasher && i === 0;
    const label = isDw
      ? `Mașină Spălat Vase (${segW / 10}cm)`
      : i === 1
        ? `Mască Chiuvetă (${segW / 10}cm)`
        : `Corp Bază ${i + 1} (${segW / 10}cm)`;
    pushBase(
      label,
      i === 2 ? 'chest_drawers' : 'base_cabinet',
      segW,
      860,
      560,
      cx,
      0,
      baseZ
    );
    pushBase(
      `Suspendat ${i + 1} (${segW / 10}cm)`,
      'upper_cabinet',
      segW,
      720,
      320,
      cx,
      1.42,
      baseZ - 0.12
    );
    cursorX += segW * 0.001;
  }

  if (options.layoutType !== 'linear') {
    const retCount = Math.max(1, Math.round((options.returnWallDepthMm - 600) / 700));
    const retW = Math.round((options.returnWallDepthMm - 600) / retCount);
    let cursorZ = baseZ + 0.6;
    for (let j = 0; j < retCount; j++) {
      const cz = cursorZ + (retW * 0.001) / 2;
      pushBase(
        `Corp Lateral ${j + 1} (${retW / 10}cm)`,
        'base_cabinet',
        retW,
        860,
        560,
        cursorX - 0.28,
        0,
        cz,
        -90
      );
      cursorZ += retW * 0.001;
    }

    if (options.layoutType === 'l_peninsula' || options.layoutType === 'u_shape') {
      const penW = Math.max(800, options.peninsulaLengthMm);
      pushBase(
        `Peninsulă Bar (${penW / 10}cm)`,
        'base_cabinet',
        penW,
        900,
        750,
        cursorX - 0.28 - (penW * 0.001) / 2,
        0,
        cursorZ + 0.38,
        180
      );
    }
  }

  return units;
}
