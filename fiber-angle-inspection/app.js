'use strict';
(() => {
  const $=id=>document.getElementById(id), geometry=window.FiberDemoGeometry;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy=value=>JSON.parse(JSON.stringify(value));
  const jobs=[
    {id:'DEMO-201',item:'Textile sample A',description:'Fictional production job · standard fiber batch',lot:'LOT-DEMO-A',fiber:'Sample fiber A',reference:105,lower:10,upper:10},
    {id:'DEMO-202',item:'Textile sample B',description:'Fictional development job · alternative reference',lot:'LOT-DEMO-B',fiber:'Sample fiber B',reference:100,lower:8,upper:12},
    {id:'DEMO-203',item:'Development sample',description:'Fictional engineering job · broad demonstration range',lot:'LOT-DEMO-C',fiber:'Development fiber',reference:110,lower:20,upper:20}
  ];
  const labels={
    en:{title:'Fiber inspection report',job:'Job ID',item:'Item',lot:'Lot No.',fiber:'Fiber type',batch:'Batch',date:'Created',range:'Example range',position:'Position',angle:'Angle (°)',result:'Example tolerance',state:'Measurement state',measured:'Measured',empty:'Empty',unresolved:'Unresolved',within:'Within range',outside:'Outside range',na:'Not applicable',note:'Operator note',correction:'Correction of',disclaimer:'DEMO REPORT — NOT FOR QC ACCEPTANCE. Synthetic fixture, fictional job and uncalibrated geometry. No camera, OpenCV pipeline or database was used.'},
    zh:{title:'纤维检测报告',job:'工作编号',item:'产品',lot:'批号',fiber:'纤维类型',batch:'检测批次',date:'创建时间',range:'示例范围',position:'位置',angle:'角度 (°)',result:'示例范围检查',state:'测量状态',measured:'已测量',empty:'空位',unresolved:'无法测量',within:'示例范围内',outside:'超出示例范围',na:'不适用',note:'操作员备注',correction:'更正原始批次',disclaimer:'演示报告 — 不用于质量验收。图像和工作信息均为虚构数据，几何测量未经校准。未使用相机、OpenCV 检测或数据库。'}
  };
  let job=null, slots=[], pending=null, history=[], nextId=1, selectedBatch=null, correctionOf=null, view='inspection', selectedSlot=0;
  function status(text){$('app-status').textContent=text;}
  function context(){
    const values=['reference','lower','upper'].map(id=>$(id).value.trim()===''?NaN:Number($(id).value));
    if(!values.every(Number.isFinite)||values.some(n=>n<0||n>180))return null;
    const [reference,lower,upper]=values;
    return {reference,lower,upper,min:Math.max(0,reference-lower),max:Math.min(180,reference+upper),lot:$('lot').value.trim(),fiber:$('fiber-type').value.trim()};
  }
  function clearPending(message){
    pending=null;$('confirm-review').checked=false;$('confirm-review').disabled=true;
    renderInspection();if(message)status(message);
  }
  function mean(rows){const values=rows.filter(r=>r.angle!==null).map(r=>r.angle);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;}
  function summary(rows){return {measured:rows.filter(r=>r.state==='measured').length,empty:rows.filter(r=>r.state==='empty').length,unresolved:rows.filter(r=>r.state==='unresolved').length,outside:rows.filter(r=>r.inRange===false).length,mean:mean(rows)};}
  function go(next,focus=false){
    view=next;
    for(const name of ['inspection','reports','real']){
      $('panel-'+name).hidden=name!==view;$('tab-'+name).setAttribute('aria-selected',String(name===view));$('tab-'+name).tabIndex=name===view?0:-1;
    }
    if(view==='reports')renderHistory();
    $('app-mode-badge').textContent=view==='real'?'V7 camera results · uncalibrated':'Synthetic examples · uncalibrated';
    if(focus)$('tab-'+next).focus();
  }
  function markers(){return [[62,61],[891,61],[62,427],[891,427]].map(([x,y],i)=>`<g transform="translate(${x},${y})"><rect width="46" height="46" fill="#edf1e4"/><rect x="5" y="5" width="36" height="36" fill="#142625"/><path d="M12 12h10v10H12ZM26 12h9v9h-9ZM12 27h8v8h-8ZM${i%2?26:23} 26h11v10H23Z" fill="#e4ecdb"/></g>`).join('');}
  function fixture(values,rows=null,overlay=true,highlight=-1){
    let svg=`<rect width="1000" height="560" fill="#172a28"/><rect x="35" y="37" width="930" height="487" rx="18" fill="#243735" stroke="#53634f" stroke-width="2"/><path d="M116 143H885M115 463H885" stroke="#50634e" stroke-width="2"/>${markers()}<text x="500" y="92" fill="#8ea088" font-size="14" text-anchor="middle" font-family="monospace" letter-spacing="4">SYNTHETIC FIXTURE · ILLUSTRATIVE MARKERS</text>`;
    values.forEach((value,i)=>{
      const cx=140+i*180,active=i===highlight;
      svg+=`<g data-slot="${i}"><rect x="${cx-83}" y="162" width="166" height="278" rx="6" fill="${active?'#324c3f':'#1e302e'}" stroke="${active?'#d3dfa0':'#53634e'}" stroke-width="${active?2:1}"/><text x="${cx}" y="193" fill="#8b9e85" font-size="12" font-family="monospace" text-anchor="middle">FIBER 0${i+1}</text>`;
      if(typeof value==='number'){
        const p=geometry.points(value,i),{a,b,vertex:v}=p;
        svg+=`<path d="M${a.x} ${a.y}Q${a.x+9} ${a.y+11} ${v.x} ${v.y}Q${b.x-9} ${b.y+12} ${b.x} ${b.y}" fill="none" stroke="#e7dfb1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
        if(rows&&overlay){
          svg+=`<path d="M${a.x} ${a.y}L${v.x} ${v.y}L${b.x} ${b.y}" fill="none" stroke="#a6e2b4" stroke-width="2" stroke-dasharray="5 3"/><circle cx="${v.x}" cy="${v.y}" r="4" fill="#d9ebba"/><text x="${cx}" y="397" fill="#d6e8b9" font-size="22" font-family="monospace" text-anchor="middle">${rows[i].angle.toFixed(1)}°</text>`;
        }
      }else if(value==='unresolved'){
        svg+=`<path d="M${cx-48} 280Q${cx+40} 250 ${cx-10} 315T${cx+45} 344M${cx-33} 287Q${cx+55} 330 ${cx+9} 278" fill="none" stroke="#a89874" stroke-width="3" stroke-linecap="round"/><text x="${cx}" y="397" fill="#c5a57b" font-size="13" font-family="monospace" text-anchor="middle">${rows?'UNRESOLVED':'UNCLEAR FIBER'}</text>`;
      }else svg+=`<path d="M${cx-24} 306H${cx+24}" stroke="#5b6b58" stroke-width="2"/><text x="${cx}" y="397" fill="#75866f" font-size="13" font-family="monospace" text-anchor="middle">${rows?'EMPTY':'NO FIBER'}</text>`;
      svg+='</g>';
    });
    return svg+`<text x="500" y="495" fill="#8b9e85" font-size="12" font-family="monospace" text-anchor="middle">SCHEMATIC IMAGE · NO CALIBRATED MEASUREMENT</text>`;
  }
  function resultText(row,t=labels.en){return row.angle===null?t.na:row.inRange?t.within:t.outside;}
  function tableRows(rows,t=labels.en,interactive=false){return rows.map(r=>`<tr${interactive&&r.position-1===selectedSlot?' class="selected-row"':''}><td>${interactive?`<button data-position="${r.position-1}" aria-label="Select fiber ${r.position}">Fiber ${String(r.position).padStart(2,'0')}</button>`:String(r.position).padStart(2,'0')}</td><td>${r.angle===null?'—':r.angle.toFixed(1)+(interactive?'°':'')}</td><td><span class="state ${r.angle===null?'neutral':r.inRange?'':'warning'}">${resultText(r,t)}</span></td><td>${t[r.state]}</td></tr>`).join('');}
  function renderGeometryControls(){
    const value=slots[selectedSlot];
    $('slot-select').value=selectedSlot;
    $('synthetic-angle').disabled=typeof value!=='number';
    $('angle-value').value=typeof value==='number'?value.toFixed(1)+'°':'Unavailable';
    if(typeof value==='number')$('synthetic-angle').value=value;
    $('geometry-hint').textContent=typeof value==='number'?'Changing the synthetic angle clears the old result. Re-inspect to calculate the new geometry.':'This position is empty or unresolved. Choose another position or sample to explore an angle.';
  }
  function renderInspection(){
    const ctx=context();
    $('fixture-canvas').innerHTML='<title>Illustrative five-slot fiber fixture</title>'+fixture(slots,pending?.rows,$('show-overlay').checked,selectedSlot);
    $('frame-caption').textContent=geometry.scenarios[$('sample-select').value].title;
    $('processing-state').textContent=pending?'Synthetic geometry calculated':'Ready for inspection';
    $('inspect').disabled=!job||!ctx;
    $('inspect-hint').textContent=!job?'Load a fictional job to begin.':!ctx?'Enter an angle and non-negative deviations between 0° and 180°.':'Calculates example geometry only; no image detector runs.';
    $('tolerance-description').textContent=ctx?`Example range: ${ctx.min.toFixed(1)}°–${ctx.max.toFixed(1)}°. These are not customer specifications.`:'Invalid example tolerance. Use finite values between 0° and 180°.';
    if(pending){
      const s=summary(pending.rows);$('piece-results').innerHTML=tableRows(pending.rows,labels.en,true);
      $('result-count').textContent=`${s.measured} measured / 5 positions`;
      $('overall-summary').innerHTML=`<span class="small-cap">EXAMPLE SUMMARY</span><p><strong class="summary-count">${s.measured} / 5</strong>measurable positions<br>${s.empty} empty · ${s.unresolved} unresolved<br>${s.outside} outside the example range<br>Mean of measured angles: <strong>${s.mean===null?'—':s.mean.toFixed(1)+'°'}</strong></p>`;
    }else{
      $('piece-results').innerHTML=slots.map((_,i)=>`<tr><td>Fiber 0${i+1}</td><td>—</td><td>—</td><td>Not inspected</td></tr>`).join('');
      $('result-count').textContent='Not inspected';$('overall-summary').innerHTML='<span class="small-cap">OVERALL SUMMARY</span><p>Inspect a sample to see its results.</p>';
    }
    const measurable=pending&&pending.rows.some(r=>r.angle!==null);
    $('confirm-review').disabled=!measurable;
    $('save-batch').disabled=!measurable||!$('confirm-review').checked||!!(correctionOf&&!$('operator-note').value.trim())||history.length>=50;
    $('save-hint').textContent=history.length>=50?'Demo history limit reached (50 batches). Export your records before resetting.':correctionOf&&!$('operator-note').value.trim()?'Add a note explaining this corrected batch before saving.':pending&&!measurable?'No reliable angle in this example. Saving is disabled; select another frame.':'Memory-only demo record. Review the results before saving.';
    $('correction-banner').hidden=!correctionOf;
    $('correction-banner').textContent=correctionOf?`Correcting ${correctionOf}. Saving creates a new linked batch; the original remains unchanged. Add an operator note explaining the correction.`:'';
    renderGeometryControls();
  }
  function selectedRecord(){return history.find(r=>r.id===selectedBatch)||null;}
  function renderReport(record){
    const t=labels[$('report-language').value],s=summary(record.rows);
    const fields=[[t.batch,record.id],[t.job,record.job.id],[t.item,record.job.item],[t.date,new Date(record.createdAt).toLocaleString()],[t.lot,record.context.lot||'—'],[t.fiber,record.context.fiber||'—'],[t.range,`${record.context.min.toFixed(1)}°–${record.context.max.toFixed(1)}°`],[t.correction,record.correctionOf||'—']];
    $('report-sheet').lang=$('report-language').value==='zh'?'zh-Hans':'en';
    $('report-sheet').innerHTML=`<p class="report-eyebrow">DEMO REPORT / FIBER INSPECTION</p><h2>${t.title}</h2><div class="report-meta">${fields.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div><svg viewBox="0 0 1000 560" role="img" aria-label="Saved synthetic fixture snapshot">${fixture(record.slots,record.rows,true)}</svg><table class="report-table"><thead><tr><th>${t.position}</th><th>${t.angle}</th><th>${t.result}</th><th>${t.state}</th></tr></thead><tbody>${tableRows(record.rows,t)}</tbody></table><p class="report-notes">${esc(t.note)}: ${esc(record.note||'—')}</p><p class="report-notes">${s.measured} / 5 · ${t.measured}; ${s.empty} · ${t.empty}; ${s.unresolved} · ${t.unresolved}</p><p class="report-footnote">${t.disclaimer}</p>`;
  }
  function renderHistory(){
    $('history-count').textContent=history.length;
    $('empty-history').hidden=history.length>0;$('report-content').hidden=history.length===0;
    if(!history.length)return;
    const filter=$('history-filter').value,visible=history.filter(r=>filter==='all'||r.job.id===filter);
    if(!visible.some(r=>r.id===selectedBatch))selectedBatch=visible[0]?.id??null;
    $('batch-list').innerHTML=visible.length?visible.map(r=>`<button class="batch-button" data-batch="${r.id}" aria-pressed="${r.id===selectedBatch}"><strong>${r.id}</strong>${r.job.id}<small>${r.correctionOf?'Correction of '+r.correctionOf:'Original inspection'}<br>${summary(r.rows).measured} / 5 measured</small></button>`).join(''):'<p class="fine-print">No batches match this job.</p>';
    for(const id of ['export-csv','export-json','print-report','correct-batch'])$(id).disabled=!selectedRecord();
    if(selectedRecord())renderReport(selectedRecord());else $('report-sheet').innerHTML='<p class="panel-lead">Choose another job filter to see a saved report.</p>';
  }
  function loadJob(){
    job=copy(jobs.find(j=>j.id===$('job-select').value));correctionOf=null;
    $('lot').value=job.lot;$('fiber-type').value=job.fiber;$('reference').value=job.reference;$('lower').value=job.lower;$('upper').value=job.upper;$('operator-note').value='';
    $('job-description').innerHTML=`<strong>${esc(job.item)}</strong>${esc(job.description)}`;
    clearPending(`${job.id} loaded from fictional sample data. No database was queried.`);
  }
  $('load-job').addEventListener('click',loadJob);
  $('job-select').addEventListener('change',()=>{job=null;correctionOf=null;$('job-description').textContent='Load the selected fictional job.';clearPending('Job selection changed. Load the selected job before inspecting.');});
  $('sample-select').addEventListener('change',()=>{slots=copy(geometry.scenarios[$('sample-select').value].slots);selectedSlot=0;clearPending('Sample changed. Re-inspect before saving.');});
  for(const id of ['reference','lower','upper','lot','fiber-type'])$(id).addEventListener('input',()=>clearPending('Measurement context changed. Re-inspect before saving.'));
  $('operator-note').addEventListener('input',renderInspection);
  $('show-overlay').addEventListener('change',renderInspection);
  $('confirm-review').addEventListener('change',renderInspection);
  $('slot-select').addEventListener('change',()=>{selectedSlot=Number($('slot-select').value);renderInspection();});
  $('fixture-canvas').addEventListener('click',e=>{const g=e.target.closest('[data-slot]');if(g){selectedSlot=Number(g.dataset.slot);renderInspection();}});
  $('piece-results').addEventListener('click',e=>{const b=e.target.closest('[data-position]');if(b){selectedSlot=Number(b.dataset.position);renderInspection();$('piece-results').querySelector(`[data-position="${selectedSlot}"]`)?.focus({preventScroll:true});}});
  $('synthetic-angle').addEventListener('input',()=>{if(typeof slots[selectedSlot]!=='number')return;slots[selectedSlot]=Number($('synthetic-angle').value);clearPending('Synthetic fiber changed. Re-inspect to calculate its new angle.');});
  $('inspect').addEventListener('click',()=>{
    const ctx=context();if(!job||!ctx)return;
    pending={job:copy(job),context:copy(ctx),sample:$('sample-select').value,slots:copy(slots),rows:geometry.measure(slots,ctx)};
    $('confirm-review').checked=false;renderInspection();
    status(pending.rows.some(r=>r.angle!==null)?'Example geometry calculated. Review individual results, then confirm and save a demo batch.':'No reliable angle in this sample. Empty/unresolved positions have no numeric angle and cannot be saved alone.');
  });
  function freezeDeep(record){Object.values(record).forEach(v=>{if(v&&typeof v==='object')freezeDeep(v);});return Object.freeze(record);}
  $('save-batch').addEventListener('click',()=>{
    if(!pending||!pending.rows.some(r=>r.angle!==null)||!$('confirm-review').checked||(correctionOf&&!$('operator-note').value.trim())||history.length>=50)return;
    const record=freezeDeep({...copy(pending),id:`DEMO-B${String(nextId++).padStart(3,'0')}`,createdAt:new Date().toISOString(),note:$('operator-note').value.trim(),correctionOf,simulation:true,calibrated:false});
    history.unshift(record);selectedBatch=record.id;correctionOf=null;pending=null;$('confirm-review').checked=false;$('history-filter').value='all';renderInspection();go('reports');status(`${record.id} saved as an immutable demo snapshot in page memory.`);
  });
  $('batch-list').addEventListener('click',e=>{const b=e.target.closest('[data-batch]');if(b){selectedBatch=b.dataset.batch;renderHistory();$('batch-list').querySelector(`[data-batch="${selectedBatch}"]`)?.focus({preventScroll:true});}});
  $('history-filter').addEventListener('change',renderHistory);$('report-language').addEventListener('change',renderHistory);
  $('correct-batch').addEventListener('click',()=>{
    const record=selectedRecord();if(!record)return;
    job=copy(record.job);$('job-select').value=job.id;$('sample-select').value=record.sample;slots=copy(record.slots);selectedSlot=0;correctionOf=record.id;
    for(const id of ['reference','lower','upper','lot'])$(id).value=record.context[id];$('fiber-type').value=record.context.fiber;$('operator-note').value='';
    $('job-description').innerHTML=`<strong>${esc(job.item)}</strong>${esc(job.description)}`;
    clearPending(`Drafting a correction of ${record.id}. The original record is preserved.`);go('inspection',true);
  });
  function download(data,filename,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function csvCell(value){let s=String(value??'');if(/^\s*[=+@\-]|^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  $('export-json').addEventListener('click',()=>{const r=selectedRecord();if(r)download(JSON.stringify({format:'fiber-inspection-showcase/v1',disclaimer:labels.en.disclaimer,batch:r},null,2)+'\n',r.id+'.json','application/json');});
  $('export-csv').addEventListener('click',()=>{const r=selectedRecord();if(!r)return;const header=['Demo batch','Job','Lot','Fiber type','Position','Angle (degrees)','State','Example range check','Correction of','Operator note','Simulation','Calibrated'];const rows=r.rows.map(row=>[r.id,r.job.id,r.context.lot,r.context.fiber,row.position,row.angle??'',row.state,resultText(row),r.correctionOf??'',r.note,'true','false']);download('\uFEFF'+[header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n'),r.id+'.csv','text/csv;charset=utf-8');});
  $('print-report').addEventListener('click',()=>{if(selectedRecord())window.print();});
  const tablist=document.querySelector('[role=tablist]');
  tablist.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)go(b.dataset.view);});
  tablist.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const views=['inspection','reports','real'],index=views.indexOf(view);go(e.key==='Home'?'inspection':e.key==='End'?'real':views[(index+(e.key==='ArrowRight'?1:2))%views.length],true);}});
  $('new-inspection').addEventListener('click',()=>{correctionOf=null;clearPending('Ready for another demo inspection. Saved batches are preserved.');go('inspection',true);});
  function reset(){job=null;slots=copy(geometry.scenarios.standard.slots);pending=null;history=[];nextId=1;selectedBatch=null;correctionOf=null;selectedSlot=0;$('job-select').value='DEMO-201';$('sample-select').value='standard';$('lot').value='';$('fiber-type').value='';$('reference').value='105';$('lower').value='10';$('upper').value='10';$('operator-note').value='';$('history-filter').value='all';$('report-language').value='en';$('show-overlay').checked=true;$('confirm-review').checked=false;$('job-description').textContent='No job loaded.';renderInspection();renderHistory();go('inspection');status('Load a fictional job, then inspect a sample fixture.');}
  $('reset').addEventListener('click',reset);reset();
})();
