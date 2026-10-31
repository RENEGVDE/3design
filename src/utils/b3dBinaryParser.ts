import * as THREE from 'three';
import * as fflate from 'three/examples/jsm/libs/fflate.module.js';
import { exportToGlbBuffer, B3DPanelSpec, B3DProjectFile } from './cadFormatHandler';

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
  projectData: B3DProjectFile;
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
            const testView = new DataView(decompressedTest.buffer, decompressedTest.byteOffset, decompressedTest.byteLength);
            const testSyms = testView.getInt32(0, true);
            if (testSyms > 0 && testSyms < 50000) {
              zlibOffset = i;
              break;
            }
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

  // 6. Collect all panels (Type 4002) with hierarchical world transforms
  interface RawPanelItem {
    node: ParsedNode;
    worldMatrix: THREE.Matrix4;
  }
  const rawPanels: RawPanelItem[] = [];

  function getLocalMatrix(node: any): THREE.Matrix4 | null {
    if (!node || !node.Trans) return null;
    const m = new THREE.Matrix4();
    const posX = (node.Trans.X?.val || 0) * 0.001;
    const posY = (node.Trans.Y?.val || 0) * 0.001;
    const posZ = (node.Trans.Z?.val || 0) * 0.001;
    const pos = new THREE.Vector3(posX, posY, posZ);

    const qx = node.Trans.Rx?.val || 0;
    const qy = node.Trans.Ry?.val || 0;
    const qz = node.Trans.Rz?.val || 0;
    const qw = node.Trans.Rw?.val !== undefined ? node.Trans.Rw.val : 1;
    const quat = new THREE.Quaternion(qx, qy, qz, qw);

    const scale = new THREE.Vector3(1, 1, 1);
    m.compose(pos, quat, scale);
    return m;
  }

  function traverseTreeHierarchical(node: any, currentMatrix: THREE.Matrix4) {
    if (!node || typeof node !== 'object') return;
    let nextMatrix = currentMatrix;
    const localMat = getLocalMatrix(node);
    if (localMat) {
      nextMatrix = currentMatrix.clone().multiply(localMat);
    }

    if (node.Type?.val === 4002 && node.Contour?.val) {
      rawPanels.push({ node, worldMatrix: nextMatrix });
    }

    for (const key in node) {
      if (key.startsWith('_') || key === 'Undo') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) traverseTreeHierarchical(item, nextMatrix);
      } else {
        traverseTreeHierarchical(child, nextMatrix);
      }
    }
  }

  traverseTreeHierarchical(rootDoc.Model || rootDoc, new THREE.Matrix4());

  // 7. Build Three.js 3D Scene Group
  const rootGroup = new THREE.Group();
  rootGroup.name = 'CAD_B3D_Model';

  const materialCache = new Map<string, THREE.MeshStandardMaterial>();

  function getStandardMaterial(matName?: string): THREE.MeshStandardMaterial {
    const cleanKey = (matName || 'Alb_Default').split(/[\r\n]/)[0].trim();
    if (materialCache.has(cleanKey)) return materialCache.get(cleanKey)!;

    let hexColor = '#f4f4f2';
    let roughness = 0.45;
    let metalness = 0.05;
    let transparent = false;
    let opacity = 1.0;

    const lower = cleanKey.toLowerCase();
    if (lower.includes('sahara') || lower.includes('cream') || lower.includes('crem')) {
      hexColor = '#d8cbbe';
      roughness = 0.4;
      metalness = 0.02;
    } else if (lower.includes('casella') || lower.includes('oak') || lower.includes('stejar') || lower.includes('wood') || lower.includes('dub')) {
      hexColor = '#96714c';
      roughness = 0.55;
      metalness = 0.02;
    } else if (lower.includes('nuc') || lower.includes('walnut') || lower.includes('oreh')) {
      hexColor = '#6e5038';
      roughness = 0.5;
    } else if (lower.includes('lentos') || lower.includes('negru') || lower.includes('black') || lower.includes('cern')) {
      hexColor = '#232325';
      roughness = 0.35;
      metalness = 0.05;
    } else if (lower.includes('antracit') || lower.includes('anthracite') || lower.includes('palmel')) {
      hexColor = '#3c3e43';
      roughness = 0.42;
      metalness = 0.03;
    } else if (lower.includes('gri') || lower.includes('grey') || lower.includes('gray') || lower.includes('серый')) {
      hexColor = '#7e8288';
      roughness = 0.45;
      metalness = 0.05;
    } else if (lower.includes('hrom') || lower.includes('хром') || lower.includes('chrome') || lower.includes('crom')) {
      hexColor = '#e0e4e8';
      roughness = 0.15;
      metalness = 0.95;
    } else if (lower.includes('nerjaveika') || lower.includes('нержавейка') || lower.includes('inox') || lower.includes('steel') || lower.includes('metal')) {
      hexColor = '#cfd3d6';
      roughness = 0.28;
      metalness = 0.8;
    } else if (lower.includes('steklo') || lower.includes('стекло') || lower.includes('glass')) {
      hexColor = '#2b333a';
      roughness = 0.1;
      metalness = 0.1;
      transparent = true;
      opacity = 0.65;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor),
      roughness,
      metalness,
      transparent,
      opacity,
      name: cleanKey
    });
    materialCache.set(cleanKey, mat);
    return mat;
  }

  interface ContourSegment {
    type: 'line' | 'arc';
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    cx?: number;
    cy?: number;
    dirFlag?: number;
    reversed?: boolean;
  }

  interface ContourCircle {
    cx: number;
    cy: number;
    r: number;
  }

  function computeLoopArea(loop: ContourSegment[]): number {
    let area = 0;
    for (let i = 0; i < loop.length; i++) {
      const p1 = loop[i].p1;
      const p2 = loop[i].p2;
      area += p1.x * p2.y - p2.x * p1.y;
    }
    return Math.abs(area) * 0.5;
  }

  function buildLoopPath(pathObj: THREE.Path | THREE.Shape, loop: ContourSegment[]) {
    if (loop.length === 0) return;
    const startP = loop[0].p1;
    pathObj.moveTo(startP.x * 0.001, startP.y * 0.001);

    for (const seg of loop) {
      const p1 = seg.p1;
      const p2 = seg.p2;

      if (seg.type === 'line' || seg.cx === undefined || seg.cy === undefined) {
        pathObj.lineTo(p2.x * 0.001, p2.y * 0.001);
      } else {
        const cx = seg.cx;
        const cy = seg.cy;
        const r = Math.hypot(p1.x - cx, p1.y - cy);

        // If radius is huge (>5000mm) or center is astronomical, treat as straight line to prevent spikes
        if (r > 5000 || !isFinite(r)) {
          pathObj.lineTo(p2.x * 0.001, p2.y * 0.001);
        } else {
          const a1 = Math.atan2(p1.y - cy, p1.x - cx);
          const a2 = Math.atan2(p2.y - cy, p2.x - cx);
          let delta = a2 - a1;
          while (delta <= -Math.PI) delta += 2 * Math.PI;
          while (delta > Math.PI) delta -= 2 * Math.PI;

          const STEPS = 8;
          for (let k = 1; k <= STEPS; k++) {
            const t = k / STEPS;
            const a = a1 + t * delta;
            const px = (cx + r * Math.cos(a)) * 0.001;
            const py = (cy + r * Math.sin(a)) * 0.001;
            pathObj.lineTo(px, py);
          }
        }
      }
    }
    pathObj.closePath();
  }

  const cuttingList: B3DPanelSpec[] = [];

  // Construct 3D Panels from 2D Contours
  for (let idx = 0; idx < rawPanels.length; idx++) {
    const pItem = rawPanels[idx];
    const pNode = pItem.node;
    const cBytes: Uint8Array = pNode.Contour.val;
    if (!cBytes || cBytes.length < 4) continue;

    const cView = new DataView(cBytes.buffer, cBytes.byteOffset, cBytes.byteLength);
    const numSegs = cView.getInt32(0, true);
    if (numSegs < 1) continue;

    let cp = 4;
    const rawSegments: ContourSegment[] = [];
    const standAloneCircles: ContourCircle[] = [];

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

        if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) continue;
        if (Math.abs(x1) > 10000 || Math.abs(y1) > 10000 || Math.abs(x2) > 10000 || Math.abs(y2) > 10000) continue;

        minX = Math.min(minX, x1, x2);
        maxX = Math.max(maxX, x1, x2);
        minY = Math.min(minY, y1, y2);
        maxY = Math.max(maxY, y1, y2);

        rawSegments.push({ type: 'line', p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } });
      } else if (segType === 0x12 && cp + 50 <= cBytes.length) {
        // Arc / Fillet: cx, cy, x1, y1, x2, y2, dirFlag
        const cx = cView.getFloat64(cp + 1, true);
        const cy = cView.getFloat64(cp + 9, true);
        const x1 = cView.getFloat64(cp + 17, true);
        const y1 = cView.getFloat64(cp + 25, true);
        const x2 = cView.getFloat64(cp + 33, true);
        const y2 = cView.getFloat64(cp + 41, true);
        const dirFlag = cView.getUint8(cp + 49);
        cp += 50;

        if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) continue;
        if (Math.abs(x1) > 10000 || Math.abs(y1) > 10000 || Math.abs(x2) > 10000 || Math.abs(y2) > 10000) continue;

        minX = Math.min(minX, x1, x2);
        maxX = Math.max(maxX, x1, x2);
        minY = Math.min(minY, y1, y2);
        maxY = Math.max(maxY, y1, y2);

        rawSegments.push({ type: 'arc', cx, cy, p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 }, dirFlag });
      } else if (segType === 0x11 && cp + 25 <= cBytes.length) {
        // Standalone Circle / Grommet hole
        const cx = cView.getFloat64(cp + 1, true);
        const cy = cView.getFloat64(cp + 9, true);
        const r = cView.getFloat64(cp + 17, true);
        cp += 25;

        if (!isFinite(cx) || !isFinite(cy) || !isFinite(r) || r <= 0 || r > 5000) continue;

        minX = Math.min(minX, cx - r);
        maxX = Math.max(maxX, cx + r);
        minY = Math.min(minY, cy - r);
        maxY = Math.max(maxY, cy + r);

        standAloneCircles.push({ cx, cy, r });
      } else {
        break;
      }
    }

    // Chain segments into continuous closed loop(s)
    const loops: ContourSegment[][] = [];
    const used = new Array(rawSegments.length).fill(false);

    while (true) {
      const startIdx = used.indexOf(false);
      if (startIdx === -1) break;

      const currentLoop: ContourSegment[] = [];
      used[startIdx] = true;
      currentLoop.push(rawSegments[startIdx]);

      let currEnd = rawSegments[startIdx].p2;

      for (let step = 0; step < rawSegments.length; step++) {
        const firstStart = currentLoop[0].p1;
        if (Math.hypot(currEnd.x - firstStart.x, currEnd.y - firstStart.y) < 1.0 && currentLoop.length >= 2) {
          break;
        }

        let bestIdx = -1;
        let bestDist = Infinity;
        let bestReversed = false;

        for (let i = 0; i < rawSegments.length; i++) {
          if (used[i]) continue;
          const seg = rawSegments[i];
          const dForward = Math.hypot(seg.p1.x - currEnd.x, seg.p1.y - currEnd.y);
          const dBackward = Math.hypot(seg.p2.x - currEnd.x, seg.p2.y - currEnd.y);

          if (dForward < bestDist) {
            bestDist = dForward;
            bestIdx = i;
            bestReversed = false;
          }
          if (dBackward < bestDist) {
            bestDist = dBackward;
            bestIdx = i;
            bestReversed = true;
          }
        }

        if (bestIdx !== -1 && bestDist < 5.0) {
          used[bestIdx] = true;
          const nextSeg = rawSegments[bestIdx];
          if (bestReversed) {
            currentLoop.push({
              ...nextSeg,
              p1: nextSeg.p2,
              p2: nextSeg.p1,
              reversed: true
            });
            currEnd = nextSeg.p1;
          } else {
            currentLoop.push(nextSeg);
            currEnd = nextSeg.p2;
          }
        } else {
          break;
        }
      }

      loops.push(currentLoop);
    }

    if (loops.length === 0 && standAloneCircles.length === 0) continue;

    // Detect outer loop (largest bounding area)
    let outerLoopIdx = 0;
    let maxArea = -1;
    const loopAreas = loops.map(computeLoopArea);
    for (let i = 0; i < loops.length; i++) {
      if (loopAreas[i] > maxArea) {
        maxArea = loopAreas[i];
        outerLoopIdx = i;
      }
    }

    const shape = new THREE.Shape();
    if (loops.length > 0) {
      buildLoopPath(shape, loops[outerLoopIdx]);

      // All other loops are cutouts / holes
      for (let i = 0; i < loops.length; i++) {
        if (i === outerLoopIdx) continue;
        const holePath = new THREE.Path();
        buildLoopPath(holePath, loops[i]);
        shape.holes.push(holePath);
      }
    } else if (standAloneCircles.length > 0) {
      const c0 = standAloneCircles[0];
      shape.absarc(c0.cx * 0.001, c0.cy * 0.001, c0.r * 0.001, 0, Math.PI * 2, false);
    }

    // Additional standalone circles become holes
    const startCircleIdx = loops.length === 0 ? 1 : 0;
    for (let c = startCircleIdx; c < standAloneCircles.length; c++) {
      const sc = standAloneCircles[c];
      const holeCircle = new THREE.Path();
      holeCircle.absarc(sc.cx * 0.001, sc.cy * 0.001, sc.r * 0.001, 0, Math.PI * 2, true);
      shape.holes.push(holeCircle);
    }

    const thickMm = Math.max(2, pNode.Thick?.val || 18);
    const thickM = thickMm * 0.001;

    try {
      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: thickM,
        bevelEnabled: false
      });
      geo.computeVertexNormals();

      // Guard: Ensure panel local dimensions are physically sane (< 6.0m)
      geo.computeBoundingBox();
      if (geo.boundingBox) {
        const sz = new THREE.Vector3();
        geo.boundingBox.getSize(sz);
        if (sz.x > 6.0 || sz.y > 6.0 || sz.z > 6.0) {
          continue;
        }
      }

      const matName = pNode.Mat?.val || 'PAL Alb 18mm';
      const mat = getStandardMaterial(matName);
      const mesh = new THREE.Mesh(geo, mat);
      const panelName = pNode.Name?.val || `Panou_${idx + 1}`;
      mesh.name = panelName;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Apply Transformation from accumulated hierarchical worldMatrix
      pItem.worldMatrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
      mesh.updateMatrixWorld(true);

      rootGroup.add(mesh);

      // Add to Cutting List BOM
      const lengthMm = isFinite(maxX - minX) && maxX > minX ? Math.round(maxX - minX) : 600;
      const widthMm = isFinite(maxY - minY) && maxY > minY ? Math.round(maxY - minY) : 400;

      const euler = new THREE.Euler().setFromQuaternion(mesh.quaternion, 'YXZ');

      cuttingList.push({
        id: `p_${idx + 1}`,
        name: panelName,
        cabinetName: 'Ansamblu Mobilier CAD',
        lengthMm: Math.max(lengthMm, widthMm),
        widthMm: Math.min(lengthMm, widthMm),
        thicknessMm: Math.round(thickMm),
        quantity: 1,
        materialName: matName.split(/[\r\n]/)[0].trim(),
        colorHex: `#${mat.color.getHexString()}`,
        edgeBanding: { L1: 'ABS 1mm', L2: 'ABS 1mm', W1: 'ABS 0.4mm', W2: 'ABS 0.4mm' },
        positionMm: [
          Math.round(mesh.position.x * 1000),
          Math.round(mesh.position.y * 1000),
          Math.round(mesh.position.z * 1000)
        ],
        rotationDeg: [
          Math.round(THREE.MathUtils.radToDeg(euler.x)),
          Math.round(THREE.MathUtils.radToDeg(euler.y)),
          Math.round(THREE.MathUtils.radToDeg(euler.z))
        ],
        mechanism: (/sertar|drawer|ящик|tandem/i.test(panelName) ||
          (/фронтал|front|фасад|facade/i.test(panelName) && Math.min(lengthMm, widthMm) <= 380 && Math.max(lengthMm, widthMm) >= 280 && Math.round(mesh.position.y * 1000) <= 1150))
          ? 'drawer'
          : /aventos|lift|flap/i.test(panelName)
          ? 'flap_up'
          : /фронтал|front|фасад|facade|usa|ușă|dver|двер/i.test(panelName) && !/цокол|soclu|plinth|дно|бок|задн/i.test(panelName)
          ? (mesh.position.x <= 0 ? 'door_left' : 'door_right')
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
      child.updateMatrixWorld(true);
    }
  }
  rootGroup.updateMatrixWorld(true);

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

  const projectData: B3DProjectFile = {
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

