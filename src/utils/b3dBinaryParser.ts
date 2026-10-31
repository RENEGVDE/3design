import * as THREE from 'three';
import * as fflate from 'three/examples/jsm/libs/fflate.module.js';
import { exportToGlbBuffer, D3DPanelSpec, D3DProjectFile } from './cadFormatHandler';

interface ParsedNode {
  _sym: string;
  _count?: number;
  val?: any;
  [key: string]: any;
}

/**
 * Checks whether an ArrayBuffer contains a native binary CAD B3D file (magic 'BZ85')
 */
export function isNativeB3DBinary(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  // 'BZ85' -> 0x42, 0x5A, 0x38, 0x35
  return bytes[0] === 0x42 && bytes[1] === 0x5a && bytes[2] === 0x38 && bytes[3] === 0x35;
}

/**
 * Parses native binary B3D CAD furniture file into a 3D Three.js Group,
 * extracts cutting list BOM panels, and exports to a GLB buffer.
 */
export async function parseNativeB3DBinary(buffer: ArrayBuffer): Promise<{
  glbBuffer: ArrayBuffer;
  projectData: D3DProjectFile;
  thumbnailPngBase64?: string;
}> {
  const fileBytes = new Uint8Array(buffer);
  const dataView = new DataView(buffer);

  // 1. Extract embedded PNG thumbnail preview if present
  let thumbnailPngBase64 = '';
  let pngEnd = 0;
  for (let i = 0; i < Math.min(fileBytes.length - 8, 2048); i++) {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      fileBytes[i] === 0x89 &&
      fileBytes[i + 1] === 0x50 &&
      fileBytes[i + 2] === 0x4e &&
      fileBytes[i + 3] === 0x47 &&
      fileBytes[i + 4] === 0x0d &&
      fileBytes[i + 5] === 0x0a &&
      fileBytes[i + 6] === 0x1a &&
      fileBytes[i + 7] === 0x0a
    ) {
      // Find IEND chunk: 49 45 4E 44 AE 42 60 82
      for (let j = i + 8; j < Math.min(fileBytes.length - 8, i + 65536); j++) {
        if (
          fileBytes[j] === 0x49 &&
          fileBytes[j + 1] === 0x45 &&
          fileBytes[j + 2] === 0x4e &&
          fileBytes[j + 3] === 0x44 &&
          fileBytes[j + 4] === 0xae &&
          fileBytes[j + 5] === 0x42 &&
          fileBytes[j + 6] === 0x60 &&
          fileBytes[j + 7] === 0x82
        ) {
          const pngSlice = fileBytes.subarray(i, j + 8);
          pngEnd = j + 8;
          try {
            let binary = '';
            const chunkSize = 0x8000;
            for (let c = 0; c < pngSlice.length; c += chunkSize) {
              binary += String.fromCharCode.apply(null, Array.from(pngSlice.subarray(c, c + chunkSize)));
            }
            thumbnailPngBase64 = `data:image/png;base64,${btoa(binary)}`;
          } catch {}
          break;
        }
      }
      break;
    }
  }

  // 2. Locate zlib compressed stream header (0x78 followed by 0x9c, 0xda, 0x01, or 0x5e)
  let zlibOffset = -1;
  const searchStart = Math.max(pngEnd, 100);
  const searchLimit = Math.min(fileBytes.length - 100, searchStart + 50000);

  for (let i = searchStart; i < searchLimit; i++) {
    if (fileBytes[i] === 0x78) {
      const second = fileBytes[i + 1];
      if (second === 0x9c || second === 0xda || second === 0x01 || second === 0x5e) {
        try {
          const decompressedTest = fflate.unzlibSync(fileBytes.subarray(i));
          if (decompressedTest && decompressedTest.length > 100) {
            zlibOffset = i;
            break;
          }
        } catch {}
      }
    }
  }

  if (zlibOffset === -1) {
    throw new Error('Nu s-a putut localiza stream-ul geometric comprimat din fișierul B3D.');
  }

  // 3. Decompress zlib stream
  const decompressed = fflate.unzlibSync(fileBytes.subarray(zlibOffset));
  const decView = new DataView(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength);

  // 4. Decode Symbol Table
  let p = 0;
  const numSymbols = decView.getInt32(p, true);
  p += 4;
  const symbols: string[] = [];
  const textDecoder = new TextDecoder('latin1');

  for (let s = 0; s < numSymbols; s++) {
    if (p + 4 > decompressed.length) break;
    const len = decView.getInt32(p, true);
    p += 4;
    if (len > 0 && p + len <= decompressed.length) {
      const symBytes = decompressed.subarray(p, p + len);
      symbols.push(textDecoder.decode(symBytes));
      p += len;
    } else {
      symbols.push('');
    }
  }

  // 5. Recursive Object Tree Parser
  function parseTree(): ParsedNode | null {
    if (p + 9 > decompressed.length) return null;
    const symId = decView.getInt32(p, true);
    const symName = symbols[symId] || `SYM_${symId}`;
    const field2 = decView.getInt32(p + 4, true);
    const typeByte = decView.getUint8(p + 8);
    p += 9;

    if (typeByte === 0x00) {
      // Container / Object with field2 children
      const obj: ParsedNode = { _sym: symName, _count: field2 };
      for (let c = 0; c < field2; c++) {
        const child = parseTree();
        if (child) {
          if (obj[child._sym]) {
            if (!Array.isArray(obj[child._sym])) obj[child._sym] = [obj[child._sym]];
            obj[child._sym].push(child);
          } else {
            obj[child._sym] = child;
          }
        }
      }
      return obj;
    }

    if (typeByte === 0x01) return { _sym: symName, val: true };
    if (typeByte === 0x02) return { _sym: symName, val: false };
    if (typeByte === 0x03) {
      const val = decView.getUint8(p);
      p += 1;
      return { _sym: symName, val };
    }
    if (typeByte === 0x04) {
      const val = decView.getInt32(p, true);
      p += 4;
      return { _sym: symName, val };
    }
    if (typeByte === 0x05) {
      const val = decView.getFloat64(p, true);
      p += 8;
      return { _sym: symName, val };
    }
    if (typeByte === 0x06) {
      // UTF-16LE string: int32 char count + 2 * chars bytes
      const charCount = decView.getInt32(p, true);
      p += 4;
      const byteLen = charCount * 2;
      let s = '';
      if (p + byteLen <= decompressed.length) {
        const u16Slice = decompressed.subarray(p, p + byteLen);
        s = new TextDecoder('utf-16le').decode(u16Slice);
      }
      p += byteLen;
      return { _sym: symName, val: s };
    }
    if (typeByte === 0x07) {
      // Byte buffer or latin1 string: int32 byte length
      const byteLen = decView.getInt32(p, true);
      p += 4;
      let raw: Uint8Array = new Uint8Array(0);
      if (p + byteLen <= decompressed.length) {
        raw = decompressed.subarray(p, p + byteLen);
      }
      p += byteLen;
      return { _sym: symName, val: raw };
    }

    return null;
  }

  const rootDoc = parseTree();
  if (!rootDoc) {
    throw new Error('Eroare la decodarea structurii CAD din fișierul B3D.');
  }

  // 6. Collect all panels (Type 4002) and 3D meshes (TriData)
  const rawPanels: ParsedNode[] = [];
  const rawTriMeshes: ParsedNode[] = [];

  function traverseNodes(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.Type?.val === 4002 && node.Contour?.val) {
      rawPanels.push(node);
    }
    if (node.TriData && node.TriData.val) {
      rawTriMeshes.push(node);
    }
    for (const key in node) {
      if (key.startsWith('_')) continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) traverseNodes(item);
      } else {
        traverseNodes(child);
      }
    }
  }

  traverseNodes(rootDoc);

  // 7. Build Three.js 3D Scene Group
  const rootGroup = new THREE.Group();
  rootGroup.name = 'CAD_B3D_Model';

  const materialCache = new Map<string, THREE.MeshStandardMaterial>();

  function getStandardMaterial(matName?: string): THREE.MeshStandardMaterial {
    const key = (matName || 'Alb_Default').trim();
    if (materialCache.has(key)) return materialCache.get(key)!;

    let hexColor = '#f4f4f2';
    let roughness = 0.45;
    let metalness = 0.05;

    const lower = key.toLowerCase();
    if (lower.includes('stejar') || lower.includes('oak') || lower.includes('wood') || lower.includes('dub')) {
      hexColor = '#ba9a76';
      roughness = 0.55;
    } else if (lower.includes('nuc') || lower.includes('walnut') || lower.includes('oreh')) {
      hexColor = '#6e5038';
      roughness = 0.5;
    } else if (lower.includes('antracit') || lower.includes('gri') || lower.includes('grey') || lower.includes('gray')) {
      hexColor = '#4a4c50';
      roughness = 0.4;
    } else if (lower.includes('negru') || lower.includes('black') || lower.includes('cern')) {
      hexColor = '#242426';
      roughness = 0.35;
    } else if (lower.includes('inox') || lower.includes('metal') || lower.includes('steel') || lower.includes('crom')) {
      hexColor = '#d0d4d8';
      roughness = 0.25;
      metalness = 0.75;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor),
      roughness,
      metalness,
      name: key
    });
    materialCache.set(key, mat);
    return mat;
  }

  const cuttingList: D3DPanelSpec[] = [];

  // Construct 3D Panels from 2D Contours
  for (let idx = 0; idx < rawPanels.length; idx++) {
    const pNode = rawPanels[idx];
    const cBytes: Uint8Array = pNode.Contour.val;
    if (!cBytes || cBytes.length < 4) continue;

    const cView = new DataView(cBytes.buffer, cBytes.byteOffset, cBytes.byteLength);
    const numSegs = cView.getInt32(0, true);
    if (numSegs < 1) continue;

    const shape = new THREE.Shape();
    let cp = 4;
    let firstPoint = true;
    let validSegCount = 0;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let s = 0; s < numSegs; s++) {
      if (cp >= cBytes.length) break;
      const segType = cView.getUint8(cp);

      if (segType === 0x10 && cp + 33 <= cBytes.length) {
        // Line segment: 4 Float64 (x1, y1, x2, y2)
        const x1 = cView.getFloat64(cp + 1, true);
        const y1 = cView.getFloat64(cp + 9, true);
        const x2 = cView.getFloat64(cp + 17, true);
        const y2 = cView.getFloat64(cp + 25, true);
        cp += 33;

        minX = Math.min(minX, x1, x2);
        maxX = Math.max(maxX, x1, x2);
        minY = Math.min(minY, y1, y2);
        maxY = Math.max(maxY, y1, y2);

        const x1M = x1 * 0.001;
        const y1M = y1 * 0.001;
        const x2M = x2 * 0.001;
        const y2M = y2 * 0.001;

        if (firstPoint) {
          shape.moveTo(x1M, y1M);
          firstPoint = false;
        }
        shape.lineTo(x2M, y2M);
        validSegCount++;
      } else if (segType === 0x12 && cp + 50 <= cBytes.length) {
        // Fillet / Arc segment
        const x1 = cView.getFloat64(cp + 1, true);
        const y1 = cView.getFloat64(cp + 9, true);
        const x2 = cView.getFloat64(cp + 17, true);
        const y2 = cView.getFloat64(cp + 25, true);
        cp += 50;

        minX = Math.min(minX, x1, x2);
        maxX = Math.max(maxX, x1, x2);
        minY = Math.min(minY, y1, y2);
        maxY = Math.max(maxY, y1, y2);

        const x1M = x1 * 0.001;
        const y1M = y1 * 0.001;
        const x2M = x2 * 0.001;
        const y2M = y2 * 0.001;

        if (firstPoint) {
          shape.moveTo(x1M, y1M);
          firstPoint = false;
        }
        shape.lineTo(x2M, y2M);
        validSegCount++;
      } else if (segType === 0x11 && cp + 25 <= cBytes.length) {
        // Circle / Arc: Center X, Center Y, Radius
        const cx = cView.getFloat64(cp + 1, true);
        const cy = cView.getFloat64(cp + 9, true);
        const r = cView.getFloat64(cp + 17, true);
        cp += 25;

        minX = Math.min(minX, cx - r);
        maxX = Math.max(maxX, cx + r);
        minY = Math.min(minY, cy - r);
        maxY = Math.max(maxY, cy + r);

        const cxM = cx * 0.001;
        const cyM = cy * 0.001;
        const rM = r * 0.001;

        if (firstPoint && numSegs === 1) {
          shape.absarc(cxM, cyM, rM, 0, Math.PI * 2, false);
          firstPoint = false;
        } else if (firstPoint) {
          shape.moveTo(cxM + rM, cyM);
          firstPoint = false;
        } else {
          shape.lineTo(cxM, cyM);
        }
        validSegCount++;
      } else {
        break;
      }
    }

    if (validSegCount < 1) continue;
    shape.closePath();

    const thickMm = Math.max(2, pNode.Thick?.val || 18);
    const thickM = thickMm * 0.001;

    try {
      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: thickM,
        bevelEnabled: false
      });
      geo.computeVertexNormals();

      const matName = pNode.Mat?.val || 'PAL Alb 18mm';
      const mat = getStandardMaterial(matName);
      const mesh = new THREE.Mesh(geo, mat);
      const panelName = pNode.Name?.val || `Panou_${idx + 1}`;
      mesh.name = panelName;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Apply Transformation
      let posX = 0, posY = 0, posZ = 0;
      if (pNode.Trans) {
        posX = (pNode.Trans.X?.val || 0);
        posY = (pNode.Trans.Y?.val || 0);
        posZ = (pNode.Trans.Z?.val || 0);

        mesh.position.set(posX * 0.001, posY * 0.001, posZ * 0.001);

        if (pNode.Trans.Rx && pNode.Trans.Ry && pNode.Trans.Rz && pNode.Trans.Rw) {
          mesh.quaternion.set(
            pNode.Trans.Rx.val,
            pNode.Trans.Ry.val,
            pNode.Trans.Rz.val,
            pNode.Trans.Rw.val
          );
        }
      }

      rootGroup.add(mesh);

      // Add to Cutting List BOM
      const lengthMm = isFinite(maxX - minX) && maxX > minX ? Math.round(maxX - minX) : 600;
      const widthMm = isFinite(maxY - minY) && maxY > minY ? Math.round(maxY - minY) : 400;

      cuttingList.push({
        id: `p_${idx + 1}`,
        name: panelName,
        cabinetName: 'Ansamblu Mobilier',
        lengthMm: Math.max(lengthMm, widthMm),
        widthMm: Math.min(lengthMm, widthMm),
        thicknessMm: Math.round(thickMm),
        quantity: 1,
        materialName: matName,
        colorHex: `#${mat.color.getHexString()}`,
        edgeBanding: { L1: 'ABS 1mm', L2: 'ABS 1mm', W1: 'ABS 0.4mm', W2: 'ABS 0.4mm' },
        positionMm: [Math.round(posX), Math.round(posY), Math.round(posZ)],
        rotationDeg: [0, 0, 0],
        mechanism: panelName.toLowerCase().includes('usa') || panelName.toLowerCase().includes('dver')
          ? 'door_right'
          : panelName.toLowerCase().includes('sertar') || panelName.toLowerCase().includes('yash')
          ? 'drawer'
          : 'none'
      });
    } catch {}
  }

  // 8. Re-center horizontally (X, Z) and ground at floor (Y = 0)
  const bbox = new THREE.Box3().setFromObject(rootGroup);
  if (!bbox.isEmpty() && isFinite(bbox.min.x) && isFinite(bbox.max.x)) {
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const minY = bbox.min.y;
    for (const child of rootGroup.children) {
      child.position.x -= center.x;
      child.position.y -= minY;
      child.position.z -= center.z;
    }
  }

  // Compute final grounded bounds
  const finalBbox = new THREE.Box3().setFromObject(rootGroup);

  // 9. Convert group to binary GLB buffer
  const glbBuffer = await exportToGlbBuffer([rootGroup]);

  // 10. Generate project metadata
  let totalArea = 0;
  for (const p of cuttingList) {
    totalArea += (p.lengthMm * p.widthMm) / 1000000;
  }

  const dimW = Math.round((finalBbox.max.x - finalBbox.min.x) * 1000);
  const dimH = Math.round((finalBbox.max.y - finalBbox.min.y) * 1000);
  const dimD = Math.round((finalBbox.max.z - finalBbox.min.z) * 1000);

  const projectData: D3DProjectFile = {
    format: 'B3D_CAD_FURNITURE_V1',
    software: 'CAD Studio 3D',
    version: '1.0.0',
    units: 'mm',
    exportDate: new Date().toISOString(),
    metadata: {
      totalCabinets: 1,
      totalPanels: cuttingList.length,
      totalBoardAreaM2: +totalArea.toFixed(2),
      clientProjectName: 'B3D CAD Furniture'
    },
    cuttingList,
    assemblies: [
      {
        id: 'asm_main',
        name: 'Ansamblu Mobilier CAD',
        type: 'CadAssembly',
        dimensionsMm: {
          w: dimW > 0 ? dimW : 4500,
          h: dimH > 0 ? dimH : 2500,
          d: dimD > 0 ? dimD : 3500
        },
        positionMm: [0, 0, 0],
        rotationYDeg: 0,
        subPartsCount: rootGroup.children.length
      }
    ]
  };

  return {
    glbBuffer,
    projectData,
    thumbnailPngBase64
  };
}

