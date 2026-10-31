const fs = require('fs');
const THREE = require('three');
const buf = fs.readFileSync('decompressed_chunk.bin');

let p = 0;
const numSymbols = buf.readInt32LE(p); p += 4;
const symbols = [];
const textDecoder = new TextDecoder('latin1');
for (let s = 0; s < numSymbols; s++) {
  const len = buf.readInt32LE(p); p += 4;
  if (len > 0) {
    symbols.push(textDecoder.decode(buf.subarray(p, p + len))); p += len;
  } else symbols.push('');
}

function parseTree() {
  if (p + 9 > buf.length) return null;
  const symId = buf.readInt32LE(p);
  const symName = symbols[symId] || `SYM_${symId}`;
  const field2 = buf.readInt32LE(p + 4);
  const typeByte = buf.readUInt8(p + 8);
  p += 9;

  if (typeByte === 0x00) {
    const obj = { _sym: symName, _count: field2 };
    for (let c = 0; c < field2; c++) {
      const child = parseTree();
      if (child) {
        if (obj[child._sym]) {
          if (!Array.isArray(obj[child._sym])) obj[child._sym] = [obj[child._sym]];
          obj[child._sym].push(child);
        } else obj[child._sym] = child;
      }
    }
    return obj;
  }
  if (typeByte === 0x01) return { _sym: symName, val: true };
  if (typeByte === 0x02) return { _sym: symName, val: false };
  if (typeByte === 0x03) return { _sym: symName, val: buf.readUInt8(p++) };
  if (typeByte === 0x04) { const v = buf.readInt32LE(p); p += 4; return { _sym: symName, val: v }; }
  if (typeByte === 0x05) { const v = buf.readDoubleLE(p); p += 8; return { _sym: symName, val: v }; }
  if (typeByte === 0x06) {
    const charCount = buf.readInt32LE(p); p += 4;
    const byteLen = charCount * 2;
    let s = '';
    if (p + byteLen <= buf.length) {
      s = new TextDecoder('utf-16le').decode(buf.subarray(p, p + byteLen));
    }
    p += byteLen;
    return { _sym: symName, val: s };
  }
  if (typeByte === 0x07) {
    const byteLen = buf.readInt32LE(p); p += 4;
    let raw = new Uint8Array(0);
    if (p + byteLen <= buf.length) raw = buf.subarray(p, p + byteLen);
    p += byteLen;
    return { _sym: symName, val: raw };
  }
  return null;
}

const rootDoc = parseTree();
const rawTriMeshes = [];
function traverseNodes(node) {
  if (!node || typeof node !== 'object') return;
  if (node.TriData && node.TriData.val) rawTriMeshes.push(node);
  for (const key in node) {
    if (key.startsWith('_')) continue;
    const child = node[key];
    if (Array.isArray(child)) child.forEach(c => traverseNodes(c));
    else traverseNodes(child);
  }
}
traverseNodes(rootDoc);

console.log('Total rawTriMeshes:', rawTriMeshes.length);

for (let m = 0; m < rawTriMeshes.length; m++) {
  const t = rawTriMeshes[m];
  const raw = t.TriData.val;
  console.log(`[${m}] Name: "${t.Name?.val}", Mat: "${t.Mat?.val}", length: ${raw.length}`);
}

