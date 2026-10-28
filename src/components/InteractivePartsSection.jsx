'use client';

import React, { useState } from 'react';
import {
  I18N,
  CATEGORIES_ORDER,
  getSpecTitle,
  formatPartDimsText
} from '../i18n/translations.js';
import { DEFAULT_WHITE_HEX } from '../utils/textures.js';

export default function InteractivePartsSection({
  lang,
  specs,
  partsMeta,
  materials,
  onTogglePart,
  onPaintPart,
  onHoverPart
}) {
  const dict = I18N[lang] || I18N.ro;
  const [collapsedCats, setCollapsedCats] = useState({});

  const toggleCat = (catKey) => {
    setCollapsedCats((prev) => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  let openCount = 0;
  for (const s of specs) {
    if (partsMeta[s.id]?.isOpen) openCount++;
  }

  return (
    <div className="panel-section">
      <div className="section-title">
        <span>{dict.interactiveParts}</span>
        <span>{`${openCount} / ${specs.length} ${dict.statusOpen}`}</span>
      </div>

      <div id="parts-list">
        {CATEGORIES_ORDER.map((catKey) => {
          const catSpecs = specs.filter((s) => {
            if (catKey === 'base_door') {
              return s.category === 'base_door' || s.category === 'appliance';
            }
            return s.category === catKey;
          });
          if (!catSpecs.length) return null;
          const isCollapsed = Boolean(collapsedCats[catKey]);

          return (
            <div key={catKey} className="cat-group">
              <div className="cat-header" onClick={() => toggleCat(catKey)}>
                <span>{dict['cat_' + catKey]}</span>
                <span>{isCollapsed ? '▸' : '▾'}</span>
              </div>

              <div className={`cat-items ${isCollapsed ? 'hidden' : ''}`}>
                {catSpecs.map((spec) => {
                  const meta = partsMeta[spec.id] || {};
                  const matObj = materials.find((m) => m.id === meta.assignedMatId);
                  const dotBg = matObj ? matObj.thumbCss : DEFAULT_WHITE_HEX;

                  return (
                    <div
                      key={spec.id}
                      className={`part-row ${meta.isOpen ? 'open' : ''}`}
                      onClick={() => onTogglePart(spec.id)}
                      onMouseEnter={() => onHoverPart && onHoverPart(spec.id)}
                      onMouseLeave={() => onHoverPart && onHoverPart(null)}
                    >
                      <div className="part-info">
                        <span className="part-name">{getSpecTitle(spec, lang)}</span>
                        {meta.dimsCm && (
                          <span className="part-dims">
                            📏 {formatPartDimsText(meta.dimsCm, lang)}
                          </span>
                        )}
                      </div>

                      <div className="part-actions">
                        <button
                          className="part-paint-btn"
                          title="Aplică materialul selectat pe această piesă"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPaintPart(spec.id);
                          }}
                        >
                          <span
                            className="part-mat-dot"
                            style={{ background: dotBg }}
                          />
                          🖌️
                        </button>
                        <span className="part-status">
                          {meta.isOpen ? dict.statusOpen : dict.statusClosed}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
