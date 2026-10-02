import { stackTools } from './studio-copy.js';
import { InertialRotor } from './rotor.js';

export function initStudio(){
  const root=document.documentElement;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const touch=matchMedia('(pointer: coarse)');
  const isRu=()=>root.lang==='ru';
  const label=(ru,en)=>isRu()?ru:en;
  const globe=document.querySelector('.logo-globe');
  const canvas=globe.querySelector('canvas');
  const ctx=canvas.getContext('2d');
  const rotor=new InertialRotor();
  rotor.reduced=motion.matches;
  let tilt=-.16, glColor='',glFrame=0,glTimer=0,lastX=0,lastY=0,lastTime=0,glPointer=null,visible=true;
  function color(){glColor=getComputedStyle(globe).color;drawGlobe();}
  function project(lat,lon){
    const x=Math.cos(lat)*Math.sin(lon+rotor.angle),z=Math.cos(lat)*Math.cos(lon+rotor.angle),y=Math.sin(lat);
    return {x,y:y*Math.cos(tilt)-z*Math.sin(tilt),z:y*Math.sin(tilt)+z*Math.cos(tilt)};
  }
  function curve(points){
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];ctx.globalAlpha=(a.z+b.z)>0?.95:.19;
      ctx.beginPath();ctx.moveTo(44+a.x*36,44+a.y*36);ctx.lineTo(44+b.x*36,44+b.y*36);ctx.stroke();
    }
  }
  function drawGlobe(){
    if(!ctx)return;ctx.clearRect(0,0,88,88);ctx.strokeStyle=glColor;ctx.lineWidth=1.9;
    for(let lat=-Math.PI/3;lat<=Math.PI/3+.01;lat+=Math.PI/6){const p=[];for(let i=0;i<=56;i++)p.push(project(lat,i*Math.PI*2/56));curve(p);}
    for(let j=0;j<6;j++){const p=[];for(let i=0;i<=36;i++)p.push(project(-Math.PI/2+i*Math.PI/36,j*Math.PI/3));curve(p);}
    ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(44,44,36,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  function globeTick(now){
    glFrame=0;if(document.hidden||!visible)return;const state=rotor.step(now);globe.dataset.motionState=state;drawGlobe();
    if(state!=='paused')glFrame=requestAnimationFrame(globeTick);
    else if(rotor.resumeHovered&&!rotor.reduced&&!rotor.pinned&&!rotor.focused)glTimer=setTimeout(startGlobe,Math.max(20,rotor.resumeAt-performance.now()));
  }
  function startGlobe(){clearTimeout(glTimer);if(!glFrame&&!document.hidden&&visible){rotor.last=null;glFrame=requestAnimationFrame(globeTick);}}
  globe.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')rotor.enter();});
  globe.addEventListener('pointerleave',()=>{rotor.leave();startGlobe();});
  globe.addEventListener('pointerdown',e=>{if(e.button!==0)return;glPointer=e.pointerId;globe.setPointerCapture(e.pointerId);lastX=e.clientX;lastY=e.clientY;lastTime=e.timeStamp;rotor.begin();startGlobe();});
  globe.addEventListener('pointermove',e=>{
    if(glPointer!==e.pointerId){if(rotor.resumeHovered)rotor.resumeAt=performance.now()+1200;return;}
    rotor.drag((e.clientX-lastX)*.045,(e.timeStamp-lastTime)/1000);
    tilt=Math.max(-.8,Math.min(.8,tilt+(e.clientY-lastY)*.015));
    lastX=e.clientX;lastY=e.clientY;lastTime=e.timeStamp;drawGlobe();
  });
  function endGlobe(e){if(glPointer!==e.pointerId)return;if(e.type==='pointercancel'||e.timeStamp-lastTime>100)rotor.velocity=0;glPointer=null;rotor.release(performance.now());if(globe.hasPointerCapture(e.pointerId))globe.releasePointerCapture(e.pointerId);}
  globe.addEventListener('pointerup',endGlobe);globe.addEventListener('pointercancel',endGlobe);globe.addEventListener('lostpointercapture',endGlobe);
  globe.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key))return;e.preventDefault();rotor.focused=true;
    if(e.key==='ArrowLeft')rotor.angle-=.35;if(e.key==='ArrowRight')rotor.angle+=.35;
    if(e.key==='ArrowUp')tilt=Math.max(-.8,tilt-.1);if(e.key==='ArrowDown')tilt=Math.min(.8,tilt+.1);
    if(e.key===' '||e.key==='Enter'){rotor.pinned=!rotor.pinned;rotor.focused=false;rotor.leave();}
    drawGlobe();startGlobe();
  });
  globe.addEventListener('blur',()=>{rotor.focused=false;startGlobe();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)startGlobe();}).observe(globe);
  new MutationObserver(color).observe(root,{attributes:true,attributeFilter:['data-theme']});color();startGlobe();

  // Three concentric orbits, with independent speed and direction.
  const stage=document.querySelector('.orbit-stage');
  const continuous=stage.dataset.orbitMode==='continuous';
  const filtered=stage.hasAttribute('data-orbit-filter');
  const perspective=Number(stage.dataset.orbitPerspective)||1;
  const nodesRoot=stage.querySelector('.orbit-nodes');
  const detail=document.querySelector('.tool-detail');
  const pauseButton=document.querySelector('.orbit-pause');
  const groups={design:{radius:.2,speed:.085,phase:-.8},platforms:{radius:.325,speed:-.060,phase:.5},code:{radius:.45,speed:.040,phase:-1.3}};
  if(continuous){groups.design.speed=Math.PI*2/18;groups.platforms.speed=-Math.PI*2/24;groups.code.speed=Math.PI*2/32;}
  if(filtered){groups.design.radius=.38;groups.platforms.radius=.38;groups.code.radius=.42;}
  const nodes=stackTools.map(tool=>{
    const button=document.createElement(filtered?'span':'button');if(!filtered){button.type='button';button.setAttribute('aria-label',tool.name);button.setAttribute('aria-pressed','false');}button.className='orbit-node';button.dataset.tool=tool.id;button.dataset.group=tool.group;
    const image=document.createElement('img');image.src=`./assets/stack/${tool.id}.${filtered&&['illustrator','wordpress'].includes(tool.id)?'png':'svg'}`;image.alt='';image.width=29;image.height=29;image.draggable=false;
    const name=document.createElement('span');name.className='orbit-node-label';name.textContent=tool.name;
    button.append(image,name);nodesRoot.append(button);
    const siblings=stackTools.filter(t=>t.group===tool.group);
    return {tool,button,offset:siblings.findIndex(t=>t.id===tool.id)/siblings.length*Math.PI*2};
  });
  let selected=null,manualPause=false,hover=false,focused=false,inView=false,orbitFrame=0,previous=0,stageSize=0,orbPointer=null,orbX=0,orbY=0,orbTime=0,dragging=false,travel=0,velocity=0,suppressClick=false;
  let advanceStack=()=>{};
  if(filtered){
    const tabs=[...document.querySelectorAll('[data-stack-tab]')];
    const panels=[...document.querySelectorAll('[data-stack-panel]')];
    const toolbox=document.querySelector('.about-toolbox');
    let elapsed=0,delay=6,keyboardHold=false;
    function selectGroup(group,manual=false){
      elapsed=0;delay=manual?12:6;toolbox.style.setProperty('--stack-progress','0');
      stage.dataset.orbitFilter=group;
      nodes.forEach(n=>{const hidden=n.tool.group!==group;n.button.classList.toggle('is-muted',hidden);n.button.inert=hidden;});
      tabs.forEach(tab=>{const active=tab.dataset.stackTab===group;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
      panels.forEach(panel=>panel.hidden=panel.dataset.stackPanel!==group);
    }
    tabs.forEach((tab,index)=>{
      tab.addEventListener('click',()=>selectGroup(tab.dataset.stackTab,true));
      tab.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
        e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        selectGroup(tabs[next].dataset.stackTab,true);tabs[next].focus();
      });
    });
    toolbox.addEventListener('keydown',()=>keyboardHold=true);
    toolbox.addEventListener('pointerdown',()=>keyboardHold=false);
    toolbox.addEventListener('focusout',e=>{if(!toolbox.contains(e.relatedTarget))keyboardHold=false;});
    advanceStack=dt=>{
      if(keyboardHold||panels.some(p=>p.contains(document.activeElement)))return;
      elapsed+=dt;
      if(elapsed>=delay){const current=tabs.findIndex(t=>t.dataset.stackTab===stage.dataset.orbitFilter);selectGroup(tabs[(current+1)%tabs.length].dataset.stackTab);}
      toolbox.style.setProperty('--stack-progress',String(elapsed/delay));
    };
    selectGroup(stage.dataset.orbitFilter);
  }
  function groupName(group){return {design:label('Дизайн','Design'),platforms:label('Платформы','Platforms'),code:label('Код','Code')}[group];}
  function updateDetail(){
    if(selected){detail.querySelector('h3').textContent=selected.name;detail.querySelector('p').textContent=isRu()?selected.ru:selected.en;detail.querySelector('.tool-detail-group').textContent=groupName(selected.group);if(!continuous){const center=stage.querySelector('.orbit-center');center.classList.add('has-tool');center.querySelector('span').textContent=selected.name;center.querySelector('small').textContent=groupName(selected.group);}}
    pauseButton.textContent=manualPause||motion.matches?label('Продолжить','Resume'):label('Пауза','Pause');
    pauseButton.setAttribute('aria-pressed',String(manualPause||motion.matches));
    if(motion.matches){pauseButton.textContent=label('Движение выключено','Motion off');pauseButton.disabled=true;}
    else pauseButton.disabled=false;
    if(filtered){pauseButton.setAttribute('aria-label',motion.matches?label('Анимация отключена в настройках устройства','Animation disabled in device settings'):manualPause?label('Включить анимацию инструментов','Play tool animation'):label('Остановить анимацию инструментов','Pause tool animation'));pauseButton.title=pauseButton.getAttribute('aria-label');}
    if(touch.matches&&!continuous)document.querySelector('[data-i18n="stack.hint"]').textContent=label('Вращайте свайпом. Нажмите на инструмент, чтобы узнать больше.','Swipe to rotate. Tap a tool to learn more.');
  }
  function paintOrbits(){nodes.forEach(({tool,button,offset})=>{const group=groups[tool.group],angle=group.phase+offset,radius=stageSize*group.radius;button.style.transform=`translate(-50%,-50%) translate(${Math.cos(angle)*radius}px,${Math.sin(angle)*radius*perspective}px)`;});}
  new ResizeObserver(()=>{stageSize=stage.clientWidth;paintOrbits();}).observe(stage);
  function orbitTick(now){
    orbitFrame=0;if(!inView||document.hidden)return;
    const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
    const moving=!manualPause&&!motion.matches&&!(filtered&&stage.querySelector('[data-orbit-interacting]'));
    if(moving)advanceStack(dt);
    const coasting=moving&&orbPointer===null&&Math.abs(velocity)>.008;
    const auto=moving&&(continuous||(orbPointer===null&&!hover&&!focused));
    if(coasting){Object.values(groups).forEach(g=>g.phase+=velocity*dt);velocity*=Math.exp(-5*dt);}
    else if(auto)Object.values(groups).forEach(g=>g.phase+=g.speed*dt);
    stage.dataset.motionState=dragging?'dragging':(!moving||(!continuous&&(hover||focused))?'paused':'auto');
    paintOrbits();if(coasting||auto)orbitFrame=requestAnimationFrame(orbitTick);
  }
  function startOrbits(){if(!orbitFrame&&inView&&!document.hidden){previous=0;orbitFrame=requestAnimationFrame(orbitTick);}}
  stage.addEventListener('popovweb:orbit-interaction',startOrbits);
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)startOrbits();},{rootMargin:'80px'}).observe(stage);
  stage.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')hover=true;});stage.addEventListener('pointerleave',()=>{hover=false;startOrbits();});
  stage.addEventListener('focusin',()=>focused=true);stage.addEventListener('focusout',e=>{if(!stage.contains(e.relatedTarget)){focused=false;startOrbits();}});
  stage.addEventListener('pointerdown',e=>{if(continuous||e.button!==0)return;orbPointer=e.pointerId;orbX=e.clientX;orbY=e.clientY;orbTime=e.timeStamp;travel=0;dragging=false;velocity=0;suppressClick=false;});
  stage.addEventListener('pointermove',e=>{
    if(e.pointerId!==orbPointer)return;const dx=e.clientX-orbX,dy=e.clientY-orbY;
    if(!dragging){if(Math.abs(dy)>Math.abs(dx)+4&&e.pointerType==='touch'){orbPointer=null;return;}if(Math.abs(dx)<5)return;dragging=true;stage.setPointerCapture(e.pointerId);}
    const delta=dx*.009;Object.values(groups).forEach(g=>g.phase+=delta);travel+=Math.abs(dx);velocity=Math.max(-4,Math.min(4,delta/Math.max(.008,(e.timeStamp-orbTime)/1000)));
    orbX=e.clientX;orbY=e.clientY;orbTime=e.timeStamp;paintOrbits();
  });
  function endOrbit(e){if(e.pointerId!==orbPointer)return;suppressClick=travel>5;if(e.type==='pointercancel'||e.timeStamp-orbTime>100)velocity=0;orbPointer=null;dragging=false;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);setTimeout(()=>suppressClick=false,0);startOrbits();}
  stage.addEventListener('pointerup',endOrbit);stage.addEventListener('pointercancel',endOrbit);stage.addEventListener('lostpointercapture',endOrbit);
  if(!filtered)nodes.forEach(({tool,button})=>button.addEventListener('click',()=>{if(suppressClick)return;selected=tool;nodes.forEach(n=>{const active=n.tool===tool;n.button.classList.toggle('is-selected',active);n.button.setAttribute('aria-pressed',String(active));});updateDetail();}));
  stage.addEventListener('keydown',e=>{if(continuous||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'))return;e.preventDefault();Object.values(groups).forEach(g=>g.phase+=e.key==='ArrowLeft'?-.12:.12);paintOrbits();});
  pauseButton.addEventListener('click',()=>{manualPause=!manualPause;velocity=0;updateDetail();startOrbits();});

  let selectedPlan=null;
  const chosen=document.querySelector('.chosen-plan');
  const mail=document.querySelector('.contact-button');
  function updatePlan(){
    chosen.hidden=!selectedPlan;if(!selectedPlan){mail.href='mailto:fedorpopov7@yandex.ru';return;}
    const card=document.querySelector(`[data-plan="${selectedPlan}"]`).closest('.price-card');
    const name=card.querySelector('h3').textContent,price=card.querySelector('.price-value').textContent;
    chosen.querySelector('.chosen-plan-name').textContent=`${name} · ${price}`;
    const subject=`PopovWeb — ${name}`;
    const body=label(`Здравствуйте, Фёдор!\n\nХочу обсудить формат «${name}» (${price}).\n\nО проекте:\nМои задачи:\nЖелаемые сроки:\n`,`Hi Fedor,\n\nI’d like to discuss a ${name.toLowerCase()} (${price}).\n\nAbout my project:\nMy goals:\nPreferred timing:\n`);
    mail.href=`mailto:fedorpopov7@yandex.ru?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  document.querySelectorAll('[data-plan]').forEach(a=>a.addEventListener('click',()=>{selectedPlan=a.dataset.plan;updatePlan();}));
  document.querySelector('.clear-plan').addEventListener('click',()=>{selectedPlan=null;updatePlan();});
  // Keep the previous header CTA's entry-side color fill.
  const navCta=document.querySelector('.nav-cta');
  if(!navCta.hasAttribute('data-edge-fill'))navCta.addEventListener('pointerenter',e=>{const rect=navCta.getBoundingClientRect();navCta.style.setProperty('--entry-x',`${e.clientX-rect.left}px`);navCta.style.setProperty('--entry-y',`${e.clientY-rect.top}px`);navCta.style.setProperty('--fill-radius',`${Math.hypot(rect.width,rect.height)}px`);});
  root.addEventListener('popovweb:language',()=>{updateDetail();updatePlan();});
  touch.addEventListener('change',updateDetail);
  motion.addEventListener('change',()=>{rotor.reduced=motion.matches;velocity=0;updateDetail();drawGlobe();startGlobe();startOrbits();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){startGlobe();startOrbits();}});
  updateDetail();
}
