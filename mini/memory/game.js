/* 記憶翻牌：每翻兩張計 1 次。全部配對完才回報 {completed:true, pairs, tries, durationMs}。 */
window.MINI_START = () => {
  'use strict';
  const { star, flower } = MINI;
  const ICONS = [
    `<path d="${star(20, 21, 15)}" fill="#ffc93c"/>`,
    `<path d="M20,34L7,21Q1,13 8,8Q15,4 20,11Q25,4 32,8Q39,13 33,21Z" fill="#ff5c8a"/>`,
    flower(20, 20, 16, '#ff9fc6'),
    `<path d="M6,30L5,12L13,19L20,7L27,19L35,12L34,30Z" fill="#f3c94f"/><circle cx="20" cy="25" r="3" fill="#e2335b"/>`,
    `<path d="M24,6A15,15 0 1,0 34,26A12,12 0 1,1 24,6Z" fill="#8a7dff"/>`,
    `<path d="M20,5L33,16L20,36L7,16Z" fill="#7fe0ff" stroke="#3aa6d8" stroke-width="2"/><path d="M7,16L33,16" stroke="#3aa6d8" stroke-width="2"/>`,
    `<path d="M19,20L5,10Q2,20 6,30Z M21,20L35,10Q38,20 34,30Z" fill="#e2508f"/><circle cx="20" cy="20" r="5" fill="#c23258"/>`,
    `<path d="M14,30L14,9L32,5L32,26" stroke="#3fb39a" stroke-width="3.5" fill="none"/><ellipse cx="10" cy="30" rx="6" ry="4.5" fill="#3fb39a"/><ellipse cx="28" cy="26" rx="6" ry="4.5" fill="#3fb39a"/>`,
    `<circle cx="13" cy="28" r="7" fill="#e2335b"/><circle cx="27" cy="28" r="7" fill="#e2335b"/><path d="M13,21Q18,8 28,6M27,21Q24,12 28,6" stroke="#3b8a4a" stroke-width="2.5" fill="none"/>`,
    `<path d="M10,30Q2,30 3,23Q4,16 12,17Q14,8 23,9Q32,10 32,18Q38,19 37,25Q36,30 30,30Z" fill="#9fd6ff"/><path d="${star(28, 12, 5)}" fill="#ffd166"/>`,
    `<path d="M7,33Q6,9 33,7Q34,33 7,33Z" fill="#5fbf6a"/><path d="M8,32L27,13" stroke="#2f7d3a" stroke-width="2" fill="none"/>`,
    `<path d="M9,29Q10,10 20,9Q30,10 31,29Z" fill="#f6b73c"/><rect x="7" y="28" width="26" height="4" rx="2" fill="#d98a1e"/><circle cx="20" cy="34" r="3" fill="#d98a1e"/>`
  ];
  const NAMES = ['星星', '愛心', '花朵', '王冠', '月亮', '寶石', '蝴蝶', '音符', '櫻桃', '雲朵', '葉子', '鈴鐺'];
  const INKS = [['#ffe6a7', '#d9923f'], ['#ffb5d0', '#d95391'], ['#ffe5a1', '#ed9a61'], ['#ffe9b6', '#c79345'], ['#ddd1ff', '#8c78c8'], ['#b8eff9', '#5195c0'], ['#f0c3f5', '#a978ce'], ['#a6e8d7', '#3d9b94'], ['#ffb7c0', '#c44c75'], ['#d7f2ff', '#79afd7'], ['#c8f2c2', '#4f9e57'], ['#ffe2a8', '#d08a2a']];
  const defs = '<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;overflow:hidden"><defs>' + INKS.map(([a, b], i) => '<linearGradient id="memory-ink-' + i + '" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>').join('') + '</defs></svg>';
  const face = v => { const art = ICONS[v].replace(/fill="#[\da-f]+"/i, 'fill="url(#memory-ink-' + v + ')"'); return '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="' + INKS[v][0] + '" opacity=".2"/><circle cx="24" cy="24" r="20" fill="none" stroke="' + INKS[v][1] + '" opacity=".18"/><g transform="translate(4 4)">' + art + '</g><path d="M36 9v6m-3-3h6" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><circle cx="13" cy="35" r="1.3" fill="#fff"/></svg>'; };
  const back = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="' + star(20, 21, 12) + '" fill="#dce6ff"/><path d="M20 4L36 20L20 36L4 20Z" fill="none" stroke="#fff" opacity=".45"/></svg>';

  const mode = MEMORY_TIERS[MINI.tier - 1], pairs = mode.pairs, [s3, s2] = MEMORY_STAR(pairs);
  const cols = pairs >= 12 ? 6 : pairs >= 10 ? 5 : 4;
  document.documentElement.style.setProperty('--page', getComputedStyle(MINI.stage).getPropertyValue('--memory-b').trim() || '#1b1530');
  if (!MINI.title) document.getElementById('miniTitle').textContent = '記憶翻牌 · 第 ' + MINI.tier + ' 關';
  const hint = MINI.main ? `全部翻完就過關，${s2} 次內 2 星、${s3} 次內 3 星` : `${s3} 次內完成拿 3 星，就能解鎖下一關` + (MINI.tier === MEMORY_COMP ? '；此關計入競賽排行' : '');

  let timers = new Set();
  function play() {
    timers.forEach(clearTimeout); timers = new Set();
    const ids = [...Array(pairs).keys()], deck = MINI.shuffle([...ids, ...ids]);
    let open = [], tries = 0, found = 0, lock = false, finished = false;
    const t0 = performance.now();
    MINI.setPlaying(false);
    MINI.body.innerHTML = `<div class="mstat"><span>已翻 <b id="mtry">0</b> 次</span><span>配對 <b id="mfound">0</b> / ${pairs}</span></div>${defs}
      <div class="mem cols-${cols}">${deck.map((v, i) => `<button class="mc" data-i="${i}" aria-label="第 ${i + 1} 張牌，尚未翻開"><div class="in"><div class="b">${back}</div><div class="f">${face(v)}</div></div></button>`).join('')}</div>
      ${MINI.goal ? `<p class="mgoal">${MINI.esc(MINI.goal)}</p>` : `<p class="mhint">${hint}</p>`}
      <div class="mactions"><button type="button" class="mbtn" id="memoryRetry">重新開始</button></div>`;
    const cards = [...MINI.body.querySelectorAll('.mc')];
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
    document.getElementById('memoryRetry').onclick = play;
    function finish() {
      if (finished) return; finished = true; lock = true; cards.forEach(c => c.disabled = true);
      document.getElementById('memoryRetry').disabled = true;
      const durationMs = Math.max(1, Math.round(performance.now() - t0));
      later(() => MINI.report({ completed: true, pairs, tries, durationMs }, '全部配對完成，翻了 ' + tries + ' 次（' + Math.round(durationMs / 1000) + ' 秒）'), 700);
    }
    cards.forEach(c => c.onclick = () => {
      const i = +c.dataset.i; if (finished || lock || c.classList.contains('up') || c.classList.contains('done')) return;
      MINI.setPlaying(true);
      c.classList.add('up'); c.setAttribute('aria-label', '第 ' + (i + 1) + ' 張牌，' + NAMES[deck[i]]); MINI.sfx('flip'); open.push(i);
      if (open.length < 2) return;
      tries++; document.getElementById('mtry').textContent = tries; const [a, b] = open; open = [];
      if (deck[a] === deck[b]) {
        found++; MINI.sfx('pair'); document.getElementById('mfound').textContent = found;
        later(() => { for (const j of [a, b]) { cards[j].classList.add('done'); cards[j].disabled = true; cards[j].setAttribute('aria-label', '已配對，' + NAMES[deck[j]]); } }, 250);
        if (found === pairs) finish();
      } else { lock = true; later(() => { for (const j of [a, b]) { cards[j].classList.remove('up'); cards[j].setAttribute('aria-label', '第 ' + (j + 1) + ' 張牌，尚未翻開'); } lock = false; }, 800); }
    });
  }
  play();
};
