'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  DEFAULT_SHEET,
  calculateCuttingNesting,
  drawPanelBlueprint,
  generateCncDrillingCsv
} from '../utils/bazisEngineering.js';

export default function TechnicalReportModal({
  isOpen,
  onClose,
  lang = 'ro',
  importedModels = [],
  materials = [],
  onCaptureScreenshot
}) {
  const isRo = lang === 'ro';
  const isRu = lang === 'ru';

  const [activeTab, setActiveTab] = useState('bom'); // 'bom' | 'raskroy' | 'blueprint' | 'cnc'
  const [screenshotUrl, setScreenshotUrl] = useState(null);

  // Pricing configuration for estimation
  const [costPerSqM, setCostPerSqM] = useState(85); // Lei / m2 PAL
  const [costPerMEdge, setCostPerMEdge] = useState(5); // Lei / ml cant
  const [costPerHinge, setCostPerHinge] = useState(18); // Lei / balama
  const [costPerSlide, setCostPerSlide] = useState(65); // Lei / pereche glisiere
  const [currency, setCurrency] = useState('RON');

  // Nesting / Cutting optimization state (БАЗИС-Раскрой)
  const [sheetFormat, setSheetFormat] = useState('2800x2070'); // '2800x2070' | '2440x1830'
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // 2D Blueprint state (Чертёж детали)
  const [selectedBlueprintPartId, setSelectedBlueprintPartId] = useState(null);
  const blueprintCanvasRef = useRef(null);
  const nestingCanvasRef = useRef(null);

  useEffect(() => {
    if (isOpen && onCaptureScreenshot) {
      try {
        const shot = onCaptureScreenshot(true);
        if (shot) setScreenshotUrl(shot);
      } catch (e) {
        console.warn('Screenshot capture failed', e);
      }
    }
  }, [isOpen, onCaptureScreenshot]);

  // Aggregate all cutting lists from all furniture in the scene
  const aggregatedParts = useMemo(() => {
    const list = [];
    importedModels.forEach((model, mIdx) => {
      const cList =
        model.furnitureConfig?.panelCuttingList ||
        model.panelCuttingList ||
        model.cabinetConfig?.panelCuttingList ||
        [];

      if (cList.length > 0) {
        cList.forEach((p, pIdx) => {
          list.push({
            id: `${model.id}_${pIdx}`,
            cabinet: model.name || `Corp ${mIdx + 1}`,
            partName: p.partName,
            lengthMm: p.lengthMm,
            widthMm: p.widthMm,
            thicknessMm: p.thicknessMm || 18,
            qty: p.qty || 1,
            material: p.material || 'PAL 18mm',
            grain: p.grain || 'Vertical',
            edgeBanding: p.edgeBanding || 'Cant ABS 1mm'
          });
        });
      } else {
        // Fallback estimated breakdown from bounding box
        const wMm = Math.round((model.scale?.[0] || 1) * 800);
        const hMm = Math.round((model.scale?.[1] || 1) * 720);
        const dMm = Math.round((model.scale?.[2] || 1) * 560);
        list.push(
          {
            id: `${model.id}_l`,
            cabinet: model.name,
            partName: 'Laterale Carcasă (x2)',
            lengthMm: hMm,
            widthMm: dMm,
            thicknessMm: 18,
            qty: 2,
            material: 'PAL 18mm',
            grain: 'Vertical',
            edgeBanding: 'Cant ABS 1mm'
          },
          {
            id: `${model.id}_tb`,
            cabinet: model.name,
            partName: 'Fund & Capac (x2)',
            lengthMm: Math.max(100, wMm - 36),
            widthMm: dMm,
            thicknessMm: 18,
            qty: 2,
            material: 'PAL 18mm',
            grain: 'Orizontal',
            edgeBanding: 'Cant ABS 1mm'
          },
          {
            id: `${model.id}_f`,
            cabinet: model.name,
            partName: 'Fațadă / Ușă',
            lengthMm: hMm - 4,
            widthMm: wMm - 4,
            thicknessMm: 18,
            qty: 1,
            material: 'MDF / PAL Front',
            grain: 'Vertical',
            edgeBanding: 'Cant ABS 2mm'
          }
        );
      }
    });
    return list;
  }, [importedModels]);

  // Set default selected part for blueprint if none selected
  useEffect(() => {
    if (aggregatedParts.length > 0 && !selectedBlueprintPartId) {
      setSelectedBlueprintPartId(aggregatedParts[0].id);
    }
  }, [aggregatedParts, selectedBlueprintPartId]);

  // Compute summary metrics (total m2, edge ml, hardware)
    const stats = useMemo(() => {
      let carcassSqM = 0;
      let facadeSqM = 0;
      let edgeMeters = 0;
      let hingesCount = 0;
      let slidesCount = 0;
      let handlesCount = 0;

      aggregatedParts.forEach((p) => {
        const area = ((p.lengthMm * p.widthMm) / 1000000) * p.qty;
        const perimM = (((p.lengthMm + p.widthMm) * 2) / 1000) * p.qty;

        if (p.edgeBanding && !p.edgeBanding.includes('Fără')) {
          edgeMeters += perimM;
        }

        if (p.partName.toLowerCase().includes('uș') || p.partName.toLowerCase().includes('front') || p.partName.toLowerCase().includes('door')) {
          facadeSqM += area;
          handlesCount += p.qty;
          if (p.partName.toLowerCase().includes('uș')) {
            hingesCount += p.lengthMm > 1600 ? p.qty * 4 : p.lengthMm > 1000 ? p.qty * 3 : p.qty * 2;
          }
        } else if (p.partName.toLowerCase().includes('sertar') || p.partName.toLowerCase().includes('drawer')) {
          facadeSqM += area;
          slidesCount += p.qty;
          handlesCount += p.qty;
        } else {
          carcassSqM += area;
        }
      });

      const totalSqM = carcassSqM + facadeSqM;
      const SHEET_AREA = 2.8 * 2.07 * 0.85; // 5.79 m2 per sheet minus 15% cutting loss
      const estimatedSheets = Math.max(1, Math.ceil(totalSqM / SHEET_AREA));

      const totalCost = Math.round(
        totalSqM * costPerSqM +
        edgeMeters * costPerMEdge +
        hingesCount * costPerHinge +
        slidesCount * costPerSlide +
        handlesCount * 20
      );

      return {
        totalParts: aggregatedParts.length,
        carcassSqM: carcassSqM.toFixed(2),
        facadeSqM: facadeSqM.toFixed(2),
        totalSqM: totalSqM.toFixed(2),
        edgeMeters: Math.round(edgeMeters),
        estimatedSheets,
        hingesCount,
        slidesCount,
        handlesCount,
        totalCost
      };
    }, [aggregatedParts, costPerSqM, costPerMEdge, costPerHinge, costPerSlide]);

    // Compute 2D Nesting Cut Plan (БАЗИС-Раскрой)
    const nestingResult = useMemo(() => {
      const sheetDims = sheetFormat === '2440x1830'
        ? { widthMm: 2440, heightMm: 1830, trimMm: 15, kerfMm: 4 }
        : { widthMm: 2800, heightMm: 2070, trimMm: 15, kerfMm: 4 };

      return calculateCuttingNesting(aggregatedParts, sheetDims);
    }, [aggregatedParts, sheetFormat]);

    // Draw Active Nesting Sheet on HTML5 Canvas
    useEffect(() => {
      if (activeTab !== 'raskroy') return;
      const canvas = nestingCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      const sheet = nestingResult.sheets[activeSheetIndex] || nestingResult.sheets[0];
      if (!sheet) {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nicio piesă de debitat', w / 2, h / 2);
        return;
      }

      const margin = 40;
      const availW = w - margin * 2;
      const availH = h - margin * 2;
      const scale = Math.min(availW / sheet.totalW, availH / sheet.totalH);

      const sheetDrawW = sheet.totalW * scale;
      const sheetDrawH = sheet.totalH * scale;
      const startX = (w - sheetDrawW) / 2;
      const startY = (h - sheetDrawH) / 2;

      // Draw Master Sheet Outline (Egger / Kronospan PAL)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(startX, startY, sheetDrawW, sheetDrawH);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(startX, startY, sheetDrawW, sheetDrawH);

      // Trim border
      const trimDraw = sheet.trimMm * scale;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(startX + trimDraw, startY + trimDraw, sheetDrawW - trimDraw * 2, sheetDrawH - trimDraw * 2);
      ctx.setLineDash([]);

      // Pastel palette for placed panels
      const panelColors = [
        '#0284c7', '#0d9488', '#16a34a', '#d97706', '#9333ea',
        '#e11d48', '#2563eb', '#059669', '#ca8a04', '#4f46e5'
      ];

      // Draw placed panels
      sheet.placedPanels.forEach((p, idx) => {
        const px = startX + p.x * scale;
        const py = startY + p.y * scale;
        const pw = p.w * scale;
        const ph = p.h * scale;

        const baseColor = panelColors[idx % panelColors.length];
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(px, py, pw, ph);
        ctx.globalAlpha = 1.0;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, pw, ph);

        // Label panel
        if (pw > 30 && ph > 18) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.partName, px + pw / 2, py + ph / 2 - 5, pw - 4);

          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(`${p.w}×${p.h}`, px + pw / 2, py + ph / 2 + 7);
        }
      });

      // Sheet Dimension Annotation
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${sheet.totalW} mm`, startX + sheetDrawW / 2, startY - 10);
      ctx.save();
      ctx.translate(startX - 12, startY + sheetDrawH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${sheet.totalH} mm`, 0, 0);
      ctx.restore();
    }, [activeTab, nestingResult, activeSheetIndex]);

    // Draw 2D Blueprint for Selected Part (Чертёж детали)
    useEffect(() => {
      if (activeTab !== 'blueprint') return;
      const canvas = blueprintCanvasRef.current;
      if (!canvas) return;

      const selectedPart = aggregatedParts.find((p) => p.id === selectedBlueprintPartId) || aggregatedParts[0];

      // Example engineering drill holes on this panel
      const holes = [];
      if (selectedPart) {
        const pL = selectedPart.lengthMm;
        const pW = selectedPart.widthMm;

        if (selectedPart.partName.toLowerCase().includes('lat') || selectedPart.partName.toLowerCase().includes('side')) {
          holes.push(
            { diameter: 7, depth: 18, x: 50, y: 9 },
            { diameter: 7, depth: 18, x: pL - 50, y: 9 },
            { diameter: 7, depth: 18, x: 50, y: pW - 9 },
            { diameter: 7, depth: 18, x: pL - 50, y: pW - 9 },
            { diameter: 5, depth: 12, x: pL / 2, y: pW / 2 }
          );
        } else if (selectedPart.partName.toLowerCase().includes('uș') || selectedPart.partName.toLowerCase().includes('door')) {
          holes.push(
            { diameter: 35, depth: 12.5, x: 21.5, y: 100 },
            { diameter: 35, depth: 12.5, x: 21.5, y: pW - 100 }
          );
        }
      }

      drawPanelBlueprint(canvas, selectedPart, holes);
    }, [activeTab, selectedBlueprintPartId, aggregatedParts]);

    // Handlers for CSV, WhatsApp & Print
    const handleDownloadCsv = () => {
      let csv = '\uFEFFNr,Corp / Modul,Denumire Piesă,Lungime (mm),Lățime (mm),Grosime (mm),Buc,Material,Fibră,Finisaj Cant\n';
      aggregatedParts.forEach((p, idx) => {
        csv += `"${idx + 1}","${p.cabinet}","${p.partName}",${p.lengthMm},${p.widthMm},${p.thicknessMm},${p.qty},"${p.material}","${p.grain}","${p.edgeBanding}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fisa-tehnica-debitare-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleDownloadCnc = () => {
      const drillHoles = [];
      aggregatedParts.forEach((p) => {
        drillHoles.push(
          { panel: p.partName, cabinet: p.cabinet, holeType: 'Confirmat Ø7', diameter: 7, depth: 18, x: 50, y: 9, face: 'Față' },
          { panel: p.partName, cabinet: p.cabinet, holeType: 'Minifix Ø15', diameter: 15, depth: 13.5, x: 34, y: 32, face: 'Față' }
        );
      });
      const csv = generateCncDrillingCsv(drillHoles, aggregatedParts);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bazis-cnc-program-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const [copied, setCopied] = useState(false);

    const getSummaryText = () => {
      return [
        `🛋️ *SPECIFICAȚIE MOBILIER & OFERTĂ БАЗИС*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        `📦 Module în proiect: ${importedModels.length} corpuri`,
        `📐 Piese debitate: ${stats.totalParts} buc`,
        `🪵 PAL carcasă: ${stats.carcassSqM} m² | Fațade: ${stats.facadeSqM} m²`,
        `📊 Total PAL: ${stats.totalSqM} m² (~${stats.estimatedSheets} plăci standard 2800×2070)`,
        `📏 Cant aplicat: ~${stats.edgeMeters} ml`,
        `🔩 Feronerie: ${stats.hingesCount} balamale, ${stats.slidesCount} glisiere, ${stats.handlesCount} mânere`,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        `💰 *Total Estimativ: ${stats.totalCost.toLocaleString('ro-RO')} ${currency}*`,
        ``,
          `Generat cu 3Design Studio (Bucătărie & Mobilier CAD)`
      ].join('\n');
    };

    const handleCopySummary = async () => {
      try {
        const text = getSummaryText();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Failed to copy summary:', e);
      }
    };

    const handleShareWhatsApp = () => {
      const text = getSummaryText();
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    };

    const handlePrint = () => {
      window.print();
    };

    if (!isOpen) return null;

    return (
      <div className="report-modal-backdrop" onClick={onClose}>
          <div className="report-modal-window bazis-manufacturing-window" onClick={(e) => e.stopPropagation()}>
            {/* Header Bar */}
            <div className="report-header-bar">
              <div className="report-brand">
                <span className="report-icon">📐</span>
                <div>
                  <h2>{isRo ? 'БАЗИС Producție & Fabricație CAD' : isRu ? 'БАЗИС Производственный Центр' : 'BAZIS Furniture CAD & Manufacturing Suite'}</h2>
                  <p>{isRo ? 'Debitări, Hărți de tăiere (Раскрой), Planșe tehnice și Program CNC' : isRu ? 'Раскрой, сметы, чертежи деталей и ЧПУ присадка' : 'Cutting nesting, drawings & CNC drilling'}</p>
                </div>
              </div>

              <div className="report-actions">
                <button
                  className="btn-pill"
                  onClick={handleCopySummary}
                  title={isRo ? 'Copiază specificația și prețul pentru ofertă' : isRu ? 'Копировать смету' : 'Copy summary'}
                  style={{
                    borderColor: copied ? '#22c55e' : undefined,
                    color: copied ? '#22c55e' : undefined,
                    fontWeight: 600
                  }}
                >
                  <span>{copied ? '✅' : '📋'}</span>
                  <span>{copied ? (isRo ? 'Copiat!' : isRu ? 'Скопировано!' : 'Copied!') : (isRo ? 'Copiază Sumar' : isRu ? 'Копировать' : 'Copy Summary')}</span>
                </button>
                <button
                  className="btn-pill"
                  onClick={handleShareWhatsApp}
                  title="Trimite rezumatul comenzii pe WhatsApp"
                  style={{ color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.4)', fontWeight: 600 }}
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </button>
                <button className="btn-pill" onClick={handleDownloadCsv} title="Export CSV pentru utilaje de debitare">
                  <span>📥</span>
                  <span>CSV Debitare</span>
                </button>
                <button className="btn-primary" onClick={handlePrint} style={{ padding: '6px 14px', fontSize: '12px' }}>
                  <span>🖨️</span>
                  <span>{isRo ? 'Tipărește / PDF' : isRu ? 'Печать / PDF' : 'Print / PDF'}</span>
                </button>
                <button className="sheet-close-btn" onClick={onClose}>✕</button>
              </div>
            </div>

            {/* Manufacturing Suite Sub-Navigation Tabs */}
            <div className="bazis-modal-tabs">
              <button
                className={`bazis-modal-tab-btn ${activeTab === 'bom' ? 'active' : ''}`}
                onClick={() => setActiveTab('bom')}
              >
                <span>📄</span>
                <span>{isRo ? '1. Fișă Tehnică & Raport BOM' : isRu ? '1. Спецификация & Смета' : '1. BOM & Spec Sheet'}</span>
              </button>
              <button
                className={`bazis-modal-tab-btn ${activeTab === 'raskroy' ? 'active' : ''}`}
                onClick={() => setActiveTab('raskroy')}
              >
                <span>🗺️</span>
                <span>{isRo ? '2. БАЗИС-Раскрой (Hărți Tăiere PAL)' : isRu ? '2. БАЗИС-Раскрой (Карты раскроя)' : '2. BAZIS Cut Nesting (2D)'}</span>
              </button>
              <button
                className={`bazis-modal-tab-btn ${activeTab === 'blueprint' ? 'active' : ''}`}
                onClick={() => setActiveTab('blueprint')}
              >
                <span>📐</span>
                <span>{isRo ? '3. Planșă Tehnică Detaliu (Чертёж)' : isRu ? '3. Чертеж детали & Присадка' : '3. Panel Blueprint & Cotation'}</span>
              </button>
              <button
                className={`bazis-modal-tab-btn ${activeTab === 'cnc' ? 'active' : ''}`}
                onClick={() => setActiveTab('cnc')}
              >
                <span>⚙️</span>
                <span>{isRo ? '4. БАЗИС-ЧПУ (G-Code & Găurire)' : isRu ? '4. БАЗИС-ЧПУ (Сверловка ЧПУ)' : '4. CNC Drilling Program'}</span>
              </button>
            </div>

            {/* Printable & Interactive Content Area */}
            <div className="report-printable-area">
                    {/* TAB 1: BOM & Spec Sheet */}
                    {activeTab === 'bom' && (
            <>
                        <div className="report-summary-grid">
                          {screenshotUrl && (
                            <div className="report-screenshot-box">
                              <img src={screenshotUrl} alt="3D Furniture Render" className="report-render-img" />
                              <span className="report-watermark">Randare 3D CAD</span>
                            </div>
                          )}

                          <div className="report-stats-card">
                            <h3>{isRo ? 'Sumar Materiale & Feronerie' : isRu ? 'Сводка материалов' : 'Material & Hardware Summary'}</h3>
                            <div className="stats-row">
                              <span>{isRo ? 'Corpuri în Proiect:' : isRu ? 'Изделий в сцене:' : 'Cabinets in Scene:'}</span>
                              <strong>{importedModels.length} {isRo ? 'corpuri' : isRu ? 'шт' : 'units'}</strong>
                            </div>
                            <div className="stats-row">
                              <span>{isRo ? 'Total Piese Debitate:' : isRu ? 'Всего деталей:' : 'Total Cut Panels:'}</span>
                              <strong>{stats.totalParts} {isRo ? 'buc' : isRu ? 'шт' : 'pcs'}</strong>
                            </div>
                            <div className="stats-row">
                              <span>{isRo ? 'Suprafață Carcasă (PAL):' : isRu ? 'Площадь каркаса:' : 'Carcass Area:'}</span>
                              <strong>{stats.carcassSqM} m²</strong>
                            </div>
                            <div className="stats-row">
                              <span>{isRo ? 'Suprafață Fațade (Uși/Fronturi):' : isRu ? 'Площадь фасадов:' : 'Facade Area:'}</span>
                              <strong>{stats.facadeSqM} m²</strong>
                            </div>
                            <div className="stats-row">
                              <span>{isRo ? 'Total Suprafață Material:' : isRu ? 'Общая площадь:' : 'Total Board Area:'}</span>
                              <strong style={{ color: '#38bdf8' }}>{stats.totalSqM} m²</strong>
                            </div>
                            <div className="stats-row">
                              <span>{isRo ? 'Necesar Plăci PAL (2800×2070):' : isRu ? 'Листов ЛДСП (2800×2070):' : 'Estimated PAL Sheets:'}</span>
                              <strong>~{stats.estimatedSheets} {isRo ? 'plăci' : isRu ? 'листов' : 'sheets'}</strong>
                            </div>
                            <div className="stats-row">
                              <span>{isRo ? 'Total Canturi (ABS 1mm/2mm):' : isRu ? 'Длина кромки ABS:' : 'Edge Banding Length:'}</span>
                              <strong>~{stats.edgeMeters} ml</strong>
                            </div>
                            <div className="stats-row">
                              <span>{isRo ? 'Balamale Clip-On:' : isRu ? 'Петли мебельные:' : 'Hinges:'}</span>
                              <strong>{stats.hingesCount} {isRo ? 'buc' : isRu ? 'шт' : 'pcs'}</strong>
                            </div>
                            <div className="stats-row">
                              <span>{isRo ? 'Perechi Glisiere Sertar:' : isRu ? 'Комплектов направляющих:' : 'Drawer Slides:'}</span>
                              <strong>{stats.slidesCount} {isRo ? 'perechi' : isRu ? 'пар' : 'pairs'}</strong>
                            </div>
                            <div className="stats-row">
                              <span>{isRo ? 'Mânere Mobilier:' : isRu ? 'Ручки мебельные:' : 'Handles:'}</span>
                              <strong>{stats.handlesCount} {isRo ? 'buc' : isRu ? 'шт' : 'pcs'}</strong>
                            </div>
                          </div>

                          <div className="report-cost-card">
                            <h3>{isRo ? 'Estimator Cost Producție' : isRu ? 'Смета стоимости' : 'Cost Estimation'}</h3>
                            <div className="cost-input-row">
                              <label>{isRo ? 'Preț PAL / m²:' : isRu ? 'Цена ЛДСП / м²:' : 'Board / m²:'}</label>
                              <input
                                type="number"
                                value={costPerSqM}
                                onChange={(e) => setCostPerSqM(Number(e.target.value) || 0)}
                                className="cost-input"
                              />
                            </div>
                            <div className="cost-input-row">
                              <label>{isRo ? 'Preț Cant / ml:' : isRu ? 'Кромка / пог.м:' : 'Edge / m:'}</label>
                              <input
                                type="number"
                                value={costPerMEdge}
                                onChange={(e) => setCostPerMEdge(Number(e.target.value) || 0)}
                                className="cost-input"
                              />
                            </div>
                            <div className="cost-input-row">
                              <label>{isRo ? 'Cost / Balama:' : isRu ? 'Цена / петля:' : 'Hinge unit:'}</label>
                              <input
                                type="number"
                                value={costPerHinge}
                                onChange={(e) => setCostPerHinge(Number(e.target.value) || 0)}
                                className="cost-input"
                              />
                            </div>
                            <div className="cost-input-row">
                              <label>{isRo ? 'Cost / Set Glisieră:' : isRu ? 'Цена / направляющая:' : 'Slide pair:'}</label>
                              <input
                                type="number"
                                value={costPerSlide}
                                onChange={(e) => setCostPerSlide(Number(e.target.value) || 0)}
                                className="cost-input"
                              />
                            </div>
                            <div className="cost-input-row">
                              <label>{isRo ? 'Monedă:' : isRu ? 'Валюта:' : 'Currency:'}</label>
                              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="cost-select">
                                <option value="RON">RON (Lei)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="USD">USD ($)</option>
                                <option value="MDL">MDL (Lei)</option>
                              </select>
                            </div>
                            <div className="cost-total-display">
                              <span>{isRo ? 'TOTAL ESTIMATIV:' : isRu ? 'ИТОГО ПО СМЕТЕ:' : 'ESTIMATED TOTAL:'}</span>
                              <strong>{stats.totalCost.toLocaleString('ro-RO')} {currency}</strong>
                            </div>
                          </div>
                        </div>

                            {/* Cutting BOM Table */}
                            <div className="report-table-section">
                              <h3>{isRo ? 'Listă Detaliată Debitare Panouri (БАЗИС-Раскрой)' : isRu ? 'Ведомость деталей на раскрой' : 'Detailed Panel Cutting List'}</h3>
                              {aggregatedParts.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                  {isRo ? 'Nu există corpuri de mobilier create în scenă. Adaugă corpuri din secțiunea "Mobilier (CAD)".' : isRu ? 'В сцене нет мебели. Создайте модули во вкладке Мебель CAD.' : 'No furniture cabinets placed in scene.'}
                                </p>
                              ) : (
                                <div className="table-responsive">
                                  <table className="cutting-table">
                                    <thead>
                                      <tr>
                                        <th>#</th>
                                        <th>{isRo ? 'Corp / Modul' : isRu ? 'Изделие' : 'Cabinet'}</th>
                                        <th>{isRo ? 'Denumire Piesă' : isRu ? 'Деталь' : 'Part Name'}</th>
                                        <th>{isRo ? 'Lungime (mm)' : isRu ? 'Длина (мм)' : 'Length (mm)'}</th>
                                        <th>{isRo ? 'Lățime (mm)' : isRu ? 'Ширина (мм)' : 'Width (mm)'}</th>
                                        <th>{isRo ? 'Grosime' : isRu ? 'Толщ.' : 'Thk'}</th>
                                        <th>{isRo ? 'Buc' : isRu ? 'Кол-во' : 'Qty'}</th>
                                        <th>{isRo ? 'Material' : isRu ? 'Материал' : 'Material'}</th>
                                        <th>{isRo ? 'Fibră' : isRu ? 'Текстура' : 'Grain'}</th>
                                        <th>{isRo ? 'Canturi' : isRu ? 'Кромка' : 'Edging'}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {aggregatedParts.map((p, idx) => (
                                        <tr key={idx}>
                                          <td>{idx + 1}</td>
                                          <td><strong>{p.cabinet}</strong></td>
                                          <td>{p.partName}</td>
                                          <td className="num-cell">{p.lengthMm}</td>
                                          <td className="num-cell">{p.widthMm}</td>
                                          <td className="num-cell">{p.thicknessMm} mm</td>
                                          <td className="num-cell"><strong>{p.qty}</strong></td>
                                          <td>{p.material}</td>
                                          <td>{p.grain}</td>
                                          <td>
                                            <span className={`edge-tag ${p.edgeBanding.includes('2mm') ? 'edge-2mm' : p.edgeBanding.includes('1mm') ? 'edge-1mm' : ''}`}>
                                              {p.edgeBanding}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                        </>
          )}

                              {/* TAB 2: БАЗИС-Раскрой (2D Cut Nesting Engine) */}
                              {activeTab === 'raskroy' && (
                                <div className="bazis-raskroy-container">
                                  {/* Raskroy Toolbar & Statistics */}
                                  <div className="raskroy-stats-bar">
                                    <div className="raskroy-stat-pill">
                                      <span>{isRo ? 'Eficiență (К.И.М.):' : isRu ? 'К.И.М. (Эффективность):' : 'Efficiency (K.I.M.):'}</span>
                                      <strong style={{ color: '#22c55e' }}>{nestingResult.efficiencyPercent}%</strong>
                                    </div>
                                      <div className="raskroy-stat-pill">
                                        <span>{isRo ? 'Coli Necesare:' : isRu ? 'Листов всего:' : 'Total Sheets:'}</span>
                                        <strong>{nestingResult.sheetsCount} {isRo ? 'coli' : isRu ? 'листов' : 'sheets'}</strong>
                                      </div>
                                        <div className="raskroy-stat-pill">
                                          <span>{isRo ? 'Suprafață Piese:' : isRu ? 'Полезная площадь:' : 'Used Area:'}</span>
                                          <strong>{nestingResult.totalUsedArea} m²</strong>
                                        </div>
                                          <div className="raskroy-stat-pill">
                                            <span>{isRo ? 'Deșeu / Pierdere:' : isRu ? 'Отходы раскроя:' : 'Scrap Area:'}</span>
                                            <strong>{nestingResult.scrapAreaSqM} m²</strong>
                                          </div>
                                        <div className="raskroy-stat-pill">
                                          <span>{isRo ? 'Lungime Tăiere:' : isRu ? 'Длина реза:' : 'Cut Length:'}</span>
                                          <strong>{nestingResult.totalCutMeters} ml</strong>
                                        </div>

                                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                              <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Format Placă:</label>
                                              <select
                                                value={sheetFormat}
                                                onChange={(e) => {
                                                  setSheetFormat(e.target.value);
                                                  setActiveSheetIndex(0);
                                                }}
                                                className="cost-select"
                                                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                              >
                                                <option value="2800x2070">2800 × 2070 mm (Standard Egger)</option>
                                                <option value="2440x1830">2440 × 1830 mm (Standard Krono)</option>
                                              </select>
                                            </div>
                                          </div>

                                          {/* Sheet Switcher */}
                                          <div className="raskroy-sheet-nav">
                                            <button
                                              type="button"
                                              className="btn-pill"
                                              disabled={activeSheetIndex <= 0}
                                              onClick={() => setActiveSheetIndex((v) => Math.max(0, v - 1))}
                                            >
                                              ◄ Foaia Anterioară
                                            </button>
                                            <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem' }}>
                                              Foaia {activeSheetIndex + 1} din {nestingResult.sheetsCount} (Eficiență: {nestingResult.sheets[activeSheetIndex]?.efficiencyPercent || 0}%)
                                            </span>
                                            <button
                                              type="button"
                                              className="btn-pill"
                                              disabled={activeSheetIndex >= nestingResult.sheetsCount - 1}
                                              onClick={() => setActiveSheetIndex((v) => Math.min(nestingResult.sheetsCount - 1, v + 1))}
                                            >
                                              Foaia Următoare ►
                                            </button>
                                          </div>

                                          {/* 2D Canvas Viewport */}
                                          <div className="raskroy-canvas-box">
                                            <canvas
                                              ref={nestingCanvasRef}
                                              width={960}
                                              height={560}
                                              className="raskroy-canvas"
                                            />
                                          </div>
                                        </div>
          )}

                                          {/* TAB 3: 2D Panel Blueprint & Cotation (Чертёж детали) */}
                                          {activeTab === 'blueprint' && (
                                            <div className="bazis-blueprint-container">
                                              {/* Part Selector Bar */}
                                              <div className="blueprint-selector-bar">
                                                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
                                                  {isRo ? 'Alege Piesa pentru Desenare Tehnică:' : isRu ? 'Выберите деталь для чертежа:' : 'Select Panel for Blueprint:'}
                                                </span>
                                                <select
                                                  value={selectedBlueprintPartId || ''}
                                                  onChange={(e) => setSelectedBlueprintPartId(e.target.value)}
                                                  className="cost-select"
                                                  style={{ flex: 1, maxWidth: '420px', padding: '6px 10px' }}
                                                >
                                                  {aggregatedParts.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                      {p.cabinet} — {p.partName} ({p.lengthMm} × {p.widthMm} mm)
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>

                                              {/* 2D Blueprint Canvas Viewport */}
                                              <div className="blueprint-canvas-box">
                                                <canvas
                                                  ref={blueprintCanvasRef}
                                                  width={960}
                                                  height={560}
                                                  className="blueprint-canvas"
                                                />
                                              </div>
                                            </div>
                                          )}

                                                  {/* TAB 4: CNC Drilling & G-Code Export (БАЗИС-ЧПУ) */ }
          {activeTab === 'cnc' && (
                                                  <div className="bazis-cnc-container">
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                                      <div>
                                                        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.05rem' }}>{isRo ? 'Program Găurire CNC (System 32)' : isRu ? 'Программа сверловки для станков с ЧПУ' : 'CNC Drilling Coordinates Program'}</h3>
                                                        <small style={{ color: '#94a3b8' }}>{isRo ? 'Coordonate de găurire pentru Minifix, Euroșuruburi, Șcanturi și Balamale' : isRu ? 'Координаты присадки отверстий X, Y, глубина' : 'Drilling X, Y, depth and diameter coordinates'}</small>
                                                      </div>
                                                      <button className="btn-primary" onClick={handleDownloadCnc}>
                                                        <span>📥</span>
                                                        <span>{isRo ? 'Exportă Program CNC (.csv)' : isRu ? 'Экспорт программы ЧПУ (.csv)' : 'Export CNC Program (.csv)'}</span>
                                                      </button>
                                                    </div>

                                                    <div className="table-responsive">
                                                      <table className="cutting-table">
                                                        <thead>
                                                          <tr>
                                                            <th>#</th>
                                                            <th>Piesă</th>
                                                            <th>Corp</th>
                                                            <th>Operațiune / Tip Găurire</th>
                                                            <th>Diametru Ø</th>
                                                            <th>Adâncime</th>
                                                            <th>Coord. X</th>
                                                            <th>Coord. Y</th>
                                                            <th>Suprafață</th>
                                                          </tr>
                                                    </thead>
                                                    <tbody>
                                                      {aggregatedParts.slice(0, 20).map((p, idx) => (
                                                        <React.Fragment key={idx}>
                                                          <tr>
                                                            <td>{idx * 2 + 1}</td>
                                                            <td><strong>{p.partName}</strong></td>
                                                            <td>{p.cabinet}</td>
                                                            <td>Confirmat Ø7 mm (Găurire trecere)</td>
                                                            <td className="num-cell">7 mm</td>
                                                            <td className="num-cell">18 mm</td>
                                                            <td className="num-cell">50 mm</td>
                                                            <td className="num-cell">9 mm</td>
                                                            <td>Față Superioară</td>
                                                          </tr>
                                                          <tr>
                                                            <td>{idx * 2 + 2}</td>
                                                            <td><strong>{p.partName}</strong></td>
                                                            <td>{p.cabinet}</td>
                                                            <td>Minifix Ø15 mm (Oală excentric)</td>
                                                            <td className="num-cell">15 mm</td>
                                                            <td className="num-cell">13.5 mm</td>
                                                            <td className="num-cell">34 mm</td>
                                                            <td className="num-cell">32 mm</td>
                                                            <td>Față Interioară</td>
                                                          </tr>
                                                        </React.Fragment>
                                                      ))}
                                                    </tbody>
                                                  </table>
              </div>
                                          </div>
          )}
                                      </div>
                                    </div>
                                  </div>
                                  );
}
