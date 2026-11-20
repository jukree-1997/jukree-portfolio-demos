'use strict';
// Generic geometry for our original synthetic illustrations, not the OpenCV implementation.
(() => {
  const scenarios={
    standard:{title:'Synthetic fixture A',slots:[102.4,117.8,96.5,110.2,106.7]},
    mixed:{title:'Synthetic fixture B',slots:[101.2,114.6,94.1,'empty','unresolved']},
    unavailable:{title:'Synthetic fixture C',slots:['unresolved','empty','unresolved','unresolved','empty']}
  };
  function points(angle,index){
    const half=angle*Math.PI/360,cx=140+index*180,cy=330,r=82;
    return {vertex:{x:cx,y:cy},a:{x:cx-Math.sin(half)*r,y:cy-Math.cos(half)*r},b:{x:cx+Math.sin(half)*r,y:cy-Math.cos(half)*r}};
  }
  function openingAngle({vertex,a,b}){
    if(![vertex,a,b].every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)))return null;
    const u={x:a.x-vertex.x,y:a.y-vertex.y},v={x:b.x-vertex.x,y:b.y-vertex.y};
    const length=Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y);
    if(length<1e-10)return null;
    return Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/length)))*180/Math.PI;
  }
  function measure(slots,bounds){
    return slots.map((slot,index)=>{
      if(typeof slot!=='number')return {position:index+1,state:slot,angle:null,inRange:null};
      const raw=openingAngle(points(slot,index));
      if(raw===null||!Number.isFinite(raw))return {position:index+1,state:'unresolved',angle:null,inRange:null};
      const angle=Math.round(raw*100)/100;
      return {position:index+1,state:'measured',angle,inRange:angle>=bounds.min-1e-9&&angle<=bounds.max+1e-9};
    });
  }
  window.FiberDemoGeometry={scenarios,points,openingAngle,measure};
})();
