import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

let sharedGltfLoader = null;

function getGltfLoader() {
  if (!sharedGltfLoader) {
    sharedGltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      'https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/'
    );
    sharedGltfLoader.setDRACOLoader(dracoLoader);
  }
  return sharedGltfLoader;
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function ensureBoxProjectedUVs(geom) {
  if (!geom || geom.attributes.uv) return;
  const posAttr = geom.attributes.position;
  if (!posAttr) return;
  if (!geom.attributes.normal) {
    geom.computeVertexNormals();
  }
  const normAttr = geom.attributes.normal;
  const count = posAttr.count;
  const uvArr = new Float32Array(count * 2);

  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  const span = Math.max(
    bb ? bb.max.x - bb.min.x : 1,
    bb ? bb.max.y - bb.min.y : 1,
    bb ? bb.max.z - bb.min.z : 1,
    0.001
  );
  // Normalize UV scale so ~0.5m corresponds to 1 UV tile
  const uvScale = span > 20 ? 0.002 : 2.0;

  for (let i = 0; i < count; i++) {
    const px = posAttr.getX(i) * uvScale;
    const py = posAttr.getY(i) * uvScale;
    const pz = posAttr.getZ(i) * uvScale;
    const nx = normAttr ? Math.abs(normAttr.getX(i)) : 0;
    const ny = normAttr ? Math.abs(normAttr.getY(i)) : 1;
    const nz = normAttr ? Math.abs(normAttr.getZ(i)) : 0;

    if (ny > nx && ny > nz) {
      uvArr[i * 2] = px;
      uvArr[i * 2 + 1] = pz;
    } else if (nx > nz) {
      uvArr[i * 2] = pz;
      uvArr[i * 2 + 1] = py;
    } else {
      uvArr[i * 2] = px;
      uvArr[i * 2 + 1] = py;
    }
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
}

export function loadGlbModelFromBuffer(arrayBuffer, modelId, modelName) {
  return new Promise((resolve, reject) => {
    const loader = getGltfLoader();
    loader.parse(
      arrayBuffer,
      '',
      (gltf) => {
        const rawRoot = gltf.scene || gltf.scenes[0];
        if (!rawRoot) {
          reject(new Error('Invalid GLB: no scene found'));
          return;
        }

        rawRoot.updateMatrixWorld(true);
        const rawBox = new THREE.Box3().setFromObject(rawRoot);
        const rawSize = new THREE.Vector3();
        const rawCenter = new THREE.Vector3();
        rawBox.getSize(rawSize);
        rawBox.getCenter(rawCenter);

        // Auto-detect if model is in millimeters (max dim > 18) or meters
        const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.0001);
        let unitFactor = 1.0;
        if (maxDim > 18 && maxDim <= 150) {
          // Likely centimeters -> convert to meters
          unitFactor = 0.01;
        } else if (maxDim > 150) {
          // Likely millimeters -> convert to meters
          unitFactor = 0.001;
        }

        const innerGroup = new THREE.Group();
        innerGroup.scale.set(unitFactor, unitFactor, unitFactor);
        // Shift rawRoot so bottom-center sits at (0, 0, 0) in wrapperGroup
        rawRoot.position.set(
          -rawCenter.x,
          -rawBox.min.y,
          -rawCenter.z
        );
        innerGroup.add(rawRoot);

        const wrapperGroup = new THREE.Group();
        wrapperGroup.name = `imported_glb_${modelId}`;
        wrapperGroup.add(innerGroup);

        const baseDimsCm = {
          w: Math.max(0.5, rawSize.x * unitFactor * 100),
          h: Math.max(0.5, rawSize.y * unitFactor * 100),
          d: Math.max(0.5, rawSize.z * unitFactor * 100)
        };

        const meshes = [];
        const subPartsMeta = [];
        let subIdx = 0;

        rawRoot.traverse((child) => {
          if (child.isMesh) {
            ensureBoxProjectedUVs(child.geometry);
            child.castShadow = true;
            child.receiveShadow = true;

            const origMat = Array.isArray(child.material)
              ? child.material[0]
              : child.material;

            const stdMat = new THREE.MeshStandardMaterial({
              color:
                origMat && origMat.color
                  ? origMat.color.clone()
                  : new THREE.Color('#e5e7eb'),
              map: origMat && origMat.map ? origMat.map : null,
              roughness:
                origMat && typeof origMat.roughness === 'number'
                  ? origMat.roughness
                  : 0.4,
              metalness:
                origMat && typeof origMat.metalness === 'number'
                  ? origMat.metalness
                  : 0.05,
              transparent: Boolean(origMat && origMat.transparent),
              opacity:
                origMat && typeof origMat.opacity === 'number'
                  ? origMat.opacity
                  : 1.0
            });

            const backupMat = stdMat.clone();
            child.material = stdMat;
            child.userData.originalGlbMaterial = backupMat;
            child.userData.importedModelId = modelId;
            child.userData.subMeshIdx = subIdx;

            const partLabel =
              child.name ||
              (origMat && origMat.name) ||
              `Partea #${subIdx + 1}`;
            const hexColor =
              '#' + stdMat.color.getHexString();

            subPartsMeta.push({
              subIdx,
              name: partLabel.slice(0, 28),
              colorHex: hexColor,
              assignedMatId: null
            });

            meshes.push(child);
            subIdx++;
          }
        });

        resolve({
          id: modelId,
          name: modelName,
          wrapperGroup,
          meshes,
          baseDimsCm,
          subPartsMeta
        });
      },
      (err) => reject(err)
    );
  });
}
