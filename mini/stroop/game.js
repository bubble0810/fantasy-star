/* 顏色陷阱：點出字的顏色；反轉題要點字的意思。時間到回報 {correct, wrong}，分數由主頁算（答對 − 答錯，最低 0）。 */
window.MINI_START = () => {
  'use strict';
  const T = STROOP_TIERS[MINI.tier - 1], cols = COLORS.slice(0, T.n), sec = T.sec, skin = STROOP_SKINS[MINI.tier - 1];
  const root = document.documentElement.style;
  root.setProperty('--page', skin.page); root.setProperty('--card', skin.card); root.setProperty('--edge', skin.edge);
  root.setProperty('--stage-ink', skin.ink); root.setProperty('--stage-muted', skin.muted);
  if (!MINI.title) document.getElementById('miniTitle').textContent = '顏色陷阱 · 第 ' + MINI.tier + ' 關';
  MINI.body.innerHTML = `<div class="mstat"><span>分數 <b class="sscore" id="ssc">0</b></span><span>答對 <b id="sok">0</b>・答錯 <b id="sng">0</b></span><span>剩 <b id="stm">${sec}</b> 秒</span></div>
    <div class="stroop">
      <p class="mhint">點出這個字是用<b>什麼顏色</b>寫的，別被字騙了！分數＝答對 − 答錯。${T.rev ? '<br>出現「改點字的意思」時，要改點<b>字的意思</b>！' : ''}</p>
      <p class="srev off" id="srev">⚠ 改點字的意思</p>
      <div class="scard"><div class="sword" id="sw">準備</div><span class="sfx" id="sfx" aria-hidden="true"></span></div>
      <div class="sbtns" style="--n:${cols.length}">${cols.map((c, i) => `<button type="button" data-c="${i}">${c[0]}</button>`).join('')}</div>
    </div>${MINI.goal ? `<p class="mgoal">${MINI.esc(MINI.goal)}</p>` : ''}`;
  const $ = id => document.getElementById(id);
  const sw = $('sw');
  let correct = 0, wrong = 0, cur = null, t0 = 0, rev = false, fxT = 0, done = false;
  const score = () => Math.max(0, correct - wrong);
  const next = () => {
    const k = cols.length, w = Math.floor(Math.random() * k); let ink = w;
    if (Math.random() < .8) while (ink === w) ink = Math.floor(Math.random() * k);
    rev = T.rev && Math.random() < STROOP_REV; cur = rev ? w : ink;
    sw.textContent = cols[w][0]; sw.style.color = cols[ink][1]; sw.classList.toggle('rev', rev); $('srev').classList.toggle('off', !rev);
  };
  const fx = ok => { const e = $('sfx'); e.textContent = ok ? '✓' : '✗'; e.className = 'sfx ' + (ok ? 'ok' : 'no'); clearTimeout(fxT); fxT = setTimeout(() => { e.className = 'sfx'; }, 350); };
  MINI.body.querySelectorAll('.sbtns button').forEach(b => b.onclick = () => {
    if (cur === null || done) return; const ok = +b.dataset.c === cur;
    if (ok) { correct++; MINI.sfx('correct'); } else { wrong++; MINI.sfx('wrong'); sw.classList.remove('shake'); void sw.offsetWidth; sw.classList.add('shake'); }
    fx(ok); $('ssc').textContent = score(); $('sok').textContent = correct; $('sng').textContent = wrong; next();
  });
  /* 3、2、1 倒數後開始；用實際經過時間，切到背景不會延長 */
  let count = 3, iv = 0; sw.textContent = count; MINI.setPlaying(true);
  const tickDown = () => { count--; if (count > 0) { sw.textContent = count; setTimeout(tickDown, 1000); return; } t0 = Date.now(); next(); iv = setInterval(tick, 200); };
  setTimeout(tickDown, 1000);
  function tick() {
    const left = sec - (Date.now() - t0) / 1000; $('stm').textContent = Math.max(0, Math.ceil(left));
    if (left <= 0) {
      clearInterval(iv); done = true; cur = null; sw.textContent = '時間到'; sw.style.color = ''; sw.classList.remove('rev'); $('srev').classList.add('off');
      MINI.body.querySelectorAll('.sbtns button').forEach(b => b.disabled = true);
      setTimeout(() => MINI.report({ correct, wrong }, `${score()} 分（答對 ${correct}・答錯 ${wrong}）`), 600);
    }
  }
};
