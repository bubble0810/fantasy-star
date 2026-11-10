/* Only moon host integration: real catalog, real festgames.js, real moon iframe.
   Player/cloud state is a disposable local fixture; gameplay/media tests are separate. */
const fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert');
const {chromium}=require(path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=__dirname,prefix='/FS-moon/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalog={window:{}};vm.runInNewContext(read('festival-config.js'),catalog);const config=catalog.window.FESTIVAL_CATALOG.moon;
assert.deepEqual([config.status,config.runs,config.look,config.room,config.cur,config.home,config.lk],['ready',3,240,300,'月餅','SP07','SP07']);
for(const file of ['index.html','admin.html'])assert(read(file).includes('festival-config.js?v=20261110-moon-integration1'));
const main=read('index.html');assert(main.includes("MSP07:'moon',FSP07:'moon'"));assert(main.includes("{id:'SP07',n:'中秋賞月小屋'"));
for(const file of ['outfits/MSP07.webp','outfits/FSP07.webp','rooms/SP07.webp'])assert(fs.existsSync(path.join(root,file)));
const harness=`<!doctype html><meta charset="utf-8"><script>
window.active=true;window.stats={};window.saves=[];window.S={char:'f',candy:1000,items:[],homes:[],fest:{}};
window.ITEMS=[{id:'L-FSP07',n:'中秋女造型'},{id:'L-MSP07',n:'中秋男造型'}];window.HOMES=[{id:'SP07',n:'中秋賞月小屋',img:'rooms/SP07.webp'}];window.FESTS=[{k:'moon'}];
window.festState=()=>({on:active,end:new Date(Date.now()+86400000)});window.SND={pause(){},resume(){},setTheme(){},play(){}};
window.save=()=>{const s=JSON.stringify(S);localStorage.setItem('moon-host-fixture',s);saves.push(s)};window.render=()=>{};window.stage=()=>{};window.toast=t=>window.lastToast=t;
window.FSTAT=(k,n=1)=>stats[k]=(stats[k]||0)+n;window.head=t=>'<h1>'+t+'</h1>';window.fmtMD=()=>'';
window.openSheet=s=>{document.getElementById('modal').hidden=false;document.getElementById('sheet').innerHTML=s};window.closeQuiz=()=>{document.getElementById('modal').hidden=true;document.getElementById('sheet').innerHTML=''};
</script><div id="modal"><div id="sheet"></div></div><script src="festival-config.js"></script><script src="festgames.js"></script>`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname===prefix+'harness'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(harness);return;}
  if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
  const file=path.resolve(root,decodeURIComponent(pathname.slice(prefix.length)));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
  const url=`http://127.0.0.1:${server.address().port}${prefix}harness`;
  async function reset(){await page.goto(url);await page.evaluate(()=>{localStorage.setItem('fs-festival-muted','1');festMenu('moon');});}
  async function attached(){await page.locator('#fgFrame iframe').waitFor();const f=await(await page.locator('#fgFrame iframe').elementHandle()).contentFrame();assert(f);await f.waitForURL('**/fest/moon/index.html?**');return f;}
  async function frame(){const f=await attached();await f.locator('#go:enabled').waitFor();return f;}
  async function openFormal(){await page.locator('#fgGo').click();return frame();}
  async function complete(f,stock){await f.evaluate(()=>{for(let i=0;i<8;i++){ringStart=performance.now()-ringSpec().period*(ringSpec().min+ringSpec().max)*500;judge();update(flight.until+1);}});assert.equal(await f.evaluate(()=>mode),'between');assert.equal(await f.evaluate(()=>FSGame.phase),'playing');await f.locator('#next').click();await f.evaluate(n=>{spawnAt=Infinity;items=[];window.eval('stock='+n);update(deadline+1);},stock);await page.clock.fastForward(1100);await f.waitForFunction(()=>FSGame.phase==='result');}
  await reset();let f=await openFormal();assert.equal(await page.evaluate(()=>S.fest.moon.left),3);assert.equal(await page.evaluate(()=>S.candy),1000);
  await f.getByRole('button',{name:'離開',exact:true}).click();await page.locator('#fgFrame').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>S.fest.moon.left),3);
  f=await openFormal();await f.locator('#go').click();await f.waitForFunction(()=>FSGame.phase==='playing');assert.equal(await page.evaluate(()=>S.fest.moon.left),2);assert.equal(await page.evaluate(()=>stats['f:moon']),1);
  const session=await f.evaluate(()=>new URLSearchParams(location.search).get('session'));
  await f.evaluate(session=>{for(const data of [{session:'wrong',fsGame:'moon'},{session,fsGame:'national'},{session,fsGame:'moon',completed:false}])parent.postMessage({type:'fsGameResult',earned:60,completed:true,...data},location.origin);parent.postMessage({type:'fsGameStart',fsGame:'moon',session},location.origin);},session);
  await page.evaluate(session=>postMessage({type:'fsGameResult',fsGame:'moon',session,completed:true,earned:60},location.origin),session);await page.waitForTimeout(25);assert.equal(await page.evaluate(()=>S.fest.moon.c),0);assert.equal(await page.evaluate(()=>S.fest.moon.left),2);
  await complete(f,7);assert.equal(await page.evaluate(()=>S.fest.moon.c),14);assert.equal(await page.evaluate(()=>stats['fc:moon']),14);
  await f.evaluate(()=>fsReport(999));await f.evaluate(session=>parent.postMessage({type:'fsGameResult',fsGame:'moon',session,completed:true,earned:60},location.origin),session);await page.waitForTimeout(25);assert.equal(await page.evaluate(()=>S.fest.moon.c),14);
  await f.locator('#again').click();await page.waitForFunction(old=>{const frame=document.querySelector('#fgFrame iframe');return frame&&!frame.src.includes(old);},session);f=await frame();assert.notEqual(await f.evaluate(()=>new URLSearchParams(location.search).get('session')),session);assert.equal(await page.evaluate(()=>S.fest.moon.left),2);await f.locator('#go').click();await f.waitForFunction(()=>FSGame.phase==='playing');assert.equal(await page.evaluate(()=>S.fest.moon.left),1);await f.locator('#fsExit').click();await f.locator('#fsLeave').click();await page.locator('#fgFrame').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>S.fest.moon.c),14);assert.match(await page.locator('#sheet').innerText(),/月餅兌換所/);
  f=await openFormal();await f.locator('#go').click();await f.waitForFunction(()=>FSGame.phase==='playing');await complete(f,4);await f.locator('#out').click();await page.locator('#fgFrame').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>S.fest.moon.left),0);assert.equal(await page.evaluate(()=>S.fest.moon.c),22);assert(await page.locator('#fgGo').isDisabled());
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('moon-host-fixture')).fest.moon.c),22);
  console.log('PASS: formal load/start, 3 daily attempts, complete/award once, message/session identity, replay new session, quit/no award, return, persistence.');
  await reset();await page.evaluate(()=>starPalace());assert.equal(await page.locator('[data-tp="moon"]').count(),1);assert(await page.locator('[data-tp="moon"]').evaluate(b=>b.closest('.tp-card').querySelector('.pic').style.backgroundImage.includes('moon-bg.jpg')));
  page.once('dialog',d=>d.accept());await page.locator('[data-tp="moon"]').click();f=await frame();assert.equal(await page.evaluate(()=>S.candy),1000);await f.getByRole('button',{name:'返回星宮體驗館',exact:true}).click();await page.locator('#fgFrame').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>S.candy),1000);
  for(let i=0;i<3;i++){page.once('dialog',d=>d.accept());await page.locator('[data-tp="moon"]').click();f=await frame();await f.locator('#go').click();await f.waitForFunction(()=>FSGame.phase==='playing');assert.equal(await page.evaluate(()=>S.candy),950-i*50);await complete(f,9);assert.equal(await page.evaluate(()=>S.fest.moon?.c||0),0);await f.locator('#out').click();await page.locator('#fgFrame').waitFor({state:'detached'});}
  assert(await page.locator('.tp-card').filter({hasText:'中秋月華祭'}).getByRole('button').isDisabled());assert.equal(await page.evaluate(()=>S.trial.used.moon),3);assert.equal(await page.evaluate(()=>stats['t:moon']),3);
  console.log('PASS: palace moon cover, intro free, 50 candy/start, 3 daily trials, no formal currency, return to palace.');
  await reset();await page.evaluate(()=>{S.fest.moon.c=600;festMenu('moon');});await page.locator('[data-fx="look"]').click();assert(await page.evaluate(()=>S.items.includes('L-FSP07')));assert.equal(await page.evaluate(()=>S.fest.moon.c),360);assert(await page.locator('.fg-item').first().getByRole('button').isDisabled());await page.locator('[data-fx="room"]').click();assert(await page.evaluate(()=>S.homes.includes('SP07')));assert.equal(await page.evaluate(()=>S.fest.moon.c),60);
  await page.evaluate(()=>{S.char='m';S.fest.moon.c=240;festMenu('moon');});await page.locator('[data-fx="look"]').click();assert(await page.evaluate(()=>S.items.includes('L-MSP07')));assert.equal(await page.evaluate(()=>S.fest.moon.c),0);
  await page.evaluate(()=>{S.fest.moon.c=300;festMenu('moon');active=false;});await page.locator('[data-fx="stars"]').click();assert.equal(await page.evaluate(()=>S.fest.moon.c),300);assert.equal(await page.evaluate(()=>S.candy),1000);
  await page.evaluate(()=>{S.fest.moon.c=9;});await page.clock.fastForward(1200);assert.equal(await page.evaluate(()=>S.fest.moon.c),0);assert.equal(await page.evaluate(()=>S.candy),1027);await page.clock.fastForward(1200);assert.equal(await page.evaluate(()=>S.candy),1027);
  console.log('PASS: female/male SP07 at 240, shared room SP07 at 300, no repeat purchase, expired shop blocked, remaining moon currency converts once.');
  for(const dependency of ['img/rabbits-alpha-v2.png','music.js']){await reset();await page.route('**/fest/moon/'+dependency+'*',r=>r.abort());await page.locator('#fgGo').click();f=await attached();await f.locator('#loadStatus').filter({hasText:'素材載入失敗'}).waitFor();assert(await f.locator('#go').isDisabled());assert.equal(await page.evaluate(()=>S.fest.moon.left),3);await f.getByRole('button',{name:'離開',exact:true}).click();await page.locator('#fgFrame').waitFor({state:'detached'});await page.unroute('**/fest/moon/'+dependency+'*');}
  assert.deepEqual(errors,[]);console.log('PASS: necessary dependency failures block start without charging; repository-prefix paths work; no real player/cloud writes.');
  // One actual homepage + admin smoke check; keep the wider integration suite separate.
  const mockMatch=read('verify-integration.cjs').match(/const mockFirebase=`([\s\S]*?)`;/);assert(mockMatch);
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('https://**/*',r=>{const u=r.request().url();if(u.includes('firebase-app-compat'))return r.fulfill({contentType:'text/javascript',body:mockMatch[1]});if(u.includes('firebase-'))return r.fulfill({contentType:'text/javascript',body:''});return r.abort();});
  await context.addInitScript(()=>{localStorage.setItem('fs-login-ver','2026-11-08');localStorage.setItem('fs-last-seen',String(Date.now()));localStorage.setItem('fs-festival-muted','1');});
  const actual=await context.newPage(),actualErrors=[];actual.on('pageerror',e=>actualErrors.push(e.message));
  await actual.goto(url.replace('harness','index.html'));await actual.locator('#clMeBtn').waitFor({state:'visible'});await actual.waitForFunction(()=>FS_CLOUD_READY===true);await actual.evaluate(()=>starPalace());
  assert.equal(await actual.locator('[data-tp="moon"]').count(),1);assert.equal(await actual.locator('[data-fsoon="moon"]').count(),0);
  const before=await actual.evaluate(()=>S.candy);actual.once('dialog',d=>d.accept());await actual.locator('[data-tp="moon"]').click();const real=await(await actual.locator('#fgFrame iframe').elementHandle()).contentFrame();await real.waitForURL('**/fest/moon/index.html?**');await real.locator('#go:enabled').waitFor();await real.locator('#go').click();await real.waitForFunction(()=>FSGame.phase==='playing');assert.equal(await actual.evaluate(()=>S.candy),before-50);assert.equal(await actual.evaluate(()=>S.trial.used.moon),1);
  await real.locator('#fsExit').click();await real.locator('#fsLeave').click();await actual.locator('#fgFrame').waitFor({state:'detached'});assert.equal(await actual.locator('[data-tp="moon"]').count(),1);
  await actual.waitForFunction(()=>__writes.some(w=>w.data.sj&&JSON.parse(w.data.sj).trial?.used?.moon===1));
  const admin=await context.newPage();admin.on('pageerror',e=>actualErrors.push(e.message));await admin.goto(url.replace('harness','admin.html'));await admin.locator('[data-t="stat"]').click();await admin.locator('[data-s="fest"]').click();await admin.locator('#sbody').filter({hasText:'中秋節・中秋月華祭'}).waitFor();
  assert.deepEqual(actualErrors,[]);await context.close();console.log('PASS: actual homepage moon entry/start/return, moon trial saved using existing cloud schema, actual admin lists moon (Firebase mocked).');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});


