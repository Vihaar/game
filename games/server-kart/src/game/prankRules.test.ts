import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LapCheckoutGate } from './prankRules';
const approach={lap:1,trackT:0.96,checkpointIndex:0,speed:15,raceProgress:0.96,finished:false,wrongWay:false};
test('fake checkout appears once per legitimate approach, without blocking a lap',()=>{
  const gate=new LapCheckoutGate();
  assert.equal(gate.shouldShow(approach,30),true);
  assert.equal(gate.shouldShow(approach,31),false);
  assert.equal(gate.shouldShow({...approach,trackT:0.8},32),false);
  assert.equal(gate.shouldShow(approach,33),false);
  assert.equal(gate.shouldShow({...approach,lap:2,raceProgress:1.96},90),true);
  assert.equal(approach.speed,15);
});
test('no checkout on grid, skipped checkpoints, reverse travel, or completed race',()=>{
  for(const [state,time] of [
    [approach,0], [{...approach,checkpointIndex:4},30], [{...approach,wrongWay:true},30],
    [{...approach,speed:-5},30],[{...approach,finished:true},30], [{...approach,trackT:0.1},30],
  ] as const)assert.equal(new LapCheckoutGate().shouldShow(state,time),false);
});

test('being bumped on the start grid cannot consume the checkout for a real lap',()=>{
  const gate=new LapCheckoutGate();
  assert.equal(gate.shouldShow({...approach,trackT:0.99,raceProgress:-0.01},30),false);
  assert.equal(gate.shouldShow(approach,90),true);
});
