'use client';

import React, { useState, useMemo, useEffect } from 'react';

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

  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [costPerSqM, setCostPerSqM] = useState(85); // Lei / m2 PAL
  const [costPerMEdge, setCostPerMEdge] = useState(5); // Lei / ml cant
  const [costPerHinge, setCostPerHinge] = useState(18); // Lei / balama
  const [costPerSlide, setCostPerSlide] = useState(65); // Lei / pereche glisiere
  const [currency, setCurrency] = useState('RON');

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

  // Compute summary metrics (total m2, edge ml, hardware)
  const metrics = useMemo(() => {
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

  const [copied, setCopied] = useState(false);

  const getSummaryText = () => {
    return [
      `🛋️ *SPECIFICAȚIE MOBILIER & OFERTĂ 3DESIGN*`,
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
      `Generat cu 3Design Studio (bucatarie-3d-viewer.web.app)`
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
      <div className="report-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="report-header-bar">
          <div className="report-brand">
            <span className="report-icon">📄</span>
            <div>
              <h2>{isRo ? 'Fișă Tehnică & Raport Fabricație' : isRu ? 'Техническая спецификация и карта раскроя' : 'Technical Specification & BOM'}</h2>
              <p>{isRo ? 'Generat conform specificațiilor БАЗИС-Мебельщик' : isRu ? 'Сформировано по стандартам БАЗИС-Мебельщик' : 'Generated per BAZIS Furniture CAD Specs'}</p>
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
              <span>{isRo ? 'Tipărește / Salvează PDF' : isRu ? 'Печать / PDF' : 'Print / Save PDF'}</span>
            </button>
            <button className="sheet-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Printable Content Container */}
        <div className="report-printable-area">
          {/* Top Section with 3D Render & Key Stats */}
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
                <span>{isRo ? 'Total Piese / Panouri:' : isRu ? 'Всего деталей:' : 'Total Panels:'}</span>
                <strong>{metrics.totalParts} {isRo ? 'repere' : isRu ? 'дет.' : 'pcs'}</strong>
              </div>
              <div className="stats-row">
                <span>{isRo ? 'Suprafață PAL Carcasă:' : isRu ? 'Площадь ЛДСП корпуса:' : 'Carcass Board Area:'}</span>
                <strong>{metrics.carcassSqM} m²</strong>
              </div>
              <div className="stats-row">
                <span>{isRo ? 'Suprafață Fronturi (Uși/Sertare):' : isRu ? 'Площадь фасадов:' : 'Facade Area:'}</span>
                <strong>{metrics.facadeSqM} m²</strong>
              </div>
              <div className="stats-row">
                <span>{isRo ? 'Necesar Coli PAL (2800×2070mm):' : isRu ? 'Листов ЛДСП (2800×2070):' : 'Board Sheets Required:'}</span>
                <strong>~{metrics.estimatedSheets} {isRo ? 'coli' : isRu ? 'листов' : 'sheets'}</strong>
              </div>
              <div className="stats-row">
                <span>{isRo ? 'Consum Cant ABS:' : isRu ? 'Кромка ABS:' : 'ABS Edgebanding:'}</span>
                <strong>~{metrics.edgeMeters} metri liniari</strong>
              </div>
              <div className="stats-row">
                <span>{isRo ? 'Balamale Recomandate:' : isRu ? 'Петли мебельные:' : 'Hinges Count:'}</span>
                <strong>{metrics.hingesCount} buc</strong>
              </div>
              <div className="stats-row">
                <span>{isRo ? 'Seturi Glisiere Sertare:' : isRu ? 'Направляющие ящиков:' : 'Drawer Slide Sets:'}</span>
                <strong>{metrics.slidesCount} perechi</strong>
              </div>
            </div>

            {/* Quick Cost Estimator */}
            <div className="report-cost-card">
              <h3>{isRo ? 'Estimare Cost Fabricație' : isRu ? 'Калькулятор себестоимости' : 'Cost Estimator'}</h3>
              <div className="cost-inputs-grid">
                <div>
                  <label>PAL ({currency}/m²):</label>
                  <input
                    type="number"
                    value={costPerSqM}
                    onChange={(e) => setCostPerSqM(Number(e.target.value))}
                    className="report-input-num"
                  />
                </div>
                <div>
                  <label>Cant ({currency}/ml):</label>
                  <input
                    type="number"
                    value={costPerMEdge}
                    onChange={(e) => setCostPerMEdge(Number(e.target.value))}
                    className="report-input-num"
                  />
                </div>
                <div>
                  <label>Balama ({currency}):</label>
                  <input
                    type="number"
                    value={costPerHinge}
                    onChange={(e) => setCostPerHinge(Number(e.target.value))}
                    className="report-input-num"
                  />
                </div>
                <div>
                  <label>Glisieră ({currency}):</label>
                  <input
                    type="number"
                    value={costPerSlide}
                    onChange={(e) => setCostPerSlide(Number(e.target.value))}
                    className="report-input-num"
                  />
                </div>
              </div>

              <div className="cost-total-display">
                <span>{isRo ? 'Cost Total Estimat Materiale:' : isRu ? 'Итоговая стоимость материалов:' : 'Total Estimated Cost:'}</span>
                <div className="cost-amount">
                  {metrics.totalCost.toLocaleString()} {currency}
                </div>
                <small>{isRo ? '*Nu include manopera de montaj și transportul' : isRu ? '*Без учета сборки и доставки' : '*Excludes assembly & delivery'}</small>
              </div>
            </div>
          </div>

          {/* Cutting List Table (Tabel de Debitare) */}
          <div className="report-table-section">
            <div className="table-header-row">
              <h3>{isRo ? 'Tabel Detaliat de Debitare Panouri (Cutting List)' : isRu ? 'Деталировочная карта раскроя (БАЗИС)' : 'Comprehensive Panel Cutting List'}</h3>
              <span className="badge-tag">{aggregatedParts.length} repere</span>
            </div>

            <div className="table-scroll-container">
              <table className="report-cad-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Corp / Ansamblu</th>
                    <th>Denumire Panou</th>
                    <th>Lungime (mm)</th>
                    <th>Lățime (mm)</th>
                    <th>Grosime</th>
                    <th>Buc</th>
                    <th>Material</th>
                    <th>Orientare Fibră</th>
                    <th>Finisaj Cant ABS</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedParts.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.cabinet}</td>
                      <td>{p.partName}</td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{p.lengthMm}</td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{p.widthMm}</td>
                      <td>{p.thicknessMm} mm</td>
                      <td style={{ fontWeight: 700 }}>{p.qty}</td>
                      <td>{p.material}</td>
                      <td>{p.grain}</td>
                      <td>
                        <span className="edge-badge">{p.edgeBanding}</span>
                      </td>
                    </tr>
                  ))}
                  {aggregatedParts.length === 0 && (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        {isRo
                          ? 'Nu există încă corpuri create în scenă. Creează un corp de mobilier din tabul "Mobilier (CAD)" pentru a genera fișa tehnică.'
                          : 'В сцене пока нет созданной мебели. Создайте модуль во вкладке «Мебель (CAD)». '}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

