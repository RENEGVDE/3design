import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
  inspectModelMetrics,
  optimizeModelTextures,
  optimizeModelShadows,
  updateModelBoundingStructure
} from './cadModelOptimizer';
import { autoDetectGlbMechanisms } from './glbImporter';

export interface D3DPanelSpec {
  id: string;
  name: string;
  cabinetName?: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  quantity: number;
  materialName: string;
  colorHex: string;
  edgeBanding: {
    L1: string;
    L2: string;
    W1: string;
    W2: string;
  };
  positionMm: [number, number, number];
  rotationDeg: [number, number, number];
  mechanism: 'none' | 'door_left' | 'door_right' | 'drawer' | 'flap_up' | 'flap_down';
}

export interface D3DProjectFile {
  format: 'D3D_CAD_FURNITURE_V1' | 'B3D_CAD_FURNITURE_V1';
  software: string;
  version: string;
  units: 'mm';
  exportDate: string;
  metadata: {
    totalCabinets: number;
    totalPanels: number;
    totalBoardAreaM2: number;
    clientProjectName: string;
  };
  cuttingList: D3DPanelSpec[];
  assemblies: Array<{
    id: string;
    name: string;
    type: string;
    dimensionsMm: { w: number; h: number; d: number };
    positionMm: [number, number, number];
    rotationYDeg: number;
    subPartsCount: number;
  }>;
  embeddedGlbBase64?: string;
}

/**
 * Helper to download an in-memory Blob to the user's computer
 */
export function downloadFile(content: BlobPart, filename: string, mimeType: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports one or more 3D objects to binary .GLB ArrayBuffer
 */
export function exportToGlbBuffer(rootObjects: THREE.Object3D[]): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    const exportScene = new THREE.Scene();

    for (const obj of rootObjects) {
      if (obj) {
        exportScene.add(obj.clone(true));
      }
    }

    exporter.parse(
      exportScene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          // If JSON returned, convert to ArrayBuffer
          const str = JSON.stringify(result);
          const buf = new TextEncoder().encode(str).buffer;
          resolve(buf);
        }
      },
      (error) => reject(error),
      {
        binary: true,
        embedImages: true,
        onlyVisible: true
      }
    );
  });
}

/**
 * Exports scene or individual objects to binary .GLB file download
 */
export async function downloadGlbExport(
  rootObjects: THREE.Object3D[],
  filename = 'mobilier_3d.glb'
): Promise<void> {
  const buffer = await exportToGlbBuffer(rootObjects);
  downloadFile(buffer, filename.endsWith('.glb') ? filename : `${filename}.glb`, 'model/gltf-binary');
}

/**
 * Exports 3D objects to standard Wavefront .OBJ (with millimeter scaling)
 */
export function exportToObjText(rootObjects: THREE.Object3D[]): string {
  const exporter = new OBJExporter();
  const exportGroup = new THREE.Group();

  for (const obj of rootObjects) {
    if (obj) {
      exportGroup.add(obj.clone(true));
    }
  }

  const objRaw = exporter.parse(exportGroup);
  const header = `# CAD Studio 3D Furniture Model Export\n# Units: Millimeters (mm)\n# Generated: ${new Date().toISOString()}\n\n`;
  return header + objRaw;
}

/**
 * Generates matching .MTL material definitions for Wavefront .OBJ
 */
export function generateMtlText(rootObjects: THREE.Object3D[]): string {
  let mtl = `# CAD Studio 3D Materials\n# Generated: ${new Date().toISOString()}\n\n`;
  const materials = new Set<THREE.Material>();

  for (const obj of rootObjects) {
    obj.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => materials.add(m));
      }
    });
  }

  materials.forEach((mat: any) => {
    const matName = (mat.name || `Material_${mat.id}`).replace(/\s+/g, '_');
    const color = mat.color ? mat.color : new THREE.Color(0xffffff);
    const r = color.r.toFixed(4);
    const g = color.g.toFixed(4);
    const b = color.b.toFixed(4);
    const opacity = typeof mat.opacity === 'number' ? mat.opacity.toFixed(3) : '1.000';

    mtl += `newmtl ${matName}\n`;
    mtl += `Ka 0.2000 0.2000 0.2000\n`;
    mtl += `Kd ${r} ${g} ${b}\n`;
    mtl += `Ks 0.1500 0.1500 0.1500\n`;
    mtl += `d ${opacity}\n`;
    mtl += `illum 2\n\n`;
  });

  return mtl;
}

/**
 * Downloads .OBJ + .MTL files
 */
export function downloadObjExport(
  rootObjects: THREE.Object3D[],
  filename = 'mobilier_cad'
): void {
  const baseName = filename.replace(/\.(obj|mtl)$/i, '');
  const objText = exportToObjText(rootObjects);
  const mtlText = generateMtlText(rootObjects);

  // Download .obj
  downloadFile(objText, `${baseName}.obj`, 'text/plain');

  // Download .mtl
  setTimeout(() => {
    downloadFile(mtlText, `${baseName}.mtl`, 'text/plain');
  }, 250);
}

/**
 * Extracts manufacturing panel specifications from scene models and parametric cabinets
 */
export function extractScenePanels(
  placedCabinets: any[],
  importedModels: any[],
  availableMats: any[] = []
): D3DPanelSpec[] {
  const panels: D3DPanelSpec[] = [];

  // 1. Parametric Cabinets Panels
  for (const cab of placedCabinets || []) {
    const config = cab.parametricConfig || {};
    const cabName = cab.name || 'Corp Parametric';
    const w = config.widthMm || Math.round((cab.baseDimsCm?.w || 60) * 10);
    const h = config.heightMm || Math.round((cab.baseDimsCm?.h || 72) * 10);
    const d = config.depthMm || Math.round((cab.baseDimsCm?.d || 56) * 10);
    const thick = config.thicknessMm || 18;
    const posMm: [number, number, number] = [
      Math.round((cab.position?.[0] || 0) * 1000),
      Math.round((cab.position?.[1] || 0) * 1000),
      Math.round((cab.position?.[2] || 0) * 1000)
    ];

    // Laterală Stânga
    panels.push({
      id: `${cab.id}_lat_st`,
      name: 'Laterală Stânga',
      cabinetName: cabName,
      lengthMm: h,
      widthMm: d,
      thicknessMm: thick,
      quantity: 1,
      materialName: 'PAL Melaminat',
      colorHex: '#f4f4f2',
      edgeBanding: { L1: 'ABS 2.0mm', L2: 'ABS 0.4mm', W1: 'ABS 0.4mm', W2: 'none' },
      positionMm: [posMm[0], posMm[1], posMm[2]],
      rotationDeg: [0, 0, 90],
      mechanism: 'none'
    });

    // Laterală Dreapta
    panels.push({
      id: `${cab.id}_lat_dr`,
      name: 'Laterală Dreapta',
      cabinetName: cabName,
      lengthMm: h,
      widthMm: d,
      thicknessMm: thick,
      quantity: 1,
      materialName: 'PAL Melaminat',
      colorHex: '#f4f4f2',
      edgeBanding: { L1: 'ABS 2.0mm', L2: 'ABS 0.4mm', W1: 'ABS 0.4mm', W2: 'none' },
      positionMm: [posMm[0] + w - thick, posMm[1], posMm[2]],
      rotationDeg: [0, 0, 90],
      mechanism: 'none'
    });

    // Fund
    panels.push({
      id: `${cab.id}_fund`,
      name: 'Fund Orizontal',
      cabinetName: cabName,
      lengthMm: Math.max(10, w - thick * 2),
      widthMm: d,
      thicknessMm: thick,
      quantity: 1,
      materialName: 'PAL Melaminat',
      colorHex: '#f4f4f2',
      edgeBanding: { L1: 'ABS 2.0mm', L2: 'none', W1: 'none', W2: 'none' },
      positionMm: [posMm[0] + thick, posMm[1], posMm[2]],
      rotationDeg: [0, 0, 0],
      mechanism: 'none'
    });

    // Capac / Legături
    panels.push({
      id: `${cab.id}_capac`,
      name: 'Capac / Legătură Superioară',
      cabinetName: cabName,
      lengthMm: Math.max(10, w - thick * 2),
      widthMm: d,
      thicknessMm: thick,
      quantity: 1,
      materialName: 'PAL Melaminat',
      colorHex: '#f4f4f2',
      edgeBanding: { L1: 'ABS 2.0mm', L2: 'none', W1: 'none', W2: 'none' },
      positionMm: [posMm[0] + thick, posMm[1] + h - thick, posMm[2]],
      rotationDeg: [0, 0, 0],
      mechanism: 'none'
    });

    // Spate HDF
    panels.push({
      id: `${cab.id}_spate_hdf`,
      name: 'Spate HDF 4mm',
      cabinetName: cabName,
      lengthMm: Math.max(10, h - 4),
      widthMm: Math.max(10, w - 4),
      thicknessMm: 4,
      quantity: 1,
      materialName: 'HDF Melaminat Alb',
      colorHex: '#ffffff',
      edgeBanding: { L1: 'none', L2: 'none', W1: 'none', W2: 'none' },
      positionMm: [posMm[0] + 2, posMm[1] + 2, posMm[2]],
      rotationDeg: [90, 0, 0],
      mechanism: 'none'
    });

    // Uși / Fațade
    if (config.hasDoor || config.doorType) {
      const doorW = config.doorType === 'double' ? Math.round((w - 4) / 2) : w - 4;
      const doorH = h - 4;
      panels.push({
        id: `${cab.id}_usa_facada`,
        name: config.doorType === 'double' ? 'Uși Duble (2x)' : 'Ușă Fațadă',
        cabinetName: cabName,
        lengthMm: doorH,
        widthMm: doorW,
        thicknessMm: 18,
        quantity: config.doorType === 'double' ? 2 : 1,
        materialName: 'MDF Vopsit / PAL Fațadă',
        colorHex: '#f4f4f2',
        edgeBanding: { L1: 'ABS 2.0mm', L2: 'ABS 2.0mm', W1: 'ABS 2.0mm', W2: 'ABS 2.0mm' },
        positionMm: [posMm[0] + 2, posMm[1] + 2, posMm[2] + d],
        rotationDeg: [90, 0, 0],
        mechanism: 'door_left'
      });
    }
  }

  // 2. Imported CAD Models Sub-parts
  for (const mdl of importedModels || []) {
    if (mdl.isParametric) continue; // Already handled above
    const mName = mdl.name || 'Model CAD';
    const subParts = mdl.subParts || [];
    const baseW = (mdl.baseDimsCm?.w || 60) * 10 * (mdl.scale?.[0] || 1);
    const baseH = (mdl.baseDimsCm?.h || 72) * 10 * (mdl.scale?.[1] || 1);
    const baseD = (mdl.baseDimsCm?.d || 56) * 10 * (mdl.scale?.[2] || 1);
    const posMm: [number, number, number] = [
      Math.round((mdl.position?.[0] || 0) * 1000),
      Math.round((mdl.position?.[1] || 0) * 1000),
      Math.round((mdl.position?.[2] || 0) * 1000)
    ];

    subParts.forEach((sp: any, i: number) => {
      const isFacade = sp.mechType && sp.mechType !== 'none';
      const assignedMat = availableMats.find((m) => m.id === sp.assignedMatId);
      const matName = assignedMat ? assignedMat.name : 'PAL Standard';

      panels.push({
        id: `${mdl.id}_part_${i}`,
        name: sp.name || `Piesa #${i + 1}`,
        cabinetName: mName,
        lengthMm: isFacade ? Math.round(baseH) : Math.round(baseW),
        widthMm: isFacade ? Math.round(baseW) : Math.round(baseD),
        thicknessMm: 18,
        quantity: 1,
        materialName: matName,
        colorHex: sp.colorHex || '#f4f4f2',
        edgeBanding: isFacade
          ? { L1: 'ABS 2.0mm', L2: 'ABS 2.0mm', W1: 'ABS 2.0mm', W2: 'ABS 2.0mm' }
          : { L1: 'ABS 0.4mm', L2: 'ABS 0.4mm', W1: 'none', W2: 'none' },
        positionMm: posMm,
        rotationDeg: [0, 0, 0],
        mechanism: sp.mechType || 'none'
      });
    });
  }

  return panels;
}

/**
 * Builds and downloads a technical .D3D or .B3D CAD Project File
 */
export async function downloadD3DExport(
  rootObjects: THREE.Object3D[],
  placedCabinets: any[],
  importedModels: any[],
  availableMats: any[],
  extension: 'd3d' | 'b3d' = 'd3d',
  projectName = 'proiect_mobilier'
): Promise<void> {
  const panels = extractScenePanels(placedCabinets, importedModels, availableMats);

  let totalArea = 0;
  for (const p of panels) {
    totalArea += (p.lengthMm * p.widthMm * p.quantity) / 1000000;
  }

  const assemblies = (importedModels || []).map((m) => ({
    id: m.id,
    name: m.name || 'Corp Mobilier',
    type: m.isParametric ? 'ParametricCabinet' : 'CadAssembly',
    dimensionsMm: {
      w: Math.round((m.baseDimsCm?.w || 60) * 10 * (m.scale?.[0] || 1)),
      h: Math.round((m.baseDimsCm?.h || 72) * 10 * (m.scale?.[1] || 1)),
      d: Math.round((m.baseDimsCm?.d || 56) * 10 * (m.scale?.[2] || 1))
    },
    positionMm: [
      Math.round((m.position?.[0] || 0) * 1000),
      Math.round((m.position?.[1] || 0) * 1000),
      Math.round((m.position?.[2] || 0) * 1000)
    ] as [number, number, number],
    rotationYDeg: m.rotationYDeg || 0,
    subPartsCount: (m.subParts || []).length
  }));

  // Generate binary GLB chunk for 3D visual preview
  let embeddedGlbBase64 = '';
  try {
    const glbBuffer = await exportToGlbBuffer(rootObjects);
    const bytes = new Uint8Array(glbBuffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    embeddedGlbBase64 = btoa(binary);
  } catch (err) {
    console.warn('D3D Exporter: could not embed glb preview:', err);
  }

  const projectData: D3DProjectFile = {
    format: extension === 'b3d' ? 'B3D_CAD_FURNITURE_V1' : 'D3D_CAD_FURNITURE_V1',
    software: 'CAD Studio 3D',
    version: '1.0.0',
    units: 'mm',
    exportDate: new Date().toISOString(),
    metadata: {
      totalCabinets: assemblies.length,
      totalPanels: panels.length,
      totalBoardAreaM2: +totalArea.toFixed(2),
      clientProjectName: projectName
    },
    cuttingList: panels,
    assemblies,
    embeddedGlbBase64
  };

  const jsonString = JSON.stringify(projectData, null, 2);
  const finalFilename = `${projectName}.${extension}`;
  downloadFile(jsonString, finalFilename, 'application/json');
}

/**
 * Universal Importer: Parses .OBJ text into a native Three.js Group
 */
export function parseObjModel(objText: string): THREE.Group {
  const loader = new OBJLoader();
  const root = loader.parse(objText);

  root.traverse((child: any) => {
    if (child.isMesh) {
      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
      child.geometry.computeBoundingBox();
      child.geometry.computeBoundingSphere();
      child.castShadow = true;
      child.receiveShadow = true;

      // Assign standard material with clean defaults
      const color = child.material?.color ? child.material.color.clone() : new THREE.Color('#f4f4f2');
      child.material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.45,
        metalness: 0.05
      });
    }
  });

  return root;
}

/**
 * Universal Importer: Builds a 3D assembly Group from D3D/B3D panel specifications
 */
export function buildAssemblyFromPanels(panels: D3DPanelSpec[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CAD_Panel_Assembly';

  for (const p of panels) {
    const lM = Math.max(0.01, (p.lengthMm || 600) / 1000);
    const wM = Math.max(0.01, (p.widthMm || 400) / 1000);
    const tM = Math.max(0.002, (p.thicknessMm || 18) / 1000);

    const geo = new THREE.BoxGeometry(wM, lM, tM);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.colorHex || '#f4f4f2'),
      roughness: 0.45,
      metalness: 0.05
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = p.name || 'Panou';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.position.set(
      (p.positionMm?.[0] || 0) / 1000 + wM / 2,
      (p.positionMm?.[1] || 0) / 1000 + lM / 2,
      (p.positionMm?.[2] || 0) / 1000 + tM / 2
    );

    if (p.rotationDeg) {
      mesh.rotation.set(
        THREE.MathUtils.degToRad(p.rotationDeg[0] || 0),
        THREE.MathUtils.degToRad(p.rotationDeg[1] || 0),
        THREE.MathUtils.degToRad(p.rotationDeg[2] || 0)
      );
    }

    group.add(mesh);
  }

  return group;
}

/**
 * Universal Importer: Parses .D3D / .B3D / .CADPROJ files
 * Returns either embedded GLB buffer or structured panel assembly
 */
export async function parseD3DOrB3DContent(content: string | ArrayBuffer): Promise<{
  type: 'glb_buffer' | 'project_json' | 'raw_cad';
  glbBuffer?: ArrayBuffer;
  projectData?: D3DProjectFile;
}> {
  // 1. Binary check: if ArrayBuffer starts with 'glTF'
  if (content instanceof ArrayBuffer) {
    const view = new DataView(content);
    if (content.byteLength >= 4 && view.getUint32(0, false) === 0x676c5446) {
      return { type: 'glb_buffer', glbBuffer: content };
    }
    const text = new TextDecoder('utf-8').decode(content);
    return parseD3DOrB3DContent(text);
  }

  // 2. Text / JSON check
  try {
    const parsed = JSON.parse(content);
    if (parsed.embeddedGlbBase64) {
      const binary = atob(parsed.embeddedGlbBase64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return {
        type: 'glb_buffer',
        glbBuffer: bytes.buffer,
        projectData: parsed
      };
    }

    if (Array.isArray(parsed.cuttingList) && parsed.cuttingList.length > 0) {
      const assembly = buildAssemblyFromPanels(parsed.cuttingList);
      const glbBuf = await exportToGlbBuffer([assembly]);
      return {
        type: 'glb_buffer',
        glbBuffer: glbBuf,
        projectData: parsed
      };
    }

    return {
      type: 'project_json',
      projectData: parsed
    };
  } catch {
    return { type: 'raw_cad' };
  }
}
