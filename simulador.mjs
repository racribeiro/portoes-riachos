import {initial,rad,curved,accordion,validate,foldLimit,envelope,usefulWidth,accordionSpan} from './modelo.mjs';
import {makeScene} from './visual.mjs';

const $=selector=>document.querySelector(selector);
const number=(n,places=2)=>n.toLocaleString('pt-PT',{minimumFractionDigits:places,maximumFractionDigits:places});
const degree=n=>number(n/rad,1)+'°';
const meters=n=>number(n)+' m';
const smooth=t=>t*t*(3-2*t);
const fieldDefinitions=[
  ['width','Largura útil (m)',1,12,.05],['height','Altura (m)',.5,4,.05],
  ['radius','Raio dianteiro (m)',.15,4,.01],['spacing','Distância entre carris (m)',.05,1,.01],
  ['stroke','Curso traseiro (m)',0,1,.001],['depth','Troço lateral útil (m)',.2,15,.05],
  ['thickness','Espessura da folha (m)',.015,.25,.005],['gap','Folga entre painéis (m)',.01,.5,.005],
  ['cart','Comprimento do carro (m)',.04,.4,.01],['wall','Largura do muro (m)',.1,4,.05],
  ['wallY','Posição do muro em y (m)',-3,3,.01],['wallDepth','Espessura do muro (m)',.04,1,.01],
  ['offset','Recuo de J0 em x (m)',-2,0,.01],['foldThickness','Espessura das folhas A (m)',.015,.25,.001],['fold','Batente de A (°)',5,89,1],
  ['swing','Batente de B (°)',5,120,1],['ox','Obstáculo em x (m)',-3,12,.05],
  ['oy','Obstáculo em y (m)',-.5,15,.05]
];
const parameters={...initial};
const fields=new Map();
for(const [key,label,min,max,step] of fieldDefinitions){
  const wrapper=document.createElement('label');
  const input=document.createElement('input');
  input.type='number';
  Object.assign(input,{min,max,step,value:initial[key]});
  wrapper.append(label,input);
  $('#fields').append(wrapper);
  fields.set(key,input);
  input.addEventListener('change',()=>{
    if(!Number.isFinite(input.valueAsNumber)) input.value=parameters[key];
    input.value=Math.min(max,Math.max(min,input.valueAsNumber));
    applyParameters();
  });
}

let view='perspective';
let foldMax=0;
let p={...parameters};
const layers={walls:true,fill:true,technical:false};
const descriptions=[
  {title:'Recolha em curva',category:'Dois carris · 5 folhas',keys:[['Folhas','#5eb6bc'],['Carros dianteiros','#e6b35e'],['Apoios retráteis','#bca5f2']],
    metrics:['Abertura útil','Retração máxima','Dobra máxima']},
  {title:'Acordeão + batente',category:'Carril reto · 4 + 1 folhas',keys:[['Acordeão A','#ca8b53'],['Folha B','#7489b2'],['Carros cativos','#e6b35e'],['Rodas livres','#8cce9c']],
    metrics:['Abertura útil','Ângulo de A','Ângulo de B']}
];

function makeSimulation(type,desc){
  const card=$('#card').content.firstElementChild.cloneNode(true);
  $('#cards').append(card);
  const find=s=>card.querySelector(s);
  find('h2').textContent=desc.title;
  find('.category').textContent=desc.category;
  find('.legend').innerHTML=desc.keys.map(([label,color])=>'<span style="--key:'+color+'">'+label+'</span>').join('');
  find('.metrics').innerHTML=desc.metrics.map(label=>'<div>'+label+'<strong></strong></div>').join('');
  find('.pedestrian').hidden=!type;
  const scene=makeScene(find('.viewport'),type);
  const range=find('.position input');
  const swingRange=find('.swing-range');
  const buttons=[...card.querySelectorAll('[data-action]')];
  const status=find('.status');
  const out=find('output');
  const metrics=[...card.querySelectorAll('.metrics strong')];
  const note=find('.note');
  const readout=find('.readout div');
  let a=0,b=0,job=null,paused=false,issue='',blocked=false,plan=[];
  let data,invalid=false;
  const getPose=(x,y)=>type?accordion(p,x*foldMax,y*p.swing*rad):curved(p,x);
  const put=(element,value)=>{if(element.textContent!==value) element.textContent=value;};

  function update(redraw=true){
    data=getPose(a,b);
    if(redraw) scene.pose(data,layers);
    const validation=validate(p,data);
    const closed=a===0&&b===0;
    const opened=a===1&&(!type||b===1);
    const current=issue?(blocked?'Bloqueado':'Falha geométrica'):validation.error?'Falha geométrica':
      paused?'Em pausa':job?(job.to>job.from?'Em abertura':'Em fecho'):
      closed?'Fechado':opened?'Aberto':'Parcialmente aberto';
    put(status,current);
    status.dataset.alert=Boolean(issue||validation.error);
    range.value=Math.round(a*1000);
    swingRange.value=Math.round(b*1000);
    swingRange.disabled=range.disabled=invalid;
    for(const button of buttons){
      const action=button.dataset.action;
      button.disabled=invalid||(action==='pause'&&(!job||paused))||
        (action==='resume'&&(!job||!paused))||
        (['open','close','openB','closeB'].includes(action)&&Boolean(job)&&!paused);
    }
    put(out,type&&b>0?Math.round(a*100)+'% · B '+Math.round(b*100)+'%':Math.round(a*100)+'%');
    put(metrics[0],meters(closed?0:usefulWidth(p,data)));
    const folds=data.leaves.slice(1,type?4:5).map((l,i)=>l.angle-data.leaves[i].angle);
    const warnings=[];
    if(issue||validation.error) warnings.push(issue||validation.error);
    else if(validation.near) warnings.push('Proximidade entre componentes.');
    const e=envelope(p,data,type?4:5);
    if(type){
      put(metrics[1],degree(data.theta));
      put(metrics[2],degree(data.phi));
      if(!p.springs) warnings.push('Molas desativadas. O sentido de arranque depende do modelo ideal.');
      else if(a===0) warnings.push('Molas pré-carregadas para iniciar a dobra para o interior.');
      if(a===1){
        if(e.maxX>0) warnings.push(meters(e.maxX)+' do acordeão ainda ocupam a entrada.');
        if(e.minX<-p.wall) warnings.push('O acordeão ultrapassa a extremidade esquerda do muro.');
        if(e.maxX<=0&&e.minX>=-p.wall){
          warnings.push('O acordeão cabe atrás do muro e liberta a entrada.');
        }
      }
    } else {
      const retreat=Math.max(0,...data.rear.filter(Boolean).map(c=>p.spacing-c.k));
      put(metrics[1],number(retreat*1000,1)+' mm');
      put(metrics[2],degree(Math.max(...folds.map(Math.abs))));
      if(a===1) warnings.push(e.minX<-p.wall||e.maxX>0?'O envelope de recolha excede a largura do muro.':'O envelope em planta fica dentro da largura do muro.');
      if(!warnings.length) warnings.push('Carro líder '+meters(data.joints[0].s)+' · acionamento ideal.');
    }
    put(note,warnings.join(' '));
    if(find('.readout').open){
      const rows=[
        'Folhas · '+data.leaves.map(l=>degree(l.angle)).join(' / '),
        'Dobras · '+folds.map(degree).join(' / '),
        'Carros (x, y) em m · '+data.cars.map(c=>'('+number(c.x)+', '+number(c.y)+')').join(' / '),
        'Envelope em planta · '+meters(e.maxX-e.minX)+' × '+meters(e.maxY-e.minY)
      ];
      if(type){
        const d=accordionSpan(p)/2*(1-Math.cos(data.theta));
        rows.push('Deslocamentos J2 / J4 · '+meters(d)+' / '+meters(2*d)+' · relação 2:1');
        rows.push('Eixo J0 · x = '+meters(p.offset)+' · passo das folhas A · '+meters(accordionSpan(p)/4));
        rows.push('Limite de A · '+degree(foldMax)+' · avanço interior J1/J3 · '+meters(data.joints[1].y));
      }else rows.push('Cursos traseiros · '+data.rear.map(c=>c?number((p.spacing-c.k)*1000,1)+' mm':'sem contacto').join(' / '));
      readout.replaceChildren(...rows.map(row=>Object.assign(document.createElement('div'),{textContent:row})));
    }
  }
  function stop(){
    if(job){paused=true;update(false);}
  }
  function fail(message,isBlocked=false){
    issue=message;blocked=isBlocked;job=null;plan=[];paused=false;
    update(false);
  }
  function next(){
    while(plan.length){
      const [axis,to]=plan.shift();
      const from=axis==='a'?a:b;
      if(from===to) continue;
      job={axis,from,to,time:0,duration:Math.max(.35,(axis==='a'?5:2.25)*Math.abs(to-from))};
      return;
    }
    job=null;
  }
  function command(action){
    if(action==='pause'){stop();return;}
    if(action==='resume'){
      if(job&&paused){paused=false;update(false);}
      return;
    }
    if(action==='reset'){
      a=b=0;plan=[];job=null;paused=false;issue='';blocked=false;update();return;
    }
    if(job&&!paused) return;
    if(action==='step'||action==='stepBack'){
      seek(Math.min(1,Math.max(0,a+(action==='step'?.02:-.02))));
      return;
    }
    issue='';blocked=false;paused=false;
    if(type){
      if(action==='open'&&!foldMax){fail('Sem curso de dobra admissível. Reveja as folgas e os batentes.');return;}
      const coordinated=$('#sequence').checked;
      if(action==='open') plan=coordinated?[['b',1],['a',1]]:[['a',1]];
      else if(action==='close') plan=coordinated?[['a',0],['b',0]]:[['a',0]];
      else plan=[['b',action==='openB'?1:0]];
    }else plan=[['a',action==='open'?1:0]];
    next();
    update(false);
  }
  function move(axis,to){
    const from=axis==='a'?a:b;
    if(axis==='a'&&type&&to>0&&(!foldMax||!b)){
      fail(!foldMax?'Sem curso de dobra admissível.':'Abra B para libertar a interface central.',Boolean(foldMax));
      return false;
    }
    const steps=Math.max(1,Math.ceil(Math.abs(to-from)/.001));
    for(let i=1;i<=steps;i++){
      const candidate=from+(to-from)*i/steps;
      const pose=getPose(axis==='a'?candidate:a,axis==='b'?candidate:b);
      const result=validate(p,pose);
      if(result.error){
        fail(result.error,p.obstacle&&result.error.includes('obstáculo'));
        update();
        return false;
      }
      if(axis==='a') a=candidate;
      else b=candidate;
    }
    return true;
  }
  function seek(to,axis='a'){
    plan=[];job=null;paused=false;issue='';blocked=false;
    if(move(axis,to)) update();
  }

  range.addEventListener('input',()=>seek(+range.value/1000));
  swingRange.addEventListener('input',()=>seek(+swingRange.value/1000,'b'));
  buttons.forEach(button=>button.addEventListener('click',()=>command(button.dataset.action)));
  find('.readout').addEventListener('toggle',()=>update(false));
  return {
    configure(){
      invalid=false;
      job=null;plan=[];paused=false;issue='';blocked=false;
      if(type&&!foldMax) a=0;
      scene.setup(p);update();
    },
    reject(message){invalid=true;fail(message);},
    changeView(){scene.setView(view);update();},
    refresh(){update();},
    step(dt){
      if(job&&!paused){
        job.time=Math.min(job.duration,job.time+dt);
        const to=job.time===job.duration?job.to:job.from+(job.to-job.from)*smooth(job.time/job.duration);
        if(move(job.axis,to)){
          if(job.time===job.duration) next();
          update();
        }
      }
      scene.draw();
    }
  };
}

const simulations=descriptions.map((d,i)=>makeSimulation(i,d));
function applyParameters(){
  for(const [key,input] of fields) parameters[key]=input.valueAsNumber;
  for(const key of ['obstacle','springs']) parameters[key]=$('#'+key).checked;
  if(parameters.radius<=parameters.spacing||parameters.gap>=parameters.width/5){
    simulations.forEach(s=>s.reject('O raio deve exceder a distância entre carris e a folga deve ser menor do que o passo.'));
    return;
  }
  p={...parameters};
  foldMax=foldLimit(p);
  $('#dimensions').textContent=meters(p.width)+' × '+meters(p.height);
  simulations.forEach(s=>s.configure());
}
for(const key of ['walls','fill','technical']){
  $('#'+key).addEventListener('change',event=>{
    layers[key]=event.target.checked;
    simulations.forEach(s=>s.refresh());
  });
}
for(const key of ['springs','obstacle']) $('#'+key).addEventListener('change',applyParameters);
$('#restore').addEventListener('click',()=>{
  for(const [key,input] of fields) input.value=initial[key];
  for(const key of ['springs','obstacle']) $('#'+key).checked=initial[key];
  $('#sequence').checked=true;
  applyParameters();
});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
  view=button.dataset.view;
  for(const item of document.querySelectorAll('[data-view]')) item.setAttribute('aria-pressed',item===button);
  simulations.forEach(s=>s.changeView());
}));
applyParameters();
let last=performance.now();
function frame(now){
  const dt=Math.min(.1,(now-last)/1000)*Number($('#speed').value);
  last=now;
  simulations.forEach(s=>s.step(dt));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
