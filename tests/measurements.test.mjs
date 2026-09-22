import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMeasurement,measurementText} from '../dist/measurements.mjs';
test('unified measurements accept marks, whole inches and sixteenth fractions',()=>{
 for(const [input,want] of [[`20' 2"`,242],[`20′ 2 1/2″`,242.5],[`1/16"`,.0625],[`6"`,6],[`20'`,240],['20',240],[`-0' 1 1/2"`,-1.5]])assert.equal(parseMeasurement(input),want,input);
 for(const input of ['',`2' 12"`,`1/32"`,`1/0"`,`2/2"`,'abc','-'])assert.ok(Number.isNaN(parseMeasurement(input)),input);
 for(let n=-32;n<4000;n++)assert.equal(parseMeasurement(measurementText(n/16)),n/16);
});
