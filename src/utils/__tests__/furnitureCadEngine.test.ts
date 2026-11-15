import { describe, it, expect } from 'vitest';
import {
  createAssemblyFromTemplate,
  splitCompartmentNode,
  updateCompartmentNode,
  regenerateAssemblyParts,
  addManualPart,
  updateCadPart,
  duplicateCadPart,
  removeCadPart,
  computeAssemblyBom,
  createShapeGeometryMm,
  updateCompartmentRatios,
  mergeCompartmentNode,
  generateAssemblyCncHoles
} from '../furnitureCadEngine';

describe('furnitureCadEngine', () => {
  it('creates templates and preserves 18mm board thickness when resizing', () => {
    const asm = createAssemblyFromTemplate('base_cabinet', 'Corp Bază Test');
    expect(asm.parts.length).toBeGreaterThanOrEqual(6);

    const resized = regenerateAssemblyParts({ ...asm, widthMm: 900, heightMm: 860 });
    const leftSide = resized.parts.find((p) => p.name === 'Laterală Stânga');
    expect(leftSide?.dimensionsMm.thickness).toBe(18);
    expect(leftSide?.dimensionsMm.length).toBe(860 - 38 - 100);
  });

  it('supports recursive vertical & horizontal compartment splitting', () => {
    let asm = createAssemblyFromTemplate('wardrobe_hinged');
    const firstChildId = asm.rootNode.children![0].id;

    const nextRoot = splitCompartmentNode(asm.rootNode, firstChildId, 'horizontal', 2);
    const updatedRoot = updateCompartmentNode(nextRoot, nextRoot.children![0].children![0].id, {
      fill: 'drawers',
      drawersCount: 3
    });

    asm = regenerateAssemblyParts({ ...asm, rootNode: updatedRoot });
    const drawers = asm.parts.filter((p) => p.motion.type === 'drawer');
    expect(drawers).toHaveLength(3);
  });

  it('supports manual part add, resize, duplicate, and remove while preserving edits across regens', () => {
    let asm = createAssemblyFromTemplate('blank');
    expect(asm.parts).toHaveLength(0);

    const added = addManualPart(asm, 'horizontal');
    asm = added.assembly;
    expect(asm.parts).toHaveLength(1);

    asm = updateCadPart(asm, added.part.id, {
      name: 'Poliță Custom 950',
      dimensionsMm: { length: 950, width: 420, thickness: 22 }
    });
    expect(asm.parts[0].dimensionsMm.length).toBe(950);

    const dup = duplicateCadPart(asm, added.part.id);
    asm = dup.assembly;
    expect(asm.parts).toHaveLength(2);

    // Regenerating keeps manual parts intact
    asm = regenerateAssemblyParts({ ...asm, widthMm: 1200 });
    expect(asm.parts).toHaveLength(2);

    asm = removeCadPart(asm, dup.part!.id);
    expect(asm.parts).toHaveLength(1);
  });

  it('builds shaped 3D geometries (l_cut, chamfer, rounded, mansard_slope)', () => {
    const lDesk = createAssemblyFromTemplate('l_desk');
    const topPart = lDesk.parts.find((p) => p.shape === 'l_cut');
    expect(topPart).toBeDefined();

    const geo = createShapeGeometryMm(topPart!);
    expect(geo.boundingBox).not.toBeNull();
    expect(geo.attributes.position.count).toBeGreaterThan(12);
  });

  it('computes accurate BOM areas, edge banding meters, and hardware counts', () => {
    const chest = createAssemblyFromTemplate('chest_drawers');
    const bom = computeAssemblyBom(chest);
    expect(bom.totalParts).toBeGreaterThanOrEqual(8);
    expect(bom.carcassSqM).toBeGreaterThan(0);
    expect(bom.facadeSqM).toBeGreaterThan(0);
    expect(bom.edgeMeters).toBeGreaterThan(0);
    expect(bom.slidesCount).toBe(4);
    expect(bom.handlesCount).toBe(4);
  });

  it('supports asymmetric compartment ratios, merging splits, and joint-aware CNC drilling', () => {
    let asm = createAssemblyFromTemplate('wardrobe_hinged');
    asm = regenerateAssemblyParts({
      ...asm,
      rootNode: updateCompartmentRatios(asm.rootNode, asm.rootNode.id, [0.3, 0.7])
    });
    const cncRows = generateAssemblyCncHoles(asm);
    expect(cncRows.some((r) => r.diameterMm === 35)).toBe(true);
    expect(cncRows.some((r) => r.diameterMm === 5)).toBe(true);

    const mergedRoot = mergeCompartmentNode(asm.rootNode, asm.rootNode.id);
    expect(mergedRoot.splitAxis).toBeNull();
    expect(mergedRoot.children).toBeUndefined();
  });
});

