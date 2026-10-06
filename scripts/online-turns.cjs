/* Exercises the real Supabase SDK against an intercepted, isolated HTTP fixture. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const serve=require('./serve.cjs'),server=serve(4175);
const clone=o=>JSON.parse(JSON.stringify(o));
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined});
 const ctx=await browser.newContext({serviceWorkers:'block'});let row=null,writes=0,patchAttempts=0,failRead=false;const errors=[];
 await ctx.route('https://yaniv-test.invalid/**',async route=>{
   const req=route.request(),url=new URL(req.url());
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'};
   if(req.method()==='OPTIONS')return route.fulfill({status:200,headers,body:''});
   if(req.method()==='GET'){
     if(failRead)return route.fulfill({status:503,headers,body:JSON.stringify({message:'offline test'})});
     // Both racing clients can read the same revision before either commits.
     const snapshot=clone(row);await new Promise(r=>setTimeout(r,25));
     return route.fulfill({status:200,headers,body:JSON.stringify(req.headers().accept?.includes('object')?snapshot:[snapshot])});
   }
   if(req.method()==='PATCH'){
     patchAttempts++;const expected=url.searchParams.get('updated_at');assert.ok(expected,'Every turn write must carry an updated_at lease');
     if(expected!=='eq.'+row.updated_at)return route.fulfill({status:200,headers,body:'[]'});
     const body=req.postDataJSON();row={...row,state:body.state,updated_at:body.updated_at};writes++;
     return route.fulfill({status:200,headers,body:JSON.stringify([row])});
   }
   throw Error('Unexpected test request '+req.method());
 });
 const pages=[await ctx.newPage(),await ctx.newPage()];
 for(const p of pages){p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4175');await p.waitForFunction(()=>typeof supabase!=='undefined');await p.evaluate(()=>{PREFS.sound=false;startVsComputer();stopClock();});}
 const seed=await pages[0].evaluate(()=>{const d=buildDeck();G.players[0].hand=d.splice(0,5);G.players[1].hand=d.splice(0,5);G.availableToTake=d.splice(0,1);G.discard=[];G.deck=d;G.started=true;G.humanIndices=[0,1];G.turnDeadline=Date.now()+15000;G.turnSequence=10;G._animateDeal=false;return JSON.parse(JSON.stringify(G));});
 async function reset(patch={}){
   row={code:'TEST',state:{...clone(seed),...patch},updated_at:new Date(Date.now()-5000).toISOString()};writes=0;patchAttempts=0;
   await Promise.all(pages.map((p,i)=>p.evaluate(({s,i})=>{stopClock();closeOverlay();G=s;G.meIndex=i;G.iAmHost=i===0;MODE='online';ROOM='TEST';RULES={...G.rules};selected.clear();FLY.clear();_moveBusy=false;_timeoutBusy=false;_timeoutRetryAt=Date.now()+60000;_lastSeenUpdatedAt=null;sb=supabase.createClient('https://yaniv-test.invalid',SB_KEY,{auth:{persistSession:false,autoRefreshToken:false}});render();}, {s:clone(row.state),i})));
 }
 await reset({turnDeadline:Date.now()-20});
 await Promise.all(pages.map(p=>p.evaluate(()=>expireTurn())));
 assert.equal(writes,1,'Concurrent timeout commits exactly once');assert.equal(row.state.turnSequence,11);assert.equal(row.state.players[0].idleTurns,1);assert.equal(row.state.turn,1);
 for(const p of pages){assert.equal(await p.evaluate(()=>G.turnSequence),11);await p.evaluate(()=>stopClock());}
 console.log('PASS: two simultaneous timeout observers, one atomic write, both clients converge');
 await reset();
 const first=seed.players[0].hand[0].id;
 await pages[0].evaluate(async id=>{selected.add(id);await Promise.all([drawFromDeck(),drawFromDeck()]);},first);
 assert.equal(writes,1);assert.equal(row.state.turn,1);assert.equal(row.state.players[0].hand.length,5);
 console.log('PASS: rapid double click cannot submit twice');
 await reset({turnDeadline:Date.now()-20});
 await Promise.all([pages[0].evaluate(id=>{selected.add(id);return drawFromDeck();},first),pages[1].evaluate(()=>expireTurn())]);
 assert.equal(writes,1);assert.equal(row.state.lastEvent.kind,'timeout');
 console.log('PASS: action at expired deadline loses to one timeout transition');
 await reset();failRead=true;
 await pages[0].evaluate(id=>{selected.add(id);return drawFromDeck();},first);
 assert.equal(writes,0);assert.equal(await pages[0].evaluate(()=>G.turnSequence),10);assert.equal(await pages[0].evaluate(()=>G.players[0].hand.length),5);failRead=false;
 console.log('PASS: network failure leaves hand and turn unchanged');
 await reset({players:seed.players.map((p,i)=>({...clone(p),idleTurns:i===0?2:0})),turnDeadline:Date.now()-20});
 await pages[1].evaluate(()=>expireTurn());
 assert.equal(writes,1);assert.equal(row.state.players[0].forfeited,true);assert.equal(row.state.hostIndex,1);assert.equal(row.state.forfeitResult.winnerIdx,1);
 console.log('PASS: another client can forfeit absent host after the third idle turn');
 assert.deepEqual(errors,[]);console.log('PASS: zero page errors; no requests or writes to the real backend');
 await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
