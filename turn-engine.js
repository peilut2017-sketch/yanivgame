/* Pure turn transitions shared by the UI, timeout handler and regression tests. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.TurnEngine=api;})(globalThis,function(){
  'use strict';
  const TURN_MS=15000,MAX_IDLE=3,copy=s=>JSON.parse(JSON.stringify(s));
  const active=s=>s.players.map((p,i)=>p.forfeited?-1:i).filter(i=>i>=0);
  function arm(s,now=Date.now()){s.turnSequence=(s.turnSequence||0)+1;s.turnDeadline=now+TURN_MS;return s;}
  function appendUnique(target,cards){const ids=new Set(target.map(c=>c.id));for(const c of cards){if(c&&!ids.has(c.id)){target.push(c);ids.add(c.id);}}}
  function recycle(s,shuffle){
    if(s.deck.length)return;
    const unavailable=new Set([...(s.availableToTake||[]),...(s.pendingDiscard||[]),...s.players.flatMap(p=>p.hand)].map(c=>c.id));
    const pool=[];appendUnique(pool,(s.discard||[]).filter(c=>!unavailable.has(c.id)));
    s.deck=shuffle(pool);s.discard=[];
  }
  function advance(s,now){
    const living=active(s);
    if(living.length<=1){s.gameOver=true;s.forfeitResult={winnerIdx:living[0]??null};s.turnDeadline=0;s.turnSequence=(s.turnSequence||0)+1;return;}
    for(let n=1;n<=s.players.length;n++){const i=(s.turn+n)%s.players.length;if(!s.players[i].forfeited){s.turn=i;break;}}
    s.phase='action';arm(s,now);
  }
  function guard(s,actor,now,timeout){
    if(s.gameOver||s.turn!==actor||!s.players[actor]||s.players[actor].forfeited)throw Error('התור כבר השתנה');
    if(timeout){if(!s.turnDeadline||now<s.turnDeadline)throw Error('הזמן עדיין לא הסתיים');}
    else if(s.turnDeadline&&now>=s.turnDeadline)throw Error('הזמן לתור הסתיים');
  }
  function play(state,move,rules,helpers,now=Date.now(),rng=Math.random){
    const s=copy(state),actor=move.actor,timeout=!!move.timeout;guard(s,actor,now,timeout);
    const p=s.players[actor];let ids=move.discardIds||[],source=move.source,pickId=move.pickId;
    if(timeout){ids=p.hand.length?[p.hand[Math.min(p.hand.length-1,Math.floor(rng()*p.hand.length))].id]:[];source='deck';}
    const legacy=s.phase==='draw';
    const thrown=legacy?(s.pendingDiscard||[]):p.hand.filter(c=>ids.includes(c.id));
    if(!legacy&&(!(timeout&&p.hand.length===0))&&(new Set(ids).size!==ids.length||thrown.length!==ids.length||!helpers.isValidSet(thrown)))throw Error('בחרו קלף או צירוף חוקי להשלכה');
    const available=s.availableToTake||[];
    let drawn;
    if(source==='pile'){
      if(!available.length||![available[0].id,available.at(-1).id].includes(pickId))throw Error('אפשר לקחת רק קלף מקצה הקבוצה');
      drawn=available.find(c=>c.id===pickId);
    }else if(source==='deck'){
      recycle(s,helpers.shuffle);if(!s.deck.length)throw Error('אין קלפים זמינים בחפיסה');drawn=s.deck.shift();
    }else throw Error('בחרו מאיפה למשוך');
    if(!legacy)p.hand=p.hand.filter(c=>!ids.includes(c.id));
    appendUnique(s.discard,available.filter(c=>source!=='pile'||c.id!==drawn.id));
    s.availableToTake=thrown.slice();s.pendingDiscard=null;s.justDiscarded=thrown.slice();s.lastDrawnId=drawn.id;p.hand.push(drawn);
    p.idleTurns=timeout?(p.idleTurns||0)+1:0;
    const forfeited=p.idleTurns>=MAX_IDLE;
    if(forfeited){p.forfeited=true;p.forfeitReason='timeout';appendUnique(s.discard,p.hand);p.hand=[];}
    if(s.players[s.hostIndex||0]?.forfeited)s.hostIndex=active(s)[0]??0;
    s.lastEvent={kind:forfeited?'forfeit':timeout?'timeout':'move',actor,source,drawnId:drawn.id,discardedIds:thrown.map(c=>c.id),idleTurns:p.idleTurns};
    advance(s,now);s.lastEvent.sequence=s.turnSequence;s._animateDeal=false;
    return s;
  }
  function yaniv(state,actor,rules,helpers,now=Date.now()){
    const s=copy(state);guard(s,actor,now,false);
    if(s.phase==='draw')throw Error('אפשר לקרוא יניב רק בתחילת התור');
    const totals=s.players.map(p=>helpers.handTotal(p.hand)),callerTotal=totals[actor];
    if(callerTotal>rules.yanivLimit)throw Error('ערך היד גבוה מסף יניב');
    const before=s.players.map(p=>p.score),others=active(s).filter(i=>i!==actor),assafers=others.filter(i=>totals[i]<=callerTotal);
    let assafBy=null;
    if(assafers.length){assafBy=assafers.reduce((a,b)=>totals[a]<=totals[b]?a:b);s.players[actor].score+=rules.assafPenalty+totals[assafBy];}
    else others.forEach(i=>s.players[i].score+=totals[i]);
    const halved=[];
    if(rules.halveOnRound){const mark=rules.loseScore/2;s.players.forEach((p,i)=>{if(!p.forfeited&&p.score>0&&p.score%mark===0&&p.score<rules.loseScore){p.score/=2;halved.push(i);}});}
    s.players[actor].idleTurns=0;s.gameOver=true;s.turnDeadline=0;s.turnSequence=(s.turnSequence||0)+1;
    s.roundResult={callerIdx:actor,callerTotal,assaf:!!assafers.length,assafers,assafBy,totals,before,after:s.players.map(p=>p.score),halved};
    s.lastEvent={kind:'yaniv',actor,sequence:s.turnSequence};return s;
  }
  return {TURN_MS,MAX_IDLE,active,arm,play,yaniv};
});
