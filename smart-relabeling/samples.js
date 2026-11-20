'use strict';

// Original synthetic illustrations, deliberately separate from simulated predictions.
(() => {
  const datasets = {
    bottles: {title:'Bottles', className:'bottle', mapped:true, description:'Retail shelves · varied counts, sizes and colors', context:'Bottle is a COCO class. Try initial auto-labeling, correct a suggestion, then auto-label again to illustrate learning from edits.'},
    cars: {title:'Cars', className:'car', mapped:true, description:'Parking areas · different vehicles and arrangements', context:'Car is a COCO class. Start with example suggestions and refine them in the review workspace.'},
    parts: {title:'Spare parts', className:'spare_part', mapped:false, description:'Inspection trays · gears, washers and bolts', context:'A custom class with no COCO mapping. Label at least one object manually before previewing auto-labeling from your examples.'}
  };
  function createImages(kind) {
    return Array.from({length:10},(_,index)=>{
      const count=kind==='bottles'?4+index%3:kind==='cars'?3+index%4:5+index%3;
      const objects=Array.from({length:count},(_,i)=>{
        if(kind==='bottles'){
          const y=23+(index*7+i*9)%18;
          return {x:7+i*84/count+(index%3)*.7,y,w:8+(i+index)%3,h:73-y};
        }
        if(kind==='cars')return {x:7+(i%3)*30+(index%3),y:19+Math.floor(i/3)*37+(i+index)%4,w:24,h:20};
        return {x:7+(i%4)*23+(index%3),y:16+Math.floor(i/4)*41+(i+index)%5,w:14+(i+index)%3,h:25+(i+index)%3};
      });
      return {name:`${kind}_${String(index+1).padStart(2,'0')}.svg`,kind,builtin:true,index,width:800,height:480,objects,boxes:[],reviewed:false,edited:false};
    });
  }
  const palette=['#9fac8b','#d2ad78','#708d7c','#b97d61','#a6b8c7','#b3a4be'];
  function bottles(img){
    const shapes=img.objects.map((b,i)=>{
      const x=b.x*8,y=b.y*4.8,w=b.w*8,h=b.h*4.8,caph=h*.07;
      return `<g><ellipse cx="${x+w*.5+8}" cy="${y+h+7}" rx="${w*.65}" ry="9" fill="#4c483b" opacity=".13"/>
      <path d="M${x+w*.3} ${y+caph}h${w*.4}v${h*.12}q0 ${h*.05} ${w*.2} ${h*.1}v${h*.65}q0 ${h*.06} -${w*.1} ${h*.06}h-${w*.8}q-${w*.1} 0 -${w*.1} -${h*.06}v-${h*.65}q${w*.2} -${h*.05} ${w*.2} -${h*.1}z" fill="${palette[(i+img.index)%palette.length]}"/>
      <rect x="${x+w*.28}" y="${y}" width="${w*.44}" height="${caph*1.5}" rx="3" fill="#435549"/>
      <rect x="${x+4}" y="${y+h*.42}" width="${w-8}" height="${h*.35}" rx="1" fill="#f9f3df"/>
      <path d="M${x+w*.25} ${y+h*.54}h${w*.5}M${x+w*.3} ${y+h*.59}h${w*.4}M${x+w*.32} ${y+h*.65}h${w*.36}" stroke="#87917b" stroke-width="2"/>
      <path d="M${x+w*.12} ${y+h*.3}v${h*.48}" stroke="#fff" stroke-width="${w*.06}" stroke-linecap="round" opacity=".25"/></g>`;
    }).join('');
    return `<rect width="800" height="480" fill="#e8e6d9"/><rect y="32" width="800" height="20" fill="#d7d7c9"/><rect y="52" width="800" height="308" fill="#e5e4d6"/>
      <path d="M0 97H800M0 155H800M0 216H800M0 277H800M80 52V360M240 52V360M400 52V360M560 52V360M720 52V360" stroke="#d5d8c8"/>
      <rect y="354" width="800" height="14" fill="#bbc4b1"/><rect y="368" width="800" height="30" fill="#cdd3c1"/><rect y="398" width="800" height="82" fill="#e5e8da"/>${shapes}
      <rect y="365" width="800" height="9" fill="#f3f1e3"/><path d="M0 397H800" stroke="#a3b39c" stroke-width="2"/>
      ${[90,250,410,570,710].map(x=>`<rect x="${x}" y="378" width="38" height="13" rx="1" fill="#f8f7ef"/><path d="M${x+7} 383h23M${x+10} 387h17" stroke="#b4bba9"/>`).join('')}`;
  }
  function cars(img){
    const shapes=img.objects.map((b,i)=>`<g transform="translate(${b.x*8},${b.y*4.8}) scale(${b.w*8/200},${b.h*4.8/100})">
      <ellipse cx="104" cy="91" rx="94" ry="8" fill="#263830" opacity=".18"/>
      <path d="M5 45 31 36 57 8Q65 2 77 2H137Q148 2 156 15L176 36 194 45Q199 47 199 58V81H1V57Q1 48 5 45" fill="${palette[(i+img.index)%palette.length]}"/>
      <path d="M43 35 64 11H97V35ZM105 11H134Q140 11 146 19L159 35H105Z" fill="#47606a"/><path d="M66 12H92M112 12H130" stroke="#b5cbcd" stroke-width="3"/>
      <path d="M6 53H194M104 39V77" stroke="#294939" opacity=".3"/><rect x="179" y="47" width="16" height="9" rx="2" fill="#f9e5b0"/><rect x="1" y="48" width="10" height="9" rx="2" fill="#aa624d"/>
      <circle cx="43" cy="80" r="18" fill="#35483f"/><circle cx="155" cy="80" r="18" fill="#35483f"/><circle cx="43" cy="80" r="9" fill="#bec6bd"/><circle cx="155" cy="80" r="9" fill="#bec6bd"/></g>`).join('');
    return `<rect width="800" height="480" fill="#d9e1d4"/><rect y="55" width="800" height="365" fill="${img.index%2?'#d0d5cb':'#c8cec4'}"/>
      <path d="M15 218H785M15 397H785" stroke="#f6f5e6" stroke-width="4"/>
      <path d="M15 65V210M250 65V210M490 65V210M785 65V210M15 245V390M250 245V390M490 245V390M785 245V390" stroke="#f6f5e6" stroke-width="3"/>
      <path d="M0 428H800" stroke="#aab99e" stroke-width="10"/>${shapes}`;
  }
  function gear(){
    const points=Array.from({length:48},(_,i)=>{
      const angle=i*Math.PI/24,r=i%4<2?47:39;
      return `${50+Math.cos(angle)*r},${50+Math.sin(angle)*r}`;
    }).join(' ');
    return `<polygon points="${points}" fill="#859891" stroke="#5f7770" stroke-width="2"/><circle cx="50" cy="50" r="25" fill="#adb9b0"/><circle cx="50" cy="50" r="13" fill="#e3e7de" stroke="#687f77" stroke-width="3"/>`;
  }
  function parts(img){
    const shapes=img.objects.map((b,i)=>{
      const type=(i+img.index)%3;
      const shape=type===0?gear():type===1?'<circle cx="50" cy="50" r="46" fill="#acb8b1" stroke="#698177" stroke-width="3"/><circle cx="50" cy="50" r="25" fill="#e3e7de" stroke="#788d83" stroke-width="4"/><path d="M20 25Q35 10 52 10" fill="none" stroke="#f3f5ee" stroke-width="4"/>':'<path d="M30 3H70L86 22 70 41H60V97H40V41H30L14 22Z" fill="#9aaba4" stroke="#607d71" stroke-width="2"/><path d="M31 22H69M40 49H60M40 59H60M40 69H60M40 79H60M40 89H60" stroke="#567165" stroke-width="3"/>';
      return `<g transform="translate(${b.x*8},${b.y*4.8}) scale(${b.w*8/100},${b.h*4.8/100})">${shape}</g>`;
    }).join('');
    return `<rect width="800" height="480" fill="#c4d0c4"/><rect x="18" y="27" width="764" height="424" rx="18" fill="#e3e7de" stroke="#a5b7a5" stroke-width="6"/>
      <path d="M198 45V435M382 45V435M566 45V435M35 236H765" stroke="#c9d2c6" stroke-width="3"/>${shapes}
      <rect x="29" y="454" width="115" height="16" rx="3" fill="#a6b8a6"/><path d="M40 462H130" stroke="#dde7d9" stroke-width="3"/>`;
  }
  function scene(img){
    if(!img.builtin)return `<image href="${img.url}" width="800" height="${800*img.height/img.width}" preserveAspectRatio="xMidYMid meet"/>`;
    return {bottles,cars,parts}[img.kind](img);
  }
  window.SmartRelabelSamples={datasets,createImages,scene};
})();
