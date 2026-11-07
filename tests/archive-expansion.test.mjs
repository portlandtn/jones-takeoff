import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {verifyWorkbookExpansion,importWorkbook} from '../dist/workbook.mjs';
function zip(data,declared=data.length){
 const compressed=deflateRawSync(data),name=Buffer.from('synthetic.xml');
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(declared,22);local.writeUInt16LE(name.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(8,10);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(declared,24);central.writeUInt16LE(name.length,28);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(46+name.length,12);end.writeUInt32LE(30+name.length+compressed.length,16);
 return Buffer.concat([local,name,compressed,central,name,end]);
}
test('valid actual decompression and forged expansion metadata',async()=>{
 await verifyWorkbookExpansion(zip(Buffer.from('<synthetic/>')));
 await assert.rejects(()=>verifyWorkbookExpansion(zip(Buffer.alloc(1024*1024,65),1)),/expansion/);
 await assert.rejects(()=>verifyWorkbookExpansion(zip(Buffer.from('short'),100)),/size/);
});
test('rejects oversized, malformed and invalid archive before invoking Excel parser',async()=>{
 let parsed=false;const fake={Workbook:class{constructor(){parsed=true;}}};
 for(const input of [new Uint8Array(5*1024*1024+1),new Uint8Array([1,2,3]),zip(Buffer.alloc(4096,65),1)])
  await assert.rejects(()=>importWorkbook(fake,input));
 assert.equal(parsed,false);
});
