import {parseMeasurement,measurementText} from './measurements.mjs';
import { createViewer } from './viewer.mjs';
import { defaultJob,calculate,validate,roofGeometry,editRoofDimension,ROOFS,WALLS,WALL_NAMES,OPENING_TYPES,DEFAULT_CUT,ACCESSORIES,SOURCES,formatLength } from './engine.mjs';
import { exportWorkbook, importWorkbook } from './workbook.mjs';
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let job=defaultJob(),result,tab='panels',editing=null,messageTimer,rotating=!matchMedia('(prefers-reduced-motion: reduce)').matches;
const viewer=createViewer($('#viewer'));
const feetFields=(key,label,value,{negative=false}={})=>`<label class="measurement-field">${escape(label)}<input class="length-input" aria-label="${escape(label)}" data-measure="${escape(key)}" data-negative="${negative}" type="text" placeholder="20' 2 1/2&quot;" value="${escape(measurementText(value))}"></label>`;
const panelLengthFields=p=>`<div class="panel-length-editor"><input class="length-input" aria-label="${escape(p.type)} panel length" data-measure="${escape(p.lengthKey)}" type="text" value="${escape(measurementText(p.length))}"></div>`;

const options=(items,value)=>Object.entries(items).map(([k,v])=>`<option value="${escape(k)}" ${k===value?'selected':''}>${escape(typeof v==='string'?v:v.name)}</option>`).join('');
const number=(key,label,value,step=1)=>`<label>${escape(label)}<input data-number="${key}" type="number" value="${value}" step="${step}" min="0"></label>`;
function setPath(path,value){const parts=path.split('.');if(parts[0]==='rules')job.rules[parts[1]]=value;else if(parts[0]==='purlinCounts')job.purlinCounts[+parts[1]]=value;else job[path]=value;}
function notify(text){$('#message').textContent=text;$('#message').hidden=false;clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('#message').hidden=true,6500);}
function renderForms(){
  $('#job-name').value=job.name;$('#shape').value=job.shape;$('#slope').value=job.slope;$('#show-purlins').checked=job.showPurlins;
  $('#dimension-fields').innerHTML=feetFields('width','Width',job.width)+feetFields('length','Length',job.length)+feetFields('height','Low eave height',job.height)+`<label id="high-eave-field" class="measurement-field">High eave height<input id="high-eave-value" class="length-input" type="text" aria-label="High eave height"></label>`;
  $('#panel-fields').innerHTML=`<label>Roof panel<select data-select="roofPanel">${options(ROOFS,job.roofPanel)}</select></label><label>Wall panel<select data-select="wallPanel">${options(WALLS,job.wallPanel)}</select></label><div class="field-grid"><label>Roof preview color<input type="color" data-select="roofColor" value="${escape(job.roofColor)}"></label><label>Wall preview color<input type="color" data-select="wallColor" value="${escape(job.wallColor)}"></label></div><p class="hint">${ROOFS[job.roofPanel].width}″ roof coverage · ${ROOFS[job.roofPanel].gauge} ga. ${WALLS[job.wallPanel].width}″ wall coverage · ${WALLS[job.wallPanel].gauge} ga. Colors are for the model only.</p>`;
  renderPurlins();renderRoofExtras();
  $('#accessory-fields').innerHTML=`<div class="check-grid">${ACCESSORIES.map(([k,label])=>`<label><input type="checkbox" data-include="${k}" ${job.include[k]?'checked':''}>${escape(label)}</label>`).join('')}</div><p class="hint">Only applicable materials appear in the list. R-panel omits standing-seam clips and plates.</p>`;
  const lengths=[['maxPanel','Maximum panel length'],['roofAllowance','Roof net end allowance'],['wallAllowance','Wall net length allowance'],['doorAllowance','Above-opening allowance'],['roofLap','Roof endlap'],['wallLap','Wall endlap'],['endLapOffset','Lower panel end beyond purlin'],['trimStock','Trim / gutter stock length'],['trimLap','Trim / gutter lap'],['headerExtra','Extra header trim length'],['downspoutSpacing','Roof length per downspout'],['downspoutStock','Downspout stock length'],['downspoutClearance','Downspout bottom clearance'],['gutterHangerSpacing','Gutter hanger spacing'],['strapSpacing','Downspout strap spacing'],['roofStitchSpacing','R-panel stitch screw spacing']];
  const nums=[['wallScrewsPerLF','Wall screws / panel LF',.1],['wallScrew12Share','Wall screw #12 share (%)',1],['roofSupportScrews','R-panel screws / support',1],['clipScrews','Screws / panel clip',1],['roofEndScrews','Screws / roof end or endlap',1],['screwWaste','Extra screws (%)',1],['masticWaste','Extra mastic / caulk (%)',1]];
  $('#rule-fields').innerHTML=`<p class="hint">Starting allowances for estimating. Confirm roof ends, laps, drainage and fastener patterns for the job. Negative net allowances shorten panels.</p><div class="field-grid">${lengths.map(([k,label])=>feetFields(`rules.${k}`,label,job.rules[k],{negative:['roofAllowance','wallAllowance','doorAllowance'].includes(k)})).join('')}</div><div class="field-grid">${nums.map(([k,label,step])=>number(`rules.${k}`,label,job.rules[k],step)).join('')}</div><label>Standing-seam clip / eave plate height<select data-select="rules.clipOffset">${options({short:'Short · ½″ offset',tall:'Tall · 1½″ offset',super:'Super tall · 2½″ offset'},job.rules.clipOffset)}</select></label>`;
  renderOpenings();
}
function renderRoofExtras(){
  const g=job.shape==='gable',asymmetric=g&&job.asymmetric;
  $('#slope-label').textContent=asymmetric?'Front roof slope':'Roof slope';
  $('#back-slope-field').hidden=!asymmetric;
  $('#back-slope').value=asymmetric?Number(roofGeometry(job).slopes[1].toFixed(6)):'';
  $('#ridge-fields').innerHTML=asymmetric?feetFields('ridgeFromBack','Back sidewall to ridge',job.ridgeFromBack):'';
  $('#roof-extra').innerHTML=g?`<label class="inline"><input id="asymmetric" type="checkbox" ${job.asymmetric?'checked':''}>Asymmetric gable</label>${asymmetric?'<p class="hint">Slopes are rise per 12. Editing either slope moves the ridge. Editing eave heights or ridge position recalculates the back slope. Low eave is the front sidewall.</p>':''}`:'';
}

function renderPurlins(){
  const g=job.shape==='gable';
  $('#purlin-fields').innerHTML=`<label>Calculate rows using<select data-select="purlinMode">${options({spacing:'Typical spacing',count:'Number of rows per roof side'},job.purlinMode)}</select></label>${feetFields('purlinOffset',g?'First row from ridge':'First row from high eave',job.purlinOffset)}${job.purlinMode==='spacing'?feetFields('purlinSpacing','Typical on-center spacing',job.purlinSpacing):`<div class="field-grid">${number('purlinCounts.0',g?'Front roof rows':'Roof rows',job.purlinCounts[0])}${g?number('purlinCounts.1','Back roof rows',job.purlinCounts[1]):''}</div>`}<p class="hint">Distances run along the roof slope. Count purlin rows only; the low-eave support is separate. ${job.purlinMode==='count'?'Count mode distributes rows for the model; check actual locations for endlaps.':''}</p><p class="disclosure-note" id="purlin-summary"></p>`;
}
function renderOpenings(){
  $('#opening-list').innerHTML=job.openings.length?job.openings.map(o=>`<article class="opening-card"><div class="opening-top"><strong>${escape(OPENING_TYPES[o.type])}</strong><label class="inline"><input type="checkbox" data-cut="${o.id}" ${o.cutPanels?'checked':''}>Cut Panels</label></div><p>${escape(WALL_NAMES[o.wall])}<br>${formatLength(o.width)} wide × ${formatLength(o.height)} high<br>From left corner: ${formatLength(o.offset)}<br>${o.type==='window'?'Window sill height':'Sill above slab'}: ${formatLength(o.sill)}</p><button type="button" data-edit="${o.id}">Edit</button><button type="button" data-remove="${o.id}">Remove</button></article>`).join(''):'<p class="hint">No openings added.</p>';
}
function update(){
  result=calculate(job);const ok=!result.errors.length;
  const high=$('#high-eave-value'),asymmetric=job.shape==='gable'&&job.asymmetric;
  high.disabled=job.shape==='gable'&&!asymmetric;high.readOnly=job.shape==='single';
  high.value=measurementText(job.shape==='single'?(ok?result.geometry.highEaveHeight:NaN):asymmetric?job.backHeight:job.height);
  high.title=job.shape==='single'?'Calculated from width, low eave height and slope':asymmetric?'Back sidewall eave height; low eave is the front sidewall':'Same as low eave for a standard gable';
  if(asymmetric)high.dataset.measure='backHeight';else delete high.dataset.measure;
  $('#export-button').disabled=!ok;$('#model-title').textContent=job.name||'Untitled building';
  $('#issues').hidden=false;$('#issues').classList.toggle('error',!ok);
  $('#issues').innerHTML=ok?`<details><summary>Review ${result.warnings.length} takeoff notes before ordering</summary><ul>${result.warnings.map(t=>`<li>${escape(t)}</li>`).join('')}</ul></details>`:`<strong>Check the inputs</strong><ul>${result.errors.map(t=>`<li>${escape(t)}</li>`).join('')}</ul>`;
  if(ok){
    viewer.update(job,result);const s=result.stats;
    $('#roof-derived').textContent=job.shape==='single'?'':job.asymmetric?`Low eave: ${formatLength(Math.min(job.height,job.backHeight))} · Ridge height: ${formatLength(job.height+result.rise)} · Front slope ${job.slope}:12 · Back slope ${Number(result.geometry.slopes[1].toFixed(4))}:12 (calculated).`:'Ridge is centered and runs along the building length.';
    $('#building-summary').textContent=`${formatLength(job.length)} × ${formatLength(job.width)}`;
    $('#model-caption').textContent=`${job.shape==='gable'?'Gable':'Single slope'} · ${job.slope}:12`;
    $('#model-dimensions').textContent=`Eave ${formatLength(job.height)} · ${job.shape==='gable'?'Peak':'High eave'} ${formatLength(job.height+result.rise)}`;
    $('#stats').innerHTML=[['Roof panels',s.roofPanels,'pcs'],['Wall panels',s.wallPanels,'pcs'],['Roof area',Math.round(s.roofArea).toLocaleString(),'SF'],['Net wall area',Math.round(s.wallArea).toLocaleString(),'SF']].map(([label,value,unit])=>`<div class="stat"><strong>${value}<small>${unit}</small></strong><span>${label}</span></div>`).join('');
    $('#purlin-summary').textContent=`${s.purlinRows.join(' / ')} purlin rows · slope length ${result.slopeLengths.map(formatLength).join(' / ')}`;
  }else{$('#roof-derived').textContent='';$('#stats').innerHTML='';$('#building-summary').textContent='Inputs need attention';$('#model-caption').textContent='Last valid model · correct inputs to update';$('#model-dimensions').textContent='';$('#purlin-summary').textContent='';}
  renderResults();
}
function table(headers,rows,note=''){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>${note?`<p class="result-note">${note}</p>`:''}`;}
function renderResults(){
  document.querySelectorAll('[data-tab]').forEach(b=>{const selected=b.dataset.tab===tab;b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1;});
  if(result.errors.length){$('#result-content').innerHTML='<p class="empty">Correct the inputs above to calculate and export this takeoff.</p>';$('#line-count').textContent='';return;}
  const out=$('#result-content');$('#line-count').textContent=`${result.panels.length} panel sizes · ${result.hardware.length} material lines`;
  if(tab==='panels')out.innerHTML=table(['Panel / part','Use','Qty','Length each','Total LF'],result.panels.map(p=>`<tr><td>${escape(p.type)}<span class="subtle">${p.coverage}″ coverage · ${p.gauge} ga · <span class="code">${escape(p.part)}</span></span></td><td>${p.area}</td><td class="num">${p.quantity}</td><td class="num">${panelLengthFields(p)}${p.overridden?`<button data-reset-length="${escape(p.lengthKey)}" title="Restore calculated panel length">↺ Reset</button><span class="subtle">Calculated: ${formatLength(p.calculatedLength)}</span>`:''}</td><td class="num">${p.totalLF.toFixed(2)}</td></tr>`),'Enter lengths such as 20′ 2 1/2″ to change every panel in that row. Saved edits apply to matching calculated sizes until reset. Lengths round up to 1/16″. Final panels use full coverage stock and are trimmed to width on site. See Panel layout for wall positions and opening cuts.');
  else if(tab==='hardware')out.innerHTML=result.hardware.length?table(['Material / part','Qty','Unit / stock','Quantity basis'],result.hardware.map(p=>`<tr><td>${escape(p.name)}<span class="subtle code">${escape(p.part)}</span>${p.provisional?'<span class="row-status">Review allowance / profile</span>':''}</td><td class="num"><input class="rule-override" aria-label="Override ${escape(p.name)} quantity" data-override="${p.id}" type="number" min="0" max="1000000" step="1" value="${p.quantity}">${p.overridden?`<button data-clear-override="${p.id}" title="Restore calculated quantity">↺</button><span class="subtle">Calculated: ${p.calculated}</span>`:''}</td><td>${escape(p.unit)}${p.length?`<span class="subtle">${formatLength(p.length)}</span>`:''}</td><td class="notes">${escape(p.basis)}</td></tr>`),'Edit a quantity to override it. Overrides remain fixed when dimensions change; use ↺ to restore calculation. Fasteners are individual counts, not boxes.'): '<p class="empty">Select materials to include hardware.</p>';
  else if(tab==='layout')out.innerHTML=table(['ID','Face / bay','Width position','Length','Notes'],result.layout.map(p=>`<tr><td class="code">${p.id}</td><td>${escape(p.face)}<span class="subtle">Bay ${p.bay}</span></td><td>${formatLength(p.from)}–${formatLength(p.to)}</td><td class="num">${formatLength(p.length)}</td><td class="notes">${escape(p.note)}</td></tr>`),'Wall positions start at the left corner when viewed from outside. Roof bay positions run along the building length. Partial bays beside openings remain full length for field cutting.');
  else out.innerHTML=`<div class="assumptions"><h3>Calculation rules</h3><ul><li>Rectangular building. Front/back side walls run along the length. Left/right end walls span the width. The gable ridge runs along the length. Asymmetric gables use separate front and back eave heights, linked front/back slopes and ridge position. Editing either slope or width moves the ridge while preserving both eave heights and the other slope. Editing an eave height or ridge position preserves front slope and recalculates back slope. Low eave changes only when edited. Single slope rises from front to back.</li><li>Roof coverage: Loc Seam 16″, R-panel 36″, SS360 24″. Wall coverage: 36″. CFR is excluded. Gauge and part prefixes are from the catalog listings.</li><li>Default maximum panel length is 40′. Longer roof runs split at a purlin plus the configured offset, with the configured endlap. Verify positions and swaged ends.</li><li>The 1½″ wall base lap and 1½″ upper setback cancel: wall net allowance starts at zero. Endwall panels use the highest roof point across their width, then are field cut to slope.</li><li>Cut Panels is editable per opening, regardless of width. Defaults: off for walk doors, double walk doors, windows and overhead doors; on for roll-up doors and general/rough openings. Fully contained panel bays are shortened above/below the opening. Partial bays retain full-height material.</li><li>Typical purlins start 1′6″ below the ridge/high eave and continue at 5′ centers along the roof. Row-count mode excludes the low-eave support.</li><li>Wall screw estimating defaults are 1.8 per panel LF, split 60% #12 / 40% #14. Mastic quantities use the configured application paths and reference roll lengths.</li><li>Roof screw patterns, clips, thermal blocks, drainage and trim profiles require job confirmation. Every hardware row shows its quantity basis. Estimates do not select wind-zone or engineered attachment requirements.</li><li>All material checkboxes start selected. Inapplicable standing-seam parts are omitted for R-panel. Offcuts are not reused. Insulation roll takeoff is not included in this version.</li><li>Excel saves the original inputs and in-app overrides. Edits to output cells in Excel do not change the job restored by import.</li></ul><h3>Reference catalog</h3><ul>${Object.entries(SOURCES).map(([topic,url])=>`<li>${url.startsWith('https:')?`<a href="${url}" target="_blank" rel="noopener noreferrer">${escape(topic[0].toUpperCase()+topic.slice(1))} ↗</a>`:escape(url)}</li>`).join('')}</ul><p>Confirm current manufacturer documents and project-specific requirements before ordering. Reference links do not establish approval of estimating allowances.</p></div>`;
}

$('#building-form').addEventListener('submit',e=>e.preventDefault());
$('#building-form').addEventListener('change',e=>{
  const el=e.target;
  const roofKey=el.id==='back-slope'?'backSlope':el.id==='slope'?'slope':el.dataset.measure;
  if(job.shape==='gable'&&job.asymmetric&&['width','height','backHeight','slope','backSlope','ridgeFromBack'].includes(roofKey)){
    const value=['slope','backSlope'].includes(roofKey)?(el.value.trim()===''?NaN:Number(el.value)):parseMeasurement(el.value);
    try{job=editRoofDimension(job,roofKey,value);renderForms();update();}
    catch(error){notify(error.message);renderForms();update();}
    return;
  }
  if(el.dataset.measure){const value=parseMeasurement(el.value);if(!Number.isFinite(value)||(value<0&&el.dataset.negative!=='true')){notify('Use feet and inch marks, for example 20′ 2 1/2″. Fractions may be in sixteenths.');el.value=measurementText(el.dataset.measure.startsWith('rules.')?job.rules[el.dataset.measure.split('.')[1]]:job[el.dataset.measure]);return;}setPath(el.dataset.measure,value);el.value=measurementText(value);}

  else if(el.dataset.number)setPath(el.dataset.number,el.value===''?NaN:+el.value);
  else if(el.dataset.select){setPath(el.dataset.select,el.value);if(el.dataset.select==='purlinMode')renderPurlins();if(['roofPanel','wallPanel'].includes(el.dataset.select))renderForms();}
  else if(el.dataset.include)job.include[el.dataset.include]=el.checked;
  else if(el.dataset.cut){const o=job.openings.find(o=>o.id===el.dataset.cut);if(o)o.cutPanels=el.checked;}
  else if(el.id==='asymmetric'){job.asymmetric=el.checked;if(!Number.isFinite(job.backHeight))job.backHeight=job.height;if(!job.ridgeFromBack||job.ridgeFromBack>=job.width)job.ridgeFromBack=job.width/2;renderForms();}
  else if(el.id==='shape'){job.shape=el.value;renderForms();}
  else if(el.id==='slope')job.slope=el.value===''?NaN:+el.value;
  else return;
  update();
});
$('#job-name').addEventListener('input',e=>{job.name=e.target.value;$('#model-title').textContent=job.name||'Untitled building';});
$('#show-purlins').onchange=e=>{job.showPurlins=e.target.checked;update();};
$('#rotate-button').setAttribute('aria-pressed',rotating);$('#rotate-button').textContent=rotating?'Pause rotation':'Resume rotation';
$('#rotate-button').onclick=e=>{rotating=!rotating;viewer.setRotate(rotating);e.target.setAttribute('aria-pressed',rotating);e.target.textContent=rotating?'Pause rotation':'Resume rotation';};
$('#reset-view').onclick=()=>viewer.reset();
document.querySelectorAll('[data-tab]').forEach(b=>{b.onclick=()=>{tab=b.dataset.tab;renderResults();};b.onkeydown=e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const all=[...document.querySelectorAll('[data-tab]')],i=all.indexOf(b);const next=e.key==='Home'?0:e.key==='End'?all.length-1:(i+(e.key==='ArrowRight'?1:-1)+all.length)%all.length;all[next].click();all[next].focus();};});
$('#result-content').addEventListener('change',e=>{if(e.target.dataset.measure){const editor=e.target.closest('.panel-length-editor');if(!editor)return;const value=parseMeasurement(e.target.value);if(!Number.isFinite(value)||value<=0||value>12000){notify('Enter a positive length such as 20′ 2 1/2″ (maximum 1,000 feet).');renderResults();return;}(job.panelLengths??={})[e.target.dataset.measure]=value;update();return;}const id=e.target.dataset.override;if(!id)return;const value=+e.target.value;if(e.target.value===''||!Number.isInteger(value)||value<0||value>1000000){notify('Use a whole number from 0 to 1,000,000.');renderResults();return;}job.overrides[id]=value;update();});
$('#result-content').addEventListener('click',e=>{const key=e.target.dataset.resetLength;if(key){delete job.panelLengths[key];update();return;}const id=e.target.dataset.clearOverride;if(id){delete job.overrides[id];update();}});

function openOpening(id=null){
  editing=id;const o=id?job.openings.find(o=>o.id===id):{type:'rollup',wall:'front',width:144,height:144,offset:36,sill:0,cutPanels:true};
  $('#opening-title').textContent=id?'Edit opening':'Add opening';
  $('#opening-fields').innerHTML=`<label>Opening type<select id="opening-type">${options(OPENING_TYPES,o.type)}</select></label><label>Wall<select id="opening-wall">${options(WALL_NAMES,o.wall)}</select></label><div class="field-grid">${feetFields('opening.width','Opening width',o.width)}${feetFields('opening.height','Opening height',o.height)}${feetFields('opening.offset','From left corner',o.offset)}${feetFields('opening.sill','Sill above slab',o.sill)}</div><label class="inline"><input id="opening-cut" type="checkbox" ${o.cutPanels?'checked':''}>Cut Panels</label><p class="hint">When checked, order shorter panels above/below the opening where a full panel width fits. Uncheck to order full panels for field cutting.</p>`;
  $('#opening-error').textContent='';$('#opening-dialog').showModal();
  $('#opening-type').onchange=e=>{const type=e.target.value;$('#opening-cut').checked=DEFAULT_CUT[type];if(type==='walk'){setOpeningMeasure('width',40);setOpeningMeasure('height',86);setOpeningMeasure('sill',0);}else if(type==='double'){setOpeningMeasure('width',80);setOpeningMeasure('height',86);setOpeningMeasure('sill',0);}else if(type==='window'){setOpeningMeasure('width',48);setOpeningMeasure('height',36);setOpeningMeasure('sill',36);}else if(['overhead','rollup'].includes(type)){setOpeningMeasure('width',144);setOpeningMeasure('height',144);setOpeningMeasure('sill',0);}};
}
function setOpeningMeasure(key,value){$(`[data-measure="opening.${key}"]`).value=measurementText(value);}
function openingMeasure(key){return parseMeasurement($(`[data-measure="opening.${key}"]`).value);}

$('#add-opening').onclick=()=>openOpening();$('#cancel-opening').onclick=()=>$('#opening-dialog').close();
$('#opening-list').onclick=e=>{if(e.target.dataset.edit)openOpening(e.target.dataset.edit);if(e.target.dataset.remove){job.openings=job.openings.filter(o=>o.id!==e.target.dataset.remove);renderOpenings();update();}};
$('#opening-form').onsubmit=e=>{
  e.preventDefault();const type=$('#opening-type').value;
  const o={id:editing||crypto.randomUUID(),type,wall:$('#opening-wall').value,width:openingMeasure('width'),height:openingMeasure('height'),offset:openingMeasure('offset'),sill:openingMeasure('sill'),cutPanels:$('#opening-cut').checked};
  const next={...job,openings:editing?job.openings.map(p=>p.id===editing?o:p):[...job.openings,o]};const errors=validate(next);if(errors.length){$('#opening-error').textContent=errors.join(' ');return;}
  job=next;$('#opening-dialog').close();renderOpenings();update();
};
$('#export-button').onclick=async()=>{
  const button=$('#export-button');button.disabled=true;button.textContent='Exporting…';
  try{if(!globalThis.ExcelJS)throw new Error('Excel library is still loading. Try again.');const bytes=await exportWorkbook(globalThis.ExcelJS,job);const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=`${job.name.replace(/[^a-z0-9 _-]/gi,'').trim()||'Jones-building'}-takeoff.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('Excel exported. Drop that file here whenever you want to resume.');}catch(e){notify(e.message);}finally{button.textContent='Export Excel';button.disabled=!!result.errors.length;}
};
async function loadFile(file){if(!file)return;if(!/\.xlsx$/i.test(file.name)){notify('Choose an .xlsx job exported by this app.');return;}if(file.size>5*1024*1024){notify('Choose a Jones XLSX file smaller than 5 MB.');return;}
  try{if(!globalThis.ExcelJS)throw new Error('Excel library is still loading. Try again.');const next=await importWorkbook(globalThis.ExcelJS,await file.arrayBuffer());job=next;renderForms();update();notify(`Opened ${job.name||'building job'}.`);}catch(e){notify(`Could not open job: ${e.message}`);}
}
$('#import-button').onclick=()=>$('#import-file').click();$('#import-file').onchange=async e=>{await loadFile(e.target.files[0]);e.target.value='';};
let dragDepth=0;window.addEventListener('dragenter',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();dragDepth++;$('#drop-overlay').hidden=false;}});
window.addEventListener('dragleave',e=>{e.preventDefault();if(--dragDepth<=0){dragDepth=0;$('#drop-overlay').hidden=true;}});window.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});
window.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;$('#drop-overlay').hidden=true;loadFile(e.dataTransfer.files[0]);});

if(document.modelContext?.registerTool){
  const controller=new AbortController();window.addEventListener('pagehide',()=>controller.abort(),{once:true});
  const registrations=[{name:'read_building_takeoff',title:'Read building takeoff',description:'Read current inputs, panel quantities, hardware and calculation notes.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({job:structuredClone(job),result:structuredClone(result)})},{name:'set_building_dimensions',title:'Set building dimensions',description:'Update current dimensions in inches and roof rise per 12, then recalculate the visible model and takeoff.',inputSchema:{type:'object',properties:{length:{type:'number'},width:{type:'number'},height:{type:'number'},slope:{type:'number'},shape:{type:'string',enum:['gable','single']}},additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['length','width','height','slope','shape'].includes(k)))throw new Error('Invalid building input');const next={...job,...input};const check=calculate(next);if(check.errors.length)throw new Error(check.errors.join(' '));job=next;renderForms();update();return {stats:result.stats,notes:result.warnings};}}];
  for(const tool of registrations){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{}}
}
renderForms();update();
