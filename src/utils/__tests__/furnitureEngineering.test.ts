import { describe, it, expect } from 'vitest';
import { optimizeSheetNesting, generateCncDrillingCsv, DEFAULT_SHEET } from '../furnitureEngineering';

describe('furnitureEngineering', () => {
  it('optimizes 2D panel nesting onto standard sheets', () => {
    const panels = [
      { id: 'p1', cabinet: 'B60', partName: 'Laterală', lengthMm: 720, widthMm: 560, qty: 2 },
      { id: 'p2', cabinet: 'B60', partName: 'Poliță', lengthMm: 564, widthMm: 520, qty: 2 }
    ];

    const result = optimizeSheetNesting(panels, DEFAULT_SHEET);
    expect(result.sheetsCount).toBe(1);
    expect(result.totalPlacedParts).toBe(4);
    expect(result.efficiencyPercent).toBeGreaterThan(0);
    expect(result.totalUsedArea).toBeGreaterThan(1.0);
  });

  it('generates CNC drilling CSV rows for drill holes', () => {
    const csv = generateCncDrillingCsv(
      [
        { x: 50, y: 32, diaMm: 15, depthMm: 13.5, type: 'minifix' },
        { x: 100, y: 9, diaMm: 7, depthMm: 18, type: 'confirmat' }
      ],
      'Laterală Stânga'
    );

    expect(csv).toContain('Laterală Stânga');
    expect(csv).toContain('15');
    expect(csv).toContain('T03_MILL_35MM');
    expect(csv).toContain('T02_DRILL_8MM');
    expect(csv.trim().split('\n').length).toBe(3);
  });
});
