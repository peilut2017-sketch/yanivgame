/* Paired seeded deals with swapped seats; this is a benchmark, not a strength guarantee. */
const fs=require('fs'),C=require('../card-rules.js'),AI=require('../cpu-strategy.js'),E=require('../turn-engine.js');
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function shuffled(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function round(levels,seed,count){
 const random=rng(seed),deck=[];for(const s of ['♠','♥','♦','♣'])for(const r of C.ranks)deck.push({s,r,id:s+r});deck.push({s:'★',r:'JOKER',id:'j1'},{s:'★',r:'JOKER',id:'j2'});shuffled(deck,random);
 const rules={yanivLimit:7,assafPenalty:15,loseScore:200,halveOnRound:true};
 let state={players:levels.map(()=>({hand:deck.splice(0,count),score:0})),turn:Math.floor(random()*levels.length),round:1,turnSequence:1,turnDeadline:15000,phase:'action',deck,discard:[],availableToTake:deck.splice(0,1),rules};
 const helpers={isValidSet:C.valid,handTotal:C.total,orderSet:C.ordered,shuffle:a=>shuffled(a,random)};
 let maxMs=0;
 for(let t=0;t<240;t++){
   const actor=state.turn,p=state.players[actor],start=performance.now();
   const d=AI.decide({hand:p.hand,available:state.availableToTake,discard:state.discard,opponentCounts:state.players.filter((_,i)=>i!==actor).map(p=>p.hand.length),rules},levels[actor],random);
   maxMs=Math.max(maxMs,performance.now()-start);
   if(d.kind==='yaniv'){state=E.yaniv(state,actor,rules,helpers,t*100);return {winner:state.roundResult.assaf?state.roundResult.assafBy:actor,assaf:state.roundResult.assaf,turns:t+1,maxMs};}
   state=E.play(state,{...d,actor},rules,helpers,t*100,random);
   const cards=state.players.flatMap(p=>p.hand).concat(state.deck,state.discard,state.availableToTake);
   if(cards.length!==54||new Set(cards.map(c=>c.id)).size!==54)throw Error('Card conservation failed');
 }
 return {winner:null,assaf:false,turns:240,maxMs};
}
const pairs=Number(process.env.BENCH_PAIRS||100),results=[];
for(const [a,b] of [['easy','medium'],['medium','hard'],['easy','hard']]){
 const result={levels:[a,b],rounds:pairs*2,wins:{[a]:0,[b]:0},unresolved:0,assafs:0,totalTurns:0,maxDecisionMs:0};
 for(let seed=1;seed<=pairs;seed++)for(const levels of [[a,b],[b,a]]){
   const r=round(levels,seed,seed%2?5:7);if(r.winner===null)result.unresolved++;else result.wins[levels[r.winner]]++;
   result.assafs+=Number(r.assaf);result.totalTurns+=r.turns;result.maxDecisionMs=Math.max(result.maxDecisionMs,r.maxMs);
 }
 result.averageTurns=+(result.totalTurns/result.rounds).toFixed(1);result.maxDecisionMs=+result.maxDecisionMs.toFixed(1);delete result.totalTurns;results.push(result);console.log(JSON.stringify(result));
}
const multiplayer=[];for(const n of [3,4]){let unresolved=0;for(let seed=1;seed<=12;seed++)if(round(Array.from({length:n},(_,i)=>['easy','medium','hard'][i%3]),seed,7).winner===null)unresolved++;multiplayer.push({players:n,rounds:12,unresolved});}
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/cpu-benchmark.json',JSON.stringify({method:'100 paired seeds per matchup by default; swapped seats, identical starting deals, alternating 5/7 cards. Round outcomes, not full-match outcomes.',results,multiplayer,limitations:['Synthetic opponents; not a human skill rating','Hard is a one-step heuristic, not a solved or optimal policy','CPU receives no hidden hands or actual deck order']},null,2));
