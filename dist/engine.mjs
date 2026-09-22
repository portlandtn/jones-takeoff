export const VERSION = 1;
export const SOURCES = {
  roof:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=128',
  wall:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=129',
  foam:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=130&brandid=8',
  closures:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=136',
  clips:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=134&brandId=8&page=2',
  vertical:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=141&brandid=8',
  eave:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=133',
  backup:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=137',
  trim:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=160',
  roofTrim:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=146&brandid=8',
  downspout:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=162&brandid=8',
  mastic:'https://www.nucorsteelstore.com/Subcategory.aspx?CategoryID=173&brandid=8',
  manual:'https://s3.amazonaws.com/ix2-kirby-upload-prod/upload/resources/online-manuals/ss360erectionmnl.pdf',
  screws:'Editable estimating allowance: 1.8 wall screws per panel LF; 60% #12 / 40% #14. Confirm project requirements.'
};
export const ROOFS = {
  loc:{name:'Loc Seam · not swaged',width:16,gauge:24,part:'LSN24-',source:SOURCES.roof},
  locSwaged:{name:'Loc Seam · swaged',width:16,gauge:24,part:'LSS24-',source:SOURCES.roof},
  r:{name:'R-panel roof',width:36,gauge:26,part:'RPR26-1',source:SOURCES.roof},
  ss360:{name:'Standing Seam 360',width:24,gauge:24,part:'SS324-',source:SOURCES.roof}
};
export const WALLS = {
  a:{name:'A-panel wall',width:36,gauge:26,part:'APW26-',closure:'A',source:SOURCES.wall},
  r:{name:'R-panel wall',width:36,gauge:26,part:'RPW26-',closure:'R',source:SOURCES.wall},
  reverse:{name:'Reverse R-panel wall',width:36,gauge:26,part:'RRW26-',closure:'V',source:SOURCES.wall}
};
export const WALL_NAMES={front:'Front side wall',back:'Back side wall',left:'Left end wall',right:'Right end wall'};
export const OPENING_TYPES={walk:'Walk door',double:'Double walk door',window:'Window',overhead:'Overhead door',rollup:'Roll-up door',framed:'General / rough opening'};
export const DEFAULT_CUT={walk:false,double:false,window:false,overhead:false,rollup:true,framed:true};
export const ACCESSORIES = [
  ['inside','Inside closures'],['outside','Outside closures'],['header','Header trim'],['jamb','Jamb trim'],['jambFlashing','Jamb flashing'],['base','Base trim'],['corner','Corner trim'],['gutter','Gutter'],['downspouts','Downspouts & fittings'],['rake','Rake trim'],['ridge','Ridge / high-eave trim'],['eaveTrim','Eave trim'],['mastic','Mastic'],['caulk','Caulk'],['screws','Screws'],['clips','Panel clips'],['eavePlate','Eave plates'],['backup','Backup plates'],['thermal','Thermal blocks'],['foamSpacer','Foam spacers']
];
export const DEFAULT_RULES = {
  maxPanel:480,roofAllowance:0,wallAllowance:0,doorAllowance:0,roofLap:6,wallLap:6,endLapOffset:12,
  trimStock:121,trimLap:2,headerExtra:4,downspoutSpacing:480,downspoutStock:120,downspoutClearance:6,
  gutterHangerSpacing:36,strapSpacing:120,wallScrewsPerLF:1.8,wallScrew12Share:60,roofSupportScrews:4,
  roofStitchSpacing:24,clipScrews:2,roofEndScrews:10,screwWaste:5,masticWaste:5,clipOffset:'short'
};
export function defaultJob(){return {version:VERSION,name:'Untitled building',length:1200,width:600,height:192,slope:1,shape:'gable',asymmetric:false,backHeight:192,ridgeFromBack:300,roofPanel:'r',wallPanel:'r',roofColor:'#365973',wallColor:'#bfced8',purlinMode:'spacing',purlinOffset:18,purlinSpacing:60,purlinCounts:[5,5],openings:[],include:Object.fromEntries(ACCESSORIES.map(([k])=>[k,true])),rules:{...DEFAULT_RULES},overrides:{},panelLengths:{},showPurlins:false};}
const finite = (x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const ceil = n=>Math.ceil(n-1e-9);
export function formatLength(inches){const n=Math.round(inches*16),ft=Math.floor(n/192),rem=n-ft*192,whole=Math.floor(rem/16),frac=rem%16;let f='';if(frac){let a=frac,b=16;while(a%2===0){a/=2;b/=2;}f=` ${a}/${b}`;}return `${ft}′ ${whole}${f}″`;}
export function roofGeometry(job){
  const g=job.shape==='gable',backRun=g?(job.asymmetric?job.ridgeFromBack:job.width/2):0;
  const ridgeFromFront=g?job.width-backRun:job.width;
  const rise=ridgeFromFront*job.slope/12;
  const runs=g?[ridgeFromFront,backRun]:[job.width];
  const backHeight=g?(job.asymmetric?job.backHeight:job.height):job.height+rise;
  const rises=g?[rise,job.height+rise-backHeight]:[rise];
  return {ridgeFromFront,rise,backHeight,slopes:runs.map((run,i)=>rises[i]*12/run),slopeLengths:runs.map((run,i)=>Math.hypot(run,rises[i])),highEaveHeight:g?null:backHeight};
}
// Edits are transactional: callers keep the original job when a constraint fails.
export function editRoofDimension(job,key,value){
  if(!['width','height','backHeight','slope','backSlope','ridgeFromBack'].includes(key)||!Number.isFinite(value))throw new Error('Enter a valid roof dimension.');
  const next={...job};
  if(job.shape!=='gable'||!job.asymmetric){next[key]=value;return next;}
  const previousBackSlope=roofGeometry(job).slopes[1];
  if(key!=='backSlope')next[key]=value;
  if(['slope','backSlope','width'].includes(key)){
    const backSlope=key==='backSlope'?value:previousBackSlope;
    if(backSlope<=0||next.slope<=0)throw new Error('Both roof slopes must be positive.');
    next.ridgeFromBack=(next.slope*next.width-12*(next.backHeight-next.height))/(next.slope+backSlope);
  }
  if(next.backHeight<next.height)throw new Error('High eave must be at least the low eave height. Low eave was not changed.');
  const errors=calculate(next).errors;
  if(errors.length)throw new Error(errors.join(' '));
  return next;
}
export function topHeight(job,wall,x){const geo=roofGeometry(job);if(wall==='front')return job.height;if(wall==='back')return geo.backHeight;const u=wall==='right'?job.width-x:x;return job.shape==='single'||u<=geo.ridgeFromFront?job.height+u*job.slope/12:geo.backHeight+(job.width-u)*geo.slopes[1]/12;}

export function wallLength(job,wall){return ['left','right'].includes(wall)?job.width:job.length;}
export function openingCuts(o){return o.cutPanels===true;}
export function validate(job){
  const errors=[];
  if(!job||Array.isArray(job)||typeof job!=='object')return ['Job must contain building inputs.'];
  if(job.version!==VERSION)errors.push('This job file version is not supported.');
  if(typeof job.name!=='string'||job.name.length>120)errors.push('Job name must be 120 characters or fewer.');
  for(const k of ['length','width','height'])if(!finite(job[k],12,k==='height'?1440:12000))errors.push(`${k}: enter 1–${k==='height'?120:1000} feet.`);
  if(!finite(job.slope,.125,12))errors.push('Roof slope must be between 0.125 and 12 per 12.');
  if(!['gable','single'].includes(job.shape))errors.push('Select a roof shape.');
  if(job.asymmetric!==undefined&&typeof job.asymmetric!=='boolean')errors.push('Choose whether the gable is asymmetric.');
  if(job.shape==='gable'&&job.asymmetric&&(!finite(job.ridgeFromBack,1,job.width-1)))errors.push('Back sidewall to ridge must be inside the building width.');
  if(job.shape==='gable'&&job.asymmetric){if(!finite(job.backHeight,12,1440))errors.push('Back eave height must be 1–120 feet.');else if(roofGeometry(job).slopes[1]<=0)errors.push('Ridge must be above the back eave. Increase front slope or lower back eave height.');}
  if(!Object.hasOwn(ROOFS,job.roofPanel)||!Object.hasOwn(WALLS,job.wallPanel))errors.push('Select a supported roof and wall panel.');
  if(!['spacing','count'].includes(job.purlinMode))errors.push('Select a purlin spacing or row count.');
  if(!finite(job.purlinOffset,1,600)||!finite(job.purlinSpacing,1,600))errors.push('Purlin offset and spacing must be between 1 and 600 inches.');
  if(!Array.isArray(job.purlinCounts)||job.purlinCounts.length!==2||job.purlinCounts.some(n=>!Number.isInteger(n)||n<1||n>200))errors.push('Each purlin row count must be a whole number from 1–200.');
  for(const k of ['roofColor','wallColor'])if(typeof job[k]!=='string'||!/^#[0-9a-f]{6}$/i.test(job[k]))errors.push('Select valid panel colors.');
  if(!job.rules||Array.isArray(job.rules)||typeof job.rules!=='object')return [...errors,'Takeoff settings are missing.'];
  for(const [k,v] of Object.entries(DEFAULT_RULES)){
    if(k==='clipOffset'){if(!['short','tall','super'].includes(job.rules[k]))errors.push('Select a clip height.');continue;}
    const min=['roofAllowance','wallAllowance','doorAllowance'].includes(k)?-48:0;
    if(!finite(job.rules[k],min,12000))errors.push(`Invalid takeoff setting: ${k}.`);
  }
  for(const k of ['maxPanel','trimStock','downspoutStock','downspoutSpacing','gutterHangerSpacing','strapSpacing','roofStitchSpacing'])if(job.rules[k]<=0)errors.push(`${k} must be greater than zero.`);
  if(job.rules.maxPanel<12)errors.push('Maximum panel length must be at least 1 foot.');
  if(job.rules.roofLap>=job.rules.maxPanel||job.rules.wallLap>=job.rules.maxPanel)errors.push('Panel lap must be shorter than the maximum panel length.');
  if(job.rules.trimLap>=job.rules.trimStock)errors.push('Trim lap must be shorter than trim stock.');
  for(const k of ['wallScrew12Share','screwWaste','masticWaste'])if(job.rules[k]>100)errors.push(`${k} must be between 0 and 100.`);
  if(!job.include||typeof job.include!=='object'||Array.isArray(job.include)||ACCESSORIES.some(([k])=>typeof job.include[k]!=='boolean'))errors.push('Material selections are missing.');
  if(!job.overrides||Array.isArray(job.overrides)||typeof job.overrides!=='object'||Object.keys(job.overrides).length>150||Object.entries(job.overrides).some(([k,v])=>!/^[-a-z0-9]+$/.test(k)||!Number.isInteger(v)||v<0||v>1000000))errors.push('Quantity overrides must be whole numbers between 0 and 1,000,000.');
  if(job.panelLengths!==undefined&&(!job.panelLengths||Array.isArray(job.panelLengths)||typeof job.panelLengths!=='object'||Object.keys(job.panelLengths).length>20000||Object.entries(job.panelLengths).some(([k,v])=>k.length>180||!Number.isFinite(v)||v<=0||v>12000)))errors.push('Panel length overrides must be positive lengths up to 1,000 feet.');
  if(!Array.isArray(job.openings)||job.openings.length>100)return [...errors,'A job can contain up to 100 openings.'];
  const ids=new Set();
  for(const [i,o] of job.openings.entries()){
    const name=`Opening ${i+1}`;
    if(!o||!Object.hasOwn(OPENING_TYPES,o.type)||!Object.hasOwn(WALL_NAMES,o.wall)||typeof o.id!=='string'||!/^[-\w]{1,80}$/.test(o.id)||ids.has(o.id)){errors.push(`${name}: invalid type, wall, or identifier.`);continue;}ids.add(o.id);
    if(!finite(o.width,1,12000)||!finite(o.height,1,1440)||!finite(o.offset,0,12000)||!finite(o.sill,0,1440)){errors.push(`${name}: enter valid dimensions and position.`);continue;}
    if(o.offset+o.width>wallLength(job,o.wall)+1e-6)errors.push(`${name} extends past its wall.`);
    if(o.sill+o.height>Math.min(topHeight(job,o.wall,o.offset),topHeight(job,o.wall,o.offset+o.width))+1e-6)errors.push(`${name} extends above the roof line.`);
    if(['walk','double','overhead','rollup'].includes(o.type)&&o.sill!==0)errors.push(`${name}: door sill must be at slab level.`);
    if(typeof o.cutPanels!=='boolean')errors.push(`${name}: choose whether to cut panels.`);
    for(let j=0;j<i;j++){const b=job.openings[j];if(b&&b.wall===o.wall&&o.offset<b.offset+b.width-1e-6&&o.offset+o.width>b.offset+1e-6&&o.sill<b.sill+b.height-1e-6&&o.sill+o.height>b.sill+1e-6)errors.push(`${name} overlaps another opening.`);}
  }
  return [...new Set(errors)];
}
export function purlinRows(job,side,slopeLength){
  const first=job.purlinOffset;if(first>=slopeLength)return [];
  if(job.purlinMode==='count'){
    const n=job.purlinCounts[side];if(n===1)return [first];
    // Count mode has no known layout: distribute below first row, excluding the eave.
    const last=Math.max(first,(slopeLength+first)/2, slopeLength-Math.min(12,(slopeLength-first)/2));
    return Array.from({length:n},(_,i)=>first+(last-first)*i/(n-1));
  }
  const n=ceil((slopeLength-first)/job.purlinSpacing);
  if(n>200)throw new Error('Purlin spacing produces more than 200 rows per slope. Increase spacing.');
  return Array.from({length:n},(_,i)=>first+i*job.purlinSpacing).filter(x=>x<slopeLength-1e-6);
}
export function splitPanel(total,max,lap,boundaries=null){
  if(total<=0)throw new Error('Panel allowances produce a zero or negative length.');
  const output=[];let start=0;
  while(total-start>max+1e-7){
    let end;
    if(boundaries){const candidates=boundaries.filter(b=>b>start+lap+.0625&&b<=start+max+1e-7&&b<total-1e-7);end=Math.max(...candidates);if(!Number.isFinite(end))throw new Error('A roof run cannot be split within the maximum panel length at the configured purlins. Adjust purlin layout, maximum length, or endlap offset.');}
    else {const n=ceil((total-start-lap)/(max-lap));end=start+(total-start+(n-1)*lap)/n;}
    output.push({start,end,length:end-start});start=end-lap;if(output.length>200)throw new Error('Too many panel sections. Check maximum length and lap.');
  }
  output.push({start,end:total,length:total-start});return output;
}
export function stockPieces(run,stock,lap=0){return run<=0?0:run<=stock?1:1+ceil((run-stock)/(stock-lap));}

export function calculate(job){
  const errors=validate(job);if(errors.length)return {errors,warnings:[],panels:[],layout:[],hardware:[]};
  const rp=ROOFS[job.roofPanel],wp=WALLS[job.wallPanel],r=job.rules;
  const sides=job.shape==='gable'?2:1,geometry=roofGeometry(job),{rise,slopeLengths}=geometry,slopeLength=slopeLengths[0];
  const layout=[],panels=[],hardware=[],warnings=[],purlins=[];let panelNumber=0;
  const roundLength=n=>ceil(n*16)/16;
  function addPanel(area,face,bay,from,to,segment,type,part,coverage,gauge,note,source){layout.push({id:`P${String(++panelNumber).padStart(4,'0')}`,area,face,bay,from,to,length:roundLength(segment.length),start:segment.start,end:segment.end,type,part,coverage,gauge,note,source});}
  try{
    for(let side=0;side<sides;side++){
      const slopeLength=slopeLengths[side];
      const rows=purlinRows(job,side,slopeLength);purlins.push(rows);
      if(!rows.length)warnings.push('No purlin row fits below the first-row offset. Check the purlin inputs.');
      const boundaries=rows.map(d=>slopeLength-d+r.endLapOffset).filter(d=>d>0&&d<slopeLength+r.roofAllowance);
      const sections=splitPanel(slopeLength+r.roofAllowance,r.maxPanel,r.roofLap,boundaries);
      if(sections.length>1){warnings.push('Roof panels have endlaps. Split locations follow purlin rows plus the configured endlap offset; verify lap, support location, and swage selection before ordering.');if(job.purlinMode==='count')warnings.push('Purlin count mode distributes rows for visualization and panel splitting. Confirm actual row positions before ordering split panels.');}
      for(let bay=0;bay<ceil(job.length/rp.width);bay++)for(const [si,segment]of sections.entries()){
        const from=bay*rp.width,to=Math.min((bay+1)*rp.width,job.length);
        addPanel('Roof',sides===1?'Single roof':side===0?'Front roof':'Back roof',bay+1,from,to,segment,rp.name,rp.part,rp.width,rp.gauge,[sections.length>1?`Section ${si+1}/${sections.length}`:'Eave to ridge/high side',to-from<rp.width?'Last panel: field trim width':''].filter(Boolean).join('; '),rp.source);
      }
    }
    for(const wall of Object.keys(WALL_NAMES)){
      const span=wallLength(job,wall),openings=job.openings.filter(o=>o.wall===wall&&openingCuts(o));
      for(let bay=0;bay<ceil(span/wp.width);bay++){
        const from=bay*wp.width,to=Math.min((bay+1)*wp.width,span);
        let top=Math.max(topHeight(job,wall,from),topHeight(job,wall,to));
        const ridgePosition=wall==='right'?job.width-geometry.ridgeFromFront:geometry.ridgeFromFront;
        if(['left','right'].includes(wall)&&job.shape==='gable'&&from<=ridgePosition&&to>=ridgePosition)top=job.height+rise;
        const full=top+r.wallAllowance;
        const holes=openings.filter(o=>o.offset<=from+1e-6&&o.offset+o.width>=to-1e-6).sort((a,b)=>a.sill-b.sill);
        const bands=[];let bottom=0;
        for(const hole of holes){if(hole.sill>bottom)bands.push({bottom,top:hole.sill,note:'Below framed opening'});bottom=Math.max(bottom,hole.sill+hole.height);}
        if(bottom<full)bands.push({bottom,top:full+(holes.length?r.doorAllowance:0),note:holes.length?'Above opening':'Full-height panel'});
        const partial=openings.some(o=>o.offset<to&&o.offset+o.width>from)&&holes.length===0;
        for(const band of bands){if(band.top<=band.bottom)throw new Error('Opening allowance produces a zero or negative panel length.');const parts=splitPanel(band.top-band.bottom,r.maxPanel,r.wallLap);if(parts.length>1)warnings.push('Wall panels exceed the maximum length. Equal sections include the configured lap; confirm girt support positions before ordering.');
          for(const [si,section]of parts.entries())addPanel('Wall',WALL_NAMES[wall],bay+1,from,to,{...section,start:section.start+band.bottom,end:section.end+band.bottom},wp.name,wp.part,wp.width,wp.gauge,[band.note,partial?'Opening edge: field cut remaining panel width':'', ['left','right'].includes(wall)?'Field cut top to slope':'',to-from<wp.width?'Last panel: field trim width':'',parts.length>1?`Section ${si+1}/${parts.length}`:''].filter(Boolean).join('; '),wp.source);
        }
      }
    }
  }catch(e){return {errors:[e.message],warnings,panels:[],layout:[],hardware:[]};}
  // Prevent exporting an unbounded workbook after adversarial import or extreme settings.
  if(layout.length>20000)return {errors:['This takeoff exceeds 20,000 panel pieces. Reduce the building dimensions or number of splits.'],warnings:[],panels:[],layout:[],hardware:[]};
  const groups=new Map();for(const item of layout){const key=[item.area,item.type,item.length,item.gauge,item.part].join('|');item.lengthKey=key;item.calculatedLength=item.length;item.overridden=Object.hasOwn(job.panelLengths||{},key);if(item.overridden){item.length=roundLength(job.panelLengths[key]);item.note+=`; Length overridden from ${formatLength(item.calculatedLength)}`;}if(!groups.has(key))groups.set(key,{...item,quantity:0,faces:new Set()});const group=groups.get(key);group.quantity++;group.faces.add(item.face);}
  for(const item of groups.values())panels.push({...item,faces:[...item.faces].join(', '),totalLF:item.quantity*item.length/12});
  if(layout.some(p=>p.overridden))warnings.push('Panel length edits apply to all pieces of the matching calculated size and profile. Building geometry and support positions stay as entered; verify fit and laps. Edits remain saved for matching sizes until reset.');
  if(layout.some(p=>p.length>r.maxPanel))warnings.push('An edited panel length exceeds the configured maximum panel length.');
  panels.sort((a,b)=>a.area.localeCompare(b.area)||a.type.localeCompare(b.type)||b.length-a.length);
  const roofPieces=layout.filter(p=>p.area==='Roof'),wallPieces=layout.filter(p=>p.area==='Wall');
  const roofBays=ceil(job.length/rp.width),eaveRun=job.length*sides,rakeRun=slopeLengths.reduce((a,b)=>a+b,0)*2;
  const roofLaps=roofPieces.length-roofBays*sides;
  const clipCount=purlins.reduce((a,rows)=>a+rows.length*Math.max(0,roofBays-1),0);
  const wallLF=wallPieces.reduce((sum,p)=>sum+p.length/12,0);
  const screwFactor=1+r.screwWaste/100, masticFactor=1+r.masticWaste/100;
  const endArea=sides===2?geometry.ridgeFromFront*(2*job.height+rise)/2+(job.width-geometry.ridgeFromFront)*(job.height+rise+geometry.backHeight)/2:job.width*(job.height+geometry.backHeight)/2;
  const wallArea=job.length*(job.height+geometry.backHeight)+2*endArea;
  const openArea=job.openings.reduce((sum,o)=>sum+o.width*o.height,0);
  function add(id,option,name,part,quantity,unit,length,basis,source,provisional=false){
    if(!job.include[option]||quantity<=0)return;
    const calculated=ceil(quantity),overridden=Object.hasOwn(job.overrides,id);
    hardware.push({id,name,part,quantity:overridden?job.overrides[id]:calculated,calculated,unit,length,basis,source,provisional,overridden});
  }
  function trim(id,option,name,runs,part='Profile not specified',source=SOURCES.roofTrim){const count=runs.reduce((sum,x)=>sum+stockPieces(x,r.trimStock,r.trimLap),0);add(id,option,name,part,count,'pieces',r.trimStock,`${(runs.reduce((a,b)=>a+b,0)/12).toFixed(2)} LF; ${formatLength(r.trimLap)} lap; separate runs`,source,true);}
  const cutsAtBase=job.openings.filter(o=>o.sill===0);const baseSegments=[];
  for(const wall of Object.keys(WALL_NAMES)){let end=0;for(const o of cutsAtBase.filter(o=>o.wall===wall).sort((a,b)=>a.offset-b.offset)){if(o.offset>end)baseSegments.push(o.offset-end);end=o.offset+o.width;}if(end<wallLength(job,wall))baseSegments.push(wallLength(job,wall)-end);}
  const openings=job.openings;
  trim('header','header','Header trim',openings.map(o=>o.width+r.headerExtra),'HTA series',SOURCES.trim);
  trim('jamb','jamb','Jamb trim',openings.flatMap(o=>[o.height,o.height]),wp.closure==='V'?'Select Reverse R jamb':'JTA series',SOURCES.trim);
  trim('jamb-flashing','jambFlashing','Jamb flashing',openings.flatMap(o=>[o.height,o.height]),'Profile not specified',SOURCES.trim);
  trim('base','base','Base trim',baseSegments);
  trim('corner','corner','Outside corner trim',[job.height,job.height,geometry.backHeight,geometry.backHeight]);
  trim('rake','rake','Rake trim',slopeLengths.flatMap(n=>[n,n]));
  trim('ridge','ridge',sides===2?'Ridge trim':'High-eave trim',[job.length]);
  trim('eave-trim','eaveTrim','Low-eave trim',Array(sides).fill(job.length));
  trim('gutter','gutter','Gutter',Array(sides).fill(job.length));
  const gutterPieces=sides*stockPieces(job.length,r.trimStock,r.trimLap);
  add('gutter-hangers','gutter','Gutter hangers','Profile not specified',sides*(ceil(job.length/r.gutterHangerSpacing)+1),'each',null,`One at each end and no more than ${formatLength(r.gutterHangerSpacing)} apart`,SOURCES.downspout,true);
  add('gutter-endcaps','gutter','Gutter end caps','Select left/right pair',2*sides,'each',null,'Two ends per gutter run',SOURCES.downspout,true);
  const dsPerSide=Math.max(1,ceil(job.length/r.downspoutSpacing)),dsCount=dsPerSide*sides;
  const dsLengths=(sides===2?[job.height,geometry.backHeight]:[job.height]).map(h=>Math.max(1,h-r.downspoutClearance));
  add('downspouts','downspouts','Downspout stock','Size / profile not specified',dsPerSide*dsLengths.reduce((n,d)=>n+stockPieces(d,r.downspoutStock),0),'pieces',r.downspoutStock,`${dsCount} drops; ${dsLengths.map(formatLength).join(' / ')} vertical per side; offset pieces not included`,SOURCES.downspout,true);
  add('downspout-outlets','downspouts','Downspout outlets','Select size',dsCount,'each',null,'One outlet per drop',SOURCES.downspout,true);
  add('downspout-elbows','downspouts','Downspout elbows','Select size/angle',dsCount*3,'each',null,'Allowance: three elbows per drop; override for actual offset',SOURCES.downspout,true);
  add('downspout-straps','downspouts','Downspout straps','Select size',dsPerSide*dsLengths.reduce((n,d)=>n+Math.max(2,ceil(d/r.strapSpacing)+1),0),'each',null,`No more than ${formatLength(r.strapSpacing)} apart`,SOURCES.downspout,true);
  const wallInside=baseSegments.reduce((sum,n)=>sum+ceil(n/wp.width),0);
  const wallOutside=2*ceil(job.length/wp.width)+2*ceil(job.width/wp.width);
  add('wall-inside','inside','Wall inside foam closures',`CI${wp.closure}S0`,wallInside,'each',wp.width,'Base runs, rounded separately around doors',SOURCES.foam,true);
  add('wall-outside','outside','Wall outside foam closures',`CO${wp.closure}S0`,wallOutside,'each',wp.width,'Top of each wall; verify closure condition at sloped ends',SOURCES.foam,true);
  if(job.roofPanel==='r'){
    add('roof-inside','inside','Roof inside foam closures','CIRS0',roofBays*sides,'each',36,'One per panel at each low eave',SOURCES.foam,true);
    add('roof-outside','outside','Roof outside foam closures','CORS0',roofBays*sides,'each',36,'One per panel at ridge/high eave',SOURCES.foam,true);
  } else {
    const ss=job.roofPanel==='ss360',offset=r.clipOffset;
    add('roof-inside','inside','Roof inside closures',ss?'SSMC-I':'Select Loc Seam closure',roofBays*sides,'each',rp.width,'One per panel module at low eave; verify first/last boundary detail',ss?SOURCES.closures:SOURCES.vertical,true);
    add('roof-outside','outside','Roof outside closures',ss?'SSMOC':'Select Loc Seam closure',roofBays*sides,'each',rp.width,'One per panel at ridge/high eave',ss?SOURCES.closures:SOURCES.vertical,true);
    add('panel-clips','clips',`Roof panel clips · ${offset}`,ss?({short:'S3PC-1',tall:'S3PC-2T',super:'S3PC-5T'}[offset]):'Select Loc Seam clip',clipCount,'each',null,`${roofBays-1} interior seams × purlin rows per slope; edge clips separate`,ss?SOURCES.clips:SOURCES.vertical,true);
    add('rake-clips','clips',`Rake attachment clips · ${offset}`,'Select compatible rake clip',purlins.reduce((sum,rows)=>sum+2*rows.length,0),'each',null,'Two rake edges × purlin rows; confirm attachment system',SOURCES.clips,true);
    add('eave-plates','eavePlate',`Eave plates · ${offset}`,{short:'EPS108',tall:'EPT108',super:'EPX108'}[offset],sides*ceil(job.length/108),'pieces',108,'9 ft stock, butt joints; one run per low eave',SOURCES.eave);
    add('backup-plates','backup','Panel backup plates',ss?'SSLS-1':'Select Loc Seam backup',roofLaps+roofBays*sides,'each',null,'One per panel endlap plus one at each ridge/high end',ss?SOURCES.backup:SOURCES.vertical,true);
    add('thermal-blocks','thermal','Thermal blocks','Select thickness/length',purlins.reduce((sum,rows)=>sum+rows.length*roofBays,0),'each',null,'One allowance per panel × purlin; verify block length and insulation',SOURCES.vertical,true);
    add('foam-spacers','foamSpacer','Foam spacers','Select thickness/length',purlins.reduce((sum,rows)=>sum+rows.length*roofBays,0),'each',null,'One allowance per panel × purlin; verify need with thermal blocks',SOURCES.vertical,true);
  }
  const wallScrews=wallLF*r.wallScrewsPerLF;
  add('wall-screws-12','screws','Wall screws #12','Select length/finish',wallScrews*r.wallScrew12Share/100*screwFactor,'each',null,`${wallLF.toFixed(2)} panel LF × ${r.wallScrewsPerLF} × ${r.wallScrew12Share}% + ${r.screwWaste}% waste`,SOURCES.screws);
  add('wall-screws-14','screws','Wall screws #14','Select length/finish',wallScrews*(1-r.wallScrew12Share/100)*screwFactor,'each',null,`${wallLF.toFixed(2)} panel LF × ${r.wallScrewsPerLF} × ${100-r.wallScrew12Share}% + ${r.screwWaste}% waste`,SOURCES.screws);
  const supports=purlins.reduce((sum,rows)=>sum+(rows.length+1)*roofBays,0);
  if(job.roofPanel==='r'){
    add('roof-support-screws','screws','Roof attachment screws','Select R-panel fastener',supports*r.roofSupportScrews*screwFactor,'each',null,`${supports} panel/support intersections (including eave) × ${r.roofSupportScrews}; + ${r.screwWaste}% waste`,SOURCES.roof,true);
    add('roof-stitch-screws','screws','Roof sidelap stitch screws','Select stitch screw',Math.max(0,roofBays-1)*slopeLengths.reduce((sum,n)=>sum+ceil(n/r.roofStitchSpacing)+1,0)*screwFactor,'each',null,`Interior seams at ${formatLength(r.roofStitchSpacing)} maximum spacing`,SOURCES.roof,true);
  }else{
    add('clip-screws','screws','Panel clip attachment screws','Select clip fastener',clipCount*r.clipScrews*screwFactor,'each',null,`${clipCount} clips × ${r.clipScrews} screws + ${r.screwWaste}% waste`,SOURCES.manual,true);
  }
  add('roof-end-screws','screws','Roof end / endlap screws','Select end fastener',(roofBays*sides*2+roofLaps)*r.roofEndScrews*screwFactor,'each',null,`${r.roofEndScrews} per panel end/endlap; allowance includes both roof ends`,SOURCES.manual,true);
  const tape=(id,name,part,inches,roll,basis)=>add(id,'mastic',name,part,inches/roll*masticFactor,'rolls',roll,`${basis}; + ${r.masticWaste}% waste`,SOURCES.mastic,true);
  if(job.roofPanel==='r')tape('mastic-double','Double-bead tape mastic','H3000',eaveRun*2+roofLaps*rp.width,300,'Low eave + ridge/high eave + endlaps');
  else tape('mastic-triple','Triple-bead tape mastic','H3001',eaveRun*2+roofLaps*rp.width,360,'Low eave + outside closures + endlaps');
  const wallSeams=Object.keys(WALL_NAMES).reduce((sum,w)=>sum+Math.max(0,ceil(wallLength(job,w)/wp.width)-1)*Math.max(topHeight(job,w,0),topHeight(job,w,wallLength(job,w)),['left','right'].includes(w)&&sides===2?job.height+rise:0),0);
  tape('mastic-flat','Flat tape mastic','H3010',(job.roofPanel==='r'?Math.max(0,roofBays-1)*slopeLengths.reduce((a,b)=>a+b,0):0)+wallSeams+(job.include.gutter?eaveRun:0),600,'Wall sidelaps (full height allowance) + applicable roof sidelaps/gutters');
  tape('mastic-rake','Rake double-bead tape mastic','H3020',job.include.rake?rakeRun:0,240,'Selected rake trim runs');
  add('caulk','caulk','Trim sealant tubes','H3152',(openings.reduce((sum,o)=>sum+2*o.height+o.width+(o.type==='window'?o.width:0),0)+(job.include.gutter?Math.max(0,gutterPieces-sides)*24:0))/276*masticFactor,'tubes',null,'Opening perimeter + 24 in per gutter splice; 23 LF/tube at ¼ in bead',SOURCES.mastic,true);
  warnings.push('Trim stock/laps, roof-end allowances, drainage spacing and hardware application rates are editable estimating allowances. Review the marked rows before ordering.');
  if(job.include.thermal&&job.include.foamSpacer&&job.roofPanel!=='r')warnings.push('Both thermal blocks and foam spacers are included by default. Confirm the insulation assembly or uncheck the item not required.');
  if(!job.include.gutter&&job.include.downspouts)warnings.push('Downspouts are selected while gutter is off; quantities assume an existing low-eave gutter.');
  return {errors:[],warnings:[...new Set(warnings)],panels,layout,hardware,purlins,slopeLength,slopeLengths,geometry,rise,roofLaps,stats:{roofPanels:roofPieces.length,wallPanels:wallPieces.length,roofArea:job.length*slopeLengths.reduce((a,b)=>a+b,0)/144,wallArea:(wallArea-openArea)/144,panelLF:layout.reduce((s,p)=>s+p.length/12,0),wallLF,purlinRows:purlins.map(x=>x.length)},rulesVersion:'2026-09-10.1'};
}
