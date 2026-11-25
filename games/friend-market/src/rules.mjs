export const FRIENDS=Object.freeze({
 mike:{id:'mike',name:'Mike',title:'Server landlord',base:18,portrait:'mike.webp',color:'#bd7350',talent:'At closing: earns 4¢ for every OTHER friend on your roster.',quote:'I can host that. Probably.'},
 torin:{id:'torin',name:'Torin',title:'Certified haggler',base:12,portrait:'torin.png',color:'#5c8069',talent:'Other friends cost 3¢ less while Torin is on your roster. Earns 2¢ nightly.',quote:'I know a guy. It is me.'},
 jonah:{id:'jonah',name:'Jonah',title:'Side-quest specialist',base:20,portrait:'jonah.png',color:'#bba04a',talent:'Earns 10¢ each night. Some daily events pay even more.',quote:'Give me twenty minutes.'},
 grant:{id:'grant',name:'Grant',title:'Hype merchant',base:22,portrait:'grant.png',color:'#727da0',talent:'OTHER friends sell for 4¢ more while Grant is on your roster.',quote:'This is a limited-edition Mike.'},
});
export const TARGETS=Object.freeze([44,65,88,112,138]);
export const UPGRADES=Object.freeze({van:{id:'van',name:'Borrow a van',text:'One extra roster slot. Finally, leg room.'},coupon:{id:'coupon',name:'Lunch on the house',text:'Friend upkeep drops from 2¢ to 1¢ for days 3–5.'},sponsor:{id:'sponsor',name:'Suspicious sponsor',text:'Get 16¢ immediately. The logo is imaginary.'}});
const EVENTS=[
 {id:'normal',name:'The group chat is awake',text:'Everyone earns a 3¢ appearance fee at closing.',bonus:3},
 {id:'gig',name:'Somebody needs a guy',text:'Jonah earns an extra 7¢ at closing.',jonah:7},
 {id:'hype',name:'A very convincing rumor',text:'All selling prices +4¢ today.',sale:4},
 {id:'sale',name:'The car-boot clearance',text:'All buying prices −3¢ today.',buy:-3},
 {id:'grant',name:'Grant goes mildly viral',text:'Grant sells for 10¢ more today.',grant:10},
 {id:'rent',name:'The landlord likes you',text:'No booth rent today. A rare act of kindness.',rent:-2},
 {id:'mike',name:'LAN party emergency',text:'Mike earns an extra 7¢ at closing.',mike:7},
];
// Reused seeded generator from The Fold's existing main.js (project MIT notice retained).
export function seededRandom(value){return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export function newRun(seed=42){const rng=seededRandom(Number(seed)>>>0),days=Array.from({length:5},(_,i)=>({event:{...EVENTS[Math.floor(rng()*EVENTS.length)]},prices:Object.fromEntries(Object.values(FRIENDS).map(f=>[f.id,Math.max(7,f.base+i*3+Math.floor(rng()*11)-5)]))}));return{seed:Number(seed)>>>0,day:1,cash:46,roster:[],slots:3,stock:Object.fromEntries(Object.keys(FRIENDS).map(id=>[id,1])),phase:'market',upgrade:null,days,ledger:[],receipts:[],trades:0}}
export function today(s){return s.days[s.day-1]}
export function buyPrice(s,id){if(!FRIENDS[id])return null;return Math.max(1,today(s).prices[id]+(today(s).event.buy||0)-(s.roster.includes('torin')&&id!=='torin'?3:0))}
export function sellPrice(s,id){if(!FRIENDS[id])return null;return Math.max(1,today(s).prices[id]-4+(today(s).event.sale||0)+(s.roster.includes('grant')&&id!=='grant'?4:0)+(id==='grant'?today(s).event.grant||0:0))}
export function netWorth(s){return s.cash+s.roster.reduce((sum,id)=>sum+sellPrice(s,id),0)}
export function closingForecast(s){const event=today(s).event,crew=s.roster.length;const mike=s.roster.includes('mike')?4*Math.max(0,crew-1)+(event.mike||0):0,torin=s.roster.includes('torin')?2:0,jonah=s.roster.includes('jonah')?10+(event.jonah||0):0,appearance=(event.bonus||0)*crew,upkeep=crew*(s.upgrade==='coupon'?1:2),rent=2+(event.rent||0),income=mike+torin+jonah+appearance,cost=upkeep+rent,delta=income-cost;return{mike,torin,jonah,appearance,income,upkeep,rent,cost,delta,cash:s.cash+delta,worth:netWorth(s)+delta,target:TARGETS[s.day-1]}}
export function buy(s,id){if(s.phase!=='market')return{ok:false,reason:'The market is closed.'};if(!FRIENDS[id]||!s.stock[id])return{ok:false,reason:'That arrival is gone for today.'};if(s.roster.includes(id))return{ok:false,reason:'One of each friend. The world cannot handle two Mikes.'};if(s.roster.length>=s.slots)return{ok:false,reason:'Your roster is full. Sell someone to make room.'};const price=buyPrice(s,id);if(s.cash<price)return{ok:false,reason:'Not enough pocket change.'};s.cash-=price;s.roster.push(id);s.stock[id]=0;s.trades++;s.ledger.push({day:s.day,type:'buy',id,amount:price});return{ok:true,price,id}}
export function sell(s,id){if(s.phase!=='market')return{ok:false,reason:'The market is closed.'};if(!s.roster.includes(id))return{ok:false,reason:'You cannot sell a friend you do not have.'};const price=sellPrice(s,id);s.roster=s.roster.filter(value=>value!==id);s.cash+=price;s.trades++;s.ledger.push({day:s.day,type:'sell',id,amount:price});return{ok:true,price,id}}
export function closeDay(s){if(s.phase!=='market')return{ok:false,reason:'Choose your next step first.'};const forecast=closingForecast(s);s.cash=forecast.cash;const receipt={day:s.day,...forecast,roster:[...s.roster],event:today(s).event.name};s.receipts.push(receipt);if(forecast.worth<forecast.target||s.cash<0){s.phase='lost';return{ok:true,receipt,outcome:'lost'}}if(s.day===5){s.phase='won';return{ok:true,receipt,outcome:'won'}}s.day++;s.stock=Object.fromEntries(Object.keys(FRIENDS).map(id=>[id,s.roster.includes(id)?0:1]));s.phase=s.day===3&&!s.upgrade?'upgrade':'market';return{ok:true,receipt,outcome:s.phase}}
export function chooseUpgrade(s,id){if(s.phase!=='upgrade'||!UPGRADES[id])return{ok:false,reason:'Choose one available stall upgrade.'};s.upgrade=id;if(id==='van')s.slots=4;if(id==='sponsor')s.cash+=16;s.phase='market';return{ok:true,id}}
