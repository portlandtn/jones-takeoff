import {formatLength} from './engine.mjs';
export function measurementText(n){return Number.isFinite(n)?(n<0?'-':'')+formatLength(Math.abs(n)):'';}
// Bare numbers are feet; inch-only values require an inch mark.
export function parseMeasurement(value){
  let s=String(value).trim().replace(/[′’‘]/g,"'").replace(/[″“”]/g,'"');
  const sign=s.startsWith('-')?-1:1;if(sign<0)s=s.slice(1).trim();
  if(/^\d+(?:\.\d+)?$/.test(s))return sign*Number(s)*12;
  const m=s.match(/^(?:(\d+(?:\.\d+)?)\s*'\s*)?(?:(\d+)?\s*(?:(\d+)\s*\/\s*(\d+))?\s*")?$/);
  if(!m||!m[1]&&!m[2]&&!m[3])return NaN;
  const whole=Number(m[2]||0),num=Number(m[3]||0),den=Number(m[4]||1);
  if(m[3]&&(![2,4,8,16].includes(den)||num>=den))return NaN;
  if(m[1]!==undefined&&whole>=12)return NaN;
  return sign*(Number(m[1]||0)*12+whole+num/den);
}
