import {
  readFileSync, writeFileSync, readdirSync, statSync,
} from 'fs';
import { join, relative } from 'path';
import { deflateRawSync, crc32 } from 'zlib';

const root = process.argv[2];
const out = process.argv[3];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

const files = walk(root).map((abs) => ({
  abs,
  name: relative(root, abs).split('\\').join('/'),
  data: readFileSync(abs),
}));

const chunks = [];
const central = [];
let offset = 0;

const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n >>> 0); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };

for (const f of files) {
  const nameBuf = Buffer.from(f.name, 'utf8');
  const comp = deflateRawSync(f.data);
  const crc = crc32(f.data) >>> 0;
  const local = Buffer.concat([
    u32(0x04034b50), u16(20), u16(0), u16(8), u16(0), u16(0),
    u32(crc), u32(comp.length), u32(f.data.length),
    u16(nameBuf.length), u16(0), nameBuf,
  ]);
  chunks.push(local, comp);
  central.push(Buffer.concat([
    u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(0), u16(0),
    u32(crc), u32(comp.length), u32(f.data.length),
    u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0),
    u32(offset), nameBuf,
  ]));
  offset += local.length + comp.length;
}

const cd = Buffer.concat(central);
const eocd = Buffer.concat([
  u32(0x06054b50), u16(0), u16(0),
  u16(files.length), u16(files.length),
  u32(cd.length), u32(offset), u16(0),
]);
writeFileSync(out, Buffer.concat([...chunks, cd, eocd]));
console.log('wrote', out, 'with', files.length, 'files');
files.forEach((f) => console.log('  ', f.name));
