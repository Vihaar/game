/** Adapted from Liam Brummitt's MIT Matter ballPool/compound/manipulation examples.
 * Exact upstream sources and license are in ../upstream. We reuse Matter's engine,
 * composite bodies and spring dragging; the game rules and canvas art are original.
 */
import Matter from 'matter-js';
export const { Engine, Bodies, Body, Composite, Constraint, Query, Vector } = Matter;
export const W=900,H=600;
export function makeWorld(gravity=0) {
  const engine=Engine.create({positionIterations:8,velocityIterations:8});
  engine.gravity.y=gravity;
  return engine;
}
export function parts(body) {return body.parts.length>1?body.parts.slice(1):[body];}
export function drawBody(ctx,body,fill,stroke='#17233c',lineWidth=3){
  for(const part of parts(body)){
    const vertices=part.vertices;ctx.beginPath();ctx.moveTo(vertices[0].x,vertices[0].y);
    for(let i=1;i<vertices.length;i++)ctx.lineTo(vertices[i].x,vertices[i].y);
    ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
  }
}
export function setupCanvas(canvas){
  const ctx=canvas.getContext('2d');const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  if(!canvas.dataset.sized){canvas.dataset.sized='1';const fit=()=>{const stage=canvas.parentElement;canvas.style.width=Math.max(120,Math.min(stage.clientWidth-8,(stage.clientHeight-16)*W/H))+'px';};new ResizeObserver(fit).observe(canvas.parentElement);fit();}
  return {ctx,point(event){const r=canvas.getBoundingClientRect();return{x:(event.clientX-r.left)*W/r.width,y:(event.clientY-r.top)*H/r.height};}};
}
export function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}}
export function text(ctx,label,x,y,size=20,color='#17233c',align='center'){ctx.fillStyle=color;ctx.font=`700 ${size}px 'Trebuchet MS', sans-serif`;ctx.textAlign=align;ctx.fillText(label,x,y);}
export function startLoop(tick,draw){
  let last=performance.now(),acc=0;const step=1000/60;
  function frame(now){const elapsed=document.hidden?0:Math.min(50,Math.max(0,now-last));last=now;acc+=elapsed;
    while(acc>=step){tick(step/1000);acc-=step;}draw();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
}
export function makeDrag(canvas,engine,bodies,onSelect){
  const {point}=setupCanvas(canvas);let held=null,drag=null;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=point(e);const body=Query.point(bodies,p).at(-1);if(!body)return;
    onSelect(body);held=e.pointerId;canvas.setPointerCapture(held);const offset=Vector.rotate(Vector.sub(p,body.position),-body.angle);
    drag=Constraint.create({pointA:p,bodyB:body,pointB:offset,stiffness:.18,damping:.18,length:0});Composite.add(engine.world,drag);});
  canvas.addEventListener('pointermove',e=>{if(drag&&held===e.pointerId)drag.pointA=point(e);});
  const release=()=>{if(drag)Composite.remove(engine.world,drag);drag=null;held=null;};
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  return release;
}
