const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=__dirname;
let playwright;try{playwright=require('playwright')}catch{playwright=require(path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))}const {chromium}=playwright;
const out=path.join(root,'artifacts/home-ui');fs.mkdirSync(out,{recursive:true});
const harness=`<!doctype html><meta charset="utf-8"><script>
window.S={char:'f',candy:1000,items:[],homes:[],fest:{}};window.ITEMS=[{id:'L-FSP06',n:'七夕女造型'}];window.HOMES=[{id:'SP06',n:'七夕小屋',img:'rooms/SP06.webp'}];
window.FESTS=[{k:'qixi'}];window.active=true;window.festState=()=>({on:active,end:new Date(Date.now()+86400000)});window.SND={pause(){},resume(){},setTheme(){},play(){}};
window.save=()=>localStorage.setItem('test-save',JSON.stringify(S));window.render=()=>{};window.stage=()=>{};window.toast=()=>{};window.head=t=>'<h1>'+t+'</h1>';window.fmtMD=()=>'';
window.openSheet=s=>document.getElementById('sheet').innerHTML=s;window.closeQuiz=()=>document.getElementById('sheet').innerHTML='';
</script><div id="sheet"></div><script src="festival-config.js"></script><script src="festgames.js"></script>`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/FS-test/harness'){res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(harness)}const p=path.resolve(root,pathname.replace(/^\/FS-test\//,''));if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end()};try{res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.writeHead(404);res.end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/FS-test/harness');await page.clock.install();
 await page.evaluate(()=>festMenu('qixi'));await page.locator('#fgGo').click();
 async function attached(){const f=await(await page.locator('#fgFrame iframe').elementHandle()).contentFrame();await f.locator('#start:enabled').waitFor();await page.locator('#fgLoading').waitFor({state:'detached'});return f;}
 let frame=await attached();assert.equal(await page.evaluate(()=>S.fest.qixi.left),3);
 await page.screenshot({path:path.join(out,'07-qixi-intro.png')});
 await frame.locator('#start').click();await frame.waitForFunction(()=>FSGame.phase==='playing');assert.equal(await page.evaluate(()=>S.fest.qixi.left),2);
 for(const [width,height] of [[320,667],[390,844],[768,1024]]){
  await page.setViewportSize({width,height});
  const boxes=await frame.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom,w:b.width,h:b.height}};return{exit:r('#fsExit'),time:r('.fs-time'),sound:r('.fs-sound'),progress:r('.progressWrap'),scene:r('#stage')}});
  assert(boxes.exit.right<boxes.time.x+1,JSON.stringify(boxes));assert(boxes.exit.h>=43.8);assert(boxes.sound.h>=43.8);assert(boxes.time.bottom<boxes.progress.y+1,JSON.stringify(boxes));assert(boxes.sound.right<=boxes.scene.right+1);
 }
 await page.setViewportSize({width:390,height:844});
 await frame.locator('#fsExit').click();assert(await frame.locator('#fsQuit').isVisible());await frame.locator('#fsStay').click();
 for(const expected of [8,18,30,44,60,78,100]){
  await frame.evaluate(()=>{roundToken++;state='input';sequence=[2,0,4];inputIndex=0;enable(true);slots('hide')});
  for(const i of [2,0,4])await frame.locator('.choice').nth(i).click();assert.equal(await frame.evaluate(()=>progress),expected);
 }
 await page.clock.runFor(3600);assert.equal(await frame.evaluate(()=>FSGame.phase),'result');const earned=await frame.evaluate(()=>reward());assert(earned>=25&&earned<=55);assert.equal(await page.evaluate(()=>S.fest.qixi.c),earned);
 await page.screenshot({path:path.join(out,'08-qixi-result.png')});
 const session=await frame.evaluate(()=>new URLSearchParams(location.search).get('session'));
 await frame.evaluate(session=>parent.postMessage({type:'fsGameResult',session,fsGame:'qixi',completed:true,earned:99},location.origin),session);await page.waitForTimeout(20);assert.equal(await page.evaluate(()=>S.fest.qixi.c),earned);
 await frame.locator('#again').click();await page.waitForFunction(old=>{const f=document.querySelector('#fgFrame iframe');return f&&!f.src.includes(old)},session);frame=await attached();assert.equal(await page.evaluate(()=>S.fest.qixi.left),2);await frame.locator('#start').click();await frame.waitForFunction(()=>FSGame.phase==='playing');assert.equal(await page.evaluate(()=>S.fest.qixi.left),1);await frame.locator('#fsExit').click();await frame.locator('#fsLeave').click();await page.locator('#fgFrame').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>S.fest.qixi.c),earned);
 // Approved prices and shared ownership IDs.
 await page.evaluate(()=>{S.fest.qixi.c=600;festMenu('qixi')});await page.locator('[data-fx="look"]').click();assert(await page.evaluate(()=>S.items.includes('L-FSP06')));assert.equal(await page.evaluate(()=>S.fest.qixi.c),360);await page.locator('[data-fx="room"]').click();assert(await page.evaluate(()=>S.homes.includes('SP06')));assert.equal(await page.evaluate(()=>S.fest.qixi.c),60);
 await page.evaluate(()=>starPalace());page.once('dialog',d=>d.accept());await page.locator('[data-tp="qixi"]').click();frame=await attached();assert.equal(await page.evaluate(()=>S.candy),1000);await frame.locator('#start').click();await frame.waitForFunction(()=>FSGame.phase==='playing');assert.equal(await page.evaluate(()=>S.candy),950);
 await frame.evaluate(()=>{state='done';QixiMusic.stop();document.getElementById('panel').innerHTML='<h1>本局結算</h1><button id="again">再玩</button><button id="out">返回</button>';document.getElementById('overlay').style.display='flex';fsReport(55)});await page.clock.runFor(1100);assert.equal(await page.evaluate(()=>S.fest.qixi.c),60);assert.match(await frame.locator('#fsStatus').textContent(),/不發正式獎勵/);await frame.locator('#out').click();await page.locator('#fgFrame').waitFor({state:'detached'});assert(await page.locator('[data-tp="qixi"]').isVisible());
 await page.route('**/fest/seven/img/background.jpg',r=>r.abort());page.once('dialog',d=>d.accept());await page.locator('[data-tp="qixi"]').click();frame=await(await page.locator('#fgFrame iframe').elementHandle()).contentFrame();await frame.locator('#loadStatus').getByText(/素材載入失敗/).waitFor();assert(await frame.locator('#start').isDisabled());assert.equal(await page.evaluate(()=>S.candy),950);
 assert.deepEqual(errors,[]);console.log('PASS qixi real iframe: ready, mobile controls, original 7-round progression, single award, replay, exit, approved prices, trial no reward, missing-asset no charge.');
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
