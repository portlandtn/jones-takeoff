import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {defaultJob, calculate, validate, topHeight, DEFAULT_CUT, ROOFS, splitPanel, stockPieces} from '../dist/engine.mjs';
import {createWorkbook, exportWorkbook, importWorkbook, checkWorkbookArchive} from '../dist/workbook.mjs';
const opening=(changes={})=>({id:'opening-1',wall:'front',type:'rollup',width:72,height:96,offset:36,sill:0,cutPanels:true,...changes});
const run=j=>{const r=calculate(j);assert.deepEqual(r.errors,[]);return r;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('100 × 50 gable: independent panel counts, roof geometry and purlin positions',()=>{
  const r=run(defaultJob());assert.equal(r.stats.roofPanels,68);assert.equal(r.stats.wallPanels,102);
  close(r.slopeLength,Math.sqrt(300**2+25**2));assert.deepEqual(r.purlins,[[18,78,138,198,258],[18,78,138,198,258]]);
  assert.equal(r.panels.find(p=>p.area==='Roof').length,301.0625);
  assert.equal(r.panels.reduce((sum,p)=>sum+p.quantity,0),r.layout.length);
});
test('every supported roof uses its specified coverage; CFR is excluded',()=>{
  for(const [key,count] of Object.entries({r:68,ss360:100,loc:150,locSwaged:150})){const j=defaultJob();j.roofPanel=key;assert.equal(run(j).stats.roofPanels,count);}assert.equal(ROOFS.cfr,undefined);
});
test('all material checkboxes default on, inapplicable standing seam items are omitted',()=>{
  const j=defaultJob();assert.ok(Object.values(j.include).every(Boolean));assert.ok(!run(j).hardware.some(h=>h.id==='panel-clips'));
  for(const k of Object.keys(j.include))j.include[k]=false;assert.equal(run(j).hardware.length,0);
});
test('Cut Panels overrides width and type; only contained panel bays are shortened',()=>{
  const j=defaultJob();j.openings=[opening({type:'overhead',width:60})];let r=run(j);
  assert.equal(r.layout.find(p=>p.face==='Front side wall'&&p.bay===2).length,96);
  assert.equal(r.layout.find(p=>p.face==='Front side wall'&&p.bay===3).length,192);
  j.openings[0].cutPanels=false;r=run(j);assert.equal(r.layout.find(p=>p.face==='Front side wall'&&p.bay===2).length,192);
  assert.deepEqual(DEFAULT_CUT,{walk:false,double:false,window:false,overhead:false,rollup:true,framed:true});
});
test('cut windows produce material above and below; unchecked windows retain full panels',()=>{
  const j=defaultJob();j.openings=[opening({type:'window',width:72,height:36,sill:48})];
  const r=run(j);assert.deepEqual(r.layout.filter(p=>p.face==='Front side wall'&&p.bay===2).map(p=>p.length),[48,108]);
  j.openings[0].cutPanels=false;assert.deepEqual(run(j).layout.filter(p=>p.face==='Front side wall'&&p.bay===2).map(p=>p.length),[192]);
});
test('side walls run along length, end walls along width; single-slope heights reverse outside viewpoint',()=>{
  const j=defaultJob();j.shape='single';j.width=360;j.slope=2;
  close(topHeight(j,'front',0),192);close(topHeight(j,'back',0),252);
  close(topHeight(j,'left',0),192);close(topHeight(j,'left',360),252);
  close(topHeight(j,'right',0),252);close(topHeight(j,'right',360),192);
  const r=run(j);assert.equal(r.stats.roofPanels,34);assert.equal(r.layout.filter(p=>p.face==='Front side wall').length,34);assert.equal(r.layout.filter(p=>p.face==='Left end wall').length,10);
  j.openings=[opening({wall:'left',offset:350,width:72})];assert.ok(validate(j).some(x=>x.includes('past its wall')));
});
test('gable bay spanning peak includes the highest point rather than just endpoints',()=>{
  const j=defaultJob();j.width=600;const r=run(j);
  assert.equal(r.layout.find(p=>p.face==='Left end wall'&&p.from===288).length,217);
});
test('explicit purlin counts change clip quantities by roof side, excluding eave',()=>{
  const j=defaultJob();j.roofPanel='ss360';j.purlinMode='count';j.purlinCounts=[4,6];
  const r=run(j);assert.deepEqual(r.stats.purlinRows,[4,6]);assert.equal(r.hardware.find(h=>h.id==='panel-clips').quantity,490);
});
test('roof split lengths obey max and reconstruct slope including overlaps',()=>{
  const j=defaultJob();j.width=1200;j.roofPanel='ss360';const r=run(j);
  const parts=r.layout.filter(p=>p.face==='Front roof'&&p.bay===1);assert.equal(parts.length,2);
  close(parts.reduce((s,p)=>s+(p.end-p.start),0)-j.rules.roofLap,r.slopeLength);
  assert.ok(parts.every(p=>p.length<=480));const end=parts[0].end;
  assert.ok(r.purlins[0].some(d=>Math.abs(r.slopeLength-d+j.rules.endLapOffset-end)<1e-6));
});
test('wall split overlap is included and trim rounds per separate run',()=>{
  const parts=splitPanel(700,480,6);close(parts.reduce((s,p)=>s+p.length,0)-6,700);assert.ok(parts.every(p=>p.length<=480));
  assert.equal(stockPieces(121,121,2),1);assert.equal(stockPieces(240,121,2),2);assert.equal(stockPieces(241,121,2),3);
});
test('invalid and overlapping openings, malformed imports and impossible lap settings are rejected',()=>{
  const j=defaultJob();j.openings=[opening(),opening({id:'opening-2',offset:40})];assert.ok(validate(j).some(s=>s.includes('overlaps')));
  j.openings=[opening({height:300})];assert.ok(validate(j).some(s=>s.includes('roof line')));
  j.openings=[];j.rules.roofLap=480;assert.ok(validate(j).some(s=>s.includes('lap')));
  j.rules.roofLap=6;j.width=NaN;assert.ok(calculate(j).errors.length);
  assert.throws(()=>checkWorkbookArchive(new Uint8Array([1,2,3])),/valid XLSX/);
});
test('wall screw allowance is applied to panel LF with deliberate whole-count rounding',()=>{
  const j=defaultJob();j.rules.screwWaste=0;const r=run(j);
  assert.equal(r.hardware.find(h=>h.id==='wall-screws-12').quantity,Math.ceil(r.stats.wallLF*1.8*.6-1e-9));
});
test('manual quantity overrides survive recalculation and can be reset',()=>{
  const j=defaultJob();j.overrides['wall-screws-12']=99;j.length=1300;let r=run(j);assert.equal(r.hardware.find(h=>h.id==='wall-screws-12').quantity,99);
  delete j.overrides['wall-screws-12'];r=run(j);assert.notEqual(r.hardware.find(h=>h.id==='wall-screws-12').quantity,99);
});
test('Excel round trip restores dimensions, every opening flag, purlin overrides and material selections',async()=>{
  const j=defaultJob();j.name='Example 60 × 100';j.roofPanel='locSwaged';j.purlinMode='count';j.purlinCounts=[4,6];j.include.gutter=false;j.overrides['wall-screws-14']=123;j.openings=[opening({offset:48,width:60}),opening({id:'window-2',wall:'right',type:'window',width:48,height:36,sill:48,offset:120,cutPanels:false})];
  const bytes=await exportWorkbook(ExcelJS,j);const loaded=await importWorkbook(ExcelJS,bytes);assert.deepEqual(loaded,j);assert.deepEqual(run(loaded).stats,run(j).stats);
  const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);assert.equal(book.getWorksheet('Job Data').state,'veryHidden');assert.equal(book.getWorksheet('Openings').getCell('G2').value,'Yes');assert.equal(book.getWorksheet('Openings').getCell('G3').value,'No');
  const cut=book.getWorksheet('Panel Cut List');let count=0;cut.eachRow((row,i)=>{if(i>1)count+=row.getCell(6).value;});assert.equal(count,run(j).layout.length);
  book.getWorksheet('Panel Cut List').getCell('F2').value=9999;assert.deepEqual(await importWorkbook(ExcelJS,await book.xlsx.writeBuffer()),j);
});
test('Excel rejects arbitrary workbooks and invalid saved job state without evaluating formulas',async()=>{
  const arbitrary=new ExcelJS.Workbook();arbitrary.addWorksheet('Sheet1');await assert.rejects(importWorkbook(ExcelJS,await arbitrary.xlsx.writeBuffer()),/not exported/);
  const book=createWorkbook(ExcelJS,defaultJob());const job=defaultJob();job.length=-1;book.getWorksheet('Job Data').getCell('A3').value=JSON.stringify(job);
  await assert.rejects(importWorkbook(ExcelJS,await book.xlsx.writeBuffer()),/length/);
});
test('panel length edits update grouped pieces, footage and Excel, with reset and legacy support',async()=>{
  const j=defaultJob(),base=run(j),row=base.panels.find(p=>p.area==='Wall');
  j.panelLengths[row.lengthKey]=row.length+12;
  const edited=run(j),changed=edited.panels.find(p=>p.lengthKey===row.lengthKey);
  assert.equal(changed.quantity,row.quantity);assert.equal(changed.length,row.length+12);
  close(edited.stats.wallLF,base.stats.wallLF+row.quantity);
  assert.ok(edited.layout.filter(p=>p.lengthKey===row.lengthKey).every(p=>p.length===row.length+12&&p.calculatedLength===row.length));
  const loaded=await importWorkbook(ExcelJS,await exportWorkbook(ExcelJS,j));assert.deepEqual(loaded,j);assert.deepEqual(run(loaded).panels,edited.panels);
  delete j.panelLengths[row.lengthKey];assert.deepEqual(run(j).panels,base.panels);
  delete j.panelLengths;assert.deepEqual(run(j).panels,base.panels);
  j.panelLengths={[row.lengthKey]:-1};assert.ok(validate(j).length);
});
test('asymmetric unequal eaves produce independent slopes, roof lengths, mirrored peak panels and drainage',async()=>{
  const j=defaultJob();j.asymmetric=true;j.ridgeFromBack=204;j.backHeight=204;j.slope=2;
  const r=run(j);close(r.rise,66);close(r.geometry.slopes[1],54*12/204);
  close(r.slopeLengths[0],Math.hypot(396,66));close(r.slopeLengths[1],Math.hypot(204,54));
  close(topHeight(j,'left',396),258);close(topHeight(j,'right',204),258);close(topHeight(j,'back',0),204);
  assert.ok(r.layout.some(p=>p.face==='Left end wall'&&p.from<=396&&p.to>=396&&p.length===258));
  assert.ok(r.layout.some(p=>p.face==='Right end wall'&&p.from<=204&&p.to>=204&&p.length===258));
  close(r.stats.wallArea,(1200*(192+204)+396*(192+258)+204*(204+258))/144);
  assert.deepEqual(r.stats.purlinRows,[7,4]);
  const loaded=await importWorkbook(ExcelJS,await exportWorkbook(ExcelJS,j));assert.deepEqual(loaded,j);assert.deepEqual(run(loaded).geometry,r.geometry);
  const summary=createWorkbook(ExcelJS,j).getWorksheet('Summary');let fields=[];summary.eachRow(row=>fields.push(row.getCell(1).value));assert.ok(fields.includes('Back roof slope (calculated)'));assert.ok(!fields.includes('High eave height (calculated)'));
  j.ridgeFromBack=0;assert.ok(validate(j).length);j.ridgeFromBack=204;j.backHeight=270;assert.ok(validate(j).some(e=>e.includes('Ridge must')));
});
test('single slope derives high eave; legacy symmetric jobs remain supported',()=>{
  const j=defaultJob();j.shape='single';j.slope=2;const r=run(j);assert.equal(r.geometry.highEaveHeight,292);
  const summary=createWorkbook(ExcelJS,j).getWorksheet('Summary');let fields=[];summary.eachRow(row=>fields.push(row.getCell(1).value));assert.ok(fields.includes('High eave height (calculated)'));
  j.shape='gable';delete j.asymmetric;delete j.backHeight;delete j.ridgeFromBack;assert.equal(run(j).geometry.highEaveHeight,null);
});
