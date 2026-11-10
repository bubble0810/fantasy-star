const fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert');
const root=__dirname;
let playwright;try{playwright=require('playwright')}catch{playwright=require(path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))}
const {chromium}=playwright;
const output=path.join(root,'artifacts/integration');fs.mkdirSync(output,{recursive:true});
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const config={window:{}};vm.runInNewContext(read('festival-config.js'),config);
const catalog=config.window.FESTIVAL_CATALOG;
assert.equal(Object.keys(catalog).length,8);assert.equal(Object.keys(config.window.GAMEF).length,6);
const expected={halloween:[3,240,300],xmas:[5,200,300],newyear:[3,280,380],children:[3,220,320],duanwu:[3,240,300],moon:[3,240,300]};
for(const [k,values] of Object.entries(expected)){
 const g=catalog[k];assert.deepEqual([g.runs,g.look,g.room],values,'preserve '+k+' settings');
 assert(fs.existsSync(path.join(root,g.url)),g.url);
 const html=read(g.url);if(k==='duanwu')assert(html.includes('data-game-key="duanwu"'));assert(html.includes('common.js'));
 for(const m of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)){
  if(/^(?:https?:|data:|#)/.test(m[1])||m[1].includes('${'))continue;
  assert(fs.existsSync(path.resolve(root,path.dirname(g.url),m[1])),'missing asset '+g.url+':'+m[1]);
 }
}
for(const p of ['index.html','admin.html'])for(const m of read(p).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:p});
const harness=`<!doctype html><meta charset="utf-8"><script>
window.S={char:'f',candy:1000,items:[],homes:['R00'],fest:{}};
window.ITEMS=[];window.HOMES=[];window.active=true;
window.FESTS=['halloween','xmas','newyear','children','duanwu','qixi','moon','national'].map(k=>({k}));
window.festState=()=>({on:active,end:new Date(Date.now()+86400000)});window.SND={pause(){},resume(){},setTheme(){},play(){}};
window.save=()=>localStorage.setItem('harness-save',JSON.stringify(S));window.render=()=>{};window.stage=()=>{};window.toast=t=>window.lastToast=t;
window.head=t=>'<h1>'+t+'</h1>';window.fmtMD=()=>'';
window.openSheet=s=>{document.getElementById('modal').hidden=false;document.getElementById('sheet').innerHTML=s};
window.closeQuiz=()=>{document.getElementById('modal').hidden=true;document.getElementById('sheet').innerHTML='';render()};
</script><div id="modal" hidden><div id="sheet"></div></div><script src="/festival-config.js"></script><script src="/festgames.js"></script>`;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/harness'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(harness);return}
 const p=path.resolve(root,'.'+decodeURIComponent(pathname));
 if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 try{res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.writeHead(404);res.end()}
});
const mockFirebase=`
window.__writes=[];window.__failWrites=false;
window.__remotePlayer={code:'a123456',name:'這是用來驗證長暱稱不會蓋住等級糖果的玩家名稱',adminRev:0,disabled:false,sj:JSON.stringify({char:'f',exp:350,candy:1000,items:['L-FSP05'],homes:['R00','SP05'],home:'SP05',fest:{duanwu:{c:55,day:new Date().toDateString(),left:2}},trial:{day:new Date().toDateString(),used:{duanwu:1}},st:{t:{'f:duanwu':2,'fc:duanwu':55},d:{}}})};
const authObj={setPersistence:()=>Promise.resolve(),onAuthStateChanged:cb=>{window.__authChanged=cb;queueMicrotask(()=>cb({uid:'test-player',email:'a123456@fantasystar.game'}));},signOut:()=>Promise.resolve()};
function collection(){return {where(){return this},orderBy(){return this},limit(){return this},get:async()=>({docs:[]}),onSnapshot(cb){queueMicrotask(()=>cb({docs:[]}));return ()=>{}}}}
const db={doc:p=>({get:async()=>({exists:true,data:()=>p.startsWith('admins/')?{}:window.__remotePlayer}),set:async(data)=>{if(window.__failWrites)throw Error('offline');window.__writes.push({path:p,data});if(p==='players/test-player')Object.assign(window.__remotePlayer,data)},update:async()=>{},onSnapshot:()=>()=>{},collection}),collection};
function auth(){return authObj};auth.Auth={Persistence:{LOCAL:'local'}};
function firestore(){return db};firestore.FieldValue={serverTimestamp:()=>123};firestore.Timestamp={fromMillis:n=>n};
window.firebase={initializeApp:()=>({}),auth,firestore};
`;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  for(const k of ['qixi','moon','national']){
   await p.goto(base+'/'+catalog[k].url);
   if(k==='qixi'){
    // Qixi now has a playable standalone development build. The host still
    // blocks the official/trial entries below until integration is complete.
    assert.equal(await p.locator('html').getAttribute('data-game-key'),'qixi');
    assert.match(await p.locator('#panel').textContent(),/心心相印/);
    assert.equal(await p.locator('#start').isVisible(),true);
    assert.equal(await p.evaluate(()=>typeof QixiMusic.start),'function');
   }else if(k==='moon'){
    assert.equal(await p.locator('html').getAttribute('data-game-key'),'moon');
    await p.waitForFunction(()=>window.fsQuestionsReady===true);
    assert.match(await p.locator('#intro').textContent(),/中秋月華祭/);
    assert.equal(await p.locator('#go').isEnabled(),true);
    assert.equal(await p.locator('.lane').count(),3);
   }else{
    assert.match(await p.locator('main').textContent(),/COMING SOON/);
    assert.equal(await p.locator('.back').getAttribute('href'),'../../index.html');
   }
  }
  await p.goto(base+'/harness');await p.evaluate(()=>starPalace());
  assert.equal(await p.locator('[data-tp]').count(),6);assert.equal(await p.locator('[data-fsoon]').count(),2);
  for(const k of ['qixi','national']){
   await p.locator('[data-fsoon="'+k+'"]').click();assert.match(await p.locator('#sheet').textContent(),/COMING SOON/);
   assert.equal(await p.locator('#fgFrame').count(),0);assert.equal(await p.evaluate(()=>S.candy),1000);assert.equal(await p.evaluate(()=>Object.keys(S.trial.used).length),0);
   await p.locator('#fsSoonBack').click();
  }
  // Even active dates cannot start an unfinished game through the formal entry.
  await p.evaluate(()=>festMenu('qixi'));assert.match(await p.locator('#sheet').textContent(),/COMING SOON/);
  await p.locator('#fsSoonBack').click();
  // Broken iframe: host return remains available and no charge is made.
  await p.route('**/fest/dragonboat/index.html*',r=>r.fulfill({contentType:'text/html',body:'<p>failed game load</p>'}));
  p.once('dialog',d=>d.accept());await p.locator('[data-tp="duanwu"]').click();
  await p.locator('#fgLoadBack').waitFor();assert.equal(await p.evaluate(()=>S.candy),1000);
  await p.locator('#fgLoadBack').click();assert.equal(await p.locator('#fgFrame').count(),0);
  await p.unroute('**/fest/dragonboat/index.html*');
  // Currency conversion must not replace an open quiz, and must happen only once.
  await p.evaluate(()=>{active=false;S.fest.duanwu={c:10,day:new Date().toDateString(),left:2};openSheet('<h2>原本的答題畫面</h2>');render()});
  await p.waitForTimeout(1100);assert.match(await p.locator('#sheet').textContent(),/原本的答題/);assert.equal(await p.evaluate(()=>S.candy),1030);
  await p.evaluate(()=>closeQuiz());await p.waitForTimeout(1100);assert.match(await p.locator('#sheet').textContent(),/節慶活動結束/);
  await p.evaluate(()=>{closeQuiz();render()});assert.equal(await p.evaluate(()=>S.candy),1030);
  // A stale exchange page cannot spend currency after the event ends.
  await p.evaluate(()=>{active=true;S.fest.duanwu.c=500;festMenu('duanwu');active=false});
  await p.locator('[data-fx="look"]').click();assert.equal(await p.evaluate(()=>S.items.length),0);assert.match(await p.evaluate(()=>lastToast),/活動已結束/);
  // Persist real completion, close, reload, and retain balances and attempts.
  await p.evaluate(()=>{active=true;S.fest.duanwu.c=0;festMenu('duanwu')});await p.locator('#fgGo').click();
  let f=await(await p.locator('#fgFrame iframe').elementHandle()).contentFrame();await f.locator('#go:enabled').waitFor();
  await p.locator('#fgLoading').waitFor({state:'detached'});await f.locator('#go').click();
  await p.waitForFunction(()=>S.fest.duanwu.left===1);
  const savedSession=await f.evaluate(()=>new URLSearchParams(location.search).get('session'));
  // Wrong session and wrong source must not award currency.
  await f.evaluate(()=>parent.postMessage({type:'fsGameResult',session:'wrong',fsGame:'duanwu',completed:true,earned:55},location.origin));
  await p.evaluate(session=>window.postMessage({type:'fsGameResult',session,fsGame:'duanwu',completed:true,earned:55},location.origin),savedSession);
  await p.waitForTimeout(40);assert.equal(await p.evaluate(()=>S.fest.duanwu.c),0);
  await f.evaluate(()=>fsReport(35));await p.waitForFunction(()=>S.fest.duanwu.c===35);
  await f.locator('#fsStay').count();await f.evaluate(()=>fsClose());await p.locator('#fgFrame').waitFor({state:'detached'});
  const save=await p.evaluate(()=>JSON.parse(localStorage.getItem('harness-save')));assert.equal(save.fest.duanwu.c,35);assert.equal(save.fest.duanwu.left,1);
  await p.reload();await p.evaluate(s=>S=s,save);assert.equal(await p.evaluate(()=>S.fest.duanwu.c),35);
  assert.deepEqual(errors,[]);console.log('PASS: catalog, coming soon, no charge, failed-load recovery, expiry, conversion, message identity and local persistence');await p.close();
  // Full actual homepage with a simulated cloud. No real Firebase requests or writes.
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('https://**/*',route=>{
   if(route.request().url().includes('firebase-app-compat'))return route.fulfill({contentType:'text/javascript',body:mockFirebase});
   if(route.request().url().includes('firebase-'))return route.fulfill({contentType:'text/javascript',body:''});
   return route.abort();
  });
  await context.addInitScript(()=>{localStorage.setItem('fs-login-ver','2026-11-08');localStorage.setItem('fs-last-seen',String(Date.now()))});
  const main=await context.newPage(),mainErrors=[];main.on('pageerror',e=>mainErrors.push(e.message));
  await main.goto(base+'/index.html');await main.locator('#clMeBtn').waitFor({state:'visible'});
  await main.waitForFunction(()=>S.fest?.duanwu?.c===0); // Ended event converts existing cloud balance.
  await main.waitForTimeout(1200);await main.evaluate(()=>closeQuiz());await main.waitForTimeout(1200);
  // Multiple simultaneous calendar entries remain scrollable instead of clipped.
  await main.evaluate(()=>{festState=()=>({on:true,end:new Date(Date.now()+86400000)});stage()});
  for(const width of [320,390,768,1280]){
   await main.setViewportSize({width,height:844});await main.evaluate(()=>{tab='shop';shopSub='normal';render();scrollTo(0,0)});await main.waitForTimeout(650);
   const geometry=await main.evaluate(()=>{
    const b=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};
    return {hud:b('.hud'),account:b('.cl-fab'),tabs:b('.tabs'),stage:b('#stage'),tools:b('.stbar'),column:getComputedStyle(document.querySelector('.sprow')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth>innerWidth+1,clicks:[...document.querySelectorAll('.stbtn,.tabs button,.spc .act')].map(b=>b.getBoundingClientRect().height),festOverflow:getComputedStyle(document.querySelector('.fests')).overflowX};
   });
   assert(geometry.hud.right<=geometry.account.x+1,JSON.stringify({width,geometry}));
   assert(!geometry.overflow,'homepage horizontal overflow at '+width);assert.equal(geometry.column,3);assert(geometry.clicks.every(h=>h>=44));
   assert.equal(geometry.festOverflow,'auto');assert(geometry.tools.y>geometry.hud.bottom,'tools separated from upper HUD');
   if(width===390)await main.screenshot({path:path.join(output,'FS-main-HUD.png')});
  }
  // Persist the full existing S object, including fest, trial, ownership and statistics.
  await main.evaluate(()=>{S.fest.duanwu.c=55;S.fest.duanwu.left=2;save()});
  await main.waitForFunction(()=>__writes.some(w=>w.data.sj&&JSON.parse(w.data.sj).fest.duanwu.c===55));
  const cloud=await main.evaluate(()=>JSON.parse(__writes.filter(w=>w.data.sj).at(-1).data.sj));
  assert(cloud.items.includes('L-FSP05'));assert(cloud.homes.includes('SP05'));assert.equal(cloud.trial.used.duanwu,1);assert.equal(cloud.st.t['f:duanwu'],2);
  await main.evaluate(()=>{__failWrites=true;S.fest.duanwu.c=65;save()});await main.waitForFunction(()=>document.getElementById('savefoot').textContent.includes('雲端存檔失敗'));
  await main.evaluate(()=>{__failWrites=false;dispatchEvent(new Event('online'))});
  await main.waitForFunction(()=>__writes.some(w=>w.data.sj&&JSON.parse(w.data.sj).fest.duanwu.c===65));
  // New page recovers the exact cloud snapshot using the unchanged sj format.
  const latest=await main.evaluate(()=>__remotePlayer);await context.addInitScript(d=>{window.__cloudSeed=d},latest);
  const reload=await context.newPage();await reload.route('**/firebase-app-compat.js',r=>r.fulfill({contentType:'text/javascript',body:mockFirebase+'\nwindow.__remotePlayer=window.__cloudSeed;'}));
  await reload.goto(base+'/index.html');await reload.locator('#clMeBtn').waitFor();
  assert.equal(await reload.evaluate(()=>S.trial.used.duanwu),1);assert(await reload.evaluate(()=>S.items.includes('L-FSP05')));await reload.close();
  await main.setViewportSize({width:390,height:844});await main.evaluate(()=>{closeQuiz();scrollTo(0,0)});await main.locator('[data-tpgo]').click();assert.equal(await main.locator('[data-tp]').count(),6);assert.equal(await main.locator('[data-fsoon]').count(),2);
  await main.waitForTimeout(700);await main.screenshot({path:path.join(output,'FS-star-palace.png')});
  await main.locator('.sheet').evaluate(el=>el.scrollTop=el.scrollHeight);await main.waitForTimeout(300);await main.screenshot({path:path.join(output,'FS-coming-soon.png')});assert.deepEqual(mainErrors,[]);
  await main.locator('.sheet').evaluate(el=>el.scrollTop=0);main.once('dialog',d=>d.accept());await main.locator('[data-tp="duanwu"]').click();await main.locator('#fgFrame').waitFor();
  await main.evaluate(()=>__authChanged(null));await main.locator('#fgFrame').waitFor({state:'detached'});assert.equal(await main.evaluate(()=>FS_CLOUD_READY),false);
  console.log('PASS: actual homepage HUD at 320/390/768/1280, long name, six ready entries, shared ownership, account isolation and cloud retry (simulated Firebase)');
  const admin=await context.newPage(),adminErrors=[];admin.on('pageerror',e=>adminErrors.push(e.message));
  await admin.setViewportSize({width:1100,height:844});await admin.goto(base+'/admin.html');await admin.locator('[data-t="stat"]').click();await admin.locator('[data-s="fest"]').click();
  assert.equal(await admin.locator('#sbody>.card').count(),6);assert.match(await admin.locator('#sbody').textContent(),/端午節・粽力龍舟賽/);
  assert(!/讀不到/.test(await admin.locator('#sbody').textContent()));await admin.screenshot({path:path.join(output,'FS-admin-festivals.png'),fullPage:true});assert.deepEqual(adminErrors,[]);
  console.log('PASS: actual admin catalog and all six festival statistic panels (simulated Firebase)');
  await context.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});

