import './style.css';
import {makeWorld,setupCanvas,startLoop,drawBody,rounded,text,Engine,Bodies,Body,Composite,W,H,Vector} from './engine.js';
import {SpillLedger,escapedBowl,outcome,INTERRUPTIONS,ROUND_SECONDS} from './rules.js';
const canvas=document.querySelector('#game');const {ctx,point}=setupCanvas(canvas);const engine=makeWorld(1);
const $=s=>document.querySelector(s);const keys=new Set();let bowl,particles,ledger,target,bottomLocal,elapsed=0,running=false,paused=false,done=false,tilt=0,activeMessage='',messageUntil=0,warning=-1,fired=new Set(),pointer=null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const route=[{x:665,y:360},{x:235,y:335},{x:665,y:405},{x:450,y:400}];let routeIndex=0;
function reset(start=false){Composite.clear(engine.world,false);Engine.clear(engine);elapsed=0;routeIndex=0;done=false;paused=false;running=start;tilt=0;fired.clear();warning=-1;activeMessage='';messageUntil=0;
  // Adapted compound.js: assemble the open bowl from three colliding bodies.
  bowl=Body.create({parts:[Bodies.rectangle(450,440,238,18,{chamfer:{radius:6}}),Bodies.rectangle(337,397,18,90,{chamfer:{radius:6}}),Bodies.rectangle(563,397,18,90,{chamfer:{radius:6}})],isStatic:true});
  target={...bowl.position};bottomLocal=440-bowl.position.y;
  // Adapted ballPool.js: a stack of many rigid circles, without the wrapping plugin.
  particles=[];for(let row=0;row<6;row++)for(let col=0;col<12;col++){const particle=Bodies.circle(362+col*16,347+row*15,7.6,{restitution:.02,friction:.015,frictionAir:.004,density:.001});particle.plugin.herb=(row+col)%9===0;particles.push(particle);}
  ledger=new SpillLedger(particles.length);Composite.add(engine.world,[bowl,...particles,Bodies.rectangle(450,587,1000,20,{isStatic:true})]);
  document.querySelector('main').inert=!start;$('#intro').classList.toggle('hidden',start);$('#result').classList.add('hidden');$('#pause').disabled=!start;$('#pause').textContent='Pause';status('Carry the bowl to the glowing table marker.');updateLabels();}
function status(s){$('#status').textContent=s;}
function start(){reset(true);$('#pause').focus();}
function updateLabels(){$('#soup').textContent=ledger.percent+'%';$('#time').textContent=Math.max(0,Math.ceil(ROUND_SECONDS-elapsed))+'s';}
function finish(){if(done)return;done=true;running=false;$('#pause').disabled=true;$('#result-title').textContent=outcome(ledger.percent)==='delivered'&&routeIndex===route.length?'The table got dinner.':routeIndex<route.length?'The table is still waiting.':'Your sleeves got dinner.';$('#result-score').textContent=ledger.percent+'%';$('#result-copy').textContent=routeIndex<route.length?`You kept ${ledger.percent}% of the soup, but reached only ${routeIndex} of ${route.length} table markers. Follow the glowing marker to actually deliver it.`:`${ledger.remaining} of ${ledger.total} soup drops delivered. ${100-ledger.percent}% went into modern art on the floor. ${ledger.percent>=65?'The chef reluctantly approves.':'The chef has asked you to stop helping.'}`;document.querySelector('main').inert=true;$('#result').classList.remove('hidden');$('#again').focus();status(routeIndex<route.length?'The table is still waiting. Follow the markers next time.':ledger.percent>=65?'Delivery complete. Barely dignified.':'Delivery complete. Mostly wearable.');}
function tick(dt){if(!running||paused||done)return;elapsed+=dt;
  if(keys.has('ArrowLeft')||keys.has('KeyA'))target.x-=3.2;if(keys.has('ArrowRight')||keys.has('KeyD'))target.x+=3.2;if(keys.has('ArrowUp')||keys.has('KeyW'))target.y-=2;if(keys.has('ArrowDown')||keys.has('KeyS'))target.y+=2;
  if(keys.has('KeyQ'))tilt-=.012;if(keys.has('KeyE'))tilt+=.012;tilt=clamp(tilt,-.7,.7);target.x=clamp(target.x,180,720);target.y=clamp(target.y,290,455);
  const dx=clamp(target.x-bowl.position.x,-4.8,4.8),dy=clamp(target.y-bowl.position.y,-3,3);
  // Adapted manipulation.js: kinematically carry/rotate a static compound body.
  Body.setPosition(bowl,{x:bowl.position.x+dx,y:bowl.position.y+dy},true);
  const ringing=elapsed>=28&&elapsed<30?Math.sin(elapsed*18)*.22:0;const desired=clamp(tilt+dx*.035+ringing,-.8,.8);Body.setAngle(bowl,bowl.angle+(desired-bowl.angle)*.08,true);
  for(let i=0;i<INTERRUPTIONS.length;i++){const ev=INTERRUPTIONS[i];if(elapsed>=ev.at-2&&elapsed<ev.at&&warning!==i){warning=i;status(ev.warning);}if(elapsed>=ev.at&&!fired.has(i)){fired.add(i);activeMessage=ev.message;messageUntil=elapsed+3;status(ev.message);
    if(ev.kind==='door')for(const p of particles)if(!ledger.spilled.has(p.id))Body.setVelocity(p,{x:p.velocity.x+4.5,y:p.velocity.y-3.2});
    if(ev.kind==='cat'){target.x=clamp(target.x+66,180,720);for(const p of particles)if(!ledger.spilled.has(p.id))Body.setVelocity(p,{x:p.velocity.x-3.6,y:p.velocity.y-1.6});}
  }}
  if(messageUntil&&elapsed>messageUntil){messageUntil=0;activeMessage='';status(ledger.percent>=65?'Steady hands. Soup believes in you.':'There is still technically some soup.');}
  Engine.update(engine,dt*1000);if(routeIndex<route.length&&Math.hypot(bowl.position.x-route[routeIndex].x,bowl.position.y-route[routeIndex].y)<44){routeIndex++;if(routeIndex<route.length)status(`Table marker ${routeIndex} / ${route.length}. Follow the next glowing spot.`);else status('At the table. Hold steady for the handoff.');}for(const p of particles)ledger.observe(p.id,escapedBowl(p.position,{...bowl.position,angle:bowl.angle},bottomLocal));updateLabels();if(elapsed>=ROUND_SECONDS||ledger.percent<10||(routeIndex===route.length&&elapsed>=12))finish();}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#c8eadf';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ff7356';ctx.fillRect(0,0,W,135);text(ctx,'PLEASE WALK. THIS IS A SOUP ESTABLISHMENT.',450,48,23,'#fff7c2');
  for(let x=0;x<W;x+=90){ctx.strokeStyle='#a7d0c2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,135);ctx.lineTo(x,600);ctx.stroke();}for(let y=150;y<H;y+=75){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  rounded(ctx,37,82,826,34,12,'#174e58');rounded(ctx,42,87,Math.max(12,816*routeIndex/route.length),24,8,'#f7dc57');text(ctx,'KITCHEN',58,105,12,'#fff','left');text(ctx,'TABLE 7',844,105,12,'#fff','right');
  rounded(ctx,50,520,800,65,12,'#2f8c7d');text(ctx,'COMPLIMENTARY FLOOR SOUP',450,560,16,'#d6f1dc');
  if(routeIndex<route.length){const goal=route[routeIndex];ctx.beginPath();ctx.arc(goal.x,goal.y,40,0,Math.PI*2);ctx.fillStyle='#ffffffaa';ctx.fill();ctx.strokeStyle='#e95d3c';ctx.lineWidth=5;ctx.setLineDash([9,7]);ctx.stroke();ctx.setLineDash([]);text(ctx,`${routeIndex+1} / ${route.length}`,goal.x,goal.y+7,20,'#174e58');}
  for(const p of particles){ctx.beginPath();ctx.arc(p.position.x,p.position.y,7.8,0,Math.PI*2);ctx.fillStyle=ledger.spilled.has(p.id)?'#c85b37':p.plugin.herb?'#487933':'#f49a26';ctx.fill();}
  drawBody(ctx,bowl,'#fff7c2','#174e58',5);ctx.save();ctx.translate(bowl.position.x,bowl.position.y);ctx.rotate(bowl.angle);text(ctx,'TABLE 7',0,bottomLocal+3,15,'#174e58');ctx.restore();
  ctx.strokeStyle='#174e58';ctx.lineWidth=12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(bowl.position.x-64,bowl.position.y+45);ctx.lineTo(bowl.position.x-84,bowl.position.y+94);ctx.moveTo(bowl.position.x+64,bowl.position.y+45);ctx.lineTo(bowl.position.x+84,bowl.position.y+94);ctx.stroke();
  if(elapsed<4&&running)text(ctx,'Gently drag the bowl. Your wrists have physics.',450,210,22,'#174e58');if(paused){rounded(ctx,285,240,330,80,16,'#fff7c2','#174e58');text(ctx,'SOUP BREAK',450,290,30);}}
canvas.addEventListener('pointerdown',e=>{if(!running||paused)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);const p=point(e);target={x:p.x,y:clamp(p.y,290,455)};});canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;const p=point(e);target={x:p.x,y:clamp(p.y,290,455)};});canvas.addEventListener('pointerup',()=>pointer=null);canvas.addEventListener('pointercancel',()=>pointer=null);
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE'].includes(e.code)&&!e.target.matches('button,a'))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.target.matches('button,a'))tilt=0;});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
$('#start').onclick=start;$('#again').onclick=start;$('#restart').onclick=start;$('#level').onclick=()=>{tilt=0;target.y=390;};$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'Resume':'Pause';status(paused?'Soup break. No one touch anything.':'Back to the extremely important soup.');};
reset();startLoop(tick,draw);
if(import.meta.env.DEV)window.__smallGame={getState:()=>({running,paused,done,elapsed,routeIndex,percent:ledger.percent,bowl,target,particles,engine}),advance:s=>{for(let i=0;i<Math.ceil(s*60);i++)tick(1/60);},move:(x,y)=>target={x,y},tilt:a=>tilt=a};
