import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist/vendor', { recursive: true });
for (const [from, to] of [
  ['three/build/three.module.js','three.module.js'],
  ['three/build/three.core.js','three.core.js'],
  ['three/examples/jsm/controls/OrbitControls.js','OrbitControls.js'],
  ['three/LICENSE','THREE-LICENSE.txt'],
  ['exceljs/dist/exceljs.min.js','exceljs.min.js'],
  ['exceljs/LICENSE','EXCELJS-LICENSE.txt'],
]) await copyFile(`node_modules/${from}`, `dist/vendor/${to}`);
