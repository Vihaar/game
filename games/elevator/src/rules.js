export const ROUND_SECONDS=60;
export const CABIN={left:330,right:830,top:103,bottom:444};
export function fullyInside(body,box=CABIN){const parts=body.parts?.length>1?body.parts.slice(1):[body];return parts.every(p=>p.vertices.length>0&&p.vertices.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=box.left&&v.x<=box.right&&v.y>=box.top&&v.y<=box.bottom));}
export function evaluateDeparture(bodies,blockedIds,box=CABIN){const boarded=bodies.filter(b=>fullyInside(b,box));return{boarded,blocked:bodies.filter(b=>blockedIds.has(b.id)),canDepart:boarded.length>0&&blockedIds.size===0};}
