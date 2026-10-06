const {chromium}=require('playwright');

const fs=require('fs'),assert=require('node:assert/strict');
const report={viewports:[],checks:[],errors:[],limitations:['No real mobile hardware frame-rate measurement','Live Supabase multiplayer not exercised; isolated SDK/HTTP concurrency tests are separate']};
function check(name,condition){assert.ok(condition,name);report.checks.push(name);}
fs.mkdirSync('artifacts',{recursive:true});const server=require('./serve.cjs')(4174);new Function(fs.readFileSync('index.html','utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
async function start(p,n=4){await p.goto('http://127.0.0.1:4174');await p.evaluate(n=>{PREFS.sound=false;SETTINGS.rules.playerCount=n;startVsComputer();},n);await p.waitForTimeout(1300);}
async function fixture(p,hand=['2♥','3♣','4♦','8♠','Q♥']){await p.evaluate(hand=>{stopClock();selected.clear();const d=buildDeck();const make=t=>d.find(c=>c.r===t.slice(0,-1)&&c.s===t.slice(-1));G.players[0].hand=hand.map(make);G.players.slice(1).forEach((pl,i)=>pl.hand=['K♠','Q♦','J♣'].map(make));G.turn=0;G.phase='action';G.gameOver=false;G._animateDeal=false;G.pendingDiscard=null;G.discard=[make('6♣'),make('9♦')];G.availableToTake=[make('5♠')];G.deck=d.filter(c=>!G.players.flatMap(p=>p.hand).concat(G.discard,G.availableToTake).some(x=>x.id===c.id));G.lastDrawnId=null;G.forfeitResult=null;G.roundResult=null;G.players.forEach(p=>{p.forfeited=false;p.idleTurns=0});TurnEngine.arm(G,Date.now());render();},hand);}
(async()=>{
const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined});
const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});p.on('pageerror',e=>report.errors.push(e.message));
for(const [w,hh] of [[375,812],[390,844],[393,852],[430,932]]){
 await p.setViewportSize({width:w,height:hh});await start(p);await fixture(p);await p.waitForTimeout(350);
 const geometry=await p.evaluate(()=>{const selectors=['#youHand .card','#actions button','.station','#deck','#discard','.me-row'];return selectors.flatMap(s=>[...document.querySelectorAll(s)].map(e=>{let r=e.getBoundingClientRect();return {selector:s,x:r.x,y:r.y,right:r.right,bottom:r.bottom}}))});
 check('No clipped live game elements at '+w+'x'+hh,geometry.every(x=>x.x>=-1&&x.right<=w+1&&x.y>=0&&x.bottom<=hh));
 check('LTR hand order at '+w,await p.locator('#youHand').evaluate(e=>getComputedStyle(e).direction==='ltr'));
 await p.screenshot({path:`artifacts/game-${w}x${hh}.png`});
 await fixture(p,['A♠','2♥','3♦','4♣','5♥','6♠','7♣']);await p.waitForTimeout(350);
 check('Seven cards inside viewport '+w,await p.locator('#youHand .card').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1})));report.viewports.push({width:w,height:hh,players:4,hands:[5,7]});
}
await p.setViewportSize({width:390,height:844});await start(p,2);await fixture(p);
const first=p.locator('#youHand .card').first();await first.click();await p.waitForTimeout(400);
check('Selection has lift and accessible pressed state',await first.getAttribute('aria-pressed')==='true');
check('Discard button removed',await p.locator('.discard-action').count()===0);check('Selection enables deck',await p.locator('#deck').getAttribute('aria-disabled')==='false');
await p.screenshot({path:'artifacts/game-selected.png'});
await p.screenshot({path:'artifacts/game-draw.png'});await p.locator('#deck').click();
check('Deck draw restores hand and advances turn',await p.evaluate(()=>G.players[0].hand.length===5&&G.turn===1));await p.waitForTimeout(2400);
check('CPU completes a real turn',await p.evaluate(()=>G.turn===0&&G.phase==='action'));
await fixture(p);await p.locator('#youHand .card').first().click();const id=await p.evaluate(()=>G.availableToTake[0].id);await p.locator('#discard .pick').click();check('Discard draw takes selected available card',await p.evaluate(id=>G.players[0].hand.some(c=>c.id===id),id));await p.waitForTimeout(2400);
await fixture(p);await p.locator('#youHand .card').nth(0).click();await p.locator('#youHand .card').nth(2).click();check('Invalid combination disables draw',await p.locator('#deck').getAttribute('aria-disabled')==='true');check('High hand disables Yaniv',await p.locator('.token').isDisabled());
await fixture(p,['A♥','2♣']);check('Low hand enables Yaniv',await p.locator('.token').isEnabled());await p.screenshot({path:'artifacts/game-yaniv-ready.png'});await p.locator('.token').click();await p.waitForTimeout(450);await p.screenshot({path:'artifacts/event-yaniv.png'});await p.waitForTimeout(1800);
check('Yaniv result',await p.evaluate(()=>G.gameOver&&!G.roundResult.assaf));check('Result dialog visible',await p.locator('.dlg.result').isVisible());await p.screenshot({path:'artifacts/round-result.png'});await p.getByRole('button',{name:'הסיבוב הבא',exact:true}).click();await p.waitForTimeout(1300);check('Next round deals fresh hand',await p.evaluate(()=>G.round===2&&G.players[0].hand.length===RULES.startCards&&!G.gameOver));
await fixture(p,['3♥','4♣']);await p.evaluate(()=>{G.players[1].hand=[buildDeck().find(c=>c.r==='A')];render()});await p.locator('.token').click();await p.waitForTimeout(450);await p.screenshot({path:'artifacts/event-assaf.png'});await p.waitForTimeout(1800);check('Assaf penalty preserved',await p.evaluate(()=>G.roundResult.assaf&&G.roundResult.after[0]-G.roundResult.before[0]===RULES.assafPenalty+1));
await p.evaluate(()=>{quitGame();go('menu')});await p.waitForTimeout(600);await p.screenshot({path:'artifacts/home.png'});
await p.getByRole('button',{name:'הגדרות',exact:true}).click();await p.waitForTimeout(350);await p.screenshot({path:'artifacts/settings.png'});await p.locator('#setName').fill('רחל ושם ארוך');check('Profile input persists',await p.evaluate(()=>JSON.parse(localStorage.getItem(LS_KEY)).name==='רחל ושם ארוך'));
await p.evaluate(()=>go('online'));await p.waitForTimeout(350);await p.screenshot({path:'artifacts/online.png'});
await p.evaluate(()=>{setOnlineWaiting('room');renderWait('roomWait',4,[{name:'רחל',av:0},{name:'חבר',av:1}], 'ABCD');$('onlineStatus').textContent='ממתינים לחברים (2/4)'});await p.waitForTimeout(350);await p.screenshot({path:'artifacts/waiting-room.png'});
for(const f of ['showRules','showStore','showRank','showWheel']){await p.evaluate(f=>window[f](),f);check(f+' dialog opens',await p.locator('#panel').isVisible());await p.keyboard.press('Escape');check(f+' closes with Escape',!await p.locator('#overlay').evaluate(e=>e.classList.contains('show')));}
await start(p,3);await fixture(p);check('Three-player layout',await p.locator('.station').count()===2);
await p.emulateMedia({reducedMotion:'reduce'});await fixture(p,['A♥']);await p.locator('.token').click();await p.waitForTimeout(50);check('Reduced motion has no particles',await p.locator('.event-spark').count()===0);await p.waitForTimeout(1400);
await p.emulateMedia({reducedMotion:'no-preference'});
await p.evaluate(()=>closeOverlay());await start(p,4);await fixture(p);
const deadline=await p.evaluate(()=>G.turnDeadline);await p.locator('#youHand .card').first().click();check('Selection never resets deadline',await p.evaluate(()=>G.turnDeadline)===deadline);
await p.evaluate(()=>{G.turnDeadline=Date.now()+4200;startClock();tickTurnTimer()});await p.screenshot({path:'artifacts/timer-warning.png'});check('Last five seconds warning',await p.locator('#turnClock').evaluate(e=>e.classList.contains('urgent')));
await p.evaluate(()=>{G.players[0].idleTurns=1;G.turnDeadline=Date.now()-1;tickTurnTimer()});await p.waitForTimeout(200);check('Timeout sends one random discard and draws',await p.evaluate(()=>G.players[0].idleTurns===2&&G.turn===1&&G.players[0].hand.length===5));
await p.waitForTimeout(3200);await fixture(p);await p.evaluate(()=>{G.players[0].idleTurns=2;G.turnDeadline=Date.now()-1;tickTurnTimer()});await p.waitForTimeout(250);
check('Third consecutive timeout eliminates player',await p.evaluate(()=>G.players[0].forfeited&&G.players[0].hand.length===0&&!G.gameOver));check('Eliminated player gets explanation',await p.getByText('המשחק שלך הסתיים',{exact:true}).isVisible());await p.screenshot({path:'artifacts/forfeit.png'});
await p.evaluate(()=>quitGame());await start(p,2);await fixture(p);await p.evaluate(()=>{G.players[0].idleTurns=2;G.turnDeadline=Date.now()-1;tickTurnTimer()});await p.waitForTimeout(200);check('Two-player forfeit awards match to opponent',await p.evaluate(()=>G.gameOver&&G.forfeitResult.winnerIdx===1));
await p.evaluate(()=>{quitGame();PREFS.sound=true});await p.getByRole('button',{name:'משחק מול המחשב',exact:true}).click();await p.waitForTimeout(1200);await p.evaluate(()=>{sfxSelect();sfxDiscard();sfxDraw();sfxTick();sfxTimeout()});check('Audio context unlocked by user gesture',await p.evaluate(()=>_actx&&_actx.state==='running'));await p.evaluate(()=>PREFS.sound=false);
check('No browser JavaScript errors',report.errors.length===0);
fs.writeFileSync('artifacts/qa-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,viewports:report.viewports,errors:report.errors}));await b.close();server.close();
})().catch(e=>{console.error(e);fs.writeFileSync('artifacts/qa-report.json',JSON.stringify({...report,failure:e.message},null,2));server.close();process.exit(1)});
