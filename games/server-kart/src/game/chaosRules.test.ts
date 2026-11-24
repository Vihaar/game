import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChaosClock, chooseTaxTargets, type ChaosSignal } from './chaosRules';

test('each disruption is warned about before firing, then gets a recovery interval', () => {
  const clock = new ChaosClock();
  const seen: {signal:ChaosSignal;time:number}[]=[];
  for(let i=0;i<600;i++) for(const signal of clock.advance(0.1)) seen.push({signal,time:clock.elapsed});
  assert.deepEqual(seen.map(x=>x.signal.kind),['warning','fire','warning','fire','warning','fire']);
  assert.ok(seen[1].time-seen[0].time >= 2.9);
  assert.ok(seen[2].time-seen[1].time >= 15.9);
  assert.deepEqual(seen.filter(x=>x.signal.kind==='fire').map(x=>x.signal.event.id),['cheese','mic','lag']);
});

test('a resumed/background tab cannot dump multiple punishments into one update', () => {
  const clock = new ChaosClock();
  assert.deepEqual(clock.advance(90),[]);
  assert.ok(clock.elapsed <= 0.1);
  clock.advance(Number.NaN);
  clock.advance(-1);
  assert.equal(clock.elapsed,0.1);
});

test('cheese tax excludes finishers and immunity; boost goes to a different trailing racer',()=>{
  const winner={place:1,finished:true,isInvincible:false};
  const immune={place:2,finished:false,isInvincible:true};
  const lead={place:3,finished:false,isInvincible:false};
  const last={place:8,finished:false,isInvincible:false};
  assert.deepEqual(chooseTaxTargets([last,winner,immune,lead]),{leader:lead,last});
  assert.deepEqual(chooseTaxTargets([lead]),{leader:lead,last:undefined});
  assert.deepEqual(chooseTaxTargets([winner]),{leader:undefined,last:undefined});
});
