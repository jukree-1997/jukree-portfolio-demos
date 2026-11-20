'use strict';
// Read-only viewer: saved records and image pairs are never fed into the synthetic dashboard.
(() => {
  const $=id=>document.getElementById(id),evidence=window.FiberRealEvidence;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const methodNames={adapted_border:'Parallel-border candidate',offline08:'Centerline candidate',whole_arm:'Whole-arm candidate','02_frangi_path_offline08_geometry':'Frangi + overlay fallback'};
  const frame=evidence.frames[0];
  let mode='result';
  function render(){
    $('real-image-error').hidden=true;
    $('real-image').src=frame[mode];
    $('real-image').alt=mode==='raw'?`Saved camera source image for ${frame.name}`:`V7 final measurement overlay for ${frame.name}, with fitted lines and angles on five fiber positions`;
    $('real-open-image').href=frame[mode];
    $('real-filename').textContent=`${frame.name} · ${frame.label}`;
    $('real-caption').textContent=mode==='raw'?'Saved physical-camera source image, copied unchanged from the V7 evaluation.':'V7 final overlay: fitted lines and angles on the captured fixture image. Saved, uncalibrated evaluation output; no live browser inference.';
    $('real-show-result').setAttribute('aria-pressed',String(mode==='result'));
    $('real-show-raw').setAttribute('aria-pressed',String(mode==='raw'));
    $('real-measured-count').textContent=`${frame.slots.filter(s=>s.status==='MEASURED').length} / 5 measured`;
    $('real-results-body').innerHTML=frame.slots.map(slot=>`<tr><td>${esc(slot.slot)}</td><td title="${esc(slot.angleSourceText||'No saved angle')}">${slot.angle===null?'—':slot.angle.toFixed(2)+'°'}</td><td><span class="state ${slot.status==='MEASURED'?'':'neutral'}">${slot.status==='MEASURED'?'Measured':slot.status==='EMPTY'?'Empty':'Not processed'}</span></td><td title="${esc(slot.method)}">${esc(methodNames[slot.method]||slot.method||'—')}</td></tr>`).join('');
  }
  $('real-show-result').addEventListener('click',()=>{mode='result';render();});
  $('real-show-raw').addEventListener('click',()=>{mode='raw';render();});
  $('real-image').addEventListener('error',()=>{$('real-image-error').hidden=false;});
  $('real-image').addEventListener('load',()=>{$('real-image-error').hidden=true;});
  $('real-export').addEventListener('click',()=>{
    const data={publication:evidence.publication,profile:evidence.profile,storedEvaluationResults:true,liveInference:false,applicationRuntimeIntegrated:evidence.applicationRuntimeIntegrated,metrologyValidated:evidence.metrologyValidated,accuracyClaimed:evidence.accuracyClaimed,productionValidated:evidence.productionValidated,sourceManifestSHA256:evidence.sourceManifestSHA256,frame};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');
    a.href=url;a.download=frame.name+'-v7-results.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  });
  $('reset').addEventListener('click',()=>{mode='result';render();});
  render();
})();
