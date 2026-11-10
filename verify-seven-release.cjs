// Deployment audit: file/case checks plus an HTTP load under a repository prefix.
// Default audits the current development build. --release also requires the
// formal economy and shared lifecycle, and intentionally fails until they exist.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), http = require('http');
const root = __dirname;
const read = file => fs.readFileSync(path.join(root,file),'utf8');
function exactFile(relative) {
  const parts = relative.replaceAll('\\','/').split('/').filter(Boolean);
  let current = root;
  for (const part of parts) {
    assert(!['..','.'].includes(part), 'Unnormalized deployment path: '+relative);
    assert(fs.readdirSync(current).includes(part), 'Missing file or case mismatch: '+relative);
    current = path.join(current,part);
  }
  assert(fs.statSync(current).isFile(), 'Not a file: '+relative);
}
function localRefs(file) {
  const source = read(file), refs = [];
  for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']|url\(["']?([^)'"\s]+)["']?\)/g)) {
    const value = match[1] || match[2];
    if (/^(?:https?:|data:|#|mailto:|javascript:)/.test(value) || value.includes('${')) continue;
    const clean = value.split(/[?#]/)[0]; if (!clean) continue;
    const relative = path.relative(root,path.resolve(root,path.dirname(file),clean)).replaceAll('\\','/');
    assert(!relative.startsWith('..'), 'Reference outside deployment: '+file+' -> '+value);
    exactFile(relative); refs.push(relative);
  }
  return refs;
}
const config = {window:{}}; vm.runInNewContext(read('festival-config.js'),config);
const game = config.window.FESTIVAL_CATALOG.qixi, html = read(game.url);
assert.equal(game.url,'fest/seven/index.html');
assert.equal(game.title,'心心相印'); assert.equal(game.cur,'紙鶴');
assert.equal(game.home,'SP06'); assert.equal(game.lk,'SP06');
assert(/data-game-key="qixi"/.test(html), 'seven folder must explicitly map to qixi key');
const files = new Set(['index.html','admin.html','festival-config.js','festgames.js',game.url,'fest/seven/music.js',
  'outfits/MSP06.webp','outfits/FSP06.webp','rooms/SP06.webp',
  ...Array.from({length:5},(_,i)=>`fest/seven/img/heart${i}.png`)]);
for (const file of [...files]) { exactFile(file); if (file.endsWith('.html')) localRefs(file).forEach(ref=>files.add(ref)); }
const main = read('index.html'), admin = read('admin.html');
const version = source => source.match(/festival-config\.js\?v=([^"']+)/)?.[1];
assert(version(main) && version(main) === version(admin), 'Homepage/admin catalog versions must match');
assert(main.includes("{k:'qixi',n:'七夕',lunar:"), 'Qixi date key mismatch');
assert(main.includes("MSP06:'qixi',FSP06:'qixi'"), 'Qixi outfit key mismatch');
assert(main.includes("img:'rooms/SP06.webp',lv:5,cost:1000,fest:'qixi'"), 'Qixi room key mismatch');
const blockers = [];
for (const key of ['runs','look','room']) if (!Number.isInteger(game[key]) || game[key] <= 0) blockers.push('未設定正式 '+key);
if (!/<script[^>]+src=["'][^"']*common\.js/.test(html)) blockers.push('遊戲未載入 fest/common.js（開始扣次、局次核對、結算、再玩及離開）');
if (!/<link[^>]+href=["'][^"']*common\.css/.test(html)) blockers.push('遊戲未載入 fest/common.css（共用 HUD／結算）');
if (!/\bfsReport\s*\(/.test(html)) blockers.push('完成時未透過 fsReport 回報正式紙鶴');
if (!/fsQuestionsReady/.test(html)) blockers.push('素材失敗尚未阻擋開始與扣次');
if (game.status !== 'ready') blockers.push('活動狀態仍為 '+game.status);
if (blockers.length && game.status === 'ready') throw Error('七夕被提前開放：\n'+blockers.join('\n'));
console.log('PASS: exact filename casing, qixi/seven/SP06 mappings, local references and catalog versions');
const runtime = path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = require(path.join(runtime,'playwright'));
const prefix = '/FS-release/';
const server = http.createServer((req,res)=>{
  const pathname = new URL(req.url,'http://localhost').pathname;
  if (!pathname.startsWith(prefix)) { res.writeHead(404); return res.end(); }
  let relative = decodeURIComponent(pathname.slice(prefix.length)); if (!relative) relative = 'index.html';
  try {
    exactFile(relative);
    res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.css':'text/css'})[path.extname(relative)] || 'application/octet-stream');
    res.end(fs.readFileSync(path.join(root,relative)));
  } catch { res.writeHead(404); res.end('Not found'); }
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({channel:'msedge',headless:true});
    const page = await browser.newPage(), failures = [], errors = [];
    page.on('response',response=>{if(response.status()>=400)failures.push(response.url())});
    page.on('requestfailed',request=>failures.push(request.url()));
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port+prefix+game.url);
    await page.waitForFunction(()=>[...document.images].every(img=>img.complete && img.naturalWidth>0));
    await page.locator('#start').click();
    assert(await page.evaluate(()=>QixiMusic.playing), 'Soundtrack must load under repository prefix');
    await page.evaluate(()=>QixiMusic.stop());
    const mapping = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('.choice')];
      sequence = [0,1,2,3,4]; slots('show');
      function visibleBounds(image) {
        const canvas = document.createElement('canvas'); canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
        const context=canvas.getContext('2d'); context.drawImage(image,0,0);
        const data=context.getImageData(0,0,canvas.width,canvas.height).data;
        const rows=Array(canvas.height).fill(0),columns=Array(canvas.width).fill(0);
        for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>=128){rows[y]++;columns[x]++;}
        const rowLimit=Math.max(...rows)*.02,colLimit=Math.max(...columns)*.02;
        const ys=rows.map((n,i)=>n>rowLimit?i:-1).filter(i=>i>=0),xs=columns.map((n,i)=>n>colLimit?i:-1).filter(i=>i>=0);
        const rect=image.getBoundingClientRect(),cell=image.parentElement.getBoundingClientRect();
        const fit=(getComputedStyle(image).objectFit==='cover'?Math.max:Math.min)(rect.width/canvas.width,rect.height/canvas.height);
        const top=rect.y+(rect.height-canvas.height*fit)/2+ys[0]*fit-cell.y;
        const bottom=rect.y+(rect.height-canvas.height*fit)/2+(ys.at(-1)+1)*fit-cell.y;
        const centerX=rect.x+(rect.width-canvas.width*fit)/2+(xs[0]+xs.at(-1)+1)/2*fit-cell.x;
        return {top,bottom,centerX};
      }
      const rect = element => { const r = element.getBoundingClientRect(); const s = getComputedStyle(element); return {x:r.x,w:r.width,h:r.height,border:s.border,radius:s.borderRadius}; };
      const pairs = buttons.map((button,i) => ({
        label:button.getAttribute('aria-label'), file:new URL(button.querySelector('img').src).pathname.split('/').pop(),
        matching:document.querySelector('#slot'+i+' img').src === button.querySelector('img').src,
        slot:rect(document.getElementById('slot'+i)), button:rect(button), visible:visibleBounds(button.querySelector('img'))
      }));
      const green = buttons[2].querySelector('img'), canvas = document.createElement('canvas');
      canvas.width = green.naturalWidth; canvas.height = green.naturalHeight;
      const context = canvas.getContext('2d'); context.drawImage(green,0,0);
      const data = context.getImageData(0,0,canvas.width,canvas.height).data;
      let clear = 0; for(let i=3;i<data.length;i+=4) if(data[i]===0)clear++;
      state='input'; sequence=[2,0,4,1,3]; inputIndex=0; slots('hide'); enable(true);
      return {pairs,clearRatio:clear/(canvas.width*canvas.height),cornerAlpha:data[3]};
    });
    assert.deepEqual(mapping.pairs.map(pair=>pair.file),['heart4.png','heart2.png','heart0.png','heart3.png','heart1.png']);
    assert.deepEqual(mapping.pairs.map(pair=>pair.label),['同心結粉紅','彎月藍','四葉草綠','星星黃','蓮花紫']);
    for(const pair of mapping.pairs) {
      assert(pair.matching,'Question/button image must match');
      assert(Math.abs(pair.slot.x-pair.button.x)<.05 && Math.abs(pair.slot.w-pair.button.w)<.05 && Math.abs(pair.slot.h-pair.button.h)<.05,'Rows must align with equal cell size');
      assert.equal(pair.slot.border,pair.button.border); assert.equal(pair.slot.radius,pair.button.radius);
    }
    for(const key of ['top','bottom','centerX']) {
      const values=mapping.pairs.map(pair=>pair.visible[key]);
      assert(Math.max(...values)-Math.min(...values)<.5,'Visible artwork '+key+' must align, not merely the button boxes: '+JSON.stringify(values));
    }
    console.log('PASS: all five visible heart silhouettes align in top/bottom/center within 0.5px');
    assert(mapping.cornerAlpha===0 && mapping.clearRatio>.3,'Green icon requires genuine transparent surroundings');
    await page.locator('.choice').nth(2).click();
    assert.equal(await page.evaluate(()=>inputIndex),1,'Third button must answer green correctly');
    assert(await page.evaluate(()=>document.querySelector('#slot0 img').src===document.querySelectorAll('.choice img')[2].src));
    await page.locator('.choice').nth(3).click();
    assert.equal(await page.evaluate(()=>inputIndex),1,'Wrong gold button must not advance the pink answer');
    console.log('PASS: pink/blue/green/yellow/purple order, shared frames, matching question sprites, green alpha and actual third-key input');
    assert.deepEqual(failures,[]); assert.deepEqual(errors,[]);
    console.log('PASS: HTTP repository-subfolder load, image decoding, music startup; no missing requests or page errors');
    if(blockers.length)console.log('正式上架仍有阻擋項：\n- '+blockers.join('\n- '));
    if(process.argv.includes('--release'))assert.equal(blockers.length,0,'正式發布條件尚未完成');
  } finally { if(browser)await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1});
