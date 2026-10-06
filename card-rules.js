/* Shared legal combinations; no game state or hidden information. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.CardRules=api;})(globalThis,function(){
  const ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const value=c=>c.r==='JOKER'?0:c.r==='A'?1:['J','Q','K'].includes(c.r)?10:Number(c.r);
  const total=cards=>cards.reduce((n,c)=>n+value(c),0);
  function valid(cards){
    if(!cards.length)return false;if(cards.length===1)return true;
    const real=cards.filter(c=>c.r!=='JOKER'),jokers=cards.length-real.length;
    if(real.length&&real.every(c=>c.r===real[0].r))return true;
    if(real.length<2||cards.length<3||!real.every(c=>c.s===real[0].s))return false;
    const positions=real.map(c=>ranks.indexOf(c.r)).sort((a,b)=>a-b);
    return new Set(positions).size===positions.length&&positions.at(-1)-positions[0]+1-real.length<=jokers;
  }
  function sets(hand){
    const out=[];
    function visit(i,chosen){if(i===hand.length){if(valid(chosen))out.push(chosen.slice());return;}visit(i+1,chosen);chosen.push(hand[i]);visit(i+1,chosen);chosen.pop();}
    visit(0,[]);return out;
  }
  function toggle(hand,ids,id){
    if(!hand.some(c=>c.id===id))return ids.slice();
    const removing=ids.includes(id),wanted=removing?ids.filter(x=>x!==id):[...ids,id];
    if(!wanted.length)return [];
    const exact=hand.filter(c=>wanted.includes(c.id));if(valid(exact))return wanted;
    const candidates=sets(hand).filter(s=>removing?s.every(c=>wanted.includes(c.id)):wanted.every(x=>s.some(c=>c.id===x)));
    candidates.sort((a,b)=>(removing?b.length-a.length:a.length-b.length)||total(b)-total(a));
    return candidates.length?candidates[0].map(c=>c.id):ids.slice();
  }
  function ordered(cards){
    const real=cards.filter(c=>c.r!=='JOKER').sort((a,b)=>ranks.indexOf(a.r)-ranks.indexOf(b.r));
    if(real.length<2||real.every(c=>c.r===real[0].r))return cards.slice();
    const jokers=cards.filter(c=>c.r==='JOKER'),out=[];
    for(let i=0;i<real.length;i++){if(i)for(let r=ranks.indexOf(real[i-1].r)+1;r<ranks.indexOf(real[i].r);r++)out.push(jokers.shift());out.push(real[i]);}
    return out.concat(jokers).filter(Boolean);
  }
  return {ranks,value,total,valid,sets,toggle,ordered};
});
