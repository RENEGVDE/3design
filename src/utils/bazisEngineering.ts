import * as THREE from 'three';

/**
 * BAZIS-ENGINEERING UTILITY SUITE
 * Standard European 32mm system (System 32 / БАЗИС-Мебельщик)
 * Contains:
 * 1. 3D Fasteners & Drilling generator (Confirmats, Minifix, Dowels, Hinges, Shelf pins)
 * 2. 2D Guillotine Cutting Optimization & Nesting engine (БАЗИС-Раскрой)
 * 3. Exploded Assembly view calculator (Разнесение сборки)
 * 4. 2D Engineering Panel Drawing renderer (Чертёж детали)
 * 5. CNC Drilling Table & G-code exporter (БАЗИС-ЧПУ)
 */

// Master sheet dimensions (standard Egger / Kronospan PAL)
export const DEFAULT_SHEET = {
  widthMm: 2800,
  heightMm: 2070,
  trimMm: 15,
  kerfMm: 4
};

/**
 * Creates 3D procedural meshes for furniture hardware (System 32).
 */
export function createFastenerMeshes(cabinetConfig) {
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
  group.name = 'Bazis_Fasteners_Group';

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

  const drillHoles = [];

  // Helper: Confirmat screw head (Ø10mm head, 7x50 body)
  function addConfirmat(x, y, z, rotZ = 0) {
    const headGeo = new THREE.CylinderGeometry(5, 5, 2, 12);
    headGeo.rotateZ(rotZ);
    const m = new THREE.Mesh(headGeo, confirmatMat);
    m.position.set(x, y, z);
    group.add(m);
  }

  // Helper: Minifix eccentric cam (Ø15mm face) + wooden dowel (Ø8x35mm)
  function addMinifixAndDowel(x, y, z, isLeft = true) {
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

  const leftX = -widthMm / 2;
  const rightX = widthMm / 2;

  jointZOffsets.forEach((zOff) => {
    // Left joint
    addConfirmat(leftX + boardThicknessMm / 2, bottomY, zOff, Math.PI / 2);
    addMinifixAndDowel(leftX + boardThicknessMm + 10, bottomY, zOff, true);
    drillHoles.push({
      panel: 'Laterală Stânga',
      holeType: 'Confirmat Ø7 (trecere)',
      diameter: 7,
      depth: 18,
      x: Math.round(zOff + depthMm / 2),
      y: Math.round(bottomY - plinthHeightMm),
      face: 'Față exterioară'
    });
    drillHoles.push({
      panel: 'Fund Bază',
      holeType: 'Confirmat Ø5 (capăt)',
      diameter: 5,
      depth: 38,
      x: Math.round(zOff + depthMm / 2),
      y: 9,
      face: 'Cant stânga'
    });

    // Right joint
    addConfirmat(rightX - boardThicknessMm / 2, bottomY, zOff, -Math.PI / 2);
    addMinifixAndDowel(rightX - boardThicknessMm - 10, bottomY, zOff, false);
    drillHoles.push({
      panel: 'Laterală Dreapta',
      holeType: 'Confirmat Ø7 (trecere)',
      diameter: 7,
      depth: 18,
      x: Math.round(zOff + depthMm / 2),
      y: Math.round(bottomY - plinthHeightMm),
      face: 'Față exterioară'
    });
    drillHoles.push({
      panel: 'Fund Bază',
      holeType: 'Confirmat Ø5 (capăt)',
      diameter: 5,
      depth: 38,
      x: Math.round(zOff + depthMm / 2),
      y: 9,
      face: 'Cant dreapta'
    });
  });

  // 2. Joints between Sides and Top Panel / Stretchers
  const topY = plinthHeightMm + heightMm - boardThicknessMm / 2;
  jointZOffsets.forEach((zOff) => {
    addConfirmat(leftX + boardThicknessMm / 2, topY, zOff, Math.PI / 2);
    addConfirmat(rightX - boardThicknessMm / 2, topY, zOff, -Math.PI / 2);
    drillHoles.push({
      panel: 'Laterală Stânga',
      holeType: 'Confirmat Ø7',
      diameter: 7,
      depth: 18,
      x: Math.round(zOff + depthMm / 2),
      y: Math.round(heightMm - boardThicknessMm / 2),
      face: 'Față exterioară'
    });
  });

  // 3. Shelf Pins (Полкодержатели Ø5mm)
  if (shelvesCount > 0) {
    const usableH = heightMm - plinthHeightMm - 2 * boardThicknessMm;
    const spacing = usableH / (shelvesCount + 1);

    for (let s = 1; s <= shelvesCount; s++) {
      const shY = plinthHeightMm + boardThicknessMm + s * spacing;
      const pinZOffsets = [-depthMm / 2 + 70, depthMm / 2 - 70];

      pinZOffsets.forEach((pz) => {
        // Left pin
        const pinL = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 8, 8).rotateZ(Math.PI / 2), pinMat);
        pinL.position.set(leftX + boardThicknessMm, shY - 4, pz);
        group.add(pinL);

        // Right pin
        const pinR = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 8, 8).rotateZ(Math.PI / 2), pinMat);
        pinR.position.set(rightX - boardThicknessMm, shY - 4, pz);
        group.add(pinR);

        drillHoles.push({
          panel: 'Laterală Stânga',
          holeType: 'Polcoдержатель Ø5 (pas 32mm)',
          diameter: 5,
          depth: 12,
          x: Math.round(pz + depthMm / 2),
          y: Math.round(shY - plinthHeightMm),
          face: 'Față interioară'
        });
        drillHoles.push({
          panel: 'Laterală Dreapta',
          holeType: 'Polcoдержатель Ø5 (pas 32mm)',
          diameter: 5,
          depth: 12,
          x: Math.round(pz + depthMm / 2),
          y: Math.round(shY - plinthHeightMm),
          face: 'Față interioară'
        });
      });
    }
  }

  // 4. Hinges (Петли мебельные Ø35mm cup + mounting plate)
  if (hasDoors) {
    const hingeCupGeo = new THREE.CylinderGeometry(17.5, 17.5, 11, 24);
    hingeCupGeo.rotateX(Math.PI / 2);

    const hingePlateGeo = new THREE.BoxGeometry(14, 38, 4);

    const hingeYOffsets = [
      plinthHeightMm + 100,
      plinthHeightMm + heightMm - 100
    ];
    if (heightMm > 1200) {
      hingeYOffsets.push(plinthHeightMm + heightMm / 2); // 3rd central hinge for tall doors
    }

    hingeYOffsets.forEach((hy) => {
      // Hinge on left side
      const cupL = new THREE.Mesh(hingeCupGeo, hingeMat);
      cupL.position.set(leftX + 22, hy, depthMm / 2 + boardThicknessMm / 2);
      group.add(cupL);

      const plateL = new THREE.Mesh(hingePlateGeo, hingeMat);
      plateL.position.set(leftX + boardThicknessMm + 2, hy, depthMm / 2 - 37);
      group.add(plateL);

      drillHoles.push({
        panel: 'Fațadă Ușă',
        holeType: 'Oală Balama Ø35mm',
        diameter: 35,
        depth: 12.5,
        x: 21.5,
        y: Math.round(hy - plinthHeightMm),
        face: 'Spate fațadă'
      });
      drillHoles.push({
        panel: 'Laterală Stânga',
        holeType: 'Plăcuță Balama Ø5 (linie 37mm)',
        diameter: 5,
        depth: 12,
        x: 37,
        y: Math.round(hy - plinthHeightMm),
        face: 'Față interioară'
      });
    });
  }

  return { group, drillHoles };
}

/**
 * 2D GUILLOTINE NESTING / CUTTING OPTIMIZATION ENGINE (БАЗИС-Раскрой)
 * Places rectangular panels onto standard sheets with saw kerf and perimeter trims.
 */
export function calculateCuttingNesting(panels, sheetConfig = DEFAULT_SHEET) {
  const {
    widthMm = 2800,
    heightMm = 2070,
    trimMm = 15,
    kerfMm = 4
  } = sheetConfig;

  const usableW = widthMm - 2 * trimMm;
  const usableH = heightMm - 2 * trimMm;

  // Flatten panels according to qty
  const itemsToCut = [];
  panels.forEach((p, pIdx) => {
    const qty = p.qty || 1;
    for (let q = 0; q < qty; q++) {
      itemsToCut.push({
        origIdx: pIdx,
        id: `${p.cabinet}_${p.partName}_${q + 1}`,
        cabinet: p.cabinet,
        partName: p.partName,
        w: Math.round(p.lengthMm),
        h: Math.round(p.widthMm),
        thickness: p.thicknessMm || 18,
        material: p.material || 'PAL 18mm',
        grain: p.grain || 'Vertical',
        edgeBanding: p.edgeBanding || 'Fără cant'
      });
    }
  });

  // Sort items by height descending (First-Fit Decreasing Height Guillotine)
  itemsToCut.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || (b.w * b.h) - (a.w * a.h));

  const sheets = [];

  function spawnNewSheet(sheetIdx) {
    return {
      index: sheetIdx + 1,
      totalW: widthMm,
      totalH: heightMm,
      usableW,
      usableH,
      trimMm,
      placedPanels: [],
      freeRects: [{ x: 0, y: 0, w: usableW, h: usableH }],
      usedAreaSqM: 0,
      cutLengthMm: 0
    };
  }

  itemsToCut.forEach((item) => {
    let placed = false;

    for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
      const sheet = sheets[sIdx];
      const fit = findBestPlacement(sheet.freeRects, item.w, item.h, kerfMm);
      if (fit) {
        placeItemOnSheet(sheet, item, fit, kerfMm);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Spawn new sheet
      const newSheet = spawnNewSheet(sheets.length);
      const fit = findBestPlacement(newSheet.freeRects, item.w, item.h, kerfMm);
      if (fit) {
        placeItemOnSheet(newSheet, item, fit, kerfMm);
      } else {
        // Oversized panel (larger than whole sheet)
        newSheet.placedPanels.push({
          ...item,
          x: 0,
          y: 0,
          w: Math.min(item.w, usableW),
          h: Math.min(item.h, usableH),
          rotated: false,
          oversized: true
        });
      }
      sheets.push(newSheet);
    }
  });

  // Best-Fit rectangle search
  function findBestPlacement(freeRects, w, h, kerf) {
    let bestFit = null;
    let minShortFit = Infinity;

    for (let i = 0; i < freeRects.length; i++) {
      const r = freeRects[i];
      // Try normal orientation
      if (r.w >= w && r.h >= h) {
        const shortSide = Math.min(r.w - w, r.h - h);
        if (shortSide < minShortFit) {
          minShortFit = shortSide;
          bestFit = { rectIdx: i, rotated: false, w, h };
        }
      }
      // Try rotated 90 deg (if fiber allows)
      if (r.w >= h && r.h >= w) {
        const shortSide = Math.min(r.w - h, r.h - w);
        if (shortSide < minShortFit) {
          minShortFit = shortSide;
          bestFit = { rectIdx: i, rotated: true, w: h, h: w };
        }
      }
    }
    return bestFit;
  }

  // Place item and split remaining space into guillotine sub-rectangles
  function placeItemOnSheet(sheet, item, fit, kerf) {
    const rect = sheet.freeRects.splice(fit.rectIdx, 1)[0];
    const pw = fit.w;
    const ph = fit.h;

    sheet.placedPanels.push({
      ...item,
      x: rect.x + trimMm,
      y: rect.y + trimMm,
      w: pw,
      h: ph,
      rotated: fit.rotated
    });

    sheet.usedAreaSqM += (pw * ph) / 1000000;
    sheet.cutLengthMm += (pw * 2 + ph * 2);

    // Guillotine cut split: split into Right Rect and Top Rect
    const remainW = rect.w - pw - kerf;
    const remainH = rect.h - ph - kerf;

    if (remainW > 50 && ph > 0) {
      sheet.freeRects.push({
        x: rect.x + pw + kerf,
        y: rect.y,
        w: remainW,
        h: ph
      });
    }
    if (remainH > 50 && rect.w > 0) {
      sheet.freeRects.push({
        x: rect.x,
        y: rect.y + ph + kerf,
        w: rect.w,
        h: remainH
      });
    }
  }

  // Summary Metrics (К.И.М. - Коэффициент использования материала)
  const singleSheetArea = (widthMm * heightMm) / 1000000;
  const totalSheetsArea = sheets.length * singleSheetArea;
  let totalUsedArea = 0;
  let totalCutMeters = 0;

  sheets.forEach((s) => {
    totalUsedArea += s.usedAreaSqM;
    totalCutMeters += s.cutLengthMm / 1000;
    s.efficiencyPercent = totalSheetsArea > 0 ? ((s.usedAreaSqM / singleSheetArea) * 100).toFixed(1) : '0';
  });

  const efficiencyPercent = totalSheetsArea > 0 ? ((totalUsedArea / totalSheetsArea) * 100).toFixed(1) : '0';
  const scrapAreaSqM = (totalSheetsArea - totalUsedArea).toFixed(2);

  return {
    sheets,
    sheetsCount: sheets.length,
    singleSheetArea: singleSheetArea.toFixed(2),
    totalSheetsArea: totalSheetsArea.toFixed(2),
    totalUsedArea: totalUsedArea.toFixed(2),
    scrapAreaSqM,
    efficiencyPercent,
    totalCutMeters: Math.round(totalCutMeters),
    totalPartsPlaced: itemsToCut.length
  };
}

/**
 * 2D PANEL TECHNICAL BLUEPRINT RENDERER (Чертёж детали БАЗИС)
 * Draws orthographic workshop drawing with dimensions, edge banding callouts and drill holes on canvas.
 */
export function drawPanelBlueprint(canvas, panel, drillHoles = []) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Technical blueprint grid background
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  const gridSize = 20;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (!panel) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Selectează o piesă pentru afișarea desenului tehnic', w / 2, h / 2);
    return;
  }

  const pW = panel.lengthMm || 600;
  const pH = panel.widthMm || 300;
  const thickness = panel.thicknessMm || 18;

  // Calculate viewport drawing bounds
  const marginX = 80;
  const marginY = 80;
  const availW = w - marginX * 2;
  const availH = h - marginY * 2 - 50; // extra space for title block

  const scale = Math.min(availW / pW, availH / pH);
  const drawW = pW * scale;
  const drawH = pH * scale;
  const startX = (w - drawW) / 2;
  const startY = 60 + (availH - drawH) / 2;

  // Draw Main Panel Body
  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.fillRect(startX, startY, drawW, drawH);

  // Edge Banding Lines (Front, Back, Left, Right)
  // Red = ABS 2mm, Yellow = ABS 1mm, Blue = 0.4mm
  const is2mm = panel.edgeBanding?.includes('2mm');
  const is1mm = panel.edgeBanding?.includes('1mm');
  const edgeColor = is2mm ? '#ef4444' : is1mm ? '#f59e0b' : '#38bdf8';

  ctx.lineWidth = is2mm ? 4 : 2.5;
  ctx.strokeStyle = edgeColor;
  ctx.strokeRect(startX, startY, drawW, drawH);

  // Core panel stroke
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#f8fafc';
  ctx.strokeRect(startX, startY, drawW, drawH);

  // Dimension Lines & Arrows
  ctx.fillStyle = '#f8fafc';
  ctx.font = '12px JetBrains Mono, monospace';
  ctx.textAlign = 'center';

  // 1. Top Dimension (Length)
  const dimTopY = startY - 25;
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX, startY - 10);
  ctx.lineTo(startX, dimTopY - 5);
  ctx.moveTo(startX + drawW, startY - 10);
  ctx.lineTo(startX + drawW, dimTopY - 5);
  ctx.moveTo(startX, dimTopY);
  ctx.lineTo(startX + drawW, dimTopY);
  ctx.stroke();

  // Arrows
  drawArrow(ctx, startX + 10, dimTopY, -1);
  drawArrow(ctx, startX + drawW - 10, dimTopY, 1);
  ctx.fillText(`${pW} mm`, startX + drawW / 2, dimTopY - 6);

  // 2. Left Dimension (Width)
  const dimLeftX = startX - 25;
  ctx.beginPath();
  ctx.moveTo(startX - 10, startY);
  ctx.lineTo(dimLeftX - 5, startY);
  ctx.moveTo(startX - 10, startY + drawH);
  ctx.lineTo(dimLeftX - 5, startY + drawH);
  ctx.moveTo(dimLeftX, startY);
  ctx.lineTo(dimLeftX, startY + drawH);
  ctx.stroke();

  ctx.save();
  ctx.translate(dimLeftX - 8, startY + drawH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${pH} mm`, 0, 0);
  ctx.restore();

  // Draw Drilling Holes & Crosshairs
  drillHoles.forEach((hole) => {
    const hx = startX + (hole.x || 37) * scale;
    const hy = startY + (hole.y || 50) * scale;

    // Crosshair
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy);
    ctx.lineTo(hx + 8, hy);
    ctx.moveTo(hx, hy - 8);
    ctx.lineTo(hx, hy + 8);
    ctx.stroke();

    // Circle
    const r = Math.max(3, (hole.diameter || 5) * scale * 0.5);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hole callout
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(`Ø${hole.diameter}↧${hole.depth}`, hx + 10, hy - 4);
  });

  // Fiber / Grain Direction Indicator (↔ or ↕)
  const isHoriz = panel.grain?.toLowerCase().includes('oriz');
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(isHoriz ? 'Direcție Fibră: Orizontală ↔' : 'Direcție Fibră: Verticală ↕', startX + drawW / 2, startY + drawH / 2);

  // Technical Title Block (Штамп чертежа)
  const stampW = Math.min(w - 40, 520);
  const stampH = 55;
  const stampX = (w - stampW) / 2;
  const stampY = h - stampH - 15;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(stampX, stampY, stampW, stampH);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(stampX, stampY, stampW, stampH);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${panel.partName} (${panel.cabinet})`, stampX + 12, stampY + 20);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(`Dimensiuni: ${pW} × ${pH} × ${thickness} mm | Cant: ${panel.edgeBanding || 'Niciunul'}`, stampX + 12, stampY + 38);
  ctx.textAlign = 'right';
  ctx.fillText(`Material: ${panel.material || 'PAL Melaminat'}`, stampX + stampW - 12, stampY + 38);
}

function drawArrow(ctx, x, y, dir) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dir * 6, y - 3);
  ctx.lineTo(x + dir * 6, y + 3);
  ctx.closePath();
  ctx.fillStyle = '#64748b';
  ctx.fill();
}

/**
 * EXPORT DRILLING DATA TO CNC FORMAT (БАЗИС-ЧПУ)
 */
export function generateCncDrillingCsv(drillHoles, panels) {
  let csv = '\uFEFF#;Piesă / Panou;Corp;Tip Prelucrare;Diametru Ø (mm);Adâncime (mm);Coord X (mm);Coord Y (mm);Față Prelucrare\n';
  drillHoles.forEach((d, idx) => {
    csv += `"${idx + 1}";"${d.panel}";"${d.cabinet || 'Mobilier'}";"${d.holeType}";${d.diameter};${d.depth};${d.x};${d.y};"${d.face}"\n`;
  });
  return csv;
}

