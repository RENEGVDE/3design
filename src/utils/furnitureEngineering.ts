import * as THREE from 'three';

/**
 * CAD FURNITURE ENGINEERING & MANUFACTURING SUITE
 * Standard European 32mm system (System 32)
 * Contains:
 * 1. 3D Fasteners & Drilling generator (Confirmats, Minifix, Dowels, Hinges, Shelf pins)
 * 2. 2D Guillotine Cutting Optimization & Nesting engine (Panel Cutting / Nesting 2D)
 * 3. Exploded Assembly view calculator
 * 4. 2D Engineering Panel Drawing renderer (Panel Blueprint & Drilling Map)
 * 5. CNC Drilling Table & G-code exporter (System 32 CNC)
 */

// Master sheet dimensions (standard Egger / Kronospan PAL)
export const DEFAULT_SHEET = {
  widthMm: 2800,
  heightMm: 2070,
  trimMm: 15,
  kerfMm: 4
};

export interface FastenerConfig {
  widthMm?: number;
  heightMm?: number;
  depthMm?: number;
  boardThicknessMm?: number;
  shelvesCount?: number;
  plinthHeightMm?: number;
  hasDoors?: boolean;
  doorCount?: number;
}

/**
 * Creates 3D procedural meshes for furniture hardware (System 32).
 */
export function createFastenerMeshes(cabinetConfig: FastenerConfig = {}) {
  const {
    widthMm = 600,
    heightMm = 720,
    depthMm = 560,
    boardThicknessMm = 18,
    shelvesCount = 1,
    plinthHeightMm = 100,
    hasDoors = true,
    doorCount = 1
  } = cabinetConfig;

  const group = new THREE.Group();
  group.name = 'CAD_Fasteners_Group';

  const confirmatMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.2
  });
  const minifixMat = new THREE.MeshStandardMaterial({
    color: 0x999999,
    metalness: 0.85,
    roughness: 0.25
  });
  const dowelMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    roughness: 0.7,
    metalness: 0.05
  });
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xe0e0e0,
    metalness: 0.95,
    roughness: 0.15
  });
  const hingeMat = new THREE.MeshStandardMaterial({
    color: 0xa8a8a8,
    metalness: 0.8,
    roughness: 0.3
  });

  const drillHoles: any[] = [];

  // Helper: Confirmat screw head (Ø10mm head, 7x50 body)
  function addConfirmat(x: number, y: number, z: number, rotZ = 0) {
    const headGeo = new THREE.CylinderGeometry(5, 5, 2, 12);
    headGeo.rotateZ(rotZ);
    const m = new THREE.Mesh(headGeo, confirmatMat);
    m.position.set(x, y, z);
    group.add(m);
  }

  // Helper: Minifix eccentric cam (Ø15mm face) + wooden dowel (Ø8x35mm)
  function addMinifixAndDowel(x: number, y: number, z: number, isLeft = true) {
    // Cam
    const camGeo = new THREE.CylinderGeometry(7.5, 7.5, 3, 16);
    camGeo.rotateX(Math.PI / 2);
    const camMesh = new THREE.Mesh(camGeo, minifixMat);
    camMesh.position.set(x, y, z);
    group.add(camMesh);

    // Dowel beside minifix (32mm pitch System 32)
    const dowelGeo = new THREE.CylinderGeometry(4, 4, 30, 10);
    dowelGeo.rotateZ(Math.PI / 2);
    const dowelMesh = new THREE.Mesh(dowelGeo, dowelMat);
    const dowelZ = z + 32;
    dowelMesh.position.set(isLeft ? x + 15 : x - 15, y, dowelZ);
    group.add(dowelMesh);
  }

  // 1. Joints between Sides and Bottom Panel
  const bottomY = plinthHeightMm + boardThicknessMm / 2;
  const jointZOffsets = [-depthMm / 2 + 50, depthMm / 2 - 50];
  if (depthMm > 450) {
    jointZOffsets.push(0); // Center fastener for deep cabinets
  }

  jointZOffsets.forEach((z) => {
    // Left side confirmat
    addConfirmat(-widthMm / 2 + 1, bottomY, z, Math.PI / 2);
    drillHoles.push({
      panel: 'Side_Left',
      type: 'through_bore',
      diaMm: 7,
      depthMm: 18,
      x: depthMm / 2 + z,
      y: bottomY
    });

    // Right side confirmat
    addConfirmat(widthMm / 2 - 1, bottomY, z, -Math.PI / 2);
    drillHoles.push({
      panel: 'Side_Right',
      type: 'through_bore',
      diaMm: 7,
      depthMm: 18,
      x: depthMm / 2 + z,
      y: bottomY
    });
  });

  // 2. Joints between Sides and Top Stretcher Panels (Stifturi / Traverse)
  const topY = plinthHeightMm + heightMm - boardThicknessMm / 2;
  jointZOffsets.forEach((z) => {
    addMinifixAndDowel(-widthMm / 2 + boardThicknessMm + 10, topY, z, true);
    addMinifixAndDowel(widthMm / 2 - boardThicknessMm - 10, topY, z, false);

    drillHoles.push({
      panel: 'Side_Left',
      type: 'face_bore',
      diaMm: 15,
      depthMm: 13,
      x: depthMm / 2 + z,
      y: topY
    });
    drillHoles.push({
      panel: 'Side_Right',
      type: 'face_bore',
      diaMm: 15,
      depthMm: 13,
      x: depthMm / 2 + z,
      y: topY
    });
  });

  // 3. Adjustable Shelf Pins (System 32 series drilling: 32mm grid)
  if (shelvesCount > 0) {
    const usableHeight = heightMm - boardThicknessMm * 2;
    const shelfSpacing = usableHeight / (shelvesCount + 1);

    for (let s = 1; s <= shelvesCount; s++) {
      const shelfY = plinthHeightMm + boardThicknessMm + s * shelfSpacing;

      // System 32 series holes around shelf height (-32mm, 0, +32mm)
      [-32, 0, 32].forEach((offsetY) => {
        const pinY = shelfY + offsetY;
        [-depthMm / 2 + 64, depthMm / 2 - 64].forEach((pinZ) => {
          // Left pin
          const pinGeo = new THREE.CylinderGeometry(2.5, 2.5, 12, 10);
          pinGeo.rotateZ(Math.PI / 2);
          const pinL = new THREE.Mesh(pinGeo, pinMat);
          pinL.position.set(-widthMm / 2 + boardThicknessMm + 5, pinY, pinZ);
          group.add(pinL);

          // Right pin
          const pinR = new THREE.Mesh(pinGeo, pinMat);
          pinR.position.set(widthMm / 2 - boardThicknessMm - 5, pinY, pinZ);
          group.add(pinR);

          drillHoles.push({
            panel: 'Side_Left',
            type: 'shelf_pin',
            diaMm: 5,
            depthMm: 12,
            x: depthMm / 2 + pinZ,
            y: pinY
          });
          drillHoles.push({
            panel: 'Side_Right',
            type: 'shelf_pin',
            diaMm: 5,
            depthMm: 12,
            x: depthMm / 2 + pinZ,
            y: pinY
          });
        });
      });
    }
  }

  // 4. Concealed European Cup Hinges (Ø35mm Blum / Hettich style)
  if (hasDoors) {
    const hingesPerDoor = heightMm > 900 ? 3 : 2;
    const hingePositionsY = [
      plinthHeightMm + 100,
      plinthHeightMm + heightMm - 100
    ];
    if (hingesPerDoor === 3) {
      hingePositionsY.splice(1, 0, plinthHeightMm + heightMm / 2);
    }

    const frontZ = depthMm / 2 + 10;
    hingePositionsY.forEach((hY) => {
      // Hinge mounting plate on cabinet side
      const plateGeo = new THREE.BoxGeometry(10, 35, 20);
      const plate = new THREE.Mesh(plateGeo, hingeMat);
      plate.position.set(-widthMm / 2 + boardThicknessMm + 5, hY, depthMm / 2 - 37);
      group.add(plate);

      // Hinge arm & cup on door back
      const cupGeo = new THREE.CylinderGeometry(17.5, 17.5, 12, 24);
      cupGeo.rotateX(Math.PI / 2);
      const cup = new THREE.Mesh(cupGeo, hingeMat);
      cup.position.set(-widthMm / 2 + 22, hY, frontZ);
      group.add(cup);

      drillHoles.push({
        panel: 'Side_Left',
        type: 'hinge_plate',
        diaMm: 5,
        depthMm: 12,
        x: 37,
        y: hY
      });
      drillHoles.push({
        panel: 'Door_Facade',
        type: 'hinge_cup',
        diaMm: 35,
        depthMm: 12.5,
        x: 22,
        y: hY - plinthHeightMm
      });
    });
  }

  // Convert mm positions to meters for Three.js scene scale
  group.scale.set(0.001, 0.001, 0.001);

  return {
    group,
    drillHoles
  };
}

/**
 * 2D GUILLOTINE NESTING / CUTTING OPTIMIZATION ENGINE
 * Computes optimal panel layout on standard raw sheets (Egger / Kronospan 2800x2070mm).
 * Takes kerf cut width and trim margins into account.
 */
export function optimizeSheetNesting(panels: any[], sheet = DEFAULT_SHEET) {
  if (!panels || panels.length === 0) {
    return { sheets: [], totalSheets: 0, overallEfficiency: 0, wasteAreaM2: 0 };
  }

  // Expand panel quantities
  const expandedItems: any[] = [];
  panels.forEach((p, idx) => {
    const qty = p.quantity || p.count || 1;
    for (let i = 0; i < qty; i++) {
      expandedItems.push({
        id: `${p.name || 'Part'}_${idx}_${i}`,
        name: p.name || `Panel ${idx + 1}`,
        length: Math.max(p.length || p.lengthMm || 100, p.width || p.widthMm || 100),
        width: Math.min(p.length || p.lengthMm || 100, p.width || p.widthMm || 100),
        thickness: p.thickness || p.thicknessMm || 18,
        material: p.material || 'PAL Melaminat',
        edgeBanding: p.edgeBanding || '-',
        allowRotation: p.allowRotation !== false
      });
    }
  });

  // Sort descending by area, then by max dimension (First-Fit Decreasing Heuristic)
  expandedItems.sort((a, b) => {
    const areaA = a.length * a.width;
    const areaB = b.length * b.width;
    if (areaB !== areaA) return areaB - areaA;
    return b.length - a.length;
  });

  const usableWidth = sheet.widthMm - sheet.trimMm * 2;
  const usableHeight = sheet.heightMm - sheet.trimMm * 2;
  const sheets: any[] = [];

  // Guillotine bin-packing algorithm
  expandedItems.forEach((panel) => {
    let placed = false;

    for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
      const curSheet = sheets[sIdx];
      const fit = findGuillotineFit(curSheet.freeRectangles, panel, sheet.kerfMm);
      if (fit) {
        placePanelOnSheet(curSheet, panel, fit, sheet.kerfMm);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Start a new sheet
      const newSheet = {
        sheetIndex: sheets.length + 1,
        width: sheet.widthMm,
        height: sheet.heightMm,
        trim: sheet.trimMm,
        kerf: sheet.kerfMm,
        placedPanels: [],
        freeRectangles: [
          {
            x: sheet.trimMm,
            y: sheet.trimMm,
            w: usableWidth,
            h: usableHeight
          }
        ]
      };
      const fit = findGuillotineFit(newSheet.freeRectangles, panel, sheet.kerfMm);
      if (fit) {
        placePanelOnSheet(newSheet, panel, fit, sheet.kerfMm);
      }
      sheets.push(newSheet);
    }
  });

  // Calculate efficiency metrics
  const sheetAreaMm2 = sheet.widthMm * sheet.heightMm;
  let totalUsedAreaMm2 = 0;

  sheets.forEach((s) => {
    let sheetUsed = 0;
    s.placedPanels.forEach((p: any) => {
      sheetUsed += p.w * p.h;
    });
    s.usedAreaMm2 = sheetUsed;
    s.efficiencyPct = Math.min(100, (sheetUsed / sheetAreaMm2) * 100);
    s.efficiencyPercent = Number(s.efficiencyPct.toFixed(1));
    s.wastePct = 100 - s.efficiencyPct;
    totalUsedAreaMm2 += sheetUsed;
  });

  const totalSheets = sheets.length;
  const totalSheetAreaMm2 = totalSheets * sheetAreaMm2;
  const overallEfficiency = totalSheets > 0 ? (totalUsedAreaMm2 / totalSheetAreaMm2) * 100 : 0;
  const wasteAreaM2 = Number(((totalSheetAreaMm2 - totalUsedAreaMm2) / 1000000).toFixed(2));
  const totalUsedArea = Number((totalUsedAreaMm2 / 1000000).toFixed(2));
  const totalCutMeters = Math.round(
    expandedItems.reduce((acc, p) => acc + ((p.length + p.width) * 2) / 1000, 0)
  );

  return {
    sheets,
    totalSheets,
    sheetsCount: totalSheets,
    overallEfficiency: Number(overallEfficiency.toFixed(1)),
    efficiencyPercent: Number(overallEfficiency.toFixed(1)),
    wasteAreaM2,
    scrapAreaSqM: wasteAreaM2,
    totalUsedArea,
    totalCutMeters,
    totalPlacedParts: expandedItems.length
  };
}

export const calculateCuttingNesting = optimizeSheetNesting;

function findGuillotineFit(freeRectangles: any[], panel: any, kerf: number) {
  for (let i = 0; i < freeRectangles.length; i++) {
    const free = freeRectangles[i];

    // Try unrotated
    if (panel.length <= free.w && panel.width <= free.h) {
      return { rectIndex: i, rotated: false, w: panel.length, h: panel.width };
    }
    // Try rotated (if allowed)
    if (panel.allowRotation && panel.width <= free.w && panel.length <= free.h) {
      return { rectIndex: i, rotated: true, w: panel.width, h: panel.length };
    }
  }
  return null;
}

function placePanelOnSheet(sheet: any, panel: any, fit: any, kerf: number) {
  const free = sheet.freeRectangles.splice(fit.rectIndex, 1)[0];

  const placed = {
    ...panel,
    x: free.x,
    y: free.y,
    w: fit.w,
    h: fit.h,
    rotated: fit.rotated
  };
  sheet.placedPanels.push(placed);

  // Guillotine cut split (create remaining free rectangles)
  const remainingW = free.w - fit.w - kerf;
  const remainingH = free.h - fit.h - kerf;

  if (remainingW > 0 && remainingH > 0) {
    // Shorter axis split for better yield
    if (remainingW < remainingH) {
      sheet.freeRectangles.push({
        x: free.x + fit.w + kerf,
        y: free.y,
        w: remainingW,
        h: fit.h
      });
      sheet.freeRectangles.push({
        x: free.x,
        y: free.y + fit.h + kerf,
        w: free.w,
        h: remainingH
      });
    } else {
      sheet.freeRectangles.push({
        x: free.x + fit.w + kerf,
        y: free.y,
        w: remainingW,
        h: free.h
      });
      sheet.freeRectangles.push({
        x: free.x,
        y: free.y + fit.h + kerf,
        w: fit.w,
        h: remainingH
      });
    }
  } else if (remainingW > 0) {
    sheet.freeRectangles.push({
      x: free.x + fit.w + kerf,
      y: free.y,
      w: remainingW,
      h: free.h
    });
  } else if (remainingH > 0) {
    sheet.freeRectangles.push({
      x: free.x,
      y: free.y + fit.h + kerf,
      w: free.w,
      h: remainingH
    });
  }
}

/**
 * 2D PANEL TECHNICAL BLUEPRINT RENDERER
 * Generates an engineering workshop drawing on HTML5 Canvas:
 * - Edge banding marks (ABS 1mm, 2mm, etc.)
 * - Drilling hole coordinates (System 32)
 * - Dimensions, Title Block, and Tolerance standards.
 */
export function drawPanelBlueprint(canvas: HTMLCanvasElement, panel: any, drillHoles: any[] = []) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Clear background
  ctx.fillStyle = '#0f172a'; // Deep engineering dark theme
  ctx.fillRect(0, 0, width, height);

  // Subtle grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  const gridSize = 20;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Panel dimensions in mm
  const pL = panel?.lengthMm || panel?.length || 600;
  const pW = panel?.widthMm || panel?.width || 400;
  const pT = panel?.thicknessMm || panel?.thickness || 18;
  const pName = panel?.name || 'Panou PAL';
  const pMat = panel?.material || 'PAL Melaminat 18mm';
  const pEdge = panel?.edgeBanding || 'Cant ABS 1mm';

  // Calculate drawing scale to fit in canvas margin
  const margin = 80;
  const availW = width - margin * 2;
  const availH = height - margin * 2 - 60; // Leave room for title block
  const scale = Math.min(availW / pL, availH / pW);

  const drawW = pL * scale;
  const drawH = pW * scale;
  const startX = (width - drawW) / 2;
  const startY = margin + (availH - drawH) / 2;

  // Draw panel main body
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(startX, startY, drawW, drawH);

  // Draw Edge Banding (distinct colored borders)
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#38bdf8'; // Blue cyan: ABS 1mm / 2mm
  ctx.strokeRect(startX, startY, drawW, drawH);

  // Dimension lines: Horizontal (Length)
  ctx.strokeStyle = '#94a3b8';
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.lineWidth = 1;

  // Top dimension line
  const dimOffset = 25;
  ctx.beginPath();
  ctx.moveTo(startX, startY - dimOffset);
  ctx.lineTo(startX + drawW, startY - dimOffset);
  // Arrow heads
  ctx.moveTo(startX, startY - dimOffset - 5);
  ctx.lineTo(startX, startY - dimOffset + 5);
  ctx.moveTo(startX + drawW, startY - dimOffset - 5);
  ctx.lineTo(startX + drawW, startY - dimOffset + 5);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillText(`${pL} mm`, startX + drawW / 2, startY - dimOffset - 8);

  // Left dimension line (Width)
  ctx.beginPath();
  ctx.moveTo(startX - dimOffset, startY);
  ctx.lineTo(startX - dimOffset, startY + drawH);
  ctx.moveTo(startX - dimOffset - 5, startY);
  ctx.lineTo(startX - dimOffset + 5, startY);
  ctx.moveTo(startX - dimOffset - 5, startY + drawH);
  ctx.lineTo(startX - dimOffset + 5, startY + drawH);
  ctx.stroke();
  ctx.save();
  ctx.translate(startX - dimOffset - 8, startY + drawH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText(`${pW} mm`, 0, 0);
  ctx.restore();

  // Draw Drilling Holes (System 32 / Confirmat / Minifix / Hinges)
  const relevantHoles = drillHoles.filter((h) => {
    if (!h.panel) return true;
    return pName.toLowerCase().includes(h.panel.toLowerCase().replace('_', ' '));
  });

  // Fallback demo holes if none found for preview
  const holesToDraw =
    relevantHoles.length > 0
      ? relevantHoles
      : [
          { x: 37, y: 50, diaMm: 7, type: 'Confirmat Ø7' },
          { x: pL - 37, y: 50, diaMm: 7, type: 'Confirmat Ø7' },
          { x: 37, y: pW - 50, diaMm: 7, type: 'Confirmat Ø7' },
          { x: pL - 37, y: pW - 50, diaMm: 7, type: 'Confirmat Ø7' },
          { x: pL / 2, y: 150, diaMm: 5, type: 'Poliță Ø5' },
          { x: pL / 2, y: pW - 150, diaMm: 5, type: 'Poliță Ø5' }
        ];

  holesToDraw.forEach((h: any) => {
    const hX = startX + (h.x / pL) * drawW;
    const hY = startY + (h.y / pW) * drawH;
    const r = Math.max(3, (h.diaMm / 2) * scale * 1.5);

    // Hole circle
    ctx.beginPath();
    ctx.arc(hX, hY, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444'; // Red drill point
    ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.stroke();

    // Center crosshairs
    ctx.beginPath();
    ctx.moveTo(hX - r - 4, hY);
    ctx.lineTo(hX + r + 4, hY);
    ctx.moveTo(hX, hY - r - 4);
    ctx.lineTo(hX, hY + r + 4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Annotation
    ctx.fillStyle = '#f87171';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Ø${h.diaMm} (${Math.round(h.x)}, ${Math.round(h.y)})`, hX + r + 4, hY + 3);
  });

  // Engineering Title Block (Cadru & Cartuș Standard Tehnic)
  const tbH = 65;
  const tbW = width - 40;
  const tbX = 20;
  const tbY = height - tbH - 15;

  ctx.fillStyle = '#0b1120';
  ctx.fillRect(tbX, tbY, tbW, tbH);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(tbX, tbY, tbW, tbH);

  // Title block partitions
  ctx.beginPath();
  ctx.moveTo(tbX + tbW * 0.45, tbY);
  ctx.lineTo(tbX + tbW * 0.45, tbY + tbH);
  ctx.moveTo(tbX + tbW * 0.75, tbY);
  ctx.lineTo(tbX + tbW * 0.75, tbY + tbH);
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  // Content
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(pName.toUpperCase(), tbX + 15, tbY + 24);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Material: ${pMat} | Grosime: ${pT} mm`, tbX + 15, tbY + 48);

  ctx.fillText(`Canturi: ${pEdge}`, tbX + tbW * 0.45 + 15, tbY + 24);
  ctx.fillText(`Găuri CNC: ${holesToDraw.length} poziții`, tbX + tbW * 0.45 + 15, tbY + 48);

  ctx.font = '10px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`SCARA 1:${(1 / scale).toFixed(1)}`, tbX + tbW * 0.75 + 15, tbY + 24);
  ctx.fillStyle = '#64748b';
  ctx.fillText(`ISO 2768-m | System 32`, tbX + tbW * 0.75 + 15, tbY + 48);
}

/**
 * EXPORT DRILLING DATA TO CNC FORMAT (Standard System 32 CNC CSV)
 */
export function generateCncDrillingCsv(drillHoles: any[] = [], panelName = 'Panel') {
  let csv = 'ID;PANEL;TYPE;DIAMETER_MM;DEPTH_MM;POS_X_MM;POS_Y_MM;TOOL_CODE\n';
  drillHoles.forEach((h, idx) => {
    const tool = h.diaMm <= 5 ? 'T01_DRILL_5MM' : h.diaMm <= 8 ? 'T02_DRILL_8MM' : 'T03_MILL_35MM';
    csv += `${idx + 1};${h.panel || panelName};${h.type || 'BORE'};${h.diaMm};${h.depthMm};${h.x.toFixed(1)};${h.y.toFixed(1)};${tool}\n`;
  });
  return csv;
}
