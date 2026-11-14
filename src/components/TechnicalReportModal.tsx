'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  calculateCuttingNesting,
  drawPanelBlueprint,
  generateCncDrillingCsv
} from '../utils/furnitureEngineering';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

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

  // Nesting / Cutting optimization state (Optimizare Debit & Croire)
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

    // Compute 2D Nesting Cut Plan (Optimizare Debit & Croire)
    const nestingResult = useMemo(() => {
      let sheetDims = { widthMm: 2800, heightMm: 2070, trimMm: 15, kerfMm: 4 };
      if (sheetFormat === '2440x1830') {
        sheetDims = { widthMm: 2440, heightMm: 1830, trimMm: 15, kerfMm: 4 };
      } else if (sheetFormat === '2750x1830') {
        sheetDims = { widthMm: 2750, heightMm: 1830, trimMm: 15, kerfMm: 4 };
      }

      return calculateCuttingNesting(aggregatedParts, sheetDims);
    }, [aggregatedParts, sheetFormat]);

    // Download high-resolution PNG of the active 2D cutting nesting sheet
    const handleDownloadNestingSheetPng = () => {
      const canvas = nestingCanvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `plan_debitare_foaia_${activeSheetIndex + 1}_${sheetFormat}_${Date.now()}.png`;
      a.click();
    };

    // Draw Active Nesting Sheet on HTML5 Canvas
    useEffect(() => {
      if (activeTab !== 'raskroy') return;
      const canvas = nestingCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      // Dark CAD workshop background
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, w, h);

      const sheet = nestingResult.sheets[activeSheetIndex] || nestingResult.sheets[0];
      if (!sheet) {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nicio piesă de debitat', w / 2, h / 2);
        return;
      }

      const totalSheetW = sheet.totalW || sheet.width || 2800;
      const totalSheetH = sheet.totalH || sheet.height || 2070;
      const trimMm = sheet.trimMm || sheet.trim || 15;
      const kerfMm = sheet.kerfMm || sheet.kerf || 4;

      const margin = 48;
      const availW = w - margin * 2;
      const availH = h - margin * 2;
      const scale = Math.min(availW / totalSheetW, availH / totalSheetH);

      const sheetDrawW = totalSheetW * scale;
      const sheetDrawH = totalSheetH * scale;
      const startX = (w - sheetDrawW) / 2;
      const startY = (h - sheetDrawH) / 2;

      // Master Sheet Raw Board Outline (Egger / Kronospan PAL)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(startX, startY, sheetDrawW, sheetDrawH);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(startX, startY, sheetDrawW, sheetDrawH);

      // Trim perimeter border (Margine tunsă/curățată)
      const trimDraw = trimMm * scale;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(
        startX + trimDraw,
        startY + trimDraw,
        sheetDrawW - trimDraw * 2,
        sheetDrawH - trimDraw * 2
      );
      ctx.setLineDash([]);

      // Color palette for distinguishing different cabinets/parts
      const palette = [
        { bg: 'rgba(2, 132, 199, 0.72)', border: '#38bdf8' },
        { bg: 'rgba(13, 148, 136, 0.72)', border: '#2dd4bf' },
        { bg: 'rgba(22, 163, 74, 0.72)', border: '#4ade80' },
        { bg: 'rgba(217, 119, 6, 0.72)', border: '#fbbf24' },
        { bg: 'rgba(147, 51, 234, 0.72)', border: '#c084fc' },
        { bg: 'rgba(225, 29, 72, 0.72)', border: '#fb7185' },
        { bg: 'rgba(37, 99, 235, 0.72)', border: '#60a5fa' },
        { bg: 'rgba(5, 150, 105, 0.72)', border: '#34d399' },
        { bg: 'rgba(202, 138, 4, 0.72)', border: '#facc15' },
        { bg: 'rgba(79, 70, 229, 0.72)', border: '#818cf8' }
      ];

      // Draw placed panels with ABS edge banding borders and grain orientation
      sheet.placedPanels.forEach((p: any, idx: number) => {
        const px = startX + p.x * scale;
        const py = startY + p.y * scale;
        const pw = p.w * scale;
        const ph = p.h * scale;

        const colorEntry = palette[idx % palette.length];

        // Fill panel body
        ctx.fillStyle = colorEntry.bg;
        ctx.fillRect(px, py, pw, ph);

        // Determine edge banding classification
        const edgeStr = (p.edgeBanding || '').toLowerCase();
        let edgeColor = '#94a3b8'; // default neutral
        let edgeWidth = 1.2;
        let edgeLabel = '';

        if (edgeStr.includes('2mm') || edgeStr.includes('2 mm') || edgeStr.includes('2.0')) {
          edgeColor = '#f59e0b'; // Amber / 2mm
          edgeWidth = 3.2;
          edgeLabel = 'ABS 2mm';
        } else if (edgeStr.includes('1mm') || edgeStr.includes('1 mm') || edgeStr.includes('1.0')) {
          edgeColor = '#06b6d4'; // Cyan / 1mm
          edgeWidth = 2.4;
          edgeLabel = 'ABS 1mm';
        } else if (edgeStr.includes('0.4') || edgeStr.includes('0.5')) {
          edgeColor = '#10b981'; // Emerald / 0.4mm
          edgeWidth = 1.6;
          edgeLabel = 'ABS 0.4mm';
        }

        // Draw inner outline
        ctx.strokeStyle = colorEntry.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, pw, ph);

        // Draw high-visibility ABS Edge Banding outer line
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = edgeWidth;
        ctx.strokeRect(px + edgeWidth / 2, py + edgeWidth / 2, Math.max(1, pw - edgeWidth), Math.max(1, ph - edgeWidth));

        // Grain Orientation Indicator & Subtle Grain Lines
        const isVerticalGrain = p.grain !== 'Orizontal' && p.grain !== 'Horizontal';
        if (pw > 28 && ph > 20) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          if (isVerticalGrain) {
            for (let gx = px + 10; gx < px + pw - 8; gx += 16) {
              ctx.beginPath();
              ctx.moveTo(gx, py + 4);
              ctx.lineTo(gx, py + ph - 4);
              ctx.stroke();
            }
          } else {
            for (let gy = py + 10; gy < py + ph - 8; gy += 16) {
              ctx.beginPath();
              ctx.moveTo(px + 4, gy);
              ctx.lineTo(px + pw - 4, gy);
              ctx.stroke();
            }
          }
        }

        // Panel Identification & Cutting Dimensions
        if (pw >= 65 && ph >= 38) {
          // Large Panel: Full detail
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '600 8.5px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const cabText = p.cabinet ? `[${p.cabinet}]` : '';
          ctx.fillText(cabText, px + pw / 2, py + 4, pw - 8);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10.5px Inter, sans-serif';
          ctx.fillText(p.partName || 'Piesă', px + pw / 2, py + 15, pw - 8);

          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.fillStyle = '#fef08a';
          ctx.fillText(`${p.w} × ${p.h} mm`, px + pw / 2, py + 28);

          if (edgeLabel && ph >= 52) {
            ctx.font = '600 8px Inter, sans-serif';
            ctx.fillStyle = edgeColor;
            ctx.fillText(`${edgeLabel} • ${isVerticalGrain ? '↕ Fibră' : '↔ Fibră'}`, px + pw / 2, py + 40);
          }
        } else if (pw >= 40 && ph >= 24) {
          // Medium Panel: Name & Dimensions
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9.5px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.partName || 'Piesă', px + pw / 2, py + ph / 2 - 6, pw - 6);

          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillStyle = '#fef08a';
          ctx.fillText(`${p.w}×${p.h}`, px + pw / 2, py + ph / 2 + 6);
        } else if (pw >= 24 && ph >= 16) {
          // Compact Panel: Dimension only
          ctx.fillStyle = '#ffffff';
          ctx.font = '8.5px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${p.w}×${p.h}`, px + pw / 2, py + ph / 2, pw - 4);
        }
      });

      // Sheet Dimension Labels (Technical CAD Cotation)
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`◄ ${totalSheetW} mm ►`, startX + sheetDrawW / 2, startY - 8);

      ctx.save();
      ctx.translate(startX - 14, startY + sheetDrawH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = 'bottom';
      ctx.fillText(`◄ ${totalSheetH} mm ►`, 0, 0);
      ctx.restore();

      // Footer stamp on sheet: Placed panels count & efficiency
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '9.5px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(
        `Foaia #${activeSheetIndex + 1} • ${sheet.placedPanels.length} piese • Kerf: ${kerfMm}mm • Trim: ${trimMm}mm`,
        startX + sheetDrawW,
        startY + sheetDrawH + 8
      );
    }, [activeTab, nestingResult, activeSheetIndex, sheetFormat]);

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
      const csv = generateCncDrillingCsv(drillHoles, 'Total_Project');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cnc-drilling-program-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const [copied, setCopied] = useState(false);

    const getSummaryText = () => {
      return [
        `🛋️ *SPECIFICAȚIE MOBILIER & OFERTĂ PRODUCȚIE*`,
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

    const cardClass =
      'rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-2 print:border-slate-300 print:bg-white print:text-slate-900 print:break-inside-avoid';
    const cardTitleClass =
      'm-0 mb-1.5 text-[0.9rem] font-bold text-slate-100 border-b border-white/10 pb-2 print:text-slate-900 print:border-slate-300';
    const statsRowClass =
      'flex items-center justify-between text-[0.8rem] text-slate-300 py-1 border-b border-white/[0.04] last:border-b-0 print:text-slate-700 print:border-slate-200';
    const costInputRowClass =
      'flex items-center justify-between gap-2 text-[0.8rem] text-slate-300 py-1 print:text-slate-700';
    const inputNumClass =
      'w-24 rounded-md border border-white/15 bg-black/35 px-2 py-1 text-right text-[0.82rem] font-mono text-white focus:border-sky-400 focus:outline-none print:border-slate-300 print:bg-white print:text-slate-900';
    const selectClass =
      'rounded-md border border-white/15 bg-slate-900 px-2 py-1 text-[0.8rem] text-white focus:border-sky-400 focus:outline-none print:border-slate-300 print:bg-white print:text-slate-900';
    const statPillClass =
      'flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 print:border-slate-300 print:bg-slate-50 print:text-slate-800';
    const tableClass =
      'w-full border-collapse text-left text-[0.78rem]';
    const thClass =
      'bg-slate-900/90 text-slate-300 font-semibold px-2.5 py-2 border-b border-white/15 whitespace-nowrap print:bg-slate-100 print:text-slate-900 print:border-slate-300';
    const tdClass =
      'px-2.5 py-1.5 border-b border-white/[0.06] text-slate-200 print:text-slate-800 print:border-slate-200';

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showClose={false}
          className="max-w-[1200px] w-[96vw] max-h-[92vh] p-0 overflow-hidden flex flex-col border-white/15 bg-[#121620]/98 print:static print:max-w-none print:w-full print:max-h-none print:overflow-visible print:border-0 print:bg-white print:text-black print:shadow-none"
        >
          <DialogTitle className="sr-only">
            {isRo ? 'Centru Producție & Fabricație Tehnică CAD' : 'CAD Furniture Manufacturing & Production Suite'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isRo ? 'Debitări, Hărți de tăiere, Planșe tehnice și Program CNC' : 'Cutting nesting, drawings & CNC drilling'}
          </DialogDescription>
            {/* Header Bar */}
            <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-black/25 px-5 py-3.5 max-md:flex-col max-md:items-start max-md:gap-2.5 max-md:p-3 print:border-slate-300 print:bg-white">
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">📐</span>
                <div>
                  <h2 className="m-0 text-base font-bold text-slate-100 print:text-slate-900">
                    {isRo ? 'Centru Producție & Fabricație Tehnică CAD' : isRu ? 'Производственный Центр CAD' : 'CAD Furniture Manufacturing & Production Suite'}
                  </h2>
                  <p className="m-0 text-xs text-slate-400 print:text-slate-600">
                    {isRo ? 'Debitări, Hărți de tăiere (Раскрой), Planșe tehnice și Program CNC' : isRu ? 'Раскрой, сметы, чертежи деталей и ЧПУ присадка' : 'Cutting nesting, drawings & CNC drilling'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 max-md:w-full max-md:flex-wrap print:hidden">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    copied
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                      : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                  onClick={handleCopySummary}
                  title={isRo ? 'Copiază specificația și prețul pentru ofertă' : isRu ? 'Копировать смету' : 'Copy summary'}
                >
                  <span>{copied ? '✅' : '📋'}</span>
                  <span>{copied ? (isRo ? 'Copiat!' : isRu ? 'Скопировано!' : 'Copied!') : (isRo ? 'Copiază Sumar' : isRu ? 'Копировать' : 'Copy Summary')}</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-2.5 py-1.5 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/20 transition-colors cursor-pointer"
                  onClick={handleShareWhatsApp}
                  title="Trimite rezumatul comenzii pe WhatsApp"
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={handleDownloadCsv}
                  title="Export CSV pentru utilaje de debitare"
                >
                  <span>📥</span>
                  <span>CSV Debitare</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:brightness-110 transition cursor-pointer"
                  onClick={handlePrint}
                >
                  <span>🖨️</span>
                  <span>{isRo ? 'Tipărește / PDF' : isRu ? 'Печать / PDF' : 'Print / PDF'}</span>
                </button>
                <button
                  type="button"
                  className="bg-white/10 hover:bg-white/20 border-none text-slate-200 w-7 h-7 rounded-full text-sm cursor-pointer flex items-center justify-center transition-colors"
                  onClick={onClose}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Manufacturing Suite Sub-Navigation Tabs (Radix UI) */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="border-b border-white/10 bg-black/20 px-4 py-2 print:hidden">
              <TabsList className="flex w-full flex-wrap gap-1 bg-transparent p-0 border-0">
                <TabsTrigger value="bom" className="gap-1.5">
                  <span>📄</span>
                  <span>{isRo ? '1. Fișă Tehnică & BOM' : isRu ? '1. Спецификация & Смета' : '1. BOM & Spec Sheet'}</span>
                </TabsTrigger>
                <TabsTrigger value="raskroy" className="gap-1.5">
                  <span>🗺️</span>
                  <span>{isRo ? '2. Optimizare Debit & Croire' : isRu ? '2. Карты раскроя' : '2. 2D Cut Nesting'}</span>
                </TabsTrigger>
                <TabsTrigger value="blueprint" className="gap-1.5">
                  <span>📐</span>
                  <span>{isRo ? '3. Planșă Tehnică Detaliu' : isRu ? '3. Чертеж детали' : '3. Panel Blueprint'}</span>
                </TabsTrigger>
                <TabsTrigger value="cnc" className="gap-1.5">
                  <span>⚙️</span>
                  <span>{isRo ? '4. Programare CNC & Găurire' : isRu ? '4. Сверловка ЧПУ' : '4. CNC Drilling'}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Printable & Interactive Content Area */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 print:overflow-visible print:p-0">
                    {/* TAB 1: BOM & Spec Sheet */}
                    {activeTab === 'bom' && (
            <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {screenshotUrl && (
                            <div className="relative rounded-xl border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center min-h-[210px] print:border-slate-300 print:bg-slate-50">
                              <img src={screenshotUrl} alt="3D Furniture Render" className="w-full h-full object-contain max-h-[260px]" />
                              <span className="absolute bottom-2 right-2.5 rounded bg-black/70 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-300">
                                Randare 3D CAD
                              </span>
                            </div>
                          )}

                          <div className={cardClass}>
                            <h3 className={cardTitleClass}>{isRo ? 'Sumar Materiale & Feronerie' : isRu ? 'Сводка материалов' : 'Material & Hardware Summary'}</h3>
                            <div className={statsRowClass}>
                              <span>{isRo ? 'Corpuri în Proiect:' : isRu ? 'Изделий в сцене:' : 'Cabinets in Scene:'}</span>
                              <strong>{importedModels.length} {isRo ? 'corpuri' : isRu ? 'шт' : 'units'}</strong>
                            </div>
                            <div className={statsRowClass}>
                              <span>{isRo ? 'Total Piese Debitate:' : isRu ? 'Всего деталей:' : 'Total Cut Panels:'}</span>
                              <strong>{stats.totalParts} {isRo ? 'buc' : isRu ? 'шт' : 'pcs'}</strong>
                            </div>
                            <div className={statsRowClass}>
                              <span>{isRo ? 'Suprafață Carcasă (PAL):' : isRu ? 'Площадь каркаса:' : 'Carcass Area:'}</span>
                              <strong>{stats.carcassSqM} m²</strong>
                            </div>
                            <div className={statsRowClass}>
                              <span>{isRo ? 'Suprafață Fațade (Uși/Fronturi):' : isRu ? 'Площадь фасадов:' : 'Facade Area:'}</span>
                              <strong>{stats.facadeSqM} m²</strong>
                            </div>
                            <div className={statsRowClass}>
                              <span>{isRo ? 'Total Suprafață Material:' : isRu ? 'Общая площадь:' : 'Total Board Area:'}</span>
                              <strong className="text-sky-400 print:text-sky-700">{stats.totalSqM} m²</strong>
                            </div>
                            <div className={statsRowClass}>
                              <span>{isRo ? 'Necesar Plăci PAL (2800×2070):' : isRu ? 'Листов ЛДСП (2800×2070):' : 'Estimated PAL Sheets:'}</span>
                              <strong>~{stats.estimatedSheets} {isRo ? 'plăci' : isRu ? 'листов' : 'sheets'}</strong>
                            </div>
                            <div className={statsRowClass}>
                              <span>{isRo ? 'Total Canturi (ABS 1mm/2mm):' : isRu ? 'Длина кромки ABS:' : 'Edge Banding Length:'}</span>
                              <strong>~{stats.edgeMeters} ml</strong>
                            </div>
                            <div className={statsRowClass}>
                              <span>{isRo ? 'Balamale Clip-On:' : isRu ? 'Петли мебельные:' : 'Hinges:'}</span>
                              <strong>{stats.hingesCount} {isRo ? 'buc' : isRu ? 'шт' : 'pcs'}</strong>
                            </div>
                            <div className={statsRowClass}>
                              <span>{isRo ? 'Perechi Glisiere Sertar:' : isRu ? 'Комплектов направляющих:' : 'Drawer Slides:'}</span>
                              <strong>{stats.slidesCount} {isRo ? 'perechi' : isRu ? 'пар' : 'pairs'}</strong>
                            </div>
                            <div className={statsRowClass}>
                              <span>{isRo ? 'Mânere Mobilier:' : isRu ? 'Ручки мебельные:' : 'Handles:'}</span>
                              <strong>{stats.handlesCount} {isRo ? 'buc' : isRu ? 'шт' : 'pcs'}</strong>
                            </div>
                          </div>

                          <div className={cardClass}>
                            <h3 className={cardTitleClass}>{isRo ? 'Estimator Cost Producție' : isRu ? 'Смета стоимости' : 'Cost Estimation'}</h3>
                            <div className={costInputRowClass}>
                              <label>{isRo ? 'Preț PAL / m²:' : isRu ? 'Цена ЛДСП / м²:' : 'Board / m²:'}</label>
                              <input
                                type="number"
                                value={costPerSqM}
                                onChange={(e) => setCostPerSqM(Number(e.target.value) || 0)}
                                className={inputNumClass}
                              />
                            </div>
                            <div className={costInputRowClass}>
                              <label>{isRo ? 'Preț Cant / ml:' : isRu ? 'Кромка / пог.м:' : 'Edge / m:'}</label>
                              <input
                                type="number"
                                value={costPerMEdge}
                                onChange={(e) => setCostPerMEdge(Number(e.target.value) || 0)}
                                className={inputNumClass}
                              />
                            </div>
                            <div className={costInputRowClass}>
                              <label>{isRo ? 'Cost / Balama:' : isRu ? 'Цена / петля:' : 'Hinge unit:'}</label>
                              <input
                                type="number"
                                value={costPerHinge}
                                onChange={(e) => setCostPerHinge(Number(e.target.value) || 0)}
                                className={inputNumClass}
                              />
                            </div>
                            <div className={costInputRowClass}>
                              <label>{isRo ? 'Cost / Set Glisieră:' : isRu ? 'Цена / направляющая:' : 'Slide pair:'}</label>
                              <input
                                type="number"
                                value={costPerSlide}
                                onChange={(e) => setCostPerSlide(Number(e.target.value) || 0)}
                                className={inputNumClass}
                              />
                            </div>
                            <div className={costInputRowClass}>
                              <label>{isRo ? 'Monedă:' : isRu ? 'Валюта:' : 'Currency:'}</label>
                              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
                                <option value="RON">RON (Lei)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="USD">USD ($)</option>
                                <option value="MDL">MDL (Lei)</option>
                              </select>
                            </div>
                            <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between text-sm print:border-slate-300">
                              <span className="text-slate-400 font-semibold print:text-slate-700">{isRo ? 'TOTAL ESTIMATIV:' : isRu ? 'ИТОГО ПО СМЕТЕ:' : 'ESTIMATED TOTAL:'}</span>
                              <strong className="text-lg font-extrabold text-amber-400 print:text-slate-900">{stats.totalCost.toLocaleString('ro-RO')} {currency}</strong>
                            </div>
                          </div>
                        </div>

                            {/* Cutting BOM Table */}
                            <div className="flex flex-col gap-3">
                              <h3 className="m-0 text-sm font-bold text-slate-100 print:text-slate-900">
                                {isRo ? 'Listă Detaliată Debitare Panouri (Optimizare Debit & Croire)' : isRu ? 'Ведомость деталей на раскрой' : 'Detailed Panel Cutting List'}
                              </h3>
                              {aggregatedParts.length === 0 ? (
                                <p className="text-slate-400 italic text-sm">
                                  {isRo ? 'Nu există corpuri de mobilier create în scenă. Adaugă corpuri din secțiunea "Mobilier (CAD)".' : isRu ? 'В сцене нет мебели. Создайте модули во вкладке Мебель CAD.' : 'No furniture cabinets placed in scene.'}
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25 print:border-slate-300 print:bg-white">
                                  <table className={tableClass}>
                                    <thead>
                                      <tr>
                                        <th className={thClass}>#</th>
                                        <th className={thClass}>{isRo ? 'Corp / Modul' : isRu ? 'Изделие' : 'Cabinet'}</th>
                                        <th className={thClass}>{isRo ? 'Denumire Piesă' : isRu ? 'Деталь' : 'Part Name'}</th>
                                        <th className={thClass}>{isRo ? 'Lungime (mm)' : isRu ? 'Длина (мм)' : 'Length (mm)'}</th>
                                        <th className={thClass}>{isRo ? 'Lățime (mm)' : isRu ? 'Ширина (мм)' : 'Width (mm)'}</th>
                                        <th className={thClass}>{isRo ? 'Grosime' : isRu ? 'Толщ.' : 'Thk'}</th>
                                        <th className={thClass}>{isRo ? 'Buc' : isRu ? 'Кол-во' : 'Qty'}</th>
                                        <th className={thClass}>{isRo ? 'Material' : isRu ? 'Материал' : 'Material'}</th>
                                        <th className={thClass}>{isRo ? 'Fibră' : isRu ? 'Текстура' : 'Grain'}</th>
                                        <th className={thClass}>{isRo ? 'Canturi' : isRu ? 'Кромка' : 'Edging'}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {aggregatedParts.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-white/[0.03]">
                                          <td className={tdClass}>{idx + 1}</td>
                                          <td className={tdClass}><strong>{p.cabinet}</strong></td>
                                          <td className={tdClass}>{p.partName}</td>
                                          <td className={`${tdClass} font-mono text-right`}>{p.lengthMm}</td>
                                          <td className={`${tdClass} font-mono text-right`}>{p.widthMm}</td>
                                          <td className={`${tdClass} font-mono text-right`}>{p.thicknessMm} mm</td>
                                          <td className={`${tdClass} font-mono text-right`}><strong>{p.qty}</strong></td>
                                          <td className={tdClass}>{p.material}</td>
                                          <td className={tdClass}>{p.grain}</td>
                                          <td className={tdClass}>
                                            <span
                                              className={`inline-block rounded px-1.5 py-0.5 text-[0.7rem] font-semibold ${
                                                p.edgeBanding.includes('2mm')
                                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                  : p.edgeBanding.includes('1mm')
                                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                                    : 'bg-white/5 text-slate-400'
                                              }`}
                                            >
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

                              {/* TAB 2: Optimizare Debit & Croire (2D Cut Nesting Engine) */}
                              {activeTab === 'raskroy' && (
                                <div className="flex flex-col gap-3.5">
                                  {/* Raskroy Toolbar & Statistics */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className={statPillClass}>
                                      <span>{isRo ? 'Eficiență (К.И.М.):' : isRu ? 'К.И.М. (Эффективность):' : 'Efficiency (K.I.M.):'}</span>
                                      <strong className="text-emerald-400">{nestingResult.efficiencyPercent}%</strong>
                                    </div>
                                      <div className={statPillClass}>
                                        <span>{isRo ? 'Coli Necesare:' : isRu ? 'Листов всего:' : 'Total Sheets:'}</span>
                                        <strong>{nestingResult.sheetsCount} {isRo ? 'coli' : isRu ? 'листов' : 'sheets'}</strong>
                                      </div>
                                        <div className={statPillClass}>
                                          <span>{isRo ? 'Suprafață Piese:' : isRu ? 'Полезная площадь:' : 'Used Area:'}</span>
                                          <strong>{nestingResult.totalUsedArea} m²</strong>
                                        </div>
                                          <div className={statPillClass}>
                                            <span>{isRo ? 'Deșeu / Pierdere:' : isRu ? 'Отходы раскроя:' : 'Scrap Area:'}</span>
                                            <strong>{nestingResult.scrapAreaSqM} m²</strong>
                                          </div>
                                        <div className={statPillClass}>
                                          <span>{isRo ? 'Lungime Tăiere:' : isRu ? 'Длина реза:' : 'Cut Length:'}</span>
                                          <strong>{nestingResult.totalCutMeters} ml</strong>
                                        </div>

                                            <div className="ml-auto flex items-center gap-2">
                                              <label className="text-xs text-slate-400">Format Placă:</label>
                                              <select
                                                value={sheetFormat}
                                                onChange={(e) => {
                                                  setSheetFormat(e.target.value);
                                                  setActiveSheetIndex(0);
                                                }}
                                                className={`${selectClass} text-xs py-1 px-2`}
                                              >
                                                <option value="2800x2070">2800 × 2070 mm (Standard Egger / Kastamonu)</option>
                                                <option value="2440x1830">2440 × 1830 mm (Standard Kronospan)</option>
                                                <option value="2750x1830">2750 × 1830 mm (Standard AGT / Swisspan)</option>
                                              </select>
                                            </div>
                                          </div>

                                          {/* Sheet Switcher & Print / PNG Export Actions */}
                                          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
                                                disabled={activeSheetIndex <= 0}
                                                onClick={() => setActiveSheetIndex((v) => Math.max(0, v - 1))}
                                              >
                                                ◄ Foaia Anterioară
                                              </button>
                                              <span className="text-[13px] font-bold text-slate-50">
                                                Foaia {activeSheetIndex + 1} din {nestingResult.sheetsCount} (Randament: {nestingResult.sheets[activeSheetIndex]?.efficiencyPercent || 0}%)
                                              </span>
                                              <button
                                                type="button"
                                                className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
                                                disabled={activeSheetIndex >= nestingResult.sheetsCount - 1}
                                                onClick={() => setActiveSheetIndex((v) => Math.min(nestingResult.sheetsCount - 1, v + 1))}
                                              >
                                                Foaia Următoare ►
                                              </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={handleDownloadNestingSheetPng}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/45 bg-sky-500/20 px-2.5 py-1 text-xs font-medium text-sky-300 hover:bg-sky-500/30 transition-colors cursor-pointer"
                                                title="Descarcă imaginea de debitare la rezoluție înaltă"
                                              >
                                                <span>📥</span>
                                                <span>{isRo ? 'Descarcă PNG Foaie' : 'Download Sheet PNG'}</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={handlePrint}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/45 bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                                                title="Imprimare fișă tehnică și plan de debitare atelier"
                                              >
                                                <span>🖨️</span>
                                                <span>{isRo ? 'Imprimă Plan' : 'Print Plan'}</span>
                                              </button>
                                            </div>
                                          </div>

                                          {/* 2D Canvas Viewport */}
                                          <div className="rounded-xl border border-white/10 bg-[#0b0f17] p-3 flex justify-center overflow-hidden">
                                            <canvas
                                              ref={nestingCanvasRef}
                                              width={960}
                                              height={560}
                                              className="w-full max-w-[960px] h-auto block rounded-lg"
                                            />
                                          </div>

                                          {/* Visual Workshop Legend */}
                                          <div className="flex flex-wrap gap-x-[18px] gap-y-3 items-center justify-center px-3.5 py-2.5 bg-slate-900/75 rounded-lg border border-white/[0.08] text-[0.74rem] text-slate-300 print:bg-slate-50 print:text-slate-800 print:border-slate-300">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-3.5 h-3.5 bg-amber-600/70 border-2 border-amber-500 rounded-[3px]" />
                                              <span><strong>Cant ABS 2.0 mm</strong> (Uși & Fațade expuse)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-3.5 h-3.5 bg-sky-600/70 border-2 border-cyan-500 rounded-[3px]" />
                                              <span><strong>Cant ABS 1.0 mm</strong> (Carcase & Polițe)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-3.5 h-3.5 bg-green-600/70 border border-emerald-500 rounded-[3px]" />
                                              <span><strong>Cant ABS 0.4 mm</strong> (Spate / Elemente secundare)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-3.5 h-3.5 border border-dashed border-rose-500 rounded-[2px]" />
                                              <span><strong>Margine Trim 15 mm</strong> (Curățare placă)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-bold text-yellow-200">↕ / ↔</span>
                                              <span><strong>Orientare Fibră</strong> (Texture Grain)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-sky-400">✂️</span>
                                              <span><strong>Pânză Circular (Kerf 4 mm)</strong></span>
                                            </div>
                                          </div>
                                        </div>
          )}

                                          {/* TAB 3: 2D Panel Blueprint & Cotation (Чертёж детали) */}
                                          {activeTab === 'blueprint' && (
                                            <div className="flex flex-col gap-3.5">
                                              {/* Part Selector Bar */}
                                              <div className="flex flex-wrap items-center gap-3 print:hidden">
                                                <span className="text-[0.82rem] text-slate-400 font-semibold">
                                                  {isRo ? 'Alege Piesa pentru Desenare Tehnică:' : isRu ? 'Выберите деталь для чертежа:' : 'Select Panel for Blueprint:'}
                                                </span>
                                                <select
                                                  value={selectedBlueprintPartId || ''}
                                                  onChange={(e) => setSelectedBlueprintPartId(e.target.value)}
                                                  className={`${selectClass} flex-1 max-w-[420px] py-1.5 px-2.5`}
                                                >
                                                  {aggregatedParts.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                      {p.cabinet} — {p.partName} ({p.lengthMm} × {p.widthMm} mm)
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>

                                              {/* 2D Blueprint Canvas Viewport */}
                                              <div className="rounded-xl border border-white/10 bg-[#0b0f17] p-3 flex justify-center overflow-hidden">
                                                <canvas
                                                  ref={blueprintCanvasRef}
                                                  width={960}
                                                  height={560}
                                                  className="w-full max-w-[960px] h-auto block rounded-lg"
                                                />
                                              </div>
                                            </div>
                                          )}

                                                  {/* TAB 4: CNC Drilling & G-Code Export (Programare CNC & Găurire) */ }
          {activeTab === 'cnc' && (
                                                  <div className="flex flex-col gap-3.5">
                                                    <div className="flex items-center justify-between gap-3">
                                                      <div>
                                                        <h3 className="m-0 text-slate-50 text-[1.05rem] font-bold print:text-slate-900">{isRo ? 'Program Găurire CNC (System 32)' : isRu ? 'Программа сверловки для станков с ЧПУ' : 'CNC Drilling Coordinates Program'}</h3>
                                                        <small className="text-slate-400 print:text-slate-600">{isRo ? 'Coordonate de găurire pentru Minifix, Euroșuruburi, Șcanturi și Balamale' : isRu ? 'Координаты присадки отверстий X, Y, глубина' : 'Drilling X, Y, depth and diameter coordinates'}</small>
                                                      </div>
                                                      <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-slate-950 hover:brightness-110 transition cursor-pointer print:hidden"
                                                        onClick={handleDownloadCnc}
                                                      >
                                                        <span>📥</span>
                                                        <span>{isRo ? 'Exportă Program CNC (.csv)' : isRu ? 'Экспорт программы ЧПУ (.csv)' : 'Export CNC Program (.csv)'}</span>
                                                      </button>
                                                    </div>

                                                    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25 print:border-slate-300 print:bg-white">
                                                      <table className={tableClass}>
                                                        <thead>
                                                          <tr>
                                                            <th className={thClass}>#</th>
                                                            <th className={thClass}>Piesă</th>
                                                            <th className={thClass}>Corp</th>
                                                            <th className={thClass}>Operațiune / Tip Găurire</th>
                                                            <th className={thClass}>Diametru Ø</th>
                                                            <th className={thClass}>Adâncime</th>
                                                            <th className={thClass}>Coord. X</th>
                                                            <th className={thClass}>Coord. Y</th>
                                                            <th className={thClass}>Suprafață</th>
                                                          </tr>
                                                    </thead>
                                                    <tbody>
                                                      {aggregatedParts.slice(0, 20).map((p, idx) => (
                                                        <React.Fragment key={idx}>
                                                          <tr className="hover:bg-white/[0.03]">
                                                            <td className={tdClass}>{idx * 2 + 1}</td>
                                                            <td className={tdClass}><strong>{p.partName}</strong></td>
                                                            <td className={tdClass}>{p.cabinet}</td>
                                                            <td className={tdClass}>Confirmat Ø7 mm (Găurire trecere)</td>
                                                            <td className={`${tdClass} font-mono text-right`}>7 mm</td>
                                                            <td className={`${tdClass} font-mono text-right`}>18 mm</td>
                                                            <td className={`${tdClass} font-mono text-right`}>50 mm</td>
                                                            <td className={`${tdClass} font-mono text-right`}>9 mm</td>
                                                            <td className={tdClass}>Față Superioară</td>
                                                          </tr>
                                                          <tr className="hover:bg-white/[0.03]">
                                                            <td className={tdClass}>{idx * 2 + 2}</td>
                                                            <td className={tdClass}><strong>{p.partName}</strong></td>
                                                            <td className={tdClass}>{p.cabinet}</td>
                                                            <td className={tdClass}>Minifix Ø15 mm (Oală excentric)</td>
                                                            <td className={`${tdClass} font-mono text-right`}>15 mm</td>
                                                            <td className={`${tdClass} font-mono text-right`}>13.5 mm</td>
                                                            <td className={`${tdClass} font-mono text-right`}>34 mm</td>
                                                            <td className={`${tdClass} font-mono text-right`}>32 mm</td>
                                                            <td className={tdClass}>Față Interioară</td>
                                                          </tr>
                                                        </React.Fragment>
                                                      ))}
                                                    </tbody>
                                                  </table>
              </div>
                                          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
