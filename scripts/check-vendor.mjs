import { readFile } from 'node:fs/promises';
const pairs = [
  ['three/build/three.module.js','three.module.js'],
  ['three/build/three.core.js','three.core.js'],
  ['three/examples/jsm/controls/OrbitControls.js','OrbitControls.js'],
  ['three/LICENSE','THREE-LICENSE.txt'],
  ['exceljs/dist/exceljs.min.js','exceljs.min.js'],
  ['exceljs/LICENSE','EXCELJS-LICENSE.txt'],
];
for (const [source, target] of pairs) {
  const [installed, bundled] = await Promise.all([
    readFile(new URL(`../node_modules/${source}`, import.meta.url)),
    readFile(new URL(`../dist/vendor/${target}`, import.meta.url)),
  ]);
  if (!installed.equals(bundled)) throw new Error(`Vendor mismatch: ${target}. Run npm run vendor after reviewing dependency changes.`);
}
console.log(`Verified ${pairs.length} vendor files against installed packages.`);
