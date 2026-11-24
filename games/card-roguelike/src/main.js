import * as THREE from 'three';
import { GuidedDiorama } from './diorama.js';
import { AREAS } from './areas.mjs';
import { GUIDED_CHARACTERS as CHARACTERS, GUIDED_FORGE_MODES as FORGE_MODES, newGuidedRun, getCard, recipeFor, getDiscoveryCatalog, guidedForgePreview, beginGuidedForge, setForgeMode, tickGuidedForge, startGuidedBattle, guidedCast, guidedStrike, guidedBlock, resolveEnemyTurn, enemyIntent, takeReward, shuffle, corruptionDamageBonus, applyCardDiscovery } from './guided-rules.mjs';
import { cardArtStyle, requestCardDiscovery } from './card-art.mjs';
import './style.css';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KNOWLEDGE=[['Language','Meaning begins when one thing can stand for another.'],['Life','Life changes, adapts, and carries understanding forward.'],['Memory','Memory gives the past a place within the present.'],['Transformation','Change reveals what can become, not only what already is.'],['Cosmos','Every small thing belongs to a greater connected whole.'],['Truth','Understanding grows when appearances meet honest questions.'],['Self','The one asking is part of the world being understood.'],['Everything','Every truth is connected. You now understand the whole.']];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state=newGuidedRun(),selectedCharacter='binder',selected=[],forgeParents=[],rewardOptions=[],seed=42,random=Math.random,started=false,travelling=false,areaIndex=0,lastPhase='explore',messageTimer;
const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,100);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power',alpha:true})}catch{document.body.innerHTML='<p class="webgl-error">WebGL could not start. Enable hardware acceleration or try another browser.</p>';throw Error('WebGL unavailable')}
renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;$('#world').appendChild(renderer.domElement);
const diorama=new GuidedDiorama(scene,camera,renderer,{onEnemyClick:index=>chooseTarget(index)});
function resize(){const s=Math.min(1,1600/innerWidth,900/innerHeight);renderer.setSize(Math.round(innerWidth*s),Math.round(innerHeight*s),false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}resize();addEventListener('resize',resize);
function seededRandom(value){return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function say(text){$('#message').textContent=text;clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('#message').textContent='',6500)}
function closePanels(){for(const id of ['forge','help','map'])$('#'+id).hidden=true}
function dialog(id){closePanels();if(!$(id).open)$(id).showModal()}
function effects(c){return[c.damage?`${c.damage}${c.all?' to all':''} damage`:'',c.block?`${c.block} guard`:'',c.heal?`${c.heal} heal`:'',c.draw?`draw ${c.draw}`:''].filter(Boolean).join(' · ')}
function cardMarkup(key,index,mode='hand'){
 const c=getCard(key);if(!c)return'';
 const disabled=mode==='hand'&&(state.phase!=='battle'||state.forge||travelling||c.cost>state.energy);
 return `<button class="card ${esc(c.kind)}${c.fused?' fused':''}${mode==='inventory'&&selected.includes(index)?' selected':''}" data-index="${index}" ${disabled?'disabled':''} ${mode==='inventory'?`aria-pressed="${selected.includes(index)}"`:''} aria-label="${esc(c.name)}. ${esc(effects(c))}. ${c.cost} ink"><span class="card-top"><span>${c.fused?'FOLDED SPELL':'ELEMENT'}</span><b>${c.cost} ink</b></span><span class="card-art" style="${esc(cardArtStyle(c,key))}"></span><strong>${esc(c.name)}</strong><span class="card-effects">${esc(effects(c))}</span><span class="card-text">${esc((c.description||c.text||'').replace(/briefly/g,'this turn').replace(/nearby enemies/g,'all enemies'))}</span>${mode==='hand'?`<kbd>${index+1}</kbd>`:''}</button>`;
}
function renderCharacters(){
 $('#characters').innerHTML=Object.values(CHARACTERS).map(c=>`<button class="character-card${selectedCharacter===c.id?' selected':''}" data-character="${c.id}" aria-pressed="${selectedCharacter===c.id}"><span class="character-fold ${c.id}"></span><strong>${esc(c.name)}</strong><span>${c.hp} HP · ${c.basicDamage} strike · ${c.blockAmount} guard</span><small>${c.id==='runner'?4:3} ink each turn</small></button>`).join('');$('#character-summary').textContent=CHARACTERS[selectedCharacter].description;
}
function renderModes(){const options=Object.values(FORGE_MODES).map(m=>`<option value="${m.id}">${esc(m.label)}</option>`).join('');for(const id of ['forge-mode','run-forge-mode']){$('#'+id).innerHTML=options;$('#'+id).value=state.forgeMode}$('#run-mode-copy').textContent=FORGE_MODES[state.forgeMode].description}
function renderEnemies(){
 $('#enemy-targets').innerHTML=state.phase==='battle'?state.enemies.map((e,i)=>{const intent=enemyIntent(state,e);return `<button class="enemy-target${i===state.target?' targeted':''}${e.hp<=0?' defeated':''}" data-enemy="${i}" ${e.hp<=0?'disabled':''} aria-pressed="${i===state.target}"><span class="target-marker">${i===state.target?'TARGET':'KEEPER'}</span><strong>${esc(e.name)}</strong><span class="hp-track"><i style="width:${100*Math.max(0,e.hp)/e.maxHp}%"></i></span><span>${e.hp} / ${e.maxHp} HP${e.guard?` · ${e.guard} guard`:''}</span><b>${e.hp>0?esc(intent.label):'Unbound'}</b></button>`}).join(''):'';
 diorama.setEnemies(state.phase==='battle'?state.enemies:[]);diorama.setTarget(state.target);
}
function render(){
 document.body.dataset.phase=travelling?'travel':state.phase;
 const area=AREAS[areaIndex];$('#area-label').textContent=`CHAPTER ${areaIndex+1} / 8 · ${KNOWLEDGE[areaIndex][0].toUpperCase()}`;$('#area-title').textContent=area.name;$('#objective').textContent=travelling?'The pages are finding their place.':state.phase==='battle'?'Your turn. Take your time; nothing attacks until you commit.':area.subtitle;
 $('#knowledge-progress').textContent=`${state.phase==='won'?8:state.floor-1} / 8 truths understood`;
 $('#stats').innerHTML=`<span>${esc(state.character.name)}</span><strong>${state.hp} / ${state.maxHp} HP</strong><span>${state.block} guard</span><span>Curse ${state.corruption} <small>(+${corruptionDamageBonus(state)} damage)</small></span>`;
 $('#energy').textContent=`${state.energy} / ${state.maxEnergy} ink`;
 $('#turn-number').textContent=`TURN ${state.turn}`;$('#deck-count').textContent=`${state.inventory.length} owned · ${state.draw.length} draw · ${state.discard.length} discard`;
 $('#hand').innerHTML=state.phase==='battle'?state.hand.map((k,i)=>cardMarkup(k,i)).join(''):'<p class="empty-hand">The next encounter is ahead. You may fold cards before continuing.</p>';
 $('#basic-attack').disabled=state.phase!=='battle'||state.struckThisTurn||Boolean(state.forge)||travelling;
 $('#basic-block').disabled=state.phase!=='battle'||state.guardedThisTurn||Boolean(state.forge)||travelling;
 $('#basic-attack small').textContent=state.struckThisTurn?'Used this turn':`${state.character.basicDamage} damage · once per turn`;
 $('#basic-block small').textContent=state.guardedThisTurn?'Used this turn':`${state.character.blockAmount} guard · once per turn`;
 $('#end-turn').disabled=state.phase!=='battle'||Boolean(state.forge)||travelling;
 $('#advance-button').hidden=state.phase!=='explore'||!started;$('#advance-button').disabled=travelling||Boolean(state.forge);
 $('#advance-button').textContent=travelling?'Turning the page…':`Enter ${AREAS[state.floor-1].name}`;
 $('#forge-button').disabled=!started||!['explore','battle'].includes(state.phase)||travelling;
 $('#channel-banner').hidden=!state.forge;
 if(state.forge)$('#channel-copy').textContent=`Folding ${getCard(state.forge.output).name}…`;
 renderEnemies();if(!$('#forge').hidden)renderForge();if(!$('#map').hidden)renderMap();
}
function renderMap(){const learned=state.phase==='won'?8:state.floor-1;$('#map-content').innerHTML=KNOWLEDGE.map((truth,i)=>`<li class="${i===areaIndex?'current':''}"><span>${i+1}</span><strong>${esc(truth[0])}</strong><small>${esc(AREAS[i].name)} · ${i<learned?'Understood':i===state.floor-1?'A question awaits':'Not yet learned'}</small><p>${i<learned?esc(truth[1]):'An unanswered page.'}</p></li>`).join('')}
function renderForge(){
 $('#forge-mode').value=state.forgeMode;$('#forge-mode').disabled=Boolean(state.forge);$('#mode-copy').textContent=FORGE_MODES[state.forgeMode].description;
 $('#inventory-count').textContent=`(${state.inventory.length} copies)`;
 $('#inventory').innerHTML=state.inventory.map((k,i)=>cardMarkup(k,i,'inventory')).join('');
 const first=selected.length?state.inventory[selected[0]]:null,second=selected.length>1?state.inventory[selected[1]]:null;
 const preview=state.forge?{...state.forge,ok:false}:first&&second?guidedForgePreview(state,selected[0],selected[1]):null;
 const output=preview?.output||(first&&second?recipeFor(first,second):null);
 const tile=(k,empty)=>{const c=k&&getCard(k);return c?`<span class="fusion-tile"><span class="card-art" style="${esc(cardArtStyle(c,k))}"></span><strong>${esc(c.name)}</strong></span>`:`<span class="fusion-tile empty">${empty}</span>`};
 $('#fusion-preview').innerHTML=`${tile(first,'First copy')}<b>+</b>${tile(second,'Second copy')}<b>=</b>${tile(output,'New spell')}`;
 $('#cost-preview').textContent=preview?.output?`Consumes both copies + ${preview.inkCost} ink${preview.healthCost?` + ${preview.healthCost} HP`:''}${preview.corruptionGain?` + 1 curse (enemy damage +${preview.enemyDamageBonusAfter})`:''}. ${preview.enemyAction?`${preview.enemyAction.name} immediately: ${preview.enemyAction.label}.`:'No extra enemy move.'}`:preview?.reason||'Choose any two distinct owned copies. Forged spells can be ingredients again.';
 $('#merge-button').disabled=!preview?.ok||Boolean(state.forge);$('#merge-button').textContent=state.forge?'Folding…':preview?.ok?`Forge ${getCard(preview.output).name}`:'Choose two owned copies';
 $('#discoveries').textContent=getDiscoveryCatalog().slice(-12).map(c=>c.name).join(' · ')||'New discoveries stay in this browser. Your run does not.';
}
function chooseTarget(index){if(state.phase!=='battle'||state.enemies[index]?.hp<=0)return;state.target=index;render()}
function actionResult(result){if(!result?.ok){if(result?.reason)say(result.reason);return}checkPhase();render()}
function strike(){actionResult(guidedStrike(state))}
function guard(){actionResult(guidedBlock(state))}
function cast(index){const c=getCard(state.hand[index]);const result=guidedCast(state,index,state.target,random);if(result.ok)say(`${c.name}: ${effects(c)}.`);actionResult(result)}
function endTurn(){const result=resolveEnemyTurn(state,random);if(!result.ok){say(result.reason);return}say(result.actions.map(a=>`${a.name}: ${a.damage?`${a.damage} damage${a.blocked?`, ${a.blocked} guarded`:''}`:a.label}`).join(' · '));checkPhase();render()}
function checkPhase(){if(state.phase===lastPhase)return;lastPhase=state.phase;if(state.phase==='reward')showReward();if(['dead','won'].includes(state.phase))showEnding()}
async function advance(){if(travelling||state.phase!=='explore'||state.forge)return;closePanels();travelling=true;areaIndex=state.floor-1;render();await diorama.travelTo(areaIndex,{reducedMotion});if(!started)return;travelling=false;startGuidedBattle(state,random);lastPhase=state.phase;render()}
function beginRun(){for(const d of document.querySelectorAll('dialog[open]'))d.close();closePanels();const mode=$('#run-forge-mode').value;state=newGuidedRun(selectedCharacter);setForgeMode(state,mode);seed=Number(new URLSearchParams(location.search).get('seed'))||Math.floor(Math.random()*1e9);random=seededRandom(seed);started=true;travelling=false;areaIndex=0;selected=[];lastPhase='explore';diorama.setArea(0);renderModes();render();say('Choose your first binding. You control when each turn ends.')}
function showReward(){rewardOptions=shuffle(['ember','stone','dew','gust'],random).slice(0,3);$('#reward-title').textContent=`${KNOWLEDGE[areaIndex][0]}, understood.`;$('#reward-copy').textContent=`${KNOWLEDGE[areaIndex][1]} Choose a card copy and recover 1 health.`;$('#reward-choices').innerHTML=rewardOptions.map((k,i)=>cardMarkup(k,i,'reward')).join('');dialog('#reward')}
function showEnding(){const won=state.phase==='won';$('#ending-label').textContent=won?'ALL EIGHT TRUTHS, UNDERSTOOD':'FULL PERMADEATH';$('#ending-title').textContent=won?'You understand everything.':'The library keeps this life.';$('#ending-copy').textContent=`${state.character.name} · ${won?8:state.floor-1} / 8 bindings · ${state.merges} spells forged · curse ${state.corruption}. ${won?'You entered knowing nothing. Language, life, memory, transformation, the cosmos, truth and self now form one complete understanding. You know everything. With every unanswered question resolved, reality is whole again.':'Your deck, forged spells, health and progress are gone. A new run starts from the first binding.'} Recipe discoveries remain in this browser.`;dialog('#ending')}
function togglePanel(id){if(!started||travelling)return;const open=$('#'+id).hidden;closePanels();$('#'+id).hidden=!open;if(open){if(id==='forge'){selected=[];renderForge()}if(id==='map')renderMap()}}
$('#paper-style').onchange=e=>diorama.setStyle(e.target.value);
$('#characters').onclick=e=>{const b=e.target.closest('[data-character]');if(b){selectedCharacter=b.dataset.character;renderCharacters()}};
$('#start-button').onclick=beginRun;$('#advance-button').onclick=advance;$('#basic-attack').onclick=strike;$('#basic-block').onclick=guard;$('#end-turn').onclick=endTurn;
$('#enemy-targets').onclick=e=>{const b=e.target.closest('[data-enemy]');if(b)chooseTarget(Number(b.dataset.enemy))};
$('#hand').onclick=e=>{const b=e.target.closest('[data-index]');if(b)cast(Number(b.dataset.index))};
for(const id of ['forge','help','map']){$('#'+id+'-button').onclick=()=>togglePanel(id);$('#close-'+id).onclick=()=>$('#'+id).hidden=true}
$('#inventory').onclick=e=>{const b=e.target.closest('[data-index]');if(!b||state.forge)return;const i=Number(b.dataset.index);selected=selected.includes(i)?selected.filter(v=>v!==i):selected.length<2?[...selected,i]:[selected[1],i];renderForge()};
$('#merge-button').onclick=()=>{if(selected.length!==2)return;forgeParents=selected.map(i=>getCard(state.inventory[i]));const result=beginGuidedForge(state,selected[0],selected[1]);if(!result.ok)say(result.reason);render()};
$('#forge-mode').onchange=e=>{setForgeMode(state,e.target.value);e.target.blur();renderForge()};$('#run-forge-mode').onchange=e=>{setForgeMode(state,e.target.value);$('#run-mode-copy').textContent=FORGE_MODES[state.forgeMode].description};
$('#reward-choices').onclick=e=>{const b=e.target.closest('[data-index]');if(!b||!takeReward(state,rewardOptions[Number(b.dataset.index)]))return;$('#reward').close();lastPhase=state.phase;diorama.setEnemies([]);if(state.phase==='won')showEnding();render()};
$('#restart-button').onclick=()=>{$('#ending').close();started=false;travelling=false;selected=[];state=newGuidedRun(selectedCharacter);diorama.setEnemies([]);diorama.setArea(0);renderCharacters();renderModes();render();dialog('#intro')};
for(const d of document.querySelectorAll('dialog'))d.addEventListener('cancel',e=>e.preventDefault());
addEventListener('keydown',e=>{if(e.repeat||!started||travelling||document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Escape'){closePanels();return}if(e.code==='KeyF')togglePanel('forge');if(e.code==='KeyM')togglePanel('map');if(e.code==='KeyJ')strike();if(e.code==='KeyK')guard();if(e.code==='Enter'&&e.target.tagName!=='BUTTON')endTurn();if(/^Digit[1-5]$/.test(e.code))cast(Number(e.code.slice(-1))-1)});
let previous=performance.now(),elapsed=0;
renderer.setAnimationLoop(now=>{if(now-previous<1000/45)return;const dt=Math.min(.05,(now-previous)/1000);previous=now;elapsed+=dt;const result=tickGuidedForge(state,dt);if(result.forged){selected=[];const c=getCard(result.forged);say(`${c.name} folded.${result.action?` ${result.action.name}: ${result.action.damage} damage.`:''}`);requestCardDiscovery(c,result.forged,forgeParents,metadata=>{applyCardDiscovery(result.forged,metadata);render()});checkPhase();render()}diorama.update(dt,elapsed,{reducedMotion});document.querySelectorAll('[data-enemy]').forEach(button=>{const anchor=diorama.getEnemyAnchor(Number(button.dataset.enemy));if(anchor){anchor.project(camera);button.style.left=`${Math.max(70,Math.min(innerWidth-70,(anchor.x*.5+.5)*innerWidth))}px`;button.style.top=`${Math.max(170,Math.min(innerHeight-280,(-anchor.y*.5+.5)*innerHeight))}px`}});renderer.render(scene,camera)});
renderCharacters();renderModes();render();dialog('#intro');
if(import.meta.env.DEV)window.__foldDebug=()=>({phase:state.phase,floor:state.floor,hp:state.hp,maxHp:state.maxHp,energy:state.energy,turn:state.turn,character:state.characterId,inventory:[...state.inventory],inventoryIds:[...state.inventoryCopyIds],hand:[...state.hand],enemies:state.enemies.map(e=>({...e,intent:enemyIntent(state,e)})),forge:state.forge?{...state.forge}:null,corruption:state.corruption,travelling,drawCalls:renderer.info.render.calls});
