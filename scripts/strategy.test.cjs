const test=require('node:test'),assert=require('node:assert/strict'),C=require('../card-rules.js'),AI=require('../cpu-strategy.js'),E=require('../turn-engine.js');
const c=(r,s='♠',id=s+r)=>({r,s,id});
const view=hand=>({hand,available:[c('9','♦')],discard:[],opponentCounts:[5],rules:{yanivLimit:7}});
test('illegal additions are rejected; runs complete using only cards in hand',()=>{
 const hand=[c('4'),c('5'),c('6'),c('K','♥')];
 assert.deepEqual(C.toggle(hand,['♠4'],'♥K'),['♠4']);
 assert.deepEqual(new Set(C.toggle(hand,['♠4'],'♠6')),new Set(['♠4','♠5','♠6']));
 assert.deepEqual(C.toggle([c('4'),c('6')],['♠4'],'♠6'),['♠4']);
 const next=C.toggle(hand,['♠4','♠5','♠6'],'♠5');assert.ok(!next.length||C.valid(hand.filter(c=>next.includes(c.id))));
});
test('every selection transition stays legal, including deselecting a middle run card',()=>{
 const hand=[c('3'),c('4'),c('5'),c('6'),c('6','♥'),c('JOKER','★','j1'),c('K','♦')];
 for(const set of [[],...C.sets(hand)])for(const card of hand){const ids=C.toggle(hand,set.map(c=>c.id),card.id);assert.ok(!ids.length||C.valid(hand.filter(c=>ids.includes(c.id))));}
});
test('enumeration covers wildcard runs, wildcard groups and subruns',()=>{
 const hand=[c('4'),c('6'),c('6','♥'),c('JOKER','★','j1')],sets=C.sets(hand);
 assert.ok(sets.some(s=>s.length===3&&s.some(c=>c.r==='4')&&s.some(c=>c.r==='6')&&s.some(c=>c.r==='JOKER')));
 assert.ok(sets.some(s=>s.length===3&&s.filter(c=>c.r==='6').length===2));
 assert.equal(C.sets([c('3'),c('4'),c('5'),c('6')]).filter(s=>s.length===3).length,2);
 assert.deepEqual(C.ordered([c('6'),c('4'),c('JOKER','★','j1')]).map(c=>c.r),['4','JOKER','6']);
});
test('all levels produce legal actions and only use pile endpoints',()=>{
 const v=view([c('K'),c('K','♥'),c('5'),c('6'),c('7'),c('JOKER','★','j1')]);v.available=[c('9','♦'),c('A','♦'),c('8','♦')];
 for(const diff of ['easy','medium','hard']){const d=AI.decide(v,diff,()=>.2);assert.equal(d.kind,'move');assert.ok(C.valid(v.hand.filter(c=>d.discardIds.includes(c.id))));if(d.source==='pile')assert.notEqual(d.pickId,'♦A');}
});
test('hard decision cannot inspect opponent hands or deck order',()=>{
 const v=view([c('K'),c('K','♥'),c('5'),c('6'),c('7')]);
 Object.defineProperties(v,{deck:{get(){throw Error('Hidden deck accessed')}},players:{get(){throw Error('Hidden hands accessed')}}});
 assert.ok(AI.decide(v,'hard'));assert.deepEqual(AI.decide(v,'hard'),AI.decide({...view(v.hand),deck:[c('A')],players:[{hand:[c('JOKER')]}]},'hard'));
});
test('hard takes a useful exposed card and sheds a wildcard combination',()=>{
 const v=view([c('K'),c('K','♥'),c('A')]);v.available=[c('JOKER','★','j1')];
 const d=AI.decide(v,'hard');assert.equal(d.source,'pile');assert.equal(d.pickId,'j1');assert.equal(d.discardIds.length,2);
 const w=view([c('4'),c('6'),c('JOKER','★','j1'),c('K','♥')]);assert.equal(AI.bestDiscard(w.hand).length,3);
});
test('CPU can Assaf a human and can itself be caught on a tie',()=>{
 const rules={yanivLimit:7,assafPenalty:15,loseScore:200};const base={turn:0,turnDeadline:15000,phase:'action',players:[{hand:[c('3')],score:0},{hand:[c('A')],score:0}],rules};
 const helpers={handTotal:C.total};assert.equal(E.yaniv(base,0,rules,helpers,1000).roundResult.assafBy,1);
 base.players[1].hand=[c('3','♥')];base.turn=1;assert.equal(E.yaniv(base,1,rules,helpers,1000).roundResult.assafBy,0);
});
test('first starter spans all active seats; Yaniv or Assaf winner starts next',()=>{
 const s={players:[{},{forfeited:true},{},{}]};assert.deepEqual([0,.4,.99].map(r=>E.starter(s,()=>r)),[0,2,3]);
 s.roundResult={callerIdx:2,assaf:false};assert.equal(E.starter(s,()=>0),2);
 s.roundResult={callerIdx:2,assaf:true,assafBy:3};assert.equal(E.starter(s,()=>0),3);
});
test('six-second continuation is persisted, but match end has no next round',()=>{
 const rules={yanivLimit:7,assafPenalty:15,loseScore:20},s={turn:0,turnDeadline:15000,phase:'action',players:[{hand:[c('A')],score:0},{hand:[c('9')],score:0}],rules};
 const n=E.yaniv(s,0,rules,{handTotal:C.total},1000);assert.equal(n.nextRoundAt,7000);assert.equal(E.matchOver(n),false);
 s.players[1].score=15;const end=E.yaniv(s,0,rules,{handTotal:C.total},1000);assert.equal(end.nextRoundAt,0);assert.equal(E.matchOver(end),true);
});
