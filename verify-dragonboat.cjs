const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const Race = require('./fest/dragonboat/engine.js');
const runtime = path.join(require('os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = require(path.join(runtime, 'playwright'));
function calmRace() {
  const r = new Race(5); r.nextWater = Infinity;
  for (const b of r.boats) { b.nextStroke = Infinity; b.nextAttack = Infinity; }
  return r;
}
const calm = calmRace(); calm.advance(40);
assert(Math.abs(calm.time - 40) < 1e-6, 'base speed completes 1000m in 40 seconds');
assert(calm.boats.every(b => b.remaining < 1e-6));
for (const rank of [1, 2, 3]) {
  const r = calmRace(); r.boats.forEach((b, i) => { b.remaining = 100 + ((i - (rank - 1) + 3) % 3) * 10; });
  r.advance(5); assert.equal(r.boats.filter(b => b.remaining === 0).length, 1);
  assert(r.boats.filter(b => b.remaining > 0).length === 2, 'freeze immediately at first finish');
}
const hit = calmRace(); assert(hit.attack(0, 1)); assert.equal(hit.boats[0].ammo, 4);
assert.equal(hit.speed(hit.boats[1]), 12.5); assert(!hit.attack(2, 1));
hit.advance(1.6); assert.equal(hit.speed(hit.boats[1]), 25); assert(!hit.attack(0, 1));
hit.advance(2.6); assert(hit.attack(2, 1), 'AI can attack another AI after protection expires');
hit.boats[0].water = 1.4; hit.boats[0].waterUntil = 6; hit.stroke();
assert(Math.abs(hit.speed(hit.boats[0]) - 49) < 1e-6); hit.attack(1, 0); assert(Math.abs(hit.speed(hit.boats[0]) - 24.5) < 1e-6);
const expert = calmRace();
for (let beat = .7; !expert.finished && beat < 40; beat += 1.4) { expert.advance(beat); if (!expert.finished) expert.stroke(); }
assert(expert.time >= 15 && expert.time <= 20, 'continuous good rhythm finishes in 15–20 seconds');
const streak = calmRace(); streak.stroke(); assert.equal(streak.boats[0].drive, 35);
assert.equal(streak.stroke(), false, 'cannot build a streak by spamming one beat');
streak.advance(1.4); streak.stroke(); assert.equal(streak.boats[0].drive, 50);
streak.advance(2.8); streak.stroke(); assert.equal(streak.boats[0].drive, 70);
streak.missStroke(); streak.advance(4.2); streak.stroke(); assert.equal(streak.boats[0].drive, 35);
const harness = `<!doctype html><meta charset="utf-8"><script>
window.S={char:'f',candy:1000,items:[],homes:[],fest:{}};window.ITEMS=[];window.HOMES=[];
window.FESTS=['halloween','xmas','newyear','children','duanwu'].map(k=>({k}));
window.festState=()=>({on:true,end:Date.now()+86400000});window.SND={pause(){},resume(){},setTheme(){},play(){}};
window.save=()=>{};window.render=()=>{};window.stage=()=>{};window.toast=t=>window.lastToast=t;
window.head=t=>'<h1>'+t+'</h1>';window.fmtMD=()=>'';
window.openSheet=s=>document.getElementById('sheet').innerHTML=s;window.closeQuiz=()=>document.getElementById('sheet').innerHTML='';
</script><div id="sheet"></div><script src="/festival-config.js"></script><script src="/festgames.js"></script>`;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/harness') { res.setHeader('Content-Type', 'text/html;charset=utf-8'); return res.end(harness); }
  const file = path.resolve(__dirname, '.' + decodeURIComponent(pathname));
  if (!file.startsWith(__dirname + path.sep)) { res.writeHead(403); return res.end(); }
  try { const data = fs.readFileSync(file); res.setHeader('Content-Type', ({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream'); res.end(data); }
  catch { res.writeHead(404); res.end(); }
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    fs.mkdirSync('artifacts/festivals', {recursive:true});
    const page = await browser.newPage({viewport:{width:390,height:844}}), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const base = 'http://127.0.0.1:' + server.address().port;
    await page.goto(base + '/harness'); await page.evaluate(() => festMenu('duanwu')); await page.locator('#fgGo').click();
    let frame = await (await page.locator('#fgFrame iframe').elementHandle()).contentFrame();
    await frame.locator('#go:enabled').waitFor(); assert.equal(await page.evaluate(() => S.fest.duanwu.left), 3);
    assert(await frame.locator('.loot img').evaluate(img => img.src.endsWith('/zongzi.png') && img.naturalWidth > 0), 'HUD uses actual zongzi sprite');
    assert(await frame.locator('.reward img').evaluate(img => img.src.endsWith('/sachet.svg') && img.naturalWidth > 0), 'reward uses system-style sachet artwork');
    await page.screenshot({path:'artifacts/festivals/dragonboat-intro.png'});
    await page.clock.install(); await frame.locator('#go').click(); await page.waitForTimeout(50);
    assert.equal(await frame.evaluate(() => FSGame.phase), 'playing');
    assert.equal(await frame.evaluate(() => DragonMusic.playing && DragonMusic.mode === 'quiz'), true, 'quiz music starts after user begins');
    assert.equal(await frame.locator('#questionSeconds').textContent(), '5');
    assert.equal(await page.evaluate(() => S.fest.duanwu.left), 2);
    const seen = new Set();
    for (let i = 0; i < 18; i++) {
      const q = await frame.locator('#question').textContent(); assert(!seen.has(q)); seen.add(q);
      const correct = await frame.evaluate(() => { const q = DRAGONBOAT_QUESTIONS.find(q => q[0] === document.querySelector('#question').textContent); return q[1][q[2]]; });
      await frame.getByRole('button', {name: new RegExp(correct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')}).click();
    }
    assert.equal(await frame.locator('#score').textContent(), '18'); assert.equal(await frame.locator('#ammo').textContent(), '5');
    const answerIndex = () => frame.evaluate(() => {
      const q = DRAGONBOAT_QUESTIONS.find(q => q[0] === document.querySelector('#question').textContent);
      return [...document.querySelectorAll('#answers button')].findIndex(b => b.textContent.slice(1) === q[1][q[2]]);
    });
    const correctIndex = await answerIndex();
    await frame.locator('#answers button').nth((correctIndex + 1) % 3).click();
    assert.equal(await frame.locator('#score').textContent(), '17', 'wrong answer deducts one');
    const beforePass = await frame.locator('#questionNo').textContent(); await frame.locator('#pass').click();
    assert.equal(await frame.locator('#score').textContent(), '17', 'PASS does not deduct points');
    assert.notEqual(await frame.locator('#questionNo').textContent(), beforePass, 'PASS immediately changes question');
    await frame.locator('#answers button').nth(await answerIndex()).click();
    assert.equal(await frame.locator('#score').textContent(), '18');
    await page.screenshot({path:'artifacts/festivals/dragonboat-quiz.png'});
    for (const width of [320,390,768]) {
      await page.setViewportSize({width,height:844});
      const boxes = await frame.evaluate(() => ['#fsExit','.fs-time','.fs-currency'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return {left:r.left,right:r.right}; }));
      assert(boxes[0].right <= boxes[1].left + 1); assert(boxes[1].right <= boxes[2].left + 1);
      assert(await frame.evaluate(() => document.querySelector('.quiz-card').getBoundingClientRect().bottom <= document.querySelector('#game').getBoundingClientRect().bottom), 'question and PASS fit mobile play area');
    }
    await page.setViewportSize({width:390,height:844});
    await frame.locator('#fsExit').click(); await page.clock.runFor(31000);
    assert(await frame.locator('#fsQuit').isVisible()); assert(await frame.locator('#transition').isVisible());
    assert.match(await frame.locator('#quizSummary').textContent(), /問答成績 18 分/);
    assert.equal((await frame.locator('#carry').textContent()).trim(), '× 5');
    await frame.locator('#fsStay').click(); await page.clock.runFor(3000);
    assert(await frame.locator('#race').isVisible());
    assert.equal(await frame.evaluate(() => DragonMusic.playing && DragonMusic.mode === 'race'), true, 'race switches to festival racing music');
    await frame.locator('#sound').click(); assert.equal(await frame.evaluate(() => localStorage.getItem('fs-festival-muted')), '1');
    await frame.locator('#sound').click(); assert.equal(await frame.evaluate(() => localStorage.getItem('fs-festival-muted')), '0');
    for (const width of [320,390,768]) {
      await page.setViewportSize({width,height:844});
      const boxes = await frame.evaluate(() => ['#attack1','#paddle','#attack2'].map(s => {const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
      assert(boxes[0].right < boxes[1].left && boxes[1].right < boxes[2].left, 'both attacks flank the paddle');
      assert(boxes.every(b => b.bottom - b.top >= 44 && b.top === boxes[0].top), 'all three controls are aligned touch targets');
      assert(await frame.evaluate(() => {
        const x = id => document.querySelector(id).getBoundingClientRect().x;
        return x('#boat1') < x('#boat0') && x('#boat0') < x('#boat2');
      }), 'player is center, red is left, blue is right');
    }
    await page.setViewportSize({width:390,height:844});
    await frame.locator('#attack1').click(); assert.equal(await frame.locator('#ammo').textContent(), '4');
    assert(await frame.locator('#boat1').isDisabled()); assert(await frame.locator('#attack1').isDisabled());
    assert.match(await frame.locator('#attack1').textContent(), /保護中/);
    await frame.locator('#attack2').click(); assert.equal(await frame.locator('#ammo').textContent(), '3');
    await page.screenshot({path:'artifacts/festivals/dragonboat-race.png'});
    await page.clock.runFor(60000);
    assert.equal(await frame.evaluate(() => FSGame.phase), 'result');
    assert.equal(await frame.evaluate(() => DragonMusic.playing), false, 'background music stops at settlement');
    const earned = Number(await frame.locator('#earned').textContent()); assert([25,35,55].includes(earned));
    assert.equal(await page.evaluate(() => S.fest.duanwu.c), earned);
    await page.screenshot({path:'artifacts/festivals/dragonboat-result.png'});
    await frame.evaluate(() => parent.postMessage({type:'fsGameResult',fsGame:'duanwu',session:new URLSearchParams(location.search).get('session'),completed:true,earned:55},location.origin));
    await page.waitForTimeout(40); assert.equal(await page.evaluate(() => S.fest.duanwu.c), earned);
    await frame.locator('#again').click(); await page.waitForTimeout(50);
    frame = await (await page.locator('#fgFrame iframe').elementHandle()).contentFrame(); await frame.locator('#go:enabled').waitFor();
    assert.equal(await page.evaluate(() => S.fest.duanwu.left), 2, 'replay loading does not consume attempt');
    await frame.locator('#go').click(); await page.waitForTimeout(50); assert.equal(await page.evaluate(() => S.fest.duanwu.left), 1);
    await frame.locator('#fsExit').click(); await frame.locator('#fsLeave').click();
    await page.locator('#fgFrame').waitFor({state:'detached'}); assert.equal(await page.evaluate(() => S.fest.duanwu.c), earned);
    // Trial: payment on start, no formal reward, replay requires a new session.
    await page.evaluate(() => starPalace());
    page.once('dialog', d => d.accept());
    await page.locator('[data-tp="duanwu"]').click(); await page.waitForTimeout(50);
    frame = await (await page.locator('#fgFrame iframe').elementHandle()).contentFrame(); await frame.locator('#go:enabled').waitFor();
    assert.equal(await page.evaluate(() => S.candy), 1000); await frame.locator('#go').click(); await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => S.candy), 950); await page.clock.runFor(95000);
    assert.equal(await frame.evaluate(() => FSGame.phase), 'result'); assert.equal(await page.evaluate(() => S.fest.duanwu.c), earned);
    assert.match(await frame.locator('#fsStatus').textContent(), /不發正式獎勵/);
    await page.route('**/fest/dragonboat/questions.js*', route => route.fulfill({contentType:'text/javascript',body:'window.DRAGONBOAT_QUESTIONS=[];'}));
    await page.goto(base + '/fest/dragonboat/index.html');
    await page.getByText(/無法開始：/).waitFor(); assert(await page.locator('#go').isDisabled());
    assert.deepEqual(errors, []); console.log('PASS: race physics, effects, protection, quiz, score cap, attack, mobile HUD, start, settlement, duplicate, replay, exit, trial, invalid bank.');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
