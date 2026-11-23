import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';
const kib = (bytes) => bytes / 1024;

const BUDGETS = {
  appKb: 450,
  vendorKb: 620,
  totalJsKb: 1120,
  cssKb: 90,
  initialGzipKb: 340,
  largestChunkKb: 480,
};

function files(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(path));
    else out.push(path);
  }
  return out;
}

let assets;
try {
  assets = files(join(DIST, 'assets'));
} catch {
  console.error('BUDGET: dist/assets missing. Run `npm run build` first.');
  process.exit(1);
}

const rows = assets.map((path) => {
  const bytes = statSync(path).size;
  const gzip = gzipSync(readFileSync(path)).length;
  const name = path.replace(/\\/g, '/').split('/').pop();
  return { name, bytes, gzip, js: name.endsWith('.js'), css: name.endsWith('.css') };
});

const app = rows.filter((r) => r.js && !r.name.startsWith('vendor-'));
const vendor = rows.filter((r) => r.js && r.name.startsWith('vendor-'));
const css = rows.filter((r) => r.css);
const js = rows.filter((r) => r.js);
const sum = (list, key) => list.reduce((total, row) => total + row[key], 0);
const initialGzip =
  sum(js, 'gzip') + sum(css, 'gzip') + gzipSync(readFileSync(join(DIST, 'index.html'))).length;
const largestChunk = Math.max(...js.map((row) => row.bytes));

const checks = [
  ['app JS', sum(app, 'bytes'), BUDGETS.appKb * 1024],
  ['vendor JS', sum(vendor, 'bytes'), BUDGETS.vendorKb * 1024],
  ['total JS', sum(js, 'bytes'), BUDGETS.totalJsKb * 1024],
  ['CSS', sum(css, 'bytes'), BUDGETS.cssKb * 1024],
  ['initial gzip', initialGzip, BUDGETS.initialGzipKb * 1024],
  ['largest chunk', largestChunk, BUDGETS.largestChunkKb * 1024],
];

for (const row of rows.sort((a, b) => b.bytes - a.bytes)) {
  console.log(
    `${row.name.padEnd(34)} ${kib(row.bytes).toFixed(1).padStart(7)} kB  ${kib(row.gzip)
      .toFixed(1)
      .padStart(6)} kB gzip`,
  );
}
console.log('');

let failed = false;
for (const [label, value, limit] of checks) {
  const ok = value <= limit;
  failed ||= !ok;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label.padEnd(15)} ${kib(value).toFixed(1).padStart(7)} kB / ${kib(
      limit,
    )
      .toFixed(0)
      .padStart(4)} kB`,
  );
}

if (failed) {
  console.error('\nBUDGET: exceeded. Trim the artifact or revise the explicit budget.');
  process.exit(1);
}
console.log('\nBUDGET: all budgets met.');
