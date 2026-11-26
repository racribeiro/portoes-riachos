import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {rail,wallRect,pillarRect,obstacleRect,envelope,accordionSpan} from './modelo.mjs';

const geometry=new THREE.BoxGeometry(1,1,1);
const cylinder=new THREE.CylinderGeometry(1,1,1,14);
const mats={};
for(const [name,color] of Object.entries({
  floor:0x26333c,street:0x39444c,wall:0x6b8190,cap:0x8195a2,
  teal:0x5eb6bc,orange:0xca8b53,frame:0x27383f,hinge:0xbecbd0,
  rail:0x141b21,lips:0x758893,car:0xe6b35e,rear:0xbca5f2,
  free:0x8cce9c,tyre:0x1b222a,spring:0xe5a565,motor:0x7489b2,obstacle:0xe15e58
})) mats[name]=new THREE.MeshStandardMaterial({color,roughness:.72});
const lineMat=new THREE.LineBasicMaterial({color:0x93f5ff});
const boundsMat=new THREE.LineBasicMaterial({color:0xffa978});
const springGeo=new THREE.TorusGeometry(.073,.008,6,16);
const at=(object,x,y,z)=>object.position.set(x,z,-y);
function box(group,x,y,z,l,d,h,mat,angle=0){
  const mesh=new THREE.Mesh(geometry,mats[mat]);
  at(mesh,x,y,z);
  mesh.scale.set(l,h,d);
  mesh.rotation.y=angle;
  group.add(mesh);
  return mesh;
}
function tube(group,x,y,z,r,h,mat){
  const mesh=new THREE.Mesh(cylinder,mats[mat]);
  at(mesh,x,y,z);
  mesh.scale.set(r,h,r);
  group.add(mesh);
  return mesh;
}
function beam(group,a,b,z,d,h,mat){
  return box(group,(a.x+b.x)/2,(a.y+b.y)/2,z,Math.hypot(a.x-b.x,a.y-b.y),d,h,mat,
    Math.atan2(b.y-a.y,b.x-a.x));
}
function line(group,points,material){
  const g=new THREE.BufferGeometry().setFromPoints(points.map(([x,y,z])=>new THREE.Vector3(x,z,-y)));
  group.add(new THREE.Line(g,material));
}
function railProfile(group,points){
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    beam(group,a,b,.012,.126,.024,'rail');
    const angle=Math.atan2(b.y-a.y,b.x-a.x);
    for(const side of [-.051,.051]){
      const x=-Math.sin(angle)*side,y=Math.cos(angle)*side;
      beam(group,{x:a.x+x,y:a.y+y},{x:b.x+x,y:b.y+y},.028,.024,.032,'lips');
    }
  }
  for(const p of [points[0],points.at(-1)]) box(group,p.x,p.y,.045,.085,.13,.09,'frame');
}
function clear(group){
  group.traverse(o=>{if(o.isLine) o.geometry.dispose();});
  group.clear();
}

export function makeScene(viewport,type){
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.setClearColor(0x25323c);
  renderer.domElement.setAttribute('aria-label','Vista interativa 3D do portão');
  viewport.append(renderer.domElement);
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xe3f2ff,0x829098,2.15));
  const sun=new THREE.DirectionalLight(0xffecd3,2.4);
  sun.position.set(-3,8,6);
  scene.add(sun);
  const grid=new THREE.GridHelper(22,44,0x48616e,0x354853);
  grid.position.y=.001;
  scene.add(grid);
  const floor=new THREE.Group(),walls=new THREE.Group(),fixed=new THREE.Group(),
    moving=new THREE.Group(),technical=new THREE.Group(),fill=new THREE.Group();
  scene.add(floor,walls,fixed,moving,technical,fill);
  const camera=new THREE.OrthographicCamera(-5,5,4,-4,.01,100);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;
  controls.minZoom=.45;
  controls.maxZoom=6;
  controls.maxPolarAngle=Math.PI/2+.04;
  let view='perspective',p;
  let dirty=true;
  controls.addEventListener('change',()=>{dirty=true;});
  function resize(){
    const w=viewport.clientWidth,h=viewport.clientHeight;
    if(!p||!w||!h) return;
    renderer.setSize(w,h,false);
    const scale=Math.max(8.8,p.width+3,p.radius+p.depth+2);
    const span=scale*Math.max(1,w/h*.84);
    camera.left=-span/2;
    camera.right=span/2;
    camera.top=span*h/w/2;
    camera.bottom=-camera.top;
    camera.updateProjectionMatrix();
    dirty=true;
  }
  new ResizeObserver(resize).observe(viewport);
  function setView(value){
    view=value;
    viewport.dataset.plan=view==='plan';
    controls.enableRotate=view!=='plan';
    controls.enablePan=view!=='plan';
    camera.zoom=view==='mechanism'?1.55:1;
    const center=p.width/2-.45;
    const depth=view==='plan'?Math.max(1,(p.radius+p.depth)/2-.65):1.5;
    const height=view==='plan'?0:view==='mechanism'?.2:.6;
    controls.target.set(center,height,-depth);
    const vectors={perspective:[5,6,10],plan:[0,12,.0001],street:[0,3.2,12],
      inside:[0,4,-12],mechanism:[4,2.2,6]};
    camera.position.copy(controls.target).add(new THREE.Vector3(...vectors[view]));
    camera.updateProjectionMatrix();
    controls.update();
    dirty=true;
  }
  function setup(params){
    const first=!p;
    const reframe=first||params.width!==p.width||params.depth!==p.depth||params.radius!==p.radius;
    p={...params};
    for(const g of [floor,walls,fixed]) clear(g);
    box(floor,0,4,-.055,23,24,.1,'floor');
    box(floor,0,-3,-.005,23,6,.01,'street');
    for(const r of [wallRect(p),pillarRect(p)]){
      box(walls,r.x,r.y,p.height*.53,r.length,r.width,p.height*1.06,'wall');
      box(walls,r.x,r.y,p.height*1.06,r.length+.025,r.width+.025,.045,'cap');
    }
    if(p.obstacle){
      const r=obstacleRect(p);
      box(fixed,r.x,r.y,.19,r.length,r.width,.38,'obstacle');
    }
    if(type===0){
      for(const offset of [0,p.spacing]){
        const r=p.radius-offset,l=Math.PI*r/2;
        const pts=[rail(-p.width-.08,r,offset),
          ...Array.from({length:33},(_,i)=>rail(l*i/32,r,offset)),
          rail(l+p.depth,r,offset)];
        railProfile(fixed,pts);
      }
      box(fixed,-p.radius-.18,p.radius+p.depth-.17,.105,.24,.32,.21,'motor');
    }else{
      const right=p.width*.8;
      const mountY=Math.min(-.055,p.wallY+p.wallDepth/2);
      for(const z of [.25,p.height-.12]){
        beam(walls,{x:p.offset,y:mountY},{x:p.offset,y:0},z,.07,.075,'hinge');
      }
      railProfile(fixed,[{x:p.offset-.1,y:0},{x:right+.08,y:0}]);
      box(fixed,p.offset-.17,.25,.125,.22,.28,.25,'motor');
      beam(fixed,{x:p.offset-.16,y:.12},{x:p.offset-.16,y:.42},.075,.035,.035,'hinge');
      for(const [i,y] of [.17,.35].entries()){
        const end=p.offset+accordionSpan(p)*(i===0?.5:1);
        beam(fixed,{x:p.offset-.16,y},{x:end,y},.037,.028,.036,'motor');
        for(const x of [p.offset-.16,end]) tube(fixed,x,y,.055,i===0?.045:.09,.035,'motor');
      }
    }
    resize();
    if(reframe) setView(view);
  }
  function pose(model,options){
    for(const g of [moving,technical,fill]) clear(g);
    const h=p.height;
    for(const [i,l] of model.leaves.entries()){
      const w=l.length-p.gap, thickness=l.thickness??p.thickness;
      const frame=new THREE.Group(),screen=new THREE.Group();
      for(const group of [frame,screen]){
        at(group,l.x,l.y,0);
        group.rotation.y=l.angle;
      }
      moving.add(frame);
      fill.add(screen);
      const profile=Math.min(.044,w/5);
      for(const x of [-(w-profile)/2,(w-profile)/2])
        box(frame,x,0,h/2+.055,profile,thickness,h,'frame');
      for(const z of [.055+profile/2,h+.055-profile/2])
        box(frame,0,0,z,w,thickness,profile,'frame');
      for(let j=0;j<8;j++){
        const inner=w-profile*2;
        const x=inner*((j+.5)/8-.5);
        box(screen,x,0,h/2+.055,inner/8*.86,thickness*.68,h-2*profile,type===0?'teal':i===4?'motor':'orange');
      }
      line(technical,[[l.a.x,l.a.y,.17],[l.b.x,l.b.y,.17]],lineMat);
    }
    for(const j of [...model.joints,...(model.pivot?[model.pivot]:[])]){
      for(const z of [.24,h*.55,h-.11]) tube(moving,j.x,j.y,z,.027,.12,'hinge');
      line(technical,[[j.x,j.y,.04],[j.x,j.y,h+.16]],lineMat);
    }
    for(const c of model.cars){
      const isRear=model.rear.includes(c);
      box(moving,c.x,c.y,.053,p.cart,.066,.065,isRear?'rear':'car',c.angle);
      box(moving,c.x,c.y,.103,p.cart*.55,.047,.05,'hinge',c.angle);
      box(moving,c.x,c.y,.026,p.cart*.82,.097,.014,'hinge',c.angle);
    }
    model.rear.forEach((b,i)=>{
      if(!b) return;
      const a=model.leaves[i];
      beam(moving,a,b,.117,.08,.052,'frame');
      const fraction=Math.min(.55,.11/Math.max(.001,b.k));
      beam(moving,{x:b.x+(a.x-b.x)*fraction,y:b.y+(a.y-b.y)*fraction},b,.132,.046,.038,'rear');
    });
    model.free.forEach(j=>{
      const tyre=tube(moving,j.x,j.y,.052,.052,.034,'tyre');
      tyre.rotation.x=Math.PI/2;
      tube(moving,j.x,j.y,.115,.028,.11,'free');
      box(moving,j.x+.052,j.y+.035,.12,.044,.046,.11,'frame');
      if(!p.springs) return;
      for(let i=0;i<4;i++){
        const spring=new THREE.Mesh(springGeo,mats.spring);
        at(spring,j.x,j.y,.21+i*.017);
        spring.rotation.x=Math.PI/2;
        moving.add(spring);
      }
      const turn=Array.from({length:14},(_,i)=>{
        const a=.1+i*.26;
        return [j.x+.132*Math.cos(a),j.y+.132*Math.sin(a),.31];
      });
      const [x,y]=turn.at(-1);
      line(technical,turn,boundsMat);
      line(technical,[[x+.045,y,.31],[x,y,.31],[x-.015,y+.045,.31]],boundsMat);
    });
    if(type===1){
      for(const [i,c] of model.cars.entries()){
        beam(moving,c,{x:c.x,y:i===0?.17:.35},.068,.026,.031,'motor');
      }
    }
    const latch=type===0?model.joints.at(-1):model.tip;
    if(latch) box(moving,latch.x,latch.y,h*.52,.065,.055,.10,'car');
    const e=envelope(p,model,type===0?5:4);
    line(technical,[[e.minX,e.minY,.016],[e.maxX,e.minY,.016],[e.maxX,e.maxY,.016],
      [e.minX,e.maxY,.016],[e.minX,e.minY,.016]],boundsMat);
    walls.visible=options.walls;
    fill.visible=options.fill&&view!=='mechanism';
    technical.visible=options.technical||view==='mechanism';
    dirty=true;
  }
  return {setup,setView,pose,draw(){
    controls.update();
    if(dirty){renderer.render(scene,camera);dirty=false;}
  }};
}
