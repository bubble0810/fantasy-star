/* Shared festival lifecycle. The host owns attempts, rewards, and replay. */
(() => {
  'use strict';
  const q = new URLSearchParams(location.search);
  const key = document.documentElement.dataset.gameKey || location.pathname.split('/').slice(-2)[0];
  const embedded = q.get('embed') === '1' && parent !== window;
  const session = q.get('session');
  const trial = q.get('trial') === '1';
  const trialPrice = Number(q.get('trialPrice')) || 50;
  let phase = 'ready', released = false, startButton, sent = false;
  let muted = false;
  try { muted = localStorage.getItem('fs-festival-muted') === '1'; } catch {}
  const outputs = new Map();
  const send = (type, extra = {}) => parent.postMessage({ type, fsGame: key, session, ...extra }, location.origin === 'null' ? '*' : location.origin);
  window.FS_EMBED = true;
  window.FS_CHAR = q.get('char') || 'f';
  window.FSGame = {
    get phase() { return phase; },
    output(ctx) {
      if (!outputs.has(ctx)) {
        const gain = ctx.createGain(), limit = ctx.createDynamicsCompressor();
        gain.gain.value = muted ? 0 : 0.65;
        limit.threshold.value = -18; limit.knee.value = 12;
        limit.ratio.value = 8; limit.attack.value = .003; limit.release.value = .18;
        limit.connect(gain).connect(ctx.destination); outputs.set(ctx, { input: limit, gain });
      }
      return outputs.get(ctx).input;
    },
    close() {
      if (phase === 'settling') return;
      if (embedded) send('fsGameClose', { fsClose: true });
      else location.href = '../../index.html';
    }
  };
  function status(text) { const el = document.getElementById('fsStatus'); if (el) el.textContent = text; }
  function unlock(text) {
    phase = 'result'; status(text);
    document.querySelectorAll('#againBtn,#again,#homeBtn,#out').forEach(b => { b.disabled = false; });
  }
  window.fsClose = FSGame.close;
  window.fsResult = () => {};
  window.fsReport = n => {
    if (sent || phase !== 'playing') return;
    sent = true; phase = 'settling';
    document.getElementById('fsQuit').hidden = true;
    document.querySelectorAll('#againBtn,#again,#homeBtn,#out').forEach(b => { b.disabled = true; });
    const over = document.getElementById('fsOver'); over.hidden = false;
    status('正在確認本局結果…');
    setTimeout(() => {
      over.hidden = true;
      document.getElementById('fsResultFooter').hidden = false;
      if (embedded) send('fsGameResult', { completed: true, earned: Math.max(0, n | 0) });
      else unlock('單獨試玩：不發正式獎勵。');
    }, 1000);
  };
  addEventListener('message', e => {
    if (!embedded || e.source !== parent || e.origin !== location.origin || e.data?.session !== session) return;
    const d = e.data;
    if (d.type === 'fsGameStarted' && phase === 'starting') {
      if (!d.ok) { phase = 'ready'; startButton.disabled = false; status(d.message); alert(d.message); return; }
      phase = 'playing'; released = true; startButton.disabled = false; startButton.click(); released = false;
    }
    if (d.type === 'fsGameSettled' && phase === 'settling') unlock(d.trial ? '體驗完成，本局不發正式獎勵。' : `已入帳：${d.earned} 個活動貨幣`);
  });
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('stage') || document.getElementById('game') || document.querySelector('.app');
    const hud = document.querySelector('.hud');
    hud?.classList.add('fs-hud');
    const exit = document.createElement('button'); exit.id = 'fsExit'; exit.textContent = '× 離開'; hud.prepend(exit);
    const time = document.getElementById('timeChip') || document.getElementById('timeN') || document.getElementById('time')?.parentElement;
    time.classList.add('fs-time'); hud.append(time);
    const sound = document.getElementById('musBtn') || document.getElementById('sound');
    sound.classList.add('fs-sound'); root.append(sound);
    const paintSound = () => { sound.textContent = muted ? '🔇' : '🔊'; sound.setAttribute('aria-label', muted ? '開啟聲音' : '關閉聲音'); sound.setAttribute('aria-pressed', String(!muted)); };
    paintSound();
    const currency = document.querySelector('.hudR,.hr,.loot');
    currency?.classList.add('fs-currency');
    document.getElementById('exit')?.remove();
    const quit = document.createElement('div'); quit.id = 'fsQuit'; quit.className = 'fs-overlay'; quit.hidden = true;
    quit.innerHTML = '<div class="fs-card"><h2>要離開嗎？</h2><p>遊戲持續進行中，現在離開不會獲得本局獎勵，已用次數不退還。</p><button id="fsStay">繼續遊戲</button><button id="fsLeave">確定離開</button></div>';
    const over = document.createElement('div'); over.id = 'fsOver'; over.className = 'fs-overlay'; over.hidden = true; over.innerHTML = '<div class="fs-card"><h1>遊戲結束</h1><p>正在統計本局成果…</p></div>';
    root.append(quit, over);
    exit.onclick = () => { if (phase === 'playing') quit.hidden = false; else FSGame.close(); };
    document.getElementById('fsStay').onclick = () => quit.hidden = true;
    document.getElementById('fsLeave').onclick = FSGame.close;
    const result = document.querySelector('#resP .card,#result .modal');
    const footer = document.createElement('p'); footer.id = 'fsResultFooter'; footer.hidden = true; footer.innerHTML = '<span id="fsStatus"></span>'; result.append(footer);
    const title = result.querySelector('h1'); title.textContent = '本局結算';
    document.querySelectorAll('#againBtn,#again').forEach(b => { b.textContent = trial ? `再體驗一次（${trialPrice} 星星糖）` : '再玩一次'; });
    document.querySelectorAll('#homeBtn,#out').forEach(b => b.textContent = trial ? '返回星宮體驗館' : '返回活動頁');
    const intro = document.querySelector('#startP .card,#intro .modal');
    const note = document.createElement('p'); note.className = 'fs-rule'; note.textContent = `${trial ? '星宮體驗・不發正式獎勵。' : '完成遊戲才發獎。'}開始後無法暫停，中途離開不發獎。`; intro.append(note);
    const introExit = document.createElement('button'); introExit.className = 'sub btn alt'; introExit.textContent = trial ? '返回星宮體驗館' : '離開'; introExit.onclick = FSGame.close; intro.append(introExit);
    // Capture before legacy per-game listeners, including their sound/pause handlers.
    document.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b === sound) {
        e.preventDefault(); e.stopImmediatePropagation(); muted = !muted;
        try { localStorage.setItem('fs-festival-muted', muted ? '1' : '0'); } catch {}
        for (const [ctx, out] of outputs) out.gain.gain.setTargetAtTime(muted ? 0 : .65, ctx.currentTime, .02);
        paintSound(); return;
      }
      if (['homeBtn','out','againBtn','again'].includes(b.id)) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (phase !== 'result') return;
        if (b.id === 'againBtn' || b.id === 'again') {
          if (embedded) { phase = 'replaying'; send('fsGameReplay'); }
          else location.reload();
        } else FSGame.close();
        return;
      }
      if (['goBtn','go'].includes(b.id) && !released) {
        e.preventDefault(); e.stopImmediatePropagation(); if (phase !== 'ready' || window.fsQuestionsReady === false) return;
        startButton = b;
        if (embedded) { phase = 'starting'; b.disabled = true; send('fsGameStart'); }
        else { phase = 'playing'; released = true; b.click(); released = false; }
      }
    }, true);
    const updateTimer = () => {
      const text = time.textContent.trim(); const m = text.match(/^(?:⏱️\s*|剩\s*)?(\d+)\s*秒$/);
      time.classList.toggle('fs-countdown', !!m);
      time.classList.toggle('fs-urgent', !!m && +m[1] <= 10);
    };
    updateTimer();
    const observer = new MutationObserver(updateTimer); observer.observe(time, { childList: true, subtree: true, characterData: true });
    if(embedded)send('fsGameReady');
  });
})();
