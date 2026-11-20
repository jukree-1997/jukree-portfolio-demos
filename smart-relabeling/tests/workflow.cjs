// Behavioral checks for the dependency-free demo, using jsdom as a test-only dependency.
// Run with NODE_PATH pointing to an existing jsdom installation, or install jsdom locally.
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {JSDOM, VirtualConsole} = require('jsdom');

(async () => {
  const downloads = [], urls = new Map(), errors = [];
  let urlIndex = 0;
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => { if (!error.message.includes('Could not parse CSS')) errors.push(error.message); });
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), {
    url:pathToFileURL(path.join(__dirname, '..', 'index.html')).href,
    runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole,
    beforeParse(window) {
      window.URL.createObjectURL = blob => {const url=`blob:test-${++urlIndex}`; urls.set(url,blob); return url;};
      window.URL.revokeObjectURL = url => urls.delete(url);
      window.HTMLAnchorElement.prototype.click = function() {downloads.push({name:this.download,blob:urls.get(this.href)});};
      window.SVGSVGElement.prototype.getScreenCTM = () => ({inverse:()=>({})});
      window.SVGSVGElement.prototype.setPointerCapture = () => {};
      window.SVGSVGElement.prototype.hasPointerCapture = () => false;
      window.DOMPoint = class {constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}};
      window.Image = class {
        constructor(){this.naturalWidth=600;this.naturalHeight=300;}
        async decode(){if(window.failDecode)throw new Error('Invalid image.');}
      };
    }
  });
  try {
    await new Promise(resolve=>dom.window.addEventListener('load',resolve,{once:true}));
    const w=dom.window,d=w.document,$=id=>d.getElementById(id);
    const click=id=>$(id).click();
    const choose=key=>d.querySelector(`[data-dataset="${key}"]`).click();
    const input=(id,value,event='input')=>{$(id).value=value;$(id).dispatchEvent(new w.Event(event,{bubbles:true}));};
    const exported=async()=>{click('export-labels');const item=downloads.at(-1);return new Promise((resolve,reject)=>{const reader=new w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.onerror=reject;reader.readAsText(item.blob);});};
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const until=async test=>{for(let i=0;i<100;i++){if(test())return;await wait(75);}throw new Error('Timed out waiting for simulated training.');};
    const checks=[];
    assert.equal(d.querySelectorAll('[role=tab]').length,3);
    assert.equal(d.querySelectorAll('.dataset-choice').length,3);
    for(const kind of ['bottles','cars','parts']){
      const fixtures=w.SmartRelabelSamples.createImages(kind);
      assert.equal(fixtures.length,10);
      assert.equal(new Set(fixtures.map(img=>w.SmartRelabelSamples.scene(img))).size,10);
      assert.ok(fixtures.every(img=>img.boxes.length===0));
      for(const img of fixtures)for(const b of img.objects){
        assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=100&&b.y+b.h<=100);
      }
    }
    checks.push('Three workflow tabs; bottles, cars and spare parts each contain ten distinct unlabeled synthetic images.');
    assert.equal(d.querySelectorAll('.sample-card').length,10);
    assert.equal($('panel-prepare').hidden,false);
    assert.equal($('run-relabel').disabled,false);
    assert.equal($('build-model').disabled,true);
    click('start-review');
    assert.equal($('panel-review').hidden,false);
    assert.equal($('box-count').textContent,'0 / 0');
    click('run-relabel');
    assert.equal($('panel-review').hidden,false);
    assert.equal($('box-count').textContent,'3 / 3');
    let data=await exported();
    assert.equal(data.images[0].annotations.length,3);
    input('confidence','95');
    assert.equal($('box-count').textContent,'0 / 3');
    assert.equal((await exported()).images[0].annotations.length,3);
    checks.push('Confidence filtering preserves hidden annotations in export.');

    click('add-box');
    assert.equal($('box-count').textContent,'1 / 4');
    input('box-x','99','change');
    assert.equal(Number($('box-x').value),86);
    click('delete-box');
    input('confidence','35');
    const initialCount=(await exported()).images[0].annotations.length;
    click('tool-draw');
    const pointer=(type,x,y)=>canvasEvent(type,{clientX:x,clientY:y,button:0,pointerId:1});
    function canvasEvent(type,fields){const e=new w.Event(type,{bubbles:true});Object.assign(e,fields);$('annotation-canvas').dispatchEvent(e);}
    pointer('pointerdown',640,160);pointer('pointermove',735,360);pointer('pointerup',735,360);
    data=await exported();
    assert.equal(data.images[0].annotations.length,initialCount+1);
    assert.equal(data.images[0].annotations.at(-1).origin,'human');
    checks.push('Drawing adds a human box; numeric edits clamp to image boundaries; deletion works.');

    click('verify-image');
    const protectedBefore=(await exported()).images[0];
    assert.equal(protectedBefore.reviewed,true);
    assert.equal($('image-caption').textContent,'bottles_02.svg');
    assert.equal((await exported()).images[1].reviewed,false);
    click('tab-review');
    assert.equal($('run-relabel').disabled,false);
    click('run-relabel');
    data=await exported();
    assert.deepEqual(data.images[0],protectedBefore);
    assert.equal(data.images[1].annotations.length,5);
    assert.equal($('panel-review').hidden,false);
    assert.equal($('image-caption').textContent,data.images[1].name);
    click('run-relabel');
    assert.match($('relabel-log').textContent,/reused/);
    checks.push('Relabel protects human-reviewed labels, updates other samples and handles unchanged corrections.');

    click('tab-prepare');
    input('dataset-name','my-bottle-study');
    choose('cars');
    assert.equal(d.querySelectorAll('.sample-card').length,10);
    assert.equal($('class-name').value,'car');
    click('start-review');
    assert.equal((await exported()).images[0].annotations.length,0);
    click('run-relabel');
    click('verify-image');
    const carBefore=(await exported()).images[0];
    click('tab-prepare');choose('parts');click('start-review');
    assert.equal($('run-relabel').disabled,true);
    assert.match($('relabel-requirement').textContent,/custom class/);
    click('add-box');
    const partBefore=(await exported()).images[0];
    assert.equal($('run-relabel').disabled,false);
    click('run-relabel');
    assert.equal($('panel-review').hidden,false);
    assert.deepEqual((await exported()).images[0],partBefore);
    assert.ok((await exported()).images[1].annotations.length>0);
    click('tab-prepare');choose('cars');
    assert.deepEqual((await exported()).images[0],carBefore);
    choose('bottles');
    assert.equal($('dataset-name').value,'my-bottle-study');
    assert.equal($('class-name').value,'bottle');
    assert.deepEqual((await exported()).images[0],protectedBefore);
    checks.push('Dataset selection preserves separate labels, names and review progress. Cars auto-label immediately; custom spare parts require a human seed and preserve it.');
    input('class-name','<img src=x onerror=alert(1)>');
    click('tab-review');
    assert.equal($('annotation-list').querySelector('img'),null);
    assert.ok($('annotation-list').textContent.includes('<img'));
    input('class-name','bottle');
    checks.push('User class labels are rendered as text, including markup-shaped input.');

    const setFiles=async files=>{Object.defineProperty($('image-input'),'files',{configurable:true,value:files});$('image-input').dispatchEvent(new w.Event('change'));await wait(20);};
    await setFiles([new w.File(['not svg'],'unsafe.svg',{type:'image/svg+xml'})]);
    assert.match($('app-status').textContent,/use JPG/);
    assert.equal((await exported()).images.length,10);
    await setFiles([new w.File(['test fixture'],'local-test.png',{type:'image/png'})]);
    data=await exported();
    assert.equal(data.images.length,11);
    assert.equal(data.images[10].width,600);
    assert.equal(data.images[10].annotations.length,0);
    click('tab-review');click('run-relabel');
    assert.equal((await exported()).images[10].annotations.length,0);
    checks.push('Local uploads start unannotated and are skipped by scripted relabeling; unsupported types are rejected. Image decoding is mocked.');

    click('tab-build');click('build-model');
    assert.equal($('epochs').disabled,true);
    await until(()=>!$('download-run').hidden);
    assert.equal($('training-progress').getAttribute('aria-valuenow'),'100');
    click('download-run');
    const run=await new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.readAsText(downloads.at(-1).blob);});
    assert.equal(run.simulation,true);assert.equal(run.containsTrainedWeights,false);
    assert.equal(run.config.imageCount,11);
    click('tab-review');click('add-box');
    assert.equal($('download-run').hidden,true);
    assert.equal($('epochs').disabled,false);
    click('verify-image');click('tab-build');click('build-model');click('cancel-build');
    assert.equal($('training-state').textContent,'Preview cancelled');
    assert.equal($('epochs').disabled,false);
    click('build-model');click('tab-review');click('add-box');
    assert.equal($('epochs').disabled,false);
    assert.equal($('download-run').hidden,true);
    checks.push('Build completion exports a clearly simulated summary; edits invalidate it and cancel active previews without leaving controls locked.');

    click('verify-image');click('tab-build');click('build-model');click('reset');
    await wait(150);
    assert.equal($('training-progress').getAttribute('aria-valuenow'),'0');
    assert.equal(d.querySelectorAll('.sample-card').length,10);
    assert.equal($('panel-prepare').hidden,false);
    // A reset while an asynchronous local upload is decoding must not reinsert that image.
    const files=[new w.File(['test fixture'],'late.png',{type:'image/png'})];
    const pending=setFiles(files);click('reset');await pending;
    assert.equal((await exported()).images.length,10);
    checks.push('Reset stops active previews, clears uploaded files and cancels pending uploads.');

    const switching=setFiles([new w.File(['fixture'],'belongs-to-bottles.png',{type:'image/png'})]);
    choose('cars');await switching;
    assert.equal((await exported()).images.length,10);
    choose('bottles');
    assert.equal((await exported()).images.length,10);
    click('start-review');click('run-relabel');click('verify-image');click('tab-build');click('build-model');
    click('tab-prepare');choose('cars');await wait(150);
    assert.equal($('epochs').disabled,false);
    assert.equal($('download-run').hidden,true);
    assert.equal($('training-progress').getAttribute('aria-valuenow'),'0');
    checks.push('Switching datasets cancels pending uploads and training without leaking images or run summaries into another dataset.');
    click('reset');

    $('tab-prepare').focus();$('tab-prepare').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
    assert.equal(d.activeElement.id,'tab-review');
    assert.equal($('panel-review').hidden,false);
    click('add-box');
    const beforeDelete=(await exported()).images[0].annotations.length;
    $('annotation-list').querySelector('button').click();
    d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Delete',bubbles:true}));
    assert.equal((await exported()).images[0].annotations.length,beforeDelete-1);
    assert.equal(d.activeElement.id,'add-box');
    checks.push('Workflow tabs support arrow keys; label selection retains focus and Delete removes the selected box.');
    data=await exported();
    for(const img of data.images)for(const b of img.annotations){
      assert.ok(b.width>0&&b.height>0);
      assert.ok(b.x_center-b.width/2>=-1e-8&&b.x_center+b.width/2<=1+1e-8);
      assert.ok(b.y_center-b.height/2>=-1e-8&&b.y_center+b.height/2<=1+1e-8);
    }
    click('reset');click('start-review');
    click('verify-image');
    assert.equal($('image-caption').textContent,'bottles_02.svg');
    d.querySelector('[data-image="3"]').click();click('verify-image');
    d.querySelector('[data-image="2"]').click();click('verify-image');
    assert.equal($('image-caption').textContent,'bottles_05.svg');
    d.querySelector('[data-image="9"]').click();click('verify-image');
    assert.equal($('image-caption').textContent,'bottles_02.svg');
    for(let i=0;i<6;i++)click('verify-image');
    assert.equal($('verified-count').textContent,'10 / 10 reviewed');
    assert.match($('app-status').textContent,/All images reviewed/);
    const lastImage=$('image-caption').textContent;
    click('verify-image');
    assert.equal($('image-caption').textContent,lastImage);
    assert.equal($('verified-count').textContent,'9 / 10 reviewed');
    assert.match($('app-status').textContent,/Review reopened/);
    checks.push('Mark reviewed advances to the next unreviewed image, skips reviewed images, wraps, and stays put on completion or reopening.');
    assert.deepEqual(errors,[]);
    console.log(checks.map(s=>'PASS '+s).join('\n'));
    console.log('PASS No uncaught script errors. Exports contain normalized, in-bounds annotations.');
    console.log('LIMIT jsdom does not render layout; pointer coordinates and image decoding are mocked. Real-browser visual QA remains separate.');
  } finally {dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
