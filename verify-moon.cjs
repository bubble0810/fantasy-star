const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const runtime=path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(path.join(runtime,'playwright'));
const sharp=require(path.join(runtime,'sharp'));
const root=__dirname;
const server=http.createServer((req,res)=>{
  if(req.url==='/host') {res.setHeader('Content-Type','text/html');res.end(`<iframe src="/fest/moon/index.html?embed=1&session=moon-test"></iframe><script>window.received=[];addEventListener('message',e=>{received.push(e.data);if(e.data.type==='fsGameStart')e.source.postMessage({type:'fsGameStarted',session:'moon-test',ok:true},location.origin);if(e.data.type==='fsGameResult')e.source.postMessage({type:'fsGameSettled',session:'moon-test',earned:e.data.earned},location.origin);});</script>`);return;}
  const target=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(target,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'})[path.extname(target)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  for(const name of ['rabbits-alpha-v2.png','moon-atlas-alpha-v2.png']){const im=sharp(path.join(root,'fest/moon/img',name));const {data,info}=await im.ensureAlpha().raw().toBuffer({resolveWithObject:true});let clear=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)clear++;assert(clear/(info.width*info.height)>.25,'Real alpha transparency required');}
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
    await page.goto(base+'/fest/moon/index.html');await page.waitForFunction(()=>window.fsQuestionsReady===true);assert.equal(await page.evaluate(()=>MoonAudio.playing),false);await page.locator('#go').click();assert.equal(await page.evaluate(()=>MoonAudio.playing),true);assert.equal(await page.evaluate(()=>MoonAudio.mode),'moon');await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');assert.equal(await page.evaluate(()=>MoonAudio.playing),true);assert.equal(await page.evaluate(()=>localStorage.getItem('fs-festival-muted')),'1');await page.locator('#sound').click();
    assert.equal(await page.evaluate(()=>FSGame.phase),'playing');assert.equal(await page.evaluate(()=>mode),'moon');assert(await page.locator('#laneControls').isHidden());assert.equal(await page.locator('.lane').count(),3);
    const tiers=await page.evaluate(()=>[0,30000,30001,60000,60001,90000,90001].map(ms=>[moonBonus(ms),Number((RULES.baseGoldChance*(1+moonBonus(ms))).toFixed(4))]));assert.deepEqual(tiers,[[.5,.36],[.5,.36],[.3,.312],[.3,.312],[.1,.264],[.1,.264],[0,.24]]);
    const sensors=await page.evaluate(()=>{const out=[];for(let i=0;i<8;i++){step=i;flight=null;const spec=ringSpec(),now=performance.now();ringStart=now;judge();const missed=step===i;ringStart=now-spec.period*(spec.min+spec.max)*500;judge();out.push({missed,accepted:step===i+1,window:spec.period*(spec.max-spec.min),period:spec.period,min:spec.min});}startMoon();return out;});assert(sensors.every(s=>s.missed&&s.accepted&&s.window>=.2599&&s.window<=.4001));assert(new Set(sensors.map(s=>s.period)).size>4);assert(new Set(sensors.map(s=>s.min)).size>4);
    await page.locator('#moonTap').click();assert.equal(await page.evaluate(()=>step),0);
    const randomChecks=await page.evaluate(()=>{
      const original=ringSpec();ringProgress(performance.now()+1234);judge();const stable=ringSpec()===original;
      const plans=Array.from({length:100},()=>{const plan=[];for(let i=0;i<8;i++)plan.push(randomRing(plan[i-1]));return plan;}),valid=plans.every(plan=>plan.length===8&&plan.every((s,i)=>s.period>=1.05&&s.period<=2.0&&s.min>=.2&&s.max<=.940001&&(s.max-s.min)*s.period>=.25999&&(s.max-s.min)*s.period<=.40001&&(!i||s.bucket!==plan[i-1].bucket)));
      const varied=new Set(plans.map(plan=>JSON.stringify(plan))).size;
      startMoon();return {stable,valid,varied};
    });assert(randomChecks.stable,'Retry never redraws the current target');assert(randomChecks.valid);assert(randomChecks.varied>90,'New games get different plans');
    await page.clock.runFor(1300);await page.screenshot({path:'artifacts/festivals/moon-ring-mobile.png'});
    for(let i=0;i<8;i++){
      await page.evaluate(()=>{ringStart=performance.now()-ringSpec().period*(ringSpec().min+ringSpec().max)*500;});await page.locator('#moonTap').click();assert.equal(await page.evaluate(()=>step),i+1);
      if(i<7){const prepared=await page.evaluate(()=>({length:ringPlan.length,next:ringPlan[step],previous:ringPlan[step-1],flying:!!flight}));assert(prepared.flying);assert.equal(prepared.length,i+2,'Only the next target is prepared during flight');assert.notEqual(prepared.next.bucket,prepared.previous.bucket);assert.equal(await page.locator('#between').isHidden(),true);}
      if(i===0){const ascending=await page.evaluate(()=>{let lastY=Infinity;for(let i=0;i<=100;i++){const p=flightPose(flight,i/100);if(p.y>lastY)return false;lastY=p.y;}return true;});assert(ascending,'Floating path keeps ascending, without a jump and fall');}
      await page.clock.runFor(1000);if(i===3)await page.screenshot({path:'artifacts/festivals/moon-flight-mobile.png'});await page.clock.runFor(1500);
    }
    assert.equal(await page.evaluate(()=>mode),'between');assert.equal(await page.evaluate(()=>MoonAudio.playing),false);assert.equal(await page.evaluate(()=>FSGame.phase),'playing');assert(await page.locator('#result').isHidden());assert.equal(await page.evaluate(()=>goldChance),.36);
    await page.screenshot({path:'artifacts/festivals/moon-bonus-mobile.png'});await page.locator('#next').click();assert.equal(await page.evaluate(()=>mode),'rabbit');assert.equal(await page.evaluate(()=>MoonAudio.mode),'rabbit');assert.equal(await page.evaluate(()=>MoonAudio.playing),true);
    const spawned=await page.evaluate(()=>{const original=Math.random,result=[];try{for(const elapsed of [30000,60000,90000,90001]){goldChance=RULES.baseGoldChance*(1+moonBonus(elapsed));let n=0;Math.random=()=>[.5,.9,.30,.5,.5][n++];spawn(performance.now());result.push(items.pop().type);}}finally{Math.random=original;goldChance=RULES.baseGoldChance*(1+goldBonus);}return result;});assert.deepEqual(spawned,['gold','gold','normal','normal']);
    await page.screenshot({path:'artifacts/festivals/moon-rabbits-mobile.png'});
    assert.deepEqual(await page.evaluate(()=>lanes.map(l=>l.sprite)),[0,2,1]);
    const pad=await page.locator('.lane').first().boundingBox(),px=pad.x+pad.width/2,py=pad.y+pad.height/2;
    await page.evaluate(()=>{spawnAt=Infinity;items=[];});await page.mouse.move(px,py);await page.mouse.down();await page.mouse.move(px,py-40,{steps:3});assert.equal(await page.evaluate(()=>rabbits[0].state),'jump');const triggered=await page.evaluate(()=>rabbits[0].since);await page.mouse.move(px,py-70);await page.mouse.up();assert.equal(await page.evaluate(()=>rabbits[0].since),triggered);await page.clock.runFor(1000);
    await page.mouse.move(px,py);await page.mouse.down();await page.mouse.move(px,py+40,{steps:3});await page.mouse.up();assert.equal(await page.evaluate(()=>rabbits[0].state),'hide');await page.clock.runFor(1900);await page.mouse.click(px,py);assert.equal(await page.evaluate(()=>rabbits[0].state),'idle');
    const middle=await page.locator('.lane').nth(1).boundingBox(),cdp=await page.context().newCDPSession(page),mx=middle.x+middle.width/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:px,y:py,id:1},{x:mx,y:py,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:px,y:py-45,id:1},{x:mx,y:py+45,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.deepEqual(await page.evaluate(()=>rabbits.slice(0,2).map(r=>r.state)),['jump','hide']);await page.clock.runFor(1000);await cdp.detach();
    const falling=await page.evaluate(()=>{const now=performance.now(),out=[];for(let i=0;i<30;i++){spawn(now);const it=items.pop();if(it.type!=='branch'){let last=-1,monotonic=true;for(let k=0;k<=100;k++){const p=dropProgress(it,now+it.travel*k/100);if(p<last)monotonic=false;last=p;}out.push({travel:it.travel,monotonic,finish:dropProgress(it,now+it.travel),varied:Math.abs(dropProgress(it,now+it.travel*.25)-.25)>1e-5});}}return {out,normal:RABBIT.cakeSize,gold:RABBIT.goldSize};});assert(falling.normal>100&&falling.gold>falling.normal);assert(falling.out.every(d=>d.travel>=1600&&d.travel<=2400&&d.monotonic&&Math.abs(d.finish-1)<1e-9));assert(new Set(falling.out.map(d=>d.travel)).size>1);assert(falling.out.some(d=>d.varied));
    await page.evaluate(()=>{const now=performance.now();items=['normal','gold','normal'].map((type,lane)=>({lane,type,born:now-1200,travel:2000,pace:.12,target:dropTarget(lane,type),resolved:false}));});await page.clock.runFor(32);await page.screenshot({path:'artifacts/festivals/moon-swipe-cakes-mobile.png'});await page.evaluate(()=>{items=[];});
    const checks=await page.evaluate(()=>{
      spawnAt=Infinity;items=[];const now=performance.now();
      const drop=(type,state,age=.4)=>{const r=rabbits[0];r.immuneUntil=0;r.state=state;r.since=now-age*1000;resolveItem({lane:0,type},now,state==='jump'?rabbitShape(r,now).hands:null);};
      stock=0;drop('normal','idle');const idle=stock;drop('normal','hide');const hide=stock;drop('normal','jump');const normal=stock;drop('gold','jump');const gold=stock;
      drop('branch','hide');const safe=stock;drop('branch','idle');const seatedHit=stock,stunned=rabbits[0].state;drop('branch','jump');const jumpingHit=stock;
      stock=0;drop('branch','idle');const floor=stock;
      return {idle,hide,normal,gold,safe,seatedHit,stunned,jumpingHit,floor};
    });assert.deepEqual(checks,{idle:0,hide:0,normal:1,gold:4,safe:4,seatedHit:4,stunned:'stun',jumpingHit:4,floor:0});
    const hiding=await page.evaluate(()=>{
      const now=performance.now(),saved={rabbits,items,physicsAt,spawnAt,stock,hits,effects};
      try{
        rabbits=lanes.map(p=>({...p,state:'idle',since:now,immuneUntil:0,hideExtra:0}));const r=rabbits[0];r.state='hide';
        const entering=rabbitPose(r,now+20).hidden,held=rabbitPose(r,now+1400).hidden,finished=stateAt(r,now+1810);
        stock=23;hits=0;spawnAt=Infinity;physicsAt=now;items=[{lane:0,type:'branch',born:now,travel:2100,pace:0,target:dropTarget(0,'branch'),resolved:false}];
        update(now+2000);const afterSlowArrival={hidden:rabbitPose(r,now+2000).hidden,extended:r.hideExtra>0,hits};
        update(now+2800);return {entering,held,finished,afterSlowArrival,finalState:r.state,hits,stock,removed:items.length===0};
      }finally{rabbits=saved.rabbits;items=saved.items;physicsAt=saved.physicsAt;spawnAt=saved.spawnAt;stock=saved.stock;hits=saved.hits;effects=saved.effects;}
    });assert.equal(hiding.entering,false);assert.equal(hiding.held,true);assert.equal(hiding.finished,'idle');assert(hiding.afterSlowArrival.hidden&&hiding.afterSlowArrival.extended);assert.equal(hiding.afterSlowArrival.hits,0);assert.equal(hiding.finalState,'idle');assert.equal(hiding.hits,0);assert.equal(hiding.stock,23);assert(hiding.removed);
    const geometry=await page.evaluate(()=>{
      const now=performance.now();stock=7;resolveItem({lane:0,type:'branch'},now);act(0,'jump');const jumpBlocked=rabbits[0].state==='stun';act(0,'hide');const hideBlocked=rabbits[0].state==='stun';
      const hitStock=stock;const points=lanes.map((r,lane)=>{rabbits[lane].state='jump';rabbits[lane].since=now-RULES.jump*500;return {paw:rabbitPose(rabbits[lane],now).pawY,cake:dropTarget(lane,'normal'),branch:dropTarget(lane,'branch'),feet:r.y};});
      rabbits[0].since=now-30;resolveItem({lane:0,type:'gold'},now,null);const earlyStock=stock;
      rabbits[0].since=now-RULES.jump*500;resolveItem({lane:0,type:'normal'},now,rabbitShape(rabbits[0],now).hands);const peakStock=stock;
      return {jumpBlocked,hideBlocked,hitStock,earlyStock,peakStock,points};
    });assert(geometry.jumpBlocked&&geometry.hideBlocked);assert.equal(geometry.hitStock,7);assert.equal(geometry.earlyStock,7);assert.equal(geometry.peakStock,8);for(const p of geometry.points){assert(Math.abs(p.cake-p.paw-13.5)<.001);assert(p.cake<p.branch&&p.branch<p.feet);}
    await page.evaluate(()=>{rabbits[0].state='stun';rabbits[0].since=performance.now();});await page.clock.runFor(900);await page.keyboard.press('a');assert.equal(await page.evaluate(()=>rabbits[0].state),'jump');
    const protection=await page.evaluate(()=>{
      const now=performance.now(),r=rabbits[0];r.state='jump';r.since=now-450;stock=0;effects=[];resolveItem({lane:0,type:'gold'},now,rabbitShape(rabbits[0],now).hands);const goldStock=stock,immuneDuration=r.immuneUntil-now,otherImmune=rabbits[1].immuneUntil;const hitCount=hits;resolveItem({lane:0,type:'branch'},now+1);const protectedState=r.state,protectedHits=hits-hitCount;resolveItem({lane:0,type:'branch'},r.immuneUntil);return {goldStock,immuneDuration,otherImmune,protectedState,protectedHits,expiredState:r.state,stock,effectKinds:effects.map(e=>e.kind)};
    });assert.equal(protection.goldStock,3);assert.equal(protection.immuneDuration,4000);assert.equal(protection.otherImmune,0);assert.equal(protection.protectedState,'jump');assert.equal(protection.protectedHits,0);assert.equal(protection.expiredState,'stun');assert.equal(protection.stock,3);assert.deepEqual(protection.effectKinds,['gold','shield','impact']);
    await page.evaluate(()=>{const now=performance.now();effects=[];rabbits.forEach(r=>{r.state='idle';r.immuneUntil=0;});rabbits[0].state='jump';rabbits[0].since=now-450;resolveItem({lane:0,type:'normal'},now,rabbitShape(rabbits[0],now).hands);rabbits[1].state='jump';rabbits[1].since=now-450;resolveItem({lane:1,type:'gold'},now,rabbitShape(rabbits[1],now).hands);resolveItem({lane:2,type:'branch'},now);});await page.clock.runFor(160);await page.screenshot({path:'artifacts/festivals/moon-effects-mobile.png'});
    await page.evaluate(()=>{spawnAt=Infinity;items=[];stock=11;});
    await page.clock.runFor(30050);assert.equal(await page.evaluate(()=>mode),'result');assert.equal(await page.evaluate(()=>MoonAudio.playing),false);assert.equal(await page.evaluate(()=>earned),22);
    await page.clock.runFor(1200);assert.equal(await page.evaluate(()=>mode),'result');assert.equal(await page.evaluate(()=>FSGame.phase),'result');await page.screenshot({path:'artifacts/festivals/moon-result-mobile.png'});
    for(const [width,height] of [[375,667],[390,844],[1440,900]]){
      await page.setViewportSize({width,height});await page.reload();await page.waitForFunction(()=>window.fsQuestionsReady);await page.locator('#go').click();assert.equal(await page.evaluate(()=>goldChance),.24);await page.evaluate(()=>{for(let i=0;i<8;i++){ringStart=performance.now()-ringSpec().period*(ringSpec().min+ringSpec().max)*500;judge();update(flight.until+1);}startRabbits();});
      const layout=await page.evaluate(()=>{const rect=e=>e.getBoundingClientRect(),exit=rect(document.getElementById('fsExit')),timer=rect(document.getElementById('timeChip')),money=rect(document.querySelector('.loot')),game=rect(document.getElementById('game'));return {ok:exit.right<=timer.left&&timer.right<=money.left,aligned:[...document.querySelectorAll('.lane')].every((e,i)=>Math.abs(rect(e).left+rect(e).width/2-(game.left+lanes[i].x/W*game.width))<1),gestures:[...document.querySelectorAll('.lane')].every(e=>rect(e).width>=44&&rect(e).height>=100),overflow:document.documentElement.scrollWidth>innerWidth};});assert(layout.ok,'HUD must not overlap');assert(layout.aligned,'Controls follow relocated rabbits');assert(layout.gestures);assert(!layout.overflow);
      await page.screenshot({path:`artifacts/festivals/moon-rabbits-${width}.png`});
    }
    await page.reload();await page.waitForFunction(()=>window.fsQuestionsReady);await page.locator('#go').click();await page.clock.fastForward(90001);assert.equal(await page.evaluate(()=>mode),'moon');await page.evaluate(()=>{for(let i=0;i<8;i++){ringStart=performance.now()-ringSpec().period*(ringSpec().min+ringSpec().max)*500;judge();update(flight.until+1);}});assert.equal(await page.evaluate(()=>goldChance),.24);assert.equal(await page.evaluate(()=>goldBonus),0);assert.equal(await page.evaluate(()=>mode),'between');assert.equal(await page.evaluate(()=>FSGame.phase),'playing');
    await page.goto(base+'/host');const game=page.frames().find(f=>f.url().includes('/fest/moon/'));await game.waitForFunction(()=>window.fsQuestionsReady);await game.locator('#go').click();await game.waitForFunction(()=>FSGame.phase==='playing');
    await game.locator('#fsExit').click();await page.clock.runFor(5000);assert.match(await game.locator('#timeChip').textContent(),/^5秒/);await game.locator('#fsStay').click();
    for(let i=0;i<8;i++){await game.evaluate(()=>{ringStart=performance.now()-ringSpec().period*(ringSpec().min+ringSpec().max)*500;judge();update(flight.until+1);});}
    assert.equal(await page.evaluate(()=>received.filter(m=>m.type==='fsGameResult').length),0);await game.locator('#next').click();await game.evaluate(()=>{spawnAt=Infinity;items=[];stock=9;});await game.locator('#fsExit').click();await page.clock.runFor(5000);assert.equal(await game.locator('#timeChip').textContent(),'25 秒');await game.locator('#fsStay').click();await game.evaluate(()=>update(deadline+1));
    await page.clock.runFor(1100);await game.waitForFunction(()=>FSGame.phase==='result');
    const results=await page.evaluate(()=>received.filter(m=>m.type==='fsGameResult'));assert.equal(results.length,1);assert.equal(results[0].earned,18);assert.equal(results[0].fsGame,'moon');assert(results[0].completed);await game.evaluate(()=>fsReport(999));assert.equal(await page.evaluate(()=>received.filter(m=>m.type==='fsGameResult').length),1);
    await game.locator('#again').click();await page.waitForFunction(()=>received.some(m=>m.type==='fsGameReplay'));
    await page.route('**/rabbits-alpha-v2.png',r=>r.abort());await page.goto(base+'/fest/moon/index.html');await page.locator('#loadStatus').filter({hasText:'素材載入失敗'}).waitFor();assert(await page.locator('#go').isDisabled());assert.equal(await page.evaluate(()=>FSGame.phase),'ready');
    assert.deepEqual(errors,[]);console.log('PASS: random ring plans, safe reaction windows, stable retries; swipe up/down fires before release once per gesture; tap ignored; native dual-touch controls separate rabbits; swapped middle/right sprites; larger cakes and monotonic variable speeds; bonuses; immunity/effects; both-stage lifecycle; HUD; one reward; replay; failed assets.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});








