'use strict';

// Original browser-only showcase. These fixtures are illustrations, not model output.
(() => {
  const $ = id => document.getElementById(id);
  const stages = ['prepare', 'review', 'build'];
  const samples = window.SmartRelabelSamples;
  const scene = samples.scene;
  let activeDataset = 'bottles';
  let datasetStates = {};
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  let nextId = 1;
  let images = [];
  let current = 0;
  let selected = null;
  let tool = 'select';
  let stage = 'prepare';
  let threshold = 35;
  let round = 0;
  let lastCorrectionSignature = null;
  let trainingTimer = null;
  let trainedRun = null;
  let pointer = null;
  let uploadGeneration = 0;
  const canvas = $('annotation-canvas');
  const uploadURLs = new Set();

  function status(message) { $('app-status').textContent = message; }
  function className() { return $('class-name').value.trim() || samples.datasets[activeDataset].className; }
  function datasetName() { return $('dataset-name').value.trim() || activeDataset+'-study'; }
  function frame() { return images[current]; }
  function protectedImage(img) { return img.reviewed || img.edited; }
  function eligibleImages() { return images.filter(img => img.builtin && !protectedImage(img)); }
  function reviewedCount() { return images.filter(img => img.reviewed).length; }
  function hasSeedLabels() { return images.some(img => protectedImage(img) && img.boxes.length > 0); }
  function visibleBoxes(img) { return img.boxes.filter(b => b.human || b.score * 100 >= threshold); }
  function stopTraining() {
    if (trainingTimer !== null) clearInterval(trainingTimer);
    trainingTimer = null;
  }
  function invalidateTraining() {
    const existed = trainingTimer !== null || trainedRun !== null;
    stopTraining();
    trainedRun = null;
    $('download-run').hidden = true;
    $('cancel-build').hidden = true;
    $('epochs').disabled = false;
    $('training-state').textContent = 'Ready when you are';
    $('training-log').textContent = existed ? 'Dataset or configuration changed. Start a new preview to update the run summary.' : 'Run a preview to see augmentation, training, and model registration.';
    $('training-bar').style.width = '0%';
    $('training-progress').setAttribute('aria-valuenow', '0');
    $('loss-line').setAttribute('d', '');
  }
  function recordEdit() {
    frame().edited = true;
    frame().reviewed = false;
    invalidateTraining();
  }

  function thumbSVG(img, overlay=false) {
    const height = img.builtin ? 480 : 800 * img.height / img.width;
    return `<svg viewBox="0 0 800 480" aria-hidden="true"><svg width="800" height="480" viewBox="0 0 800 ${height}">${scene(img)}${overlay ? img.boxes.slice(0,3).map(b=>`<rect x="${b.x*8}" y="${b.y*height/100}" width="${b.w*8}" height="${b.h*height/100}" fill="#3f786011" stroke="#477553" stroke-width="4"/>`).join('') : ''}</svg></svg>`;
  }
  function renderDataset() {
    const definition = samples.datasets[activeDataset];
    $('dataset-picker').innerHTML = Object.entries(samples.datasets).map(([key,def]) => `<button class="dataset-choice" data-dataset="${key}" aria-pressed="${key===activeDataset}">${thumbSVG(datasetStates[key].images[0])}<span class="dataset-choice-name">${def.title}<span>${key===activeDataset?'Selected ✓':'Choose dataset →'}</span></span><span class="dataset-choice-meta">10 sample images · ${def.mapped?'COCO class':'Custom class'}</span></button>`).join('');
    $('selected-dataset-title').textContent=definition.title;
    $('dataset-description').textContent=definition.description;
    $('class-context').textContent=definition.context;
    $('sample-grid').innerHTML = images.map((img, i) => `<figure class="sample-card">${thumbSVG(img, img.builtin)}<figcaption>${escapeHTML(img.name)}<span>${img.builtin?'SAMPLE '+String(i+1).padStart(2,'0'):'LOCAL IMAGE'}</span></figcaption></figure>`).join('');
    $('image-total').textContent = `${images.length} images`;
  }
  function renderFilmstrip() {
    $('filmstrip').innerHTML = images.map((img,i)=>`<button class="thumb" data-image="${i}" aria-label="Review ${escapeHTML(img.name)}${img.reviewed?', reviewed':''}" aria-pressed="${current===i}">${thumbSVG(img)}${img.reviewed?'<span class="review-tick" aria-hidden="true">✓</span>':''}<span class="thumb-label">${escapeHTML(img.name)}</span></button>`).join('');
  }
  function renderCanvas() {
    const img=frame(), height=800*img.height/img.width;
    canvas.setAttribute('viewBox', `0 0 800 ${height}`);
    canvas.style.aspectRatio = `${img.width} / ${img.height}`;
    canvas.style.maxHeight = '540px';
    canvas.style.cursor = tool === 'draw' ? 'crosshair' : 'default';
    const label=escapeHTML(className());
    canvas.innerHTML = `<title>${escapeHTML(img.name)} — ${visibleBoxes(img).length} visible annotation boxes</title>${scene(img)}` + visibleBoxes(img).map(b=>{
      const x=b.x*8,y=b.y*height/100,w=b.w*8,h=b.h*height/100;
      const active=b.id===selected, color=active?'#b85a33':'#286a4c';
      const text=`${label} ${b.human?'edited':Math.round(b.score*100)+'%'}`;
      const labelWidth=Math.min(220,100+className().length*6);
      return `<g data-box="${b.id}" style="cursor:${tool==='draw'?'crosshair':'move'}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="${active?'.12':'.035'}" stroke="${color}" stroke-width="${active?3:2}" vector-effect="non-scaling-stroke"/>
      <rect x="${x}" y="${Math.max(0,y-23)}" width="${labelWidth}" height="23" rx="2" fill="${color}"/><text x="${x+6}" y="${Math.max(16,y-7)}" font-family="Arial,sans-serif" font-size="13" fill="white">${text}</text>${active?[0,1].flatMap(a=>[0,1].map(c=>`<rect x="${x+a*w-4}" y="${y+c*h-4}" width="8" height="8" fill="white" stroke="${color}" stroke-width="2"/>`)).join(''):''}</g>`;
    }).join('');
  }
  function renderSelectionFields() {
    const b=frame().boxes.find(b=>b.id===selected);
    $('box-fields').hidden=!b;
    if(b) for(const key of ['x','y','w','h']) $('box-'+key).value=Number(b[key].toFixed(1));
  }
  function renderInspector() {
    const img=frame(), visible=visibleBoxes(img);
    $('review-dataset-name').textContent=`${samples.datasets[activeDataset].title} · ${images.length} images`;
    $('box-count').textContent=`${visible.length} / ${img.boxes.length}`;
    $('annotation-list').innerHTML=img.boxes.length ? img.boxes.map((b,i)=>`<button class="box-row" data-box-id="${b.id}" aria-label="Select box ${i+1}${!visible.includes(b)?', filtered out':''}" aria-pressed="${b.id===selected}"><span><span class="box-dot"></span>${escapeHTML(className())} ${String(i+1).padStart(2,'0')}</span><span class="${!visible.includes(b)?'low':''}">${b.human?'edited':Math.round(b.score*100)+'%'}${!visible.includes(b)?' · hidden':''}</span></button>`).join('') : '<p class="fine-print">No labels yet. Draw a box or add one below.</p>';
    $('image-caption').textContent=img.name;
    $('review-status').textContent=img.reviewed?'Reviewed ✓':img.edited?'Edited · review when ready':'Needs review';
    $('review-status').className=img.reviewed?'reviewed':'';
    $('verify-image').textContent=img.reviewed?'Reopen review ↺':'Mark reviewed ✓';
    $('verified-count').textContent=`${reviewedCount()} / ${images.length} reviewed`;
    renderSelectionFields();
  }
  function renderReview() { renderCanvas(); renderFilmstrip(); renderInspector(); }
  function updateSummaries() {
    const verified=reviewedCount(), protectedCount=images.filter(protectedImage).length;
    const eligible=eligibleImages().length;
    const ready=samples.datasets[activeDataset].mapped || hasSeedLabels();
    $('protected-count').textContent=protectedCount;
    $('eligible-count').textContent=eligible;
    $('round-count').textContent=round;
    $('run-relabel').disabled=!ready || eligible===0;
    $('run-relabel').textContent=hasSeedLabels()?'Auto-label from my edits ↻':round?'Refresh auto-labels ↻':'Auto-label dataset ↻';
    $('relabel-requirement').textContent=eligible===0?'All sample images are protected. Continue to model building, or reset the demo to try the labeling loop again.':!ready?'Spare parts are a custom class. Draw at least one box on an example, then auto-label the remaining images here.':hasSeedLabels()?'Use human-labeled examples to illustrate fine-tuning and refresh unedited images. Reviewed and edited labels are protected.':'Run auto-labeling for sample suggestions, correct the boxes, then run it again—all in this tab. Local uploads are skipped.';
    $('build-summary').innerHTML=`<div><span>Images</span><strong>${images.length}</strong></div><div><span>Reviewed</span><strong>${verified} / ${images.length}</strong></div><div><span>Total boxes</span><strong>${images.reduce((n,img)=>n+img.boxes.length,0)}</strong></div><div><span>Example model</span><strong>YOLO11m</strong></div><div><span>Output</span><strong>Demo summary JSON</strong></div>`;
    $('build-model').disabled=verified===0 || trainingTimer!==null;
    $('build-requirement').textContent=verified===0?'Review at least one image before starting.':verified<images.length?'Some images still need review. This walkthrough permits a preview; complete review before a real training run.':'All images reviewed. Ready to preview the build workflow.';
  }
  function go(next, focus=false) {
    if(!stages.includes(next))return;
    stage=next;
    for(const s of stages){
      $('panel-'+s).hidden=s!==next;
      $('tab-'+s).setAttribute('aria-selected',String(s===next));
      $('tab-'+s).tabIndex=s===next?0:-1;
    }
    if(next==='review')renderReview();
    updateSummaries();
    if(focus)$('tab-'+next).focus();
  }
  function switchDataset(key) {
    if(!samples.datasets[key] || key===activeDataset)return;
    const old=datasetStates[activeDataset];
    Object.assign(old,{name:datasetName(),className:className(),current,round,lastCorrectionSignature,log:$('relabel-log').innerHTML});
    uploadGeneration++;pointer=null;invalidateTraining();
    activeDataset=key;
    const next=datasetStates[key];
    images=next.images;current=next.current;round=next.round;lastCorrectionSignature=next.lastCorrectionSignature;selected=null;
    $('dataset-name').value=next.name;$('class-name').value=next.className;
    $('relabel-log').innerHTML=next.log;
    setTool('select');renderDataset();renderReview();updateSummaries();
    $('dataset-picker').querySelector(`[data-dataset="${key}"]`)?.focus({preventScroll:true});
    status(`${samples.datasets[key].title} selected. This dataset's labels and review progress are restored for this session.`);
  }
  $('dataset-picker').addEventListener('click',e=>{const b=e.target.closest('[data-dataset]');if(b)switchDataset(b.dataset.dataset);});
  function selectBox(id) {
    const box=frame().boxes.find(b=>b.id===id);
    if(box && !box.human && box.score*100<threshold){
      threshold=clamp(Math.floor(box.score*100/5)*5,5,95);
      $('confidence').value=threshold;
      $('confidence-value').value=threshold+'%';
    }
    selected=id; renderCanvas();renderInspector();
    $('annotation-list').querySelector(`[data-box-id="${id}"]`)?.focus({preventScroll:true});
  }
  function setTool(next) {
    tool=next;
    $('tool-select').setAttribute('aria-pressed',String(next==='select'));
    $('tool-draw').setAttribute('aria-pressed',String(next==='draw'));
    $('editor-help').textContent=next==='draw'?'Drag around an object to add a label. Your new box is protected from relabeling.':'Select a box to move it. Draw around a missed object, or use “Add centered box” for keyboard editing.';
    renderCanvas();
  }
  function addBox(box={x:39,y:24,w:14,h:48}) {
    const b={...box,id:nextId++,score:1,human:true};
    recordEdit();frame().boxes.push(b);selected=b.id;
    renderReview();updateSummaries();status('Human label added. This image is protected; mark it reviewed when ready.');
  }
  function point(event) {
    const matrix=canvas.getScreenCTM();
    if(!matrix)return null;
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    return {x:clamp(p.x/8,0,100),y:clamp(p.y/(800*frame().height/frame().width)*100,0,100)};
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    canvas.focus({preventScroll:true});
    const p=point(event);if(!p)return;
    const hit=event.target.closest('[data-box]');
    if(tool==='draw')pointer={type:'draw',start:p,last:p,pointerId:event.pointerId};
    else if(hit){
      selected=Number(hit.dataset.box);
      const b=frame().boxes.find(b=>b.id===selected);
      pointer={type:'move',start:p,last:p,original:{...b},pointerId:event.pointerId,changed:false};
      renderCanvas();renderInspector();
    }else{selected=null;renderCanvas();renderInspector();return;}
    canvas.setPointerCapture(event.pointerId);event.preventDefault();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!pointer||pointer.pointerId!==event.pointerId)return;
    const p=point(event);if(!p)return;pointer.last=p;
    if(pointer.type==='draw'){
      renderCanvas();
      const height=800*frame().height/frame().width;
      canvas.insertAdjacentHTML('beforeend',`<rect x="${Math.min(p.x,pointer.start.x)*8}" y="${Math.min(p.y,pointer.start.y)*height/100}" width="${Math.abs(p.x-pointer.start.x)*8}" height="${Math.abs(p.y-pointer.start.y)*height/100}" fill="#c8613c22" stroke="#b85a33" stroke-width="2" stroke-dasharray="6 4"/>`);
    }else{
      const dx=p.x-pointer.start.x,dy=p.y-pointer.start.y;
      if(Math.abs(dx)+Math.abs(dy)<.3&&!pointer.changed)return;
      if(!pointer.changed){recordEdit();pointer.changed=true;}
      const b=frame().boxes.find(b=>b.id===selected);
      b.x=clamp(pointer.original.x+dx,0,100-b.w);b.y=clamp(pointer.original.y+dy,0,100-b.h);b.human=true;b.score=1;
      renderCanvas();renderSelectionFields();
    }
  });
  function endPointer(event,cancelled=false){
    if(!pointer||pointer.pointerId!==event.pointerId)return;
    const saved=pointer;pointer=null;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(saved.type==='draw'&&!cancelled){
      const x=Math.min(saved.start.x,saved.last.x),y=Math.min(saved.start.y,saved.last.y),w=Math.abs(saved.start.x-saved.last.x),h=Math.abs(saved.start.y-saved.last.y);
      if(w>=1&&h>=1){addBox({x,y,w,h});return;}
      status('Box too small. Drag a larger rectangle around the object.');
    }
    renderReview();updateSummaries();
  }
  canvas.addEventListener('pointerup',e=>endPointer(e));
  canvas.addEventListener('pointercancel',e=>endPointer(e,true));
  $('filmstrip').addEventListener('click',e=>{const b=e.target.closest('[data-image]');if(!b)return;current=Number(b.dataset.image);selected=null;renderReview();$('filmstrip').querySelector(`[data-image="${current}"]`)?.focus({preventScroll:true});status(`Reviewing ${frame().name}.`);});
  $('annotation-list').addEventListener('click',e=>{const b=e.target.closest('[data-box-id]');if(b)selectBox(Number(b.dataset.boxId));});
  $('tool-select').addEventListener('click',()=>setTool('select'));
  $('tool-draw').addEventListener('click',()=>setTool('draw'));
  $('clear-selection').addEventListener('click',()=>{selected=null;renderReview();});
  $('add-box').addEventListener('click',()=>addBox());
  function deleteBox(){
    if(selected===null)return;
    recordEdit();frame().boxes=frame().boxes.filter(b=>b.id!==selected);selected=null;
    renderReview();updateSummaries();$('add-box').focus({preventScroll:true});status('Selected label deleted. Review the image to confirm the correction.');
  }
  $('delete-box').addEventListener('click',deleteBox);
  for(const key of ['x','y','w','h'])$('box-'+key).addEventListener('change',e=>{
    const b=frame().boxes.find(b=>b.id===selected);if(!b)return;
    const n=Number(e.target.value);
    if(!Number.isFinite(n)||e.target.value===''){renderSelectionFields();return;}
    recordEdit();
    b[key]=clamp(n,key==='w'||key==='h'?1:0,key==='w'?100-b.x:key==='h'?100-b.y:key==='x'?100-b.w:100-b.h);
    b.human=true;b.score=1;renderReview();updateSummaries();status('Box coordinates updated.');
  });
  $('confidence').addEventListener('input',e=>{
    threshold=Number(e.target.value);$('confidence-value').value=threshold+'%';renderReview();status('Confidence filter updated. No annotation data was deleted.');
  });
  $('verify-image').addEventListener('click',()=>{
    const image=frame();
    image.reviewed=!image.reviewed;
    invalidateTraining();
    let advanced=false;
    if(image.reviewed){
      for(let offset=1;offset<images.length;offset++){
        const next=(current+offset)%images.length;
        if(!images[next].reviewed){current=next;selected=null;advanced=true;break;}
      }
    }
    renderReview();updateSummaries();
    if(advanced){
      $('filmstrip').querySelector(`[data-image="${current}"]`)?.scrollIntoView?.({block:'nearest',inline:'nearest'});
      status(`${image.name} marked reviewed and protected. Now reviewing ${frame().name}.`);
    }else if(image.reviewed){
      status('All images reviewed. Your labels are protected. Continue to Model building when ready.');
    }else{
      status('Review reopened. Human edits remain protected.');
    }
  });
  $('run-relabel').addEventListener('click',()=>{
    const targets=eligibleImages();
    const learned=hasSeedLabels();
    if(!targets.length || (!samples.datasets[activeDataset].mapped && !learned))return;
    invalidateTraining();
    const signature=JSON.stringify(images.filter(protectedImage).map(img=>[img.name,img.boxes.map(b=>[b.x,b.y,b.w,b.h])]));
    const reuse=signature===lastCorrectionSignature;
    lastCorrectionSignature=signature;
    for(const img of targets){
      const objects=learned?img.objects:img.objects.slice(0,-1);
      const scores=learned?[.96,.89,.82,.74,.65,.48,.42]:[.94,.86,.62,.28,.52,.43];
      img.boxes=objects.map((b,i)=>({...b,x:b.x+(learned?0:.4),id:nextId++,score:scores[i%scores.length],human:false}));
    }
    round++;
    const action=learned?(reuse?'Human labels unchanged: reused the previous simulated model state.':'Illustrated quick fine-tuning from human labels.'):'Illustrated initial suggestions from a pretrained COCO class; no fine-tuning yet.';
    $('relabel-log').innerHTML=`<strong>Example round ${round}</strong> · ${action}<br>Updated ${targets.length} sample images; preserved ${images.filter(protectedImage).length} reviewed or edited images. Local uploads skipped. Results are scripted, not model output.`;
    if(!targets.includes(frame()))current=images.indexOf(targets[0]);
    selected=null;
    renderDataset();renderReview();updateSummaries();
    status(`Auto-label preview complete: ${targets.length} sample images updated. Showing ${frame().name}. Inspect the boxes here, correct them, and run again when needed.`);
  });
  function annotationData(){
    return {format:'smart-relabeling-showcase/v1',simulation:true,sampleDataset:activeDataset,dataset:datasetName(),classes:[className()],note:'Built-in images and model suggestions are synthetic. Boxes are normalized YOLO coordinates; manual edits are real browser interactions. Confidence filtering changes visibility only.',images:images.map(img=>({name:img.name,source:img.builtin?'synthetic fixture':'local user image',width:img.width,height:img.height,reviewed:img.reviewed,protected:protectedImage(img),annotations:img.boxes.map(b=>({class_id:0,x_center:(b.x+b.w/2)/100,y_center:(b.y+b.h/2)/100,width:b.w/100,height:b.h/100,origin:b.human?'human':'scripted suggestion'})),yolo_txt:img.boxes.map(b=>`0 ${[(b.x+b.w/2)/100,(b.y+b.h/2)/100,b.w/100,b.h/100].map(n=>n.toFixed(6)).join(' ')}`).join('\n')}))};
  }
  function downloadJSON(data,suffix){
    const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`${datasetName().replace(/[^a-z0-9_-]+/gi,'-').slice(0,60)||'dataset'}-${suffix}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  $('export-labels').addEventListener('click',()=>{downloadJSON(annotationData(),'annotations');status('Annotation JSON exported, including normalized boxes and per-image YOLO text. No image pixels are included.');});
  $('build-model').addEventListener('click',()=>{
    if(!reviewedCount()||trainingTimer!==null)return;
    invalidateTraining();
    const config={sampleDataset:activeDataset,dataset:datasetName(),class:className(),imageCount:images.length,reviewedCount:reviewedCount(),boxCount:images.reduce((n,i)=>n+i.boxes.length,0),exampleBaseModel:'yolo11m.pt',epochs:Number($('epochs').value)};
    let tick=0;const totalTicks=60;
    $('build-model').disabled=true;$('cancel-build').hidden=false;$('epochs').disabled=true;
    const points=[];
    trainingTimer=setInterval(()=>{
      tick++;
      const pct=Math.round(tick/totalTicks*100);
      $('training-bar').style.width=pct+'%';$('training-progress').setAttribute('aria-valuenow',String(pct));
      if(pct<20){$('training-state').textContent='Augmentation preview';$('training-log').textContent='Illustrating local dataset preparation and augmentation. No files are generated.';}
      else{
        const fraction=(pct-20)/80,epoch=Math.max(1,Math.round(fraction*config.epochs));
        $('training-state').textContent=`Example epoch ${epoch} / ${config.epochs}`;
        $('training-log').textContent='Illustrating training progress. This curve is scripted, not measured loss or accuracy.';
        points.push(`${(35+fraction*505).toFixed(1)},${(35+130*(1-Math.exp(-fraction*4))+Math.sin(tick*1.8)*3).toFixed(1)}`);
        $('loss-line').setAttribute('d',points.map((p,i)=>(i?'L':'M')+p).join(' '));
      }
      if(tick>=totalTicks){
        stopTraining();$('epochs').disabled=false;$('cancel-build').hidden=true;$('build-model').disabled=false;
        trainedRun={format:'smart-relabeling-demo-run/v1',simulation:true,containsTrainedWeights:false,config,note:'Illustrative workflow summary only. No inference, augmentation, training, loss measurement, mAP evaluation or model export was executed.',annotations:annotationData()};
        $('training-state').textContent='Preview complete ✓';$('training-log').textContent='Dataset prepared → augmentation illustrated → training illustrated → run summary ready. No trained weights or measured accuracy were produced.';
        $('download-run').hidden=false;status('Training preview complete. Download the demo run summary to inspect configuration and annotations.');
      }
    },70);
    updateSummaries();
  });
  $('cancel-build').addEventListener('click',()=>{invalidateTraining();$('epochs').disabled=false;$('training-state').textContent='Preview cancelled';updateSummaries();status('Training preview cancelled. You can start again.');});
  $('download-run').addEventListener('click',()=>{if(trainedRun)downloadJSON(trainedRun,'demo-run');});
  for(const id of ['dataset-name','class-name','epochs'])$(id).addEventListener(id==='epochs'?'change':'input',()=>{
    invalidateTraining();$('epochs').disabled=false;
    if(id==='class-name')renderReview();updateSummaries();
  });
  $('stage-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b)go(b.dataset.stage);});
  $('stage-tabs').addEventListener('keydown',e=>{
    let i=stages.indexOf(stage);
    if(['ArrowDown','ArrowRight'].includes(e.key))i=(i+1)%stages.length;
    else if(['ArrowUp','ArrowLeft'].includes(e.key))i=(i+stages.length-1)%stages.length;
    else if(e.key==='Home')i=0;else if(e.key==='End')i=stages.length-1;else return;
    e.preventDefault();go(stages[i],true);
  });
  for(const b of document.querySelectorAll('[data-go]'))b.addEventListener('click',()=>go(b.dataset.go,true));
  $('start-review').addEventListener('click',()=>go('review',true));
  document.addEventListener('keydown',e=>{
    if(stage!=='review'||/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||!$('workspace').contains(document.activeElement))return;
    if(e.key==='Escape'){selected=null;setTool('select');renderReview();}
    if(e.key==='Delete'&&selected!==null){e.preventDefault();deleteBox();}
  });
  $('image-input').addEventListener('change',async e=>{
    const generation=uploadGeneration;
    const files=Array.from(e.target.files);
    const messages=[];let added=0;
    for(const file of files){
      if(images.length>=20){messages.push('Maximum 20 images per dataset.');break;}
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)){messages.push(`${file.name}: use JPG, PNG or WebP.`);continue;}
      if(file.size>8*1024*1024){messages.push(`${file.name}: exceeds 8 MB.`);continue;}
      const url=URL.createObjectURL(file);
      try{
        const img=new Image();img.src=url;await img.decode();
        if(generation!==uploadGeneration){URL.revokeObjectURL(url);break;}
        if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>30000000)throw new Error('Image exceeds the 30-megapixel limit.');
        if(images.length>=20){URL.revokeObjectURL(url);messages.push('Maximum 20 images per dataset.');break;}
        images.push({name:file.name,builtin:false,url,width:img.naturalWidth,height:img.naturalHeight,boxes:[],reviewed:false,edited:false});uploadURLs.add(url);added++;
      }catch(error){URL.revokeObjectURL(url);if(generation===uploadGeneration)messages.push(`${file.name}: ${error.message}`);}
    }
    if(generation!==uploadGeneration)return;
    if(added){invalidateTraining();renderDataset();renderReview();updateSummaries();}
    e.target.value='';status([added?`${added} local image(s) added. Draw labels manually; no inference runs on uploads.`:'',...messages].filter(Boolean).join(' ')||'No images selected.');
  });
  function reset(){
    uploadGeneration++;pointer=null;stopTraining();
    for(const url of uploadURLs)URL.revokeObjectURL(url);uploadURLs.clear();
    nextId=1;activeDataset='bottles';
    const log='No auto-labeling run yet. Start with suggestions or label objects manually.';
    datasetStates=Object.fromEntries(Object.entries(samples.datasets).map(([key,def])=>[key,{images:samples.createImages(key),name:key+'-study',className:def.className,current:0,round:0,lastCorrectionSignature:null,log}]));
    images=datasetStates.bottles.images;current=0;selected=null;round=0;lastCorrectionSignature=null;threshold=35;
    $('confidence').value='35';$('confidence-value').value='35%';$('dataset-name').value='bottles-study';$('class-name').value='bottle';$('epochs').value='80';$('epochs').disabled=false;$('image-input').value='';
    $('relabel-log').textContent=log;
    invalidateTraining();setTool('select');renderDataset();renderReview();go('prepare');status('Demo reset. Choose from bottles, cars, and spare parts: 10 synthetic images each.');
  }
  $('reset').addEventListener('click',reset);
  window.addEventListener('pagehide',()=>{stopTraining();for(const url of uploadURLs)URL.revokeObjectURL(url);});
  reset();
})();
