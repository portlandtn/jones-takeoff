import { calculate, validate, VERSION, ROOFS, WALLS, WALL_NAMES, OPENING_TYPES, SOURCES, formatLength } from './engine.mjs';
const FORMAT='JONES_BUILDING_JOB';
export function createWorkbook(ExcelJS, job){
  const result=calculate(job);if(result.errors.length)throw new Error(result.errors.join(' '));
  const book=new ExcelJS.Workbook();book.creator='Jones Building Takeoff';book.created=new Date();book.modified=new Date();book.subject='Panel and hardware quantity estimate';book.title=job.name;
  const sheet=(name,columns,rows)=>{
    const s=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
    s.columns=columns.map(([header,key,width=20])=>({header,key,width}));s.addRows(rows);
    s.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,s.rowCount),column:columns.length}};
    s.getRow(1).height=30;s.getRow(1).eachCell(c=>{c.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF19364E'}};c.alignment={vertical:'middle',wrapText:true};});
    for(let i=2;i<=s.rowCount;i++){const row=s.getRow(i);let lines=1;row.eachCell((c,col)=>{lines=Math.max(lines,Math.ceil(String(c.value??'').length/(columns[col-1][2]||20)));c.font={name:'Calibri',size:11,color:{argb:'FF19364E'}};c.alignment={vertical:'middle',wrapText:true};if(i%2===0)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEFF4F8'}};if(typeof c.value==='number')c.numFmt='0.####';});row.height=Math.min(300,Math.max(28,lines*16+10));}
    return s;
  };
  sheet('Summary',[['Field','field',33],['Value','value',100]],Object.entries({Job:job.name,'Exported at':new Date().toISOString(),'Building length':formatLength(job.length),'Building width':formatLength(job.width),'Low eave height':formatLength(job.shape==='gable'&&job.asymmetric?Math.min(job.height,job.backHeight):job.height),'Roof shape':job.shape==='gable'?'Gable':'Single slope','Roof slope':`${job.slope}:12`,...(job.shape==='single'?{'High eave height (calculated)':formatLength(result.geometry.highEaveHeight)}:job.asymmetric?{'Asymmetric gable':'Yes','Front eave height':formatLength(job.height),'Back eave height':formatLength(job.backHeight),'Back sidewall to ridge':formatLength(job.ridgeFromBack),'Ridge height':formatLength(job.height+result.rise),'Front roof slope':`${job.slope}:12`,'Back roof slope (calculated)':`${result.geometry.slopes[1]}:12`}:{}),'Roof panel':ROOFS[job.roofPanel].name,'Wall panel':WALLS[job.wallPanel].name,'Roof pieces':result.stats.roofPanels,'Wall pieces':result.stats.wallPanels,'Roof area (SF)':result.stats.roofArea,'Net wall area (SF)':result.stats.wallArea,'Purlin rows per slope':result.stats.purlinRows.join(' / '),'Purlin mode':job.purlinMode,'Calculation version':result.rulesVersion,'Reopen instructions':'Drop this original XLSX into Jones Building Takeoff. Saved Job Data restores inputs and in-app overrides. Edits to output tables in Excel are not imported.','Quantity basis':'Panel lengths round UP to 1/16 inch. Final partial-width panels use full stock coverage. Offcuts are not reused.','Review notes':result.warnings.join(' ')}).map(([field,value])=>({field,value})));
  const cut=sheet('Panel Cut List',[['Area','area',12],['Panel','type',30],['Part prefix','part',17],['Gauge','gauge',10],['Coverage (in)','coverage',15],['Quantity','quantity',12],['Length','displayLength',18],['Length (in)','length',15],['Calculated length (in)','calculatedLength',22],['Length edited','overridden',15],['Length (ft)','lengthFt',15],['Total LF','totalLF',16],['Faces','faces',45],['Source','source',65]],result.panels.map(p=>({...p,displayLength:formatLength(p.length),lengthFt:p.length/12})));
  cut.getColumn('length').numFmt='0.0000';cut.getColumn('lengthFt').numFmt='0.0000';cut.getColumn('totalLF').numFmt='0.00';
  sheet('Panel Layout',[['ID','id',12],['Area','area',10],['Face','face',23],['Bay','bay',8],['Panel','type',28],['Quantity','quantity',10],['Length','displayLength',18],['Length (in)','length',15],['From left (in)','from',16],['To left (in)','to',16],['Section bottom (in)','start',20],['Section top (in)','end',20],['Field cuts / notes','note',75]],result.layout.map(p=>({...p,quantity:1,displayLength:formatLength(p.length)})));
  sheet('Trim and Hardware',[['Material','name',35],['Part / selection','part',29],['Quantity','quantity',12],['Calculated qty','calculated',16],['Unit','unit',12],['Stock length','displayLength',18],['Stock length (in)','length',19],['Rule status','status',28],['Quantity basis','basis',90],['Source','source',80]],result.hardware.map(p=>({...p,displayLength:p.length?formatLength(p.length):'',status:p.overridden?'User override':p.provisional?'Estimating allowance':'Source / user rule'})));
  sheet('Openings',[['Type','type',28],['Wall','wall',23],['Width','width',18],['Height','height',18],['From left corner','offset',22],['Sill above slab','sill',18],['Cut panels','cut',16]],job.openings.map(o=>({type:OPENING_TYPES[o.type],wall:WALL_NAMES[o.wall],width:formatLength(o.width),height:formatLength(o.height),offset:formatLength(o.offset),sill:formatLength(o.sill),cut:o.cutPanels?'Yes':'No'})));
  sheet('Settings',[['Setting','field',42],['Value','value',80]],Object.entries({...job.rules,purlinMode:job.purlinMode,purlinOffset:job.purlinOffset,purlinSpacing:job.purlinSpacing,purlinCounts:job.purlinCounts.join(' / '),'Units':'Lengths are inches unless the setting is a percentage or rate.',...Object.fromEntries(Object.entries(job.include).map(([k,v])=>[`Include ${k}`,v?'Yes':'No'])),...Object.fromEntries(Object.entries(job.overrides).map(([k,v])=>[`Quantity override ${k}`,v]))}).map(([field,value])=>({field,value})));
  sheet('Sources',[['Topic','topic',24],['Reference','reference',115]],Object.entries(SOURCES).map(([topic,reference])=>({topic,reference})));
  const data=book.addWorksheet('Job Data',{state:'veryHidden'});data.getCell('A1').value=FORMAT;data.getCell('A2').value=VERSION;
  const json=JSON.stringify(job);for(let i=0;i<json.length;i+=24000)data.getCell(`A${3+i/24000}`).value=json.slice(i,i+24000);
  return book;
}
export async function exportWorkbook(ExcelJS,job){return createWorkbook(ExcelJS,job).xlsx.writeBuffer();}
// Bound decompression before loading untrusted Excel files. Files remain in the browser.
export function checkWorkbookArchive(buffer){
  const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
  if(bytes.byteLength>5*1024*1024)throw new Error('Choose a Jones XLSX file smaller than 5 MB.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(view.getUint32(p,true)===0x06054b50){end=p;break;}
  if(end<0)throw new Error('This file is not a valid XLSX workbook.');
  const entries=view.getUint16(end+10,true);let pos=view.getUint32(end+16,true),expanded=0;
  if(entries>300||entries===65535)throw new Error('This workbook contains too many entries.');
  for(let i=0;i<entries;i++){
    if(pos+46>bytes.length||view.getUint32(pos,true)!==0x02014b50)throw new Error('The XLSX file is damaged.');
    if(view.getUint16(pos+8,true)&1)throw new Error('Password-protected workbooks are not supported.');
    expanded+=view.getUint32(pos+24,true);if(expanded>32*1024*1024)throw new Error('The expanded workbook is too large.');
    pos+=46+view.getUint16(pos+28,true)+view.getUint16(pos+30,true)+view.getUint16(pos+32,true);
  }
}
export async function importWorkbook(ExcelJS,buffer){
  checkWorkbookArchive(buffer);const book=new ExcelJS.Workbook();await book.xlsx.load(buffer);
  const data=book.getWorksheet('Job Data');if(!data||data.getCell('A1').value!==FORMAT)throw new Error('This workbook was not exported by Jones Building Takeoff.');
  if(data.getCell('A2').value!==VERSION)throw new Error('This job file version is not supported.');
  if(data.rowCount>60)throw new Error('Saved job data is too large.');
  let json='';for(let i=3;i<=data.rowCount;i++){const value=data.getCell(`A${i}`).value;if(typeof value!=='string')throw new Error('Saved job data is damaged.');json+=value;}
  if(json.length>1000000)throw new Error('Saved job data is too large.');
  let job;try{job=JSON.parse(json);}catch{throw new Error('Saved job data is damaged.');}
  const errors=validate(job);if(errors.length)throw new Error(errors.join(' '));const result=calculate(job);if(result.errors.length)throw new Error(result.errors.join(' '));return job;
}
