const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert'),vm=require('vm');
let playwright;
try{playwright=require('playwright')}catch{playwright=require(path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))}
const {chromium}=playwright;
const root=__dirname;
for(const k of ['halloween','xmas','newyear','children']){
  const s=fs.readFileSync(`fest/${k}/index.html`,'utf8');
  for(const m of s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:k});
}
new vm.Script(fs.readFileSync('festgames.js','utf8'));
const harness=`<!doctype html><meta charset="utf-8"><script>
window.S={char:'f',candy:1000,items:[],homes:[],fest:{}};window.ITEMS=[];window.HOMES=[];
window.FESTS=['halloween','xmas','newyear','children'].map(k=>({k}));
window.festState=()=>({on:true,end:Date.now()+86400000});window.SND={pause(){},resume(){},setTheme(){},play(){}};
window.save=()=>{};window.render=()=>{};window.stage=()=>{};window.toast=t=>window.lastToast=t;
window.head=t=>'<h1>'+t+'</h1>';window.fmtMD=()=>'';
window.openSheet=s=>document.getElementById('sheet').innerHTML=s;window.closeQuiz=()=>document.getElementById('sheet').innerHTML='';
</script><div id="sheet"></div><script src="/festival-config.js"></script><script src="/festgames.js"></script>`;
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/harness'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(harness);return}
  const file=path.join(root,decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  try{const data=fs.readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 fs.mkdirSync('artifacts/festivals',{recursive:true});
 for(const key of (process.argv.includes('--halloween')?['halloween']:process.argv.includes('--xmas')?['xmas']:['halloween','xmas','newyear','children'])){
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.goto(base+'/harness');await page.evaluate(k=>festMenu(k),key);await page.locator('#fgGo').click();
  const frame=await (await page.locator('#fgFrame iframe').elementHandle()).contentFrame();
  await frame.waitForURL('**/fest/'+key+'/**');
  assert(frame,'iframe created');const go=frame.locator(key==='children'?'#go':'#goBtn');await go.waitFor({state:'visible'});
  const runs=key==='xmas'?5:3;
  assert.equal(await page.evaluate(k=>S.fest[k].left,key),runs,'no attempt consumed on loading');
  await page.clock.install();await go.click();await page.waitForTimeout(50);
  assert.equal(await frame.evaluate(()=>FSGame.phase),'playing');
  assert.equal(await page.evaluate(k=>S.fest[k].left,key),runs-1,'START consumes exactly one attempt');
  // Shared HUD geometry, including narrow mobile screens.
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   const boxes=await frame.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height}};return{exit:r('#fsExit'),time:r('.fs-time'),currency:r('.fs-currency'),sound:r('.fs-sound')}});
   assert(boxes.exit.x+boxes.exit.w<=boxes.time.x+1,JSON.stringify(boxes));
   assert(boxes.time.x+boxes.time.w<=boxes.currency.x+1,JSON.stringify(boxes));
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`artifacts/festivals/${key}-playing.png`});
  await frame.locator('.fs-sound').click();assert.equal(await frame.evaluate(()=>localStorage.getItem('fs-festival-muted')),'1');
  await frame.locator('.fs-sound').click();
  await frame.locator('#fsExit').click();
  await page.clock.fastForward(11000);
  assert.equal(await frame.locator('#fsQuit').isVisible(),true,'confirmation does not pause');
  await frame.locator('#fsStay').click();
  if(key==='halloween'){
    assert.match(await frame.locator('#lvChip').textContent(),/第 2 關/);
    await page.clock.fastForward(10000);assert.match(await frame.locator('#lvChip').textContent(),/第 3 關/);
    await page.clock.fastForward(20000);
  }else if(key==='newyear'){
    await page.clock.fastForward(10000);assert.equal(await frame.evaluate(()=>__dbg.G.lv),1);
    for(let n=0;n<4;n++){
      await page.clock.runFor(1400);
      const expected=n===3?20:5;
      assert.equal(await frame.evaluate(()=>__dbg.G.nians.find(n=>n.st==='run')?.hp),expected);
      for(let hit=0;hit<expected;hit++){
        await frame.evaluate(()=>{const n=__dbg.G.nians.find(n=>n.st==='run');n.z=.65;n.lane=0;n.hitT=100;__dbg.G.shake=0});await page.clock.runFor(20);
        const pt=await frame.evaluate(()=>{const n=__dbg.G.nians.find(n=>n.st==='run');n.hitT=100;const r=document.getElementById('cv').getBoundingClientRect();return{x:r.x+n.bb.x+n.bb.w/2,y:r.y+n.bb.y+n.bb.h*.55}});
        await frame.locator('#cv').click({position:{x:pt.x-(await frame.locator('#cv').boundingBox()).x,y:pt.y-(await frame.locator('#cv').boundingBox()).y},force:true});
        await page.clock.runFor(320);
        assert.equal(await frame.evaluate(()=>__dbg.G.nians.find(n=>n.st==='run')?.hp??0),expected-hit-1,`newyear ${n} hit ${hit}`);
      }
      await page.clock.runFor(1800);
    }
  }else await page.clock.fastForward(30000);
  await page.clock.runFor(2500);
  assert.equal(await frame.evaluate(()=>FSGame.phase),'result',key+' completes and host acknowledges');
  const balance=await page.evaluate(k=>S.fest[k].c,key);
  assert.equal(await frame.locator('#fsOver').isVisible(),false);
  await page.screenshot({path:`artifacts/festivals/${key}-result.png`});
  await frame.evaluate(()=>parent.postMessage({type:'fsGameResult',fsGame:location.pathname.split('/').slice(-2)[0],session:new URLSearchParams(location.search).get('session'),completed:true,earned:500},location.origin));
  await page.waitForTimeout(30);assert.equal(await page.evaluate(k=>S.fest[k].c,key),balance,'duplicate result ignored');
  await frame.locator(key==='children'?'#again':'#againBtn').click();
  await page.waitForTimeout(50);const replay=page.frames().find(f=>f.url().includes('/fest/'+key+'/'));
  await replay.locator(key==='children'?'#go':'#goBtn').waitFor({state:'visible'});
  assert.equal(await page.evaluate(k=>S.fest[k].left,key),runs-1,'replay waits for START');
  await replay.locator(key==='children'?'#go':'#goBtn').click();await page.waitForTimeout(30);
  assert.equal(await page.evaluate(k=>S.fest[k].left,key),runs-2);
  await replay.locator('#fsExit').click();await replay.locator('#fsLeave').click();await page.waitForTimeout(30);
  assert.equal(await page.locator('#fgFrame').count(),0);assert.equal(await page.evaluate(k=>S.fest[k].c,key),balance,'unfinished replay earns nothing');
  assert.deepEqual(errors,[],key+' browser errors');console.log('PASS',key,'HUD, timing, completion, duplicate result, replay, exit');await page.close();
 }
 if(!process.argv.includes('--halloween')){
  for(const mode of ['missing','malformed','one','long']){
   const p=await browser.newPage({viewport:{width:320,height:740}});const failures=[];p.on('pageerror',e=>failures.push(e.message));
   await p.route('https://fonts.googleapis.com/**',r=>r.abort());
   await p.route('**/fest/xmas/questions.js',route=>{
    if(mode==='missing')return route.abort();
    const source=mode==='malformed'?'window.XMAS_QUESTIONS=[["錯誤題目",["甲","乙","丙"],9]];':mode==='one'?'window.XMAS_QUESTIONS=[["只有一題",["甲","乙","丙"],0]];':fs.readFileSync('fest/xmas/questions.js','utf8')+'\nwindow.XMAS_QUESTIONS=[window.XMAS_QUESTIONS[13],window.XMAS_QUESTIONS[14]];';
    return route.fulfill({contentType:'text/javascript;charset=utf-8',body:source});
   });
   await p.goto(base+'/harness');await p.evaluate(()=>festMenu('xmas'));await p.locator('#fgGo').click();
   const f=await (await p.locator('#fgFrame iframe').elementHandle()).contentFrame();await f.waitForURL('**/fest/xmas/**');
   await f.locator('#goBtn').waitFor({state:'visible'});
   if(mode!=='long'){
    assert.equal(await f.locator('#goBtn').isDisabled(),true);
    assert.match(await f.getByRole('alert').textContent(),/尚未扣除/);
    assert.equal(await p.evaluate(()=>S.fest.xmas.left),5);
   }else{
    await p.clock.install();await f.locator('#goBtn').click();await p.waitForTimeout(30);
    await p.clock.fastForward(9000);
    const question=await f.locator('#qq').textContent();
    assert(await f.evaluate(text=>XMAS_QUESTIONS.some(q=>q[0]===text),question));
    assert.equal(await f.locator('#qo span').count(),3);
    assert(await f.locator('#qo').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'long options fit mobile');
    const first=question;await p.clock.fastForward(14000);
    assert.notEqual(await f.locator('#qq').textContent(),first,'two different questions in a run');
   }
   assert.deepEqual(failures,[]);await p.close();
  }
  const bankContext={window:{}};vm.runInNewContext(fs.readFileSync('fest/xmas/questions.js','utf8'),bankContext);
  assert.equal(bankContext.window.XMAS_QUESTIONS.length,20);
  console.log('PASS xmas independent 20-question bank, unique draw, long options, missing/invalid bank without charges');
 }
 if(process.argv.includes('--xmas'))return;
 // Clearing all ordinary ghosts advances immediately; the gold ghost is optional.
 const early=await browser.newPage({viewport:{width:390,height:844}});
 const earlyErrors=[];early.on('pageerror',e=>earlyErrors.push(e.message));
 await early.addInitScript(()=>Math.random=()=>.2);
 await early.route('https://fonts.googleapis.com/**',r=>r.abort());await early.goto(base+'/harness');
 await early.evaluate(()=>festMenu('halloween'));await early.locator('#fgGo').click();
 const hf=await (await early.locator('#fgFrame iframe').elementHandle()).contentFrame();await hf.waitForURL('**/fest/halloween/**');
 await hf.locator('#goBtn').waitFor({state:'visible'});await early.clock.install();await hf.locator('#goBtn').click();await early.waitForTimeout(30);
 assert.equal(await hf.locator('#hintBtn').count(),0);
 assert.equal(await hf.locator('.ghost.gold').count(),1);
 await early.clock.runFor(1500);
 await hf.evaluate(()=>[...document.querySelectorAll('.ghost:not(.gold)')].slice(0,4).forEach(b=>b.click()));
 assert.match(await hf.locator('#lvChip').textContent(),/第 1 關/,'four ordinary ghosts do not clear');
 await hf.evaluate(()=>document.querySelector('.ghost:not(.gold):not(.found)').click());
 assert.match(await hf.locator('#lvChip').textContent(),/第 2 關/,'five ordinary ghosts clear without gold');
 assert.equal(await hf.locator('#timeChip').textContent(),'10 秒');
 await early.clock.runFor(1000);
 await hf.evaluate(()=>[...document.querySelectorAll('.ghost:not(.gold)')].forEach(b=>b.click()));
 assert.match(await hf.locator('#lvChip').textContent(),/第 3 關/);
 assert.equal(await hf.locator('#timeChip').textContent(),'20 秒','unused time is not carried forward');
 await hf.evaluate(()=>[...document.querySelectorAll('.spot')].forEach(b=>b.click()));
 await early.clock.runFor(2000);
 assert.equal(await hf.evaluate(()=>FSGame.phase),'result','third clear settles before deadline');
 assert.match(await hf.locator('#rLine').textContent(),/小幽靈 15 隻/);
 assert(+((await hf.locator('#rTime').textContent()).replace(' 秒',''))<40,'actual elapsed time is reported');
 assert.equal(await early.evaluate(()=>S.fest.halloween.c),+(await hf.locator('#rCandy').textContent()));
 assert.deepEqual(earlyErrors,[]);await early.close();console.log('PASS halloween early clear, optional gold, timer reset, no hint, final settlement');
 if(process.argv.includes('--halloween'))return;
 // Trial fees, no rewards, replay limits, and the volley/deadline boundary.
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.goto(base+'/harness');
 await page.evaluate(()=>{window.confirm=()=>true;starPalace()});await page.locator('[data-tp="children"]').click();
 let frame=await (await page.locator('#fgFrame iframe').elementHandle()).contentFrame();await frame.waitForURL('**/fest/children/**');await frame.locator('#go').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>S.candy),1000);
 await frame.getByRole('button',{name:'返回星宮體驗館',exact:true}).first().click();
 await page.locator('#fgFrame').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>S.candy),1000,'leaving intro is free');
 await page.locator('[data-tp="children"]').click();
 frame=await (await page.locator('#fgFrame iframe').elementHandle()).contentFrame();await frame.waitForURL('**/fest/children/**');await frame.locator('#go').waitFor({state:'visible'});
 await page.clock.install();await frame.locator('#go').click();await page.waitForTimeout(30);
 assert.equal(await page.evaluate(()=>S.candy),950);assert.equal(await page.evaluate(()=>S.trial.used.children),1);
 await page.clock.runFor(12500);
 await frame.locator('img[src="img/balloon-mystery.png"]').click({force:true});await page.clock.runFor(350);
 assert.equal(await frame.locator('#skill').isVisible(),true);
 await page.clock.runFor(27000);await frame.locator('#skill').click({force:true});
 await page.clock.runFor(3000);
 assert.equal(await frame.evaluate(()=>FSGame.phase),'result','volley across deadline settles');
 assert.equal(await page.evaluate(()=>S.fest.children?.c||0),0,'trial never earns currency');
 await frame.locator('#again').click();await page.waitForTimeout(30);
 frame=await (await page.locator('#fgFrame iframe').elementHandle()).contentFrame();await frame.waitForURL('**/fest/children/**');await frame.locator('#go').waitFor({state:'visible'});
 await frame.locator('#go').click();await page.waitForTimeout(30);assert.equal(await page.evaluate(()=>S.candy),900);
 await frame.locator('#fsExit').click();await page.clock.fastForward(41000);await page.clock.runFor(2000);
 assert.equal(await frame.locator('#fsQuit').isVisible(),false,'completion wins over leave confirmation');
 assert.equal(await frame.evaluate(()=>FSGame.phase),'result');
 await page.evaluate(()=>S.trial.used.children=3);await frame.locator('#again').click();await page.waitForTimeout(30);
 assert.equal(await page.locator('#fgFrame').count(),0,'exhausted replay returns to palace');assert.equal(await page.evaluate(()=>S.candy),900);
 console.log('PASS trial fees, limits, no rewards, volley deadline, completion during exit');
 // Standalone games return to the main page and retain the sound preference.
 await page.goto(base+'/fest/children/index.html');await page.locator('#go').waitFor({state:'visible'});
 await page.locator('#go').click();
 await page.locator('.fs-sound').click();await page.goto(base+'/fest/xmas/index.html');
 assert.equal(await page.locator('.fs-sound').getAttribute('aria-pressed'),'false');
 await page.route('**/index.html',route=>route.request().url()===base+'/index.html'?route.fulfill({body:'main page'}):route.continue());
 await page.locator('#startP').getByRole('button',{name:'離開',exact:true}).click();await page.waitForURL(base+'/index.html');
 console.log('PASS standalone exit and persisted sound setting');await page.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
