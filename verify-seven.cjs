const path = require('path'), assert = require('assert');
const runtime = path.join(require('os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = require(path.join(runtime, 'playwright'));
const url = 'file:///' + path.resolve('fest/seven/index.html').replaceAll('\\', '/');
(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    async function start(muted = false) {
      await page.goto(url);
      // Seed the muted state before start; the intro overlay covers the HUD.
      if (muted) await page.evaluate(() => document.getElementById('sound').click());
      await page.locator('#start').click();
      await page.clock.runFor(5000);
      assert.equal(await page.evaluate(() => state), 'input');
      assert(await page.evaluate(() => QixiMusic.playing), 'Music continues during player input');
    }
    async function answer(wrong = false) {
      const sequence = await page.evaluate(() => [...window.eval('sequence')]);
      if (wrong) await page.locator('.choice').nth((sequence[0] + 1) % 5).click();
      else for (const heart of sequence) await page.locator('.choice').nth(heart).click();
    }
    await start();
    const expected = [8,18,30,44,60,78,100];
    for (const progress of expected) {
      await answer();
      assert.equal(await page.evaluate(() => window.eval('progress')), progress);
      assert.equal(await page.locator('.bar').getAttribute('aria-valuenow'), String(progress));
      assert(!/7 輪|下輪|\+\d+%|／7/.test(await page.locator('body').innerText()), 'Player text must not reveal completion threshold or percentage gains');
      await page.clock.runFor(6000);
    }
    assert.equal(await page.evaluate(() => state), 'done');
    assert.equal(await page.evaluate(() => QixiMusic.playing), false, 'Music stops at completion');
    assert(await page.locator('#again').isVisible());
    await page.locator('#again').click();
    await page.locator('#start:enabled').waitFor();await page.locator('#start').click();
    assert.equal(await page.evaluate(() => window.eval('progress')), 0);
    assert(await page.evaluate(() => QixiMusic.playing), 'Replay restarts music');
    console.log('PASS: seven consecutive rounds reach 8/18/30/44/60/78/100%; completion and replay music lifecycle');

    await start(true);
    assert.equal(await page.evaluate(() => soundOn), false, 'Starting while muted works');
    await answer(); await page.clock.runFor(6000);
    await answer(); await page.clock.runFor(6000);
    assert.equal(await page.evaluate(() => window.eval('progress')), 18);
    await answer(true);
    assert.equal(await page.evaluate(() => window.eval('progress')), 18, 'Mistake preserves bridge progress');
    assert.equal(await page.evaluate(() => combo), 0, 'Mistake resets streak');
    await page.clock.runFor(6000); await answer();
    assert.equal(await page.evaluate(() => window.eval('progress')), 26, 'After a mistake the next success adds 8%');
    await page.locator('.fs-sound').click();
    assert.equal(await page.evaluate(() => soundOn), true);
    console.log('PASS: mistakes do not deduct progress; next success adds 8%; muted start and unmute work');

    for (const [width,height] of [[375,667],[390,844],[1440,900]]) {
      await page.setViewportSize({width,height});
      const valid = await page.evaluate(() => {
        const rect = id => document.getElementById(id).getBoundingClientRect();
        const bar = rect('progressHint'), notice = rect('notice');
        const slots = [...document.querySelectorAll('.slot')], choices = [...document.querySelectorAll('.choice')];
        return bar.bottom < notice.top && slots.every((slot,i) => {
          const s = slot.getBoundingClientRect(), b = choices[i].getBoundingClientRect();
          return Math.abs(s.x-b.x)<.05 && Math.abs(s.width-b.width)<.05 && Math.abs(s.height-b.height)<.05 && s.bottom<b.top && b.bottom<rect('status').top;
        });
      });
      assert(valid, `${width}x${height}: progress text and heart rows fit`);
    }
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'artifacts/festivals/seven-progress-mobile.png'});
    const stopped = await page.evaluate(() => {
      let stopped = false; const stop = QixiMusic.stop;
      QixiMusic.stop = () => { stop(); stopped = !QixiMusic.playing; };
      window.confirm = () => true;
      document.getElementById('fsExit').click();document.getElementById('fsLeave').click();
      return stopped;
    });
    assert(stopped, 'Music stops before navigating away');
    assert.deepEqual(errors, []);
    console.log('PASS: mobile/desktop layout, leave stops music, no page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
