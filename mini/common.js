/* 三個競賽小遊戲的共用外框：2:3 直式畫面、離開確認、音效、和主頁的訊息往來。
   主頁負責選單、星星、獎勵、排行紀錄；遊戲只回報原始成績。

   主頁 → 遊戲（網址參數）：embed=1、session、tier（1～5）、main（1＝主線關卡）、title、goal
   遊戲 → 主頁（postMessage）：
     fsMiniReady                     畫面準備好了
     fsMiniResult  {result:{...}}    一局結束的原始成績（每局只送一次）
     fsMiniClose                     玩家按離開 */
(() => {
  'use strict';
  const q = new URLSearchParams(location.search);
  const game = document.documentElement.dataset.mini;
  const embedded = q.get('embed') === '1' && parent !== window;
  const session = q.get('session') || '';
  const tier = Math.max(1, Math.min(5, Math.trunc(Number(q.get('tier')) || 1)));
  const main = q.get('main') === '1';
  const send = (type, extra = {}) => { if (embedded) parent.postMessage({ type, fsMini: game, session, ...extra }, location.origin === 'null' ? '*' : location.origin); };

  /* ---------- 小工具（與主頁同一套圖形） ---------- */
  const star = (cx, cy, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1); } return d + 'Z'; };
  const flower = (cx, cy, r, c, mid = '#ffd84d') => { let s = ''; for (let i = 0; i < 5; i++) { const a = Math.PI * 2 / 5 * i - Math.PI / 2; s += `<circle cx="${(cx + r * .62 * Math.cos(a)).toFixed(1)}" cy="${(cy + r * .62 * Math.sin(a)).toFixed(1)}" r="${(r * .5).toFixed(1)}" fill="${c}"/>`; } return s + `<circle cx="${cx}" cy="${cy}" r="${(r * .3).toFixed(1)}" fill="${mid}"/>`; };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* ---------- 音效（複製自主頁 SND，共用 fz-audio 的音效開關） ---------- */
  let cfg = { sfx: 1, bgm: 1 };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem('fz-audio') || '{}')); } catch (e) {}
  let ctx = null, bus = null;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  function init() {
    if (ctx) return true; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); bus = ctx.createGain(); bus.gain.value = .5; bus.connect(ctx.destination); return true;
  }
  function note(f, t, dur, { type = 'sine', vol = .3, a = .005, slide = 0, dec = null } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + (dec || dur)); o.connect(g); g.connect(bus); o.start(t); o.stop(t + (dec || dur) + .05);
  }
  const bell = (n, t, vol = .2, len = 1.1) => { note(hz(n), t, len, { vol, dec: len }); note(hz(n) * 2, t, len * .5, { vol: vol * .25, dec: len * .5 }); note(hz(n) * 3.01, t, len * .25, { type: 'triangle', vol: vol * .08, dec: len * .25 }); };
  const SFX = {
    correct: t => [72, 76, 79, 84].forEach((n, i) => bell(n, t + i * .07, .22, .5)),
    wrong: t => { note(220, t, .28, { type: 'sawtooth', vol: .07, slide: .7 }); note(164, t + .12, .3, { type: 'sawtooth', vol: .06, slide: .7 }); },
    win: t => [67, 72, 76, 79].forEach((n, i) => bell(n, t + i * .1, .2, .8)),
    flip: t => note(700, t, .07, { type: 'triangle', vol: .1, slide: 1.6 }),
    pair: t => { bell(84, t, .18, .4); bell(88, t + .08, .18, .5); },
    zap: t => note(900, t, .18, { type: 'sawtooth', vol: .06, slide: .2 })
  };
  function sfx(k) { if (!cfg.sfx || !init()) return; if (ctx.state !== 'running') ctx.resume(); const f = SFX[k]; if (f) f(ctx.currentTime + .01); }
  document.addEventListener('visibilitychange', () => { if (ctx) document.hidden ? ctx.suspend() : ctx.resume(); });

  /* ---------- 外框 ---------- */
  let playing = false, reported = false;
  const shell = document.createElement('div');
  shell.id = 'miniShell';
  shell.innerHTML = `<div id="stage" class="tier-${tier}${main ? ' is-main' : ''}">
    <header class="mhud"><button type="button" id="miniExit" class="mbtn">× 離開</button><b id="miniTitle"></b><button type="button" id="miniSound" class="mbtn" aria-pressed="true"></button></header>
    <main id="miniBody"></main>
    <div class="moverlay" id="miniQuit" hidden><div class="mcard"><h2>要離開嗎？</h2><p>這一局還在進行，現在離開不會留下成績。</p><div class="mrow"><button type="button" class="mbtn" id="miniStay">繼續遊戲</button><button type="button" class="mbtn primary" id="miniLeave">確定離開</button></div></div></div>
    <div class="moverlay" id="miniSolo" hidden><div class="mcard"><h2>單獨試玩</h2><p id="miniSoloText"></p><p class="msmall">從主頁開啟才會記錄星星、獎勵與排行。</p><div class="mrow"><button type="button" class="mbtn" id="miniSoloOut">離開</button><button type="button" class="mbtn primary" id="miniSoloAgain">再玩一次</button></div></div></div>
  </div>`;
  const $ = s => shell.querySelector(s);
  function close() {
    if (embedded) send('fsMiniClose');
    else location.href = '../../index.html';
  }
  function paintSound() { const b = $('#miniSound'); b.textContent = cfg.sfx ? '🔊' : '🔇'; b.setAttribute('aria-label', cfg.sfx ? '關閉音效' : '開啟音效'); b.setAttribute('aria-pressed', String(!!cfg.sfx)); }

  window.MINI = {
    game, tier, main, embedded, star, flower, shuffle, esc, sfx,
    title: q.get('title') || '',
    goal: q.get('goal') || '',
    get body() { return $('#miniBody'); },
    get stage() { return $('#stage'); },
    /* 進行中才需要離開確認 */
    setPlaying(v) { playing = !!v; },
    /* 一局結束：送出原始成績。soloText 是單獨開啟時顯示的成績文字。 */
    report(result, soloText) {
      if (reported) return; reported = true; playing = false;
      if (embedded) { send('fsMiniResult', { result }); return; }
      $('#miniSoloText').textContent = soloText || '完成！';
      $('#miniSolo').hidden = false;
    },
    close
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.body.prepend(shell);
    $('#miniTitle').textContent = MINI.title || document.title;
    paintSound();
    $('#miniSound').onclick = () => { cfg.sfx = cfg.sfx ? 0 : 1; try { const all = JSON.parse(localStorage.getItem('fz-audio') || '{}'); all.sfx = cfg.sfx; localStorage.setItem('fz-audio', JSON.stringify(all)); } catch (e) {} paintSound(); };
    $('#miniExit').onclick = () => { if (playing && !reported) $('#miniQuit').hidden = false; else close(); };
    $('#miniStay').onclick = () => { $('#miniQuit').hidden = true; };
    $('#miniLeave').onclick = close;
    $('#miniSoloOut').onclick = close;
    $('#miniSoloAgain').onclick = () => location.reload();
    window.MINI_START?.();
    send('fsMiniReady');
  });
})();
