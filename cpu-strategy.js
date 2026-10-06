/* CPU decisions receive only own hand, exposed cards and opponent card counts. */
(function(root,factory){const api=factory(typeof module==='object'?require('./card-rules.js'):root.CardRules);if(typeof module==='object')module.exports=api;else root.CpuStrategy=api;})(globalThis,function(C){
  const face=c=>c.s+':'+c.r;
  function unknownCards(view){
    const pool=[];for(const s of ['♠','♥','♦','♣'])for(const r of C.ranks)pool.push({s,r});pool.push({s:'★',r:'JOKER'},{s:'★',r:'JOKER'});
    for(const c of [...view.hand,...view.available,...(view.discard||[])]){const i=pool.findIndex(x=>face(x)===face(c));if(i>=0)pool.splice(i,1);}
    return pool.length?pool:[{s:'★',r:'JOKER'}];
  }
  function bestDiscard(hand){return C.sets(hand).sort((a,b)=>C.total(b)-C.total(a)||b.length-a.length)[0]||[];}
  function decide(view,difficulty='medium',rng=Math.random){
    const hand=view.hand,limit=view.rules.yanivLimit,total=C.total(hand);
    const options=view.available.filter((c,i,a)=>i===0||i===a.length-1),sets=C.sets(hand),unknown=unknownCards(view);
    if(!hand.length)return {kind:'yaniv',reason:'empty-hand'};
    if(difficulty==='easy'){
      if(total<=limit)return {kind:'yaniv',reason:'within-limit'};
      const set=sets[Math.min(sets.length-1,Math.floor(rng()*sets.length))],low=options.slice().sort((a,b)=>C.value(a)-C.value(b))[0];
      const pick=low&&C.value(low)<=2&&rng()<.4?low:null;
      return {kind:'move',discardIds:set.map(c=>c.id),source:pick?'pile':'deck',pickId:pick?.id};
    }
    if(difficulty!=='hard'){
      if(total<=limit)return {kind:'yaniv',reason:'within-limit'};
      const set=bestDiscard(hand),low=options.slice().sort((a,b)=>C.value(a)-C.value(b))[0],pick=low&&C.value(low)<=3?low:null;
      return {kind:'move',discardIds:set.map(c=>c.id),source:pick?'pile':'deck',pickId:pick?.id};
    }
    if(total<=Math.min(2,limit))return {kind:'yaniv',reason:'very-low-hand'};
    // One-step expectation over unseen card faces, never the real deck order.
    const cache=new Map();
    function cost(cards){
      const key=cards.map(face).sort().join('|');if(cache.has(key))return cache.get(key);
      const sum=C.total(cards),after=sum-C.total(bestDiscard(cards));
      const n=sum*.62+after*.38+cards.length*.65;cache.set(key,n);return n;
    }
    let best=null;
    for(const set of sets){
      const rest=hand.filter(c=>!set.includes(c));
      const deckCost=unknown.reduce((n,c)=>n+cost([...rest,c]),0)/unknown.length;
      const moves=[{source:'deck',cost:deckCost,expectedTotal:C.total(rest)+C.total(unknown)/unknown.length}];
      for(const pick of options)moves.push({source:'pile',pickId:pick.id,cost:cost([...rest,pick]),expectedTotal:C.total(rest)+C.value(pick)});
      for(const move of moves)if(!best||move.cost<best.cost-1e-9)best={kind:'move',discardIds:set.map(c=>c.id),...move};
    }
    if(total<=limit){
      const danger=view.opponentCounts.some(n=>n<=2);
      if(!danger||best.expectedTotal>=total-1||total<=3)return {kind:'yaniv',reason:danger?'limited-improvement':'opponents-have-long-hands'};
    }
    return best;
  }
  return {decide,bestDiscard,unknownCards};
});
