import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {defaultJob,editRoofDimension,roofGeometry} from '../dist/engine.mjs';
import {exportWorkbook,importWorkbook} from '../dist/workbook.mjs';
const base=()=>({...defaultJob(),asymmetric:true,slope:2,backHeight:204,ridgeFromBack:204});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('slope and width edits preserve eaves and the other slope while moving ridge',()=>{
 for(const [key,value] of [['slope',3],['backSlope',2],['width',660]]){
  const j=base(),old=roofGeometry(j),n=editRoofDimension(j,key,value),geo=roofGeometry(n);
  assert.equal(n.height,j.height);assert.equal(n.backHeight,j.backHeight);
  close(geo.slopes[0],key==='slope'?value:old.slopes[0]);close(geo.slopes[1],key==='backSlope'?value:old.slopes[1]);
  assert.notEqual(n.ridgeFromBack,j.ridgeFromBack);assert.equal(j.ridgeFromBack,204);
  close(n.height+geo.ridgeFromFront*geo.slopes[0]/12,n.backHeight+n.ridgeFromBack*geo.slopes[1]/12);
 }
});
test('eave and ridge edits preserve front slope and update back slope',()=>{
 for(const [key,value] of [['height',180],['backHeight',216],['ridgeFromBack',240]]){
  const j=base(),n=editRoofDimension(j,key,value);assert.equal(n[key],value);assert.equal(n.slope,j.slope);
  assert.equal(n.height,key==='height'?value:j.height);assert.equal(n.backHeight,key==='backHeight'?value:j.backHeight);
  assert.equal(n.ridgeFromBack,key==='ridgeFromBack'?value:j.ridgeFromBack);
  assert.notEqual(roofGeometry(n).slopes[1],roofGeometry(j).slopes[1]);
 }
});
test('impossible edits leave original inputs intact; linked geometry survives Excel',async()=>{
 const j=base(),copy=structuredClone(j);
 for(const [key,value] of [['slope',.125],['backSlope',0],['ridgeFromBack',600],['backHeight',300],['height',220]])assert.throws(()=>editRoofDimension(j,key,value));
 assert.deepEqual(j,copy);
 const n=editRoofDimension(j,'backSlope',2),loaded=await importWorkbook(ExcelJS,await exportWorkbook(ExcelJS,n));assert.deepEqual(loaded,n);assert.deepEqual(roofGeometry(loaded),roofGeometry(n));
});
