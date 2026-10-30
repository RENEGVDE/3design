import * as THREE from 'three';

export interface ArchitecturalOpening {
  id: string;
  type: 'door' | 'window' | 'sliding_door';
  wallSide: 'back' | 'left' | 'right' | 'front';
  distanceCm: number; // distance along the wall from corner
  widthCm: number;
  heightCm: number;
  elevationCm: number; // 0 for doors, ~90 for windows
  name: string;
}

export interface RoomConfig {
  widthCm: number; // X axis (e.g. 500 cm = 5.0m)
  lengthCm: number; // Z axis (e.g. 400 cm = 4.0m)
  heightCm: number; // Y axis (e.g. 270 cm = 2.7m)
  wallThicknessCm: number; // e.g. 15 cm
  floorFinish: 'parquet_oak' | 'marble_white' | 'tile_grey' | 'concrete';
  wallColor: string; // e.g. '#252932' or '#f1f5f9'
  openings: ArchitecturalOpening[];
  showCeiling: boolean;
  showBaseboards: boolean;
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  widthCm: 550,
  lengthCm: 450,
  heightCm: 270,
  wallThicknessCm: 15,
  floorFinish: 'parquet_oak',
  wallColor: '#252932',
  showCeiling: false,
  showBaseboards: true,
  openings: [
    {
      id: 'door_main',
      type: 'door',
      wallSide: 'front',
      distanceCm: 80,
      widthCm: 90,
      heightCm: 210,
      elevationCm: 0,
      name: 'Ușă Intrare (90×210)'
    },
    {
      id: 'win_main',
      type: 'window',
      wallSide: 'back',
      distanceCm: 180,
      widthCm: 160,
      heightCm: 140,
      elevationCm: 85,
      name: 'Fereastră Dublă (160×140)'
    }
  ]
};

export const FLOOR_FINISHES = [
  { id: 'parquet_oak', nameRo: 'Parchet Stejar Natural', nameRu: 'Дубовый паркет', nameEn: 'Natural Oak Parquet', color: 0xb88852, roughness: 0.38 },
  { id: 'marble_white', nameRo: 'Marmură Calacatta Albă', nameRu: 'Белый мрамор Калакатта', nameEn: 'White Calacatta Marble', color: 0xeeeeee, roughness: 0.12, metalness: 0.05 },
  { id: 'tile_grey', nameRo: 'Gresie Porțelanată Gri', nameRu: 'Серая керамогранитная плитка', nameEn: 'Grey Porcelain Tile', color: 0x3e424c, roughness: 0.45 },
  { id: 'concrete', nameRo: 'Microciment Șlefuit', nameRu: 'Шлифованный микроцемент', nameEn: 'Polished Concrete', color: 0x2d3139, roughness: 0.6 }
];

/**
 * Builds the complete 3D architectural room model in Three.js meter-space.
 */
export function buildArchitecturalRoom(config: RoomConfig = DEFAULT_ROOM_CONFIG) {
  const roomGroup = new THREE.Group();
  roomGroup.name = 'Architectural_Room';

  const w = config.widthCm * 0.01; // X in meters
  const l = config.lengthCm * 0.01; // Z in meters
  const h = config.heightCm * 0.01; // Y in meters
  const t = (config.wallThicknessCm || 15) * 0.01;

  // Selected floor material
  const finish = FLOOR_FINISHES.find((f) => f.id === config.floorFinish) || FLOOR_FINISHES[0];
  const floorMat = new THREE.MeshStandardMaterial({
    color: finish.color,
    roughness: finish.roughness,
    metalness: finish.metalness || 0.02
  });

  // Floor Mesh
  const floorGeo = new THREE.PlaneGeometry(w, l);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(w / 2, 0, l / 2);
  floorMesh.receiveShadow = true;
  floorMesh.name = 'Architectural_Floor';
  roomGroup.add(floorMesh);

  // Ceiling Mesh (if enabled)
  if (config.showCeiling) {
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      roughness: 0.9
    });
    const ceilingMesh = new THREE.Mesh(floorGeo, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(w / 2, h, l / 2);
    ceilingMesh.name = 'Architectural_Ceiling';
    roomGroup.add(ceilingMesh);
  }

  // Wall Material
  const wallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.wallColor || '#252932'),
    roughness: 0.88,
    metalness: 0.02
  });

  const baseboardMat = new THREE.MeshStandardMaterial({
    color: 0x15181f,
    roughness: 0.5,
    metalness: 0.08
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xd4ecff,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.4
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e222a,
    roughness: 0.35,
    metalness: 0.6
  });

  // Helper to build a wall with cutouts and architectural openings
  function buildWall(
    wallName: string,
    wallLen: number,
    posX: number,
    posZ: number,
    rotY: number,
    side: 'back' | 'left' | 'right' | 'front'
  ) {
    const wallParent = new THREE.Group();
    wallParent.name = wallName;
    wallParent.position.set(posX, 0, posZ);
    wallParent.rotation.y = rotY;

    const wallOpenings = (config.openings || []).filter((o) => o.wallSide === side);

    if (wallOpenings.length === 0) {
      // Solid uninterrupted wall
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(wallLen, h, t), wallMat);
      wallMesh.position.set(wallLen / 2, h / 2, -t / 2);
      wallMesh.receiveShadow = true;
      wallMesh.castShadow = true;
      wallParent.add(wallMesh);

      // Baseboard
      if (config.showBaseboards) {
        const bb = new THREE.Mesh(new THREE.BoxGeometry(wallLen, 0.08, 0.018), baseboardMat);
        bb.position.set(wallLen / 2, 0.04, 0.009);
        wallParent.add(bb);
      }
    } else {
      // Sort openings along wall length
      wallOpenings.sort((a, b) => a.distanceCm - b.distanceCm);

      let curX = 0;
      wallOpenings.forEach((op) => {
        const opX = op.distanceCm * 0.01;
        const opW = op.widthCm * 0.01;
        const opH = op.heightCm * 0.01;
        const opY = op.elevationCm * 0.01;

        // Solid wall segment before opening
        const segW = Math.max(0, opX - curX);
        if (segW > 0.02) {
          const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, h, t), wallMat);
          seg.position.set(curX + segW / 2, h / 2, -t / 2);
          seg.receiveShadow = true;
          seg.castShadow = true;
          wallParent.add(seg);

          if (config.showBaseboards) {
            const bb = new THREE.Mesh(new THREE.BoxGeometry(segW, 0.08, 0.018), baseboardMat);
            bb.position.set(curX + segW / 2, 0.04, 0.009);
            wallParent.add(bb);
          }
        }

        // Lintel above opening (if opening height < wall height)
        const lintelH = Math.max(0, h - (opY + opH));
        if (lintelH > 0.02) {
          const lintel = new THREE.Mesh(new THREE.BoxGeometry(opW, lintelH, t), wallMat);
          lintel.position.set(opX + opW / 2, opY + opH + lintelH / 2, -t / 2);
          lintel.receiveShadow = true;
          lintel.castShadow = true;
          wallParent.add(lintel);
        }

        // Sill below opening (for windows)
        if (opY > 0.02) {
          const sill = new THREE.Mesh(new THREE.BoxGeometry(opW, opY, t), wallMat);
          sill.position.set(opX + opW / 2, opY / 2, -t / 2);
          sill.receiveShadow = true;
          sill.castShadow = true;
          wallParent.add(sill);

          if (config.showBaseboards) {
            const bb = new THREE.Mesh(new THREE.BoxGeometry(opW, 0.08, 0.018), baseboardMat);
            bb.position.set(opX + opW / 2, 0.04, 0.009);
            wallParent.add(bb);
          }
        }

        // 3D Architectural Fixture (Door or Window frame & glass)
        if (op.type === 'window') {
          // Window frame
          const fThick = 0.06;
          const frameGroup = new THREE.Group();
          frameGroup.name = `Window_${op.id}`;
          frameGroup.position.set(opX + opW / 2, opY + opH / 2, -t / 2);

          const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(opW, opH, 0.07), frameMat);
          frameGroup.add(frameMesh);

          const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(opW - fThick * 2, opH - fThick * 2, 0.01), glassMat);
          frameGroup.add(glassMesh);

          // Center mullion
          const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, opH, 0.08), frameMat);
          frameGroup.add(mullion);

          wallParent.add(frameGroup);
        } else {
          // Door frame & leaf
          const doorGroup = new THREE.Group();
          doorGroup.name = `Door_${op.id}`;
          doorGroup.position.set(opX, 0, -t / 2);

          // Outer frame architrave
          const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.06, opH, t + 0.02), frameMat);
          frameL.position.set(0.03, opH / 2, 0);
          doorGroup.add(frameL);

          const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.06, opH, t + 0.02), frameMat);
          frameR.position.set(opW - 0.03, opH / 2, 0);
          doorGroup.add(frameR);

          const frameTop = new THREE.Mesh(new THREE.BoxGeometry(opW, 0.06, t + 0.02), frameMat);
          frameTop.position.set(opW / 2, opH - 0.03, 0);
          doorGroup.add(frameTop);

          // Door leaf (subtly ajar at 25 degrees for architectural depth)
          const leafPivot = new THREE.Group();
          leafPivot.position.set(0.06, 0, 0);
          leafPivot.rotation.y = THREE.MathUtils.degToRad(25);

          const leafMat = new THREE.MeshStandardMaterial({
            color: 0x222630,
            roughness: 0.45
          });
          const leafMesh = new THREE.Mesh(new THREE.BoxGeometry(opW - 0.12, opH - 0.08, 0.04), leafMat);
          leafMesh.position.set((opW - 0.12) / 2, (opH - 0.08) / 2, 0);
          leafPivot.add(leafMesh);

          // Door Handle
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12).rotateZ(Math.PI / 2), frameMat);
          handle.position.set(opW - 0.18, 1.0, 0.03);
          leafPivot.add(handle);

          doorGroup.add(leafPivot);
          wallParent.add(doorGroup);
        }

        curX = opX + opW;
      });

      // Remaining wall segment to end
      const remainW = Math.max(0, wallLen - curX);
      if (remainW > 0.02) {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(remainW, h, t), wallMat);
        seg.position.set(curX + remainW / 2, h / 2, -t / 2);
        seg.receiveShadow = true;
        seg.castShadow = true;
        wallParent.add(seg);

        if (config.showBaseboards) {
          const bb = new THREE.Mesh(new THREE.BoxGeometry(remainW, 0.08, 0.018), baseboardMat);
          bb.position.set(curX + remainW / 2, 0.04, 0.009);
          wallParent.add(bb);
        }
      }
    }

    roomGroup.add(wallParent);
  }

  // 1. Back Wall (Z = 0, along X)
  buildWall('Wall_Back', w, 0, 0, 0, 'back');

  // 2. Left Wall (X = 0, along Z)
  buildWall('Wall_Left', l, 0, 0, Math.PI / 2, 'left');

  // 3. Right Wall (X = w, along Z)
  buildWall('Wall_Right', l, w, 0, Math.PI / 2, 'right');

  // 4. Front Wall (Z = l, along X)
  buildWall('Wall_Front', w, 0, l, 0, 'front');

  return roomGroup;
}

/**
 * Renders a standard 2D Architectural Floor Plan sketch on an HTML5 Canvas.
 */
export function drawArchitecturalFloorPlan(
  canvas: HTMLCanvasElement,
  roomConfig: RoomConfig,
  placedFurniture: any[] = [],
  placedAppliances: any[] = []
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cw = canvas.width;
  const ch = canvas.height;

  // Clear canvas (blueprint dark slate background)
  ctx.fillStyle = '#0a0e17';
  ctx.fillRect(0, 0, cw, ch);

  // Architectural CAD Grid (500mm / 50cm main grid, 100mm / 10cm subgrid)
  const roomW = roomConfig.widthCm;
  const roomL = roomConfig.lengthCm;
  const wallT = roomConfig.wallThicknessCm || 15;

  const margin = 70;
  const availW = cw - margin * 2;
  const availH = ch - margin * 2;
  const scale = Math.min(availW / roomW, availH / roomL);

  const drawW = roomW * scale;
  const drawL = roomL * scale;
  const drawT = Math.max(3, wallT * scale);

  const startX = (cw - drawW) / 2;
  const startY = (ch - drawL) / 2;

  // Background Grid
  ctx.strokeStyle = '#161e2e';
  ctx.lineWidth = 1;
  const gridStepPx = 50 * scale; // 50cm step
  if (gridStepPx > 8) {
    for (let x = 0; x < cw; x += gridStepPx) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }
    for (let y = 0; y < ch; y += gridStepPx) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }
  }

  // Room Inner Floor Area
  ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
  ctx.fillRect(startX, startY, drawW, drawL);

  // Placed Furniture 2D Footprints
  placedFurniture.forEach((item, idx) => {
    // item.position: [X, Y, Z] in meters
    const posXCm = (item.position?.[0] || 0) * 100;
    const posZCm = (item.position?.[2] || 0) * 100;
    const itemWCm = (item.baseDimsCm?.w || 60) * (item.scale?.[0] || 1);
    const itemDCm = (item.baseDimsCm?.d || 56) * (item.scale?.[2] || 1);

    const fx = startX + (posXCm - itemWCm / 2) * scale;
    const fy = startY + (posZCm - itemDCm / 2) * scale;
    const fw = itemWCm * scale;
    const fh = itemDCm * scale;

    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx, fy, fw, fh);

    // Diagonal hatch for architectural footprint
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + fw, fy + fh);
    ctx.stroke();

    if (fw > 28 && fh > 14) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.name || `Corp #${idx + 1}`, fx + fw / 2, fy + fh / 2, fw - 4);
    }
  });

  // Placed Appliances 2D Footprints
  placedAppliances.forEach((app, idx) => {
    const posXCm = (app.position?.x || 0) * 100;
    const posZCm = (app.position?.z || 0) * 100;
    const itemWCm = (app.dimensions?.width || 600) / 10;
    const itemDCm = (app.dimensions?.depth || 560) / 10;

    const ax = startX + (posXCm - itemWCm / 2) * scale;
    const ay = startY + (posZCm - itemDCm / 2) * scale;
    const aw = itemWCm * scale;
    const ah = itemDCm * scale;

    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.fillRect(ax, ay, aw, ah);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ax, ay, aw, ah);

    if (aw > 20 && ah > 12) {
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(app.name || `Aparat #${idx + 1}`, ax + aw / 2, ay + ah / 2, aw - 4);
    }
  });

  // Architectural Walls (Solid outer & inner boundary)
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;

  // Outer and Inner Wall rectangles with thickness
  // Back Wall
  ctx.fillRect(startX - drawT, startY - drawT, drawW + drawT * 2, drawT);
  // Left Wall
  ctx.fillRect(startX - drawT, startY, drawT, drawL);
  // Right Wall
  ctx.fillRect(startX + drawW, startY, drawT, drawL);
  // Front Wall
  ctx.fillRect(startX - drawT, startY + drawL, drawW + drawT * 2, drawT);

  ctx.strokeRect(startX, startY, drawW, drawL);
  ctx.strokeRect(startX - drawT, startY - drawT, drawW + drawT * 2, drawL + drawT * 2);

  // Draw Openings (Doors & Windows) on 2D Plan
  (roomConfig.openings || []).forEach((op) => {
    const opDist = op.distanceCm * scale;
    const opW = op.widthCm * scale;

    if (op.wallSide === 'back') {
      const ox = startX + opDist;
      const oy = startY - drawT;
      // Clear wall cut
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(ox, oy, opW, drawT);

      if (op.type === 'window') {
        // Window glass triple lines
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox, oy + drawT / 2);
        ctx.lineTo(ox + opW, oy + drawT / 2);
        ctx.stroke();
      }
    } else if (op.wallSide === 'front') {
      const ox = startX + opDist;
      const oy = startY + drawL;
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(ox, oy, opW, drawT);

      if (op.type === 'door') {
        // Door swing arc (90 degree architectural swing)
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ox, oy, opW, 0, Math.PI / 2, false);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox, oy + opW);
        ctx.stroke();
      }
    }
  });

  // Dimension Lines & Real mm / cm Annotations
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.textAlign = 'center';

  // Top Dimension (Width)
  const dimTopY = startY - drawT - 25;
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX, startY - drawT - 10);
  ctx.lineTo(startX, dimTopY - 5);
  ctx.moveTo(startX + drawW, startY - drawT - 10);
  ctx.lineTo(startX + drawW, dimTopY - 5);
  ctx.moveTo(startX, dimTopY);
  ctx.lineTo(startX + drawW, dimTopY);
  ctx.stroke();
  ctx.fillText(`${roomW} cm (${roomW * 10} mm)`, startX + drawW / 2, dimTopY - 6);

  // Left Dimension (Length)
  const dimLeftX = startX - drawT - 25;
  ctx.beginPath();
  ctx.moveTo(startX - drawT - 10, startY);
  ctx.lineTo(dimLeftX - 5, startY);
  ctx.moveTo(startX - drawT - 10, startY + drawL);
  ctx.lineTo(dimLeftX - 5, startY + drawL);
  ctx.moveTo(dimLeftX, startY);
  ctx.lineTo(dimLeftX, startY + drawL);
  ctx.stroke();

  ctx.save();
  ctx.translate(dimLeftX - 8, startY + drawL / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${roomL} cm (${roomL * 10} mm)`, 0, 0);
  ctx.restore();

  // Floor Area Badge
  const roomAreaM2 = ((roomW * roomL) / 10000).toFixed(1);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText(`Suprafață Utilă: ${roomAreaM2} m² • Înălțime Plafon: ${roomConfig.heightCm} cm`, startX + drawW / 2, startY + drawL + drawT + 30);
}
