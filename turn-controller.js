/* UI orchestration. Online turns use compare-and-swap against updated_at. */
let _moveBusy=false,_timeoutBusy=false,_timeoutRetryAt=0,_cpuScheduled='',_tickCue='',_lastEventSeen='',_forfeitShown='',_forfeitLossRecorded=false;
const turnHelpers=()=>({isValidSet,shuffle,handTotal});
const gameNow=()=>Date.now();
function liveTurn(){return G&&!G.gameOver&&!G.players[G.meIndex].forfeited&&G.turn===G.meIndex;}
function startTurn(){
  if(!G)return;
  if(!G.turnDeadline&&!G.gameOver&&MODE==='cpu')TurnEngine.arm(G,gameNow());
  selected.clear();render();tickTurnTimer();
  if(liveTurn())sfxTurn();
  const key=(G.gameId||ROOM||'')+':'+(G.round||1)+':'+G.turnSequence+':'+G.turn;
  if(MODE==='cpu'&&!G.gameOver&&!G.players[G.turn].forfeited&&!(G.humanIndices||[G.meIndex]).includes(G.turn)&&_cpuScheduled!==key){
    _cpuScheduled=key;setTimeout(()=>{if(G&&!G.gameOver&&key===(G.gameId||ROOM||'')+':'+(G.round||1)+':'+G.turnSequence+':'+G.turn)cpuTurn();},850);
  }
}
function updateDrawTargets(){
  if(!G)return;
  const ready=liveTurn()&&!_moveBusy&&(G.phase==='draw'||isValidSet(selectedCards()))&&(!G.turnDeadline||gameNow()<G.turnDeadline);
  $('deck').classList.toggle('pick',ready);$('deck').setAttribute('aria-disabled',String(!ready));
  const avail=G.availableToTake||[];
  document.querySelectorAll('#discard .av-cards .card').forEach((el,i)=>{const end=i===0||i===avail.length-1;el.classList.toggle('pick',ready&&end);el.classList.toggle('dim',ready&&!end);el.setAttribute('aria-disabled',String(!ready||!end));});
}
function tickTurnTimer(){
  if(!G||!$('game').classList.contains('active'))return;
  const remaining=G.gameOver?0:Math.max(0,(G.turnDeadline||0)-gameNow()),seconds=Math.ceil(remaining/1000);
  document.querySelectorAll('[data-turn-seconds]').forEach(e=>e.textContent=G.gameOver?'—':G.turnDeadline?String(seconds):'…');
  const clock=$('turnClock');if(clock){clock.classList.toggle('urgent',!G.gameOver&&seconds<=5);clock.style.setProperty('--remaining',Math.min(1,remaining/TurnEngine.TURN_MS));clock.setAttribute('aria-label',G.gameOver?'הסיבוב הסתיים':seconds+' שניות לתור');}
  if(liveTurn()&&seconds>0&&seconds<=5&&!document.hidden){const cue=G.turnSequence+':'+seconds;if(_tickCue!==cue){_tickCue=cue;sfxTick();}}
  if(!G.gameOver&&G.turnDeadline&&remaining===0&&!_timeoutBusy&&!_moveBusy&&gameNow()>=_timeoutRetryAt){expireTurn();}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tickTurnTimer();});

async function commitTransition(reducer){
  if(!G)return false;
  const mode=MODE,room=ROOM,me=G.meIndex,round=G.round,sequence=G.turnSequence||0;
  const stillHere=()=>G&&MODE===mode&&ROOM===room;
  if(mode!=='online'){
    try{const next=reducer(G,gameNow());acceptTransition(next,me);return true;}catch(e){toast(e.message,1800,'err');return false;}
  }
  if(!sb||!room)return false;
  try{
    const fresh=await sb.from('yaniv_games').select('state,updated_at').eq('code',room).single();
    if(fresh.error||!fresh.data)throw Error('אין חיבור — המהלך לא נשלח');
    if(!stillHere())return false;
    const base=fresh.data.state;
    if(base.round!==round||(base.turnSequence||0)!==sequence){_lastSeenUpdatedAt=fresh.data.updated_at;applyRemote(base);return false;}
    const next=reducer(base,gameNow());
    // A strictly newer revision makes even same-millisecond writes mutually exclusive.
    const revision=new Date(Math.max(gameNow(),Date.parse(fresh.data.updated_at)+1)).toISOString();
    const write=await sb.from('yaniv_games').update({state:next,updated_at:revision}).eq('code',room).eq('updated_at',fresh.data.updated_at).select('state,updated_at');
    if(write.error)throw Error('אין חיבור — המהלך לא נשלח');
    if(!stillHere())return false;
    if(!write.data||!write.data.length){
      const latest=await sb.from('yaniv_games').select('state,updated_at').eq('code',room).single();
      if(latest.data&&stillHere()){_lastSeenUpdatedAt=latest.data.updated_at;applyRemote(latest.data.state);}return false;
    }
    _lastSeenUpdatedAt=write.data[0].updated_at;acceptTransition(write.data[0].state,me);return true;
  }catch(e){if(stillHere())toast(e.message||'המהלך לא נשלח',2400,'err');return false;}
}
function acceptTransition(state,me){
  const old=G;G=state;G.meIndex=me;G.iAmHost=(G.hostIndex||0)===me;applyRulesFrom(G);selected.clear();FLY.clear();
  presentGameTransition(old);
}
function presentGameTransition(old){
  const ev=G.lastEvent,key=ev?G.round+':'+ev.sequence+':'+ev.kind:'';
  if(ev&&key!==_lastEventSeen){
    _lastEventSeen=key;
    if(ev.kind==='timeout'||ev.kind==='forfeit'){
      sfxTimeout();toast(ev.kind==='forfeit'?pname(G.players[ev.actor])+' הפסיד בגלל חוסר פעילות':'תם הזמן · בוצע מהלך אוטומטי ('+ev.idleTurns+'/3)',2800);
    }else if(ev.kind==='move'){sfxDiscard();setTimeout(sfxDraw,130);}
  }
  if(G.gameOver){stopClock();render();if(G.forfeitResult)showForfeitResult();else if(G.roundResult&&!_announcing&&!$('overlay').classList.contains('show'))announceThenResult();return;}
  if(!clockTimer)startClock();
  if(old&&old.round!==G.round){closeOverlay();resetClocks();}
  if(!old||old.turnSequence!==G.turnSequence||old.turn!==G.turn)startTurn();else render();
  if(G.players[G.meIndex].forfeited&&!old?.players[G.meIndex]?.forfeited)showEliminated();
}
async function performTurn(source,pickId,options={}){
  if(!G||G.gameOver||_moveBusy)return;
  const actor=options.actor??G.meIndex;
  if(G.turn!==actor||G.players[actor].forfeited)return;
  const ids=options.discardIds||[...selected];
  if(G.phase!=='draw'&&!isValidSet(G.players[actor].hand.filter(c=>ids.includes(c.id)))){toast('בחרו קלף או צירוף חוקי להשלכה',1800);return;}
  const discarded=G.players[actor].hand.filter(c=>ids.includes(c.id));
  const origins=discarded.map(c=>rectOf(qs('#youHand [data-id="'+c.id+'"]'))||rectOf(qs('.station[data-seat="'+actor+'"] .fan-mini')));
  const drawOrigin=source==='pile'?rectOf(qs('#discard [data-id="'+pickId+'"]')):rectOf($('deckCard'));
  _moveBusy=true;renderHintAndActions(liveTurn());updateDrawTargets();
  try{
    const ok=await commitTransition((base,now)=>TurnEngine.play(base,{actor,source,pickId,discardIds:ids},base.rules||RULES,turnHelpers(),now));
    if(ok&&G&&!G.gameOver){
      discarded.forEach((c,i)=>{const dest=qs('#discard .av-cards [data-id="'+c.id+'"]');if(dest&&origins[i])flyTo(c,false,origins[i],'#discard .av-cards [data-id="'+c.id+'"]',{delay:i*45});});
      const drawn=G.players[actor].hand.find(c=>c.id===G.lastEvent?.drawnId);
      if(drawn&&actor===G.meIndex)flyTo(drawn,false,drawOrigin,'#youHand [data-id="'+drawn.id+'"]',{delay:100});
      else if(drawn){const to=rectOf(qs('.station[data-seat="'+actor+'"] .fan-mini'));if(to)flyGhost({card:null,faceDown:true,from:drawOrigin,to:{...to,width:28,height:40},delay:100});}
    }
  }finally{_moveBusy=false;if(G){renderHintAndActions(liveTurn());updateDrawTargets();}}
}
function drawFromDeck(){return performTurn('deck');}
function onPileCard(card,isEnd){if(!isEnd){toast('אפשר לקחת רק קלף מקצה הקבוצה',1800);return;}return performTurn('pile',card.id);}
async function expireTurn(){
  if(!G||G.gameOver||_timeoutBusy)return;
  _timeoutBusy=true;_timeoutRetryAt=gameNow()+1200;
  try{await commitTransition((base,now)=>TurnEngine.play(base,{actor:base.turn,timeout:true,source:'deck'},base.rules||RULES,turnHelpers(),now));}
  finally{_timeoutBusy=false;}
}
async function resolveYaniv(actor){
  if(_moveBusy||!G)return;_moveBusy=true;
  try{await commitTransition((base,now)=>TurnEngine.yaniv(base,actor,base.rules||RULES,turnHelpers(),now));}
  finally{_moveBusy=false;if(G)renderHintAndActions(liveTurn());}
}
function showEliminated(){
  const key=(ROOM||'cpu')+':'+G.meIndex+':'+G.round;if(_forfeitShown===key)return;_forfeitShown=key;
  overlay('<h2>המשחק שלך הסתיים</h2><p>שלושה תורים רצופים עברו ללא מהלך. נרשם לך הפסד; שאר השחקנים ממשיכים.</p><div class="btns"><button class="btn" onclick="closeOverlay()">צפייה במשחק</button><button class="btn ivory" onclick="quitGame()">לתפריט</button></div>',{closable:false});
  if(!_forfeitLossRecorded){SETTINGS.stats.games++;_forfeitLossRecorded=true;saveSettings();}
}
function showForfeitResult(){
  const winner=G.forfeitResult.winnerIdx;
  if(winner!==null&&!_forfeitLossRecorded)recordStats(true,winner,winner);
  overlay('<h2>'+(winner===G.meIndex?'ניצחת!':'המשחק הסתיים')+'</h2><p>'+esc(winner===null?'אין שחקנים פעילים':pname(G.players[winner])+' נשאר במשחק וניצח')+'</p><p>שחקן שלא מבצע מהלך בשלושה תורים רצופים מפסיד.</p><div class="btns"><button class="btn" onclick="fullRestart()">'+(MODE==='cpu'?'משחק חדש':'לתפריט')+'</button></div>',{closable:false,kind:'result'});
}
