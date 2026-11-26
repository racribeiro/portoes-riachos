export const initial = {
  width:4.5, height:2, radius:.9, spacing:.3, stroke:.15, depth:4.8,
  thickness:.045, gap:.14, cart:.12, wall:1, wallY:-.18, wallDepth:.12,
  offset:-.88, foldThickness:.022, fold:85, swing:90, springs:true, obstacle:false, ox:2.2, oy:.55
};

export const rad = Math.PI / 180;
const point = (x,y) => ({x,y});
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const dot = (a,b) => a.x*b.x+a.y*b.y;
const arc = r => Math.PI*r/2;

export function rail(s,r,offset=0) {
  if (s<=0) return {...point(-s,offset), angle:0};
  if (s>=arc(r)) return {...point(-r,offset+r+s-arc(r)), angle:-Math.PI/2};
  return {...point(-r*Math.sin(s/r),offset+r*(1-Math.cos(s/r))), angle:-s/r};
}

function rearContact(m,n,p) {
  const r=p.radius-p.spacing;
  const candidates=[];
  const add=(k,accept,angle)=>{
    const b=point(m.x+k*n.x,m.y+k*n.y);
    if (Number.isFinite(k)&&k>=0&&accept(b)) candidates.push({...b,k,angle:angle(b)});
  };
  add((p.spacing-m.y)/n.y,b=>b.x>=-1e-8,()=>0);
  add((-r-m.x)/n.x,b=>b.y>=p.radius-1e-8,()=>-Math.PI/2);
  const q=point(m.x,m.y-p.radius);
  const projection=dot(q,n);
  const discriminant=projection**2-dot(q,q)+r*r;
  if (discriminant>=0) {
    for(const sign of [-1,1]) {
      add(-projection+sign*Math.sqrt(discriminant),b=>b.x<=1e-8&&b.y<=p.radius+1e-8,
        b=>-Math.atan2(-b.x,p.radius-b.y));
    }
  }
  return candidates.sort((a,b)=>a.k-b.k)[0];
}

function leaf(a,b,thickness) {
  return {a,b,thickness,length:distance(a,b),x:(a.x+b.x)/2,y:(a.y+b.y)/2,angle:Math.atan2(b.y-a.y,b.x-a.x)};
}

export function curved(p,t) {
  const w=p.width/5;
  let s=t*(arc(p.radius)+p.width);
  const joints=[{...rail(s,p.radius),s}];
  for(let i=1;i<=5;i++){
    const previous=joints[i-1];
    let low=s-2*w, high=s;
    while(distance(rail(low,p.radius),previous)<w) low-=w;
    for(let j=0;j<40;j++){
      const mid=(low+high)/2;
      if(distance(rail(mid,p.radius),previous)>w) low=mid;
      else high=mid;
    }
    s=(low+high)/2;
    joints.push({...rail(s,p.radius),s});
  }
  const leaves=joints.slice(1).map((b,i)=>leaf(joints[i],b));
  const rear=leaves.map(m=>rearContact(m,point(-Math.sin(m.angle),Math.cos(m.angle)),p));
  return {joints,leaves,rear,cars:[...joints,...rear.filter(Boolean)],free:[]};
}

export const accordionSpan = p => p.width*.8-p.offset;

export function accordion(p,theta,phi) {
  const w=accordionSpan(p)/4, dx=w*Math.cos(theta), dy=w*Math.sin(theta);
  const joints=Array.from({length:5},(_,i)=>point(p.offset+i*dx,i%2?dy:0));
  const pivot=point(p.width,0);
  const tip=point(p.width-(p.width/5)*Math.cos(phi),(p.width/5)*Math.sin(phi));
  const leaves=joints.slice(1).map((b,i)=>leaf(joints[i],b,p.foldThickness));
  leaves.push(leaf(tip,pivot));
  return {joints,leaves,rear:[],cars:[joints[2],joints[4]],free:[joints[1],joints[3]],pivot,tip,theta,phi};
}

const rect=(x,y,length,width,angle=0)=>({x,y,length,width,angle});
export function panel(p,l) {return rect(l.x,l.y,l.length-p.gap,l.thickness??p.thickness,l.angle);}
export function wallRect(p) {return rect(-p.wall/2,p.wallY,p.wall,p.wallDepth);}
export function pillarRect(p) {return rect(p.width+.22,-.06,.24,.28);}
export function obstacleRect(p) {return rect(p.ox,p.oy,.32,.32);}
export function carRect(p,c) {return rect(c.x,c.y,p.cart,Math.min(p.cart,.09),c.angle??0);}
const axes=r=>[point(Math.cos(r.angle),Math.sin(r.angle)),point(-Math.sin(r.angle),Math.cos(r.angle))];
function clearance(a,b) {
  const u=axes(a),v=axes(b), delta=point(b.x-a.x,b.y-a.y);
  return Math.max(...[...u,...v].map(n=>Math.abs(dot(delta,n))-
    (a.length*Math.abs(dot(u[0],n))+a.width*Math.abs(dot(u[1],n))+
     b.length*Math.abs(dot(v[0],n))+b.width*Math.abs(dot(v[1],n)))/2));
}
function corners(r){
  const [u,v]=axes(r);
  return [-1,1].flatMap(i=>[-1,1].map(j=>point(r.x+i*u.x*r.length/2+j*v.x*r.width/2,
    r.y+i*u.y*r.length/2+j*v.y*r.width/2)));
}
export function envelope(p,pose,count=pose.leaves.length){
  const rs=pose.leaves.slice(0,count).map(l=>panel(p,l));
  rs.push(...pose.cars.map(c=>carRect(p,c)));
  rs.push(...pose.free.map(c=>rect(c.x,c.y,.105,.105)));
  if(pose.pivot) rs.push(...pose.joints.map(c=>rect(c.x,c.y,.054,.054)));
  const points=rs.flatMap(corners);
  return {minX:Math.min(...points.map(v=>v.x)),maxX:Math.max(...points.map(v=>v.x)),
    minY:Math.min(...points.map(v=>v.y)),maxY:Math.max(...points.map(v=>v.y))};
}

export function validate(p,pose,study=false) {
  if(p.radius<=p.spacing||p.gap>=p.width/5) return {error:'Dimensões incompatíveis.'};
  if(pose.rear.some(c=>!c)) return {error:'Apoio traseiro sem interseção admissível.'};
  if(pose.rear.some(c=>c.k>p.spacing+1e-4||p.spacing-c.k>p.stroke+1e-4))
    return {error:'Curso do apoio traseiro excedido.'};
  if(pose.rear.length&&pose.cars.some(c=>c.y>p.radius+p.depth-p.cart/2))
    return {error:'Profundidade insuficiente para os carros e batentes.'};
  const bodies=pose.leaves.map(l=>panel(p,l));
  const supports=[...pose.cars.map(c=>carRect(p,c)),...pose.free.map(c=>rect(c.x,c.y,.10,.10))];
  const fixtures=[['muro',wallRect(p)],['pilar direito',pillarRect(p)]];
  if(p.obstacle&&!study) fixtures.push(['obstáculo',obstacleRect(p)]);
  let near=false;
  function check(a,b,label){
    const gap=clearance(a,b);
    near ||=gap<.015;
    return gap<-.0001 ? {error:'Colisão · '+label} : null;
  }
  for(const [i,body] of bodies.entries()){
    for(const [j,other] of bodies.entries()){
      if(j<=i) continue;
      const issue=check(body,other,'folhas '+(i+1)+' e '+(j+1));
      if(issue) return issue;
    }
  }
  for(const [i,car] of supports.entries()){
    for(const [j,other] of supports.entries()){
      if(j<=i) continue;
      const issue=check(car,other,'apoios '+(i+1)+' e '+(j+1));
      if(issue) return issue;
    }
  }
  for(const b of [...bodies,...supports]){
    for(const [name,f] of fixtures){
      const issue=check(b,f,name);
      if(issue) return issue;
    }
  }
  return {near};
}

export function foldLimit(p){
  const max=Math.min(p.fold,89.9)*rad;
  for(let angle=0;angle<=max;angle+=.2*rad){
    if(validate(p,accordion(p,angle,p.swing*rad),true).error)
      return Math.max(0,angle-.2*rad);
  }
  return validate(p,accordion(p,max,p.swing*rad),true).error ? max-.2*rad : max;
}

export function usefulWidth(p,pose){
  let right=0;
  const ranges=pose.leaves.map(l=>corners(panel(p,l))).filter(c=>Math.min(...c.map(v=>v.y))<.05)
    .map(c=>[Math.max(0,Math.min(...c.map(v=>v.x))-.025),Math.min(p.width,Math.max(...c.map(v=>v.x))+.025)])
    .filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  let best=0;
  for(const [a,b] of ranges){
    best=Math.max(best,a-right);
    right=Math.max(right,b);
  }
  return Math.max(best,p.width-right);
}
