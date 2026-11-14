/* 電流急急棒：按住起點、沿著軌道拖到星星。只回報 {completed:true, durationMs}。 */
window.MINI_START = () => {
  'use strict';
  const M = MAZES[MINI.tier - 1], P = M.pts, start = P[0], goal = P[P.length - 1], skin = MAZE_SKINS[MINI.tier - 1];
  document.documentElement.style.setProperty('--page', skin.page);
  if (!MINI.title) document.getElementById('miniTitle').textContent = '電流急急棒 · ' + M.n;
  MINI.body.innerHTML = `<div class="mstat"><span>狀態：<b id="mst">按住綠色起點開始</b></span><span>剩下 <b id="mt">${M.time}</b> 秒</span></div>
    <canvas class="maze" id="cv" width="640" height="640" data-maze-tier="${MINI.tier}"></canvas>
    <p class="mhint">按住綠色起點，手指（或滑鼠）不放開，沿著軌道一路拖到星星。碰到發光的邊、或是中途放開，都算失敗。</p>
    ${MINI.goal ? `<p class="mgoal">${MINI.esc(MINI.goal)}</p>` : ''}`;
  const cv = document.getElementById('cv'), cx = cv.getContext('2d'), mst = document.getElementById('mst'), mt = document.getElementById('mt');
  cx.scale(2, 2);
  let state = 'ready', pos = null, rankStart = 0, retryTimer = 0;
  const segDist = (px, py, [ax, ay], [bx, by]) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); const x = ax + t * dx - px, y = ay + t * dy - py; return Math.sqrt(x * x + y * y); };
  const path = () => { cx.beginPath(); P.forEach(([x, y], i) => i ? cx.lineTo(x, y) : cx.moveTo(x, y)); };
  function draw() {
    cx.clearRect(0, 0, 320, 320); const bg = cx.createLinearGradient(0, 0, 320, 320); bg.addColorStop(0, skin.bg[0]); bg.addColorStop(1, skin.bg[1]); cx.fillStyle = bg; cx.fillRect(0, 0, 320, 320);
    cx.strokeStyle = '#c7c9ff09'; cx.lineWidth = .5; cx.beginPath(); for (let n = 20; n < 320; n += 20) { cx.moveTo(n, 0); cx.lineTo(n, 320); cx.moveTo(0, n); cx.lineTo(320, n); } cx.stroke();
    cx.lineCap = 'round'; cx.lineJoin = 'round';
    const edge = cx.createLinearGradient(20, 300, 300, 20); skin.edge.forEach((color, i) => edge.addColorStop(i / 2, color));
    cx.shadowColor = state === 'fail' ? '#ff4d6d' : skin.edge[1]; cx.shadowBlur = 8; path(); cx.strokeStyle = state === 'fail' ? '#ff4d6d' : edge; cx.lineWidth = M.w + 8; cx.stroke();
    cx.shadowBlur = 0; path(); cx.strokeStyle = '#ffffff65'; cx.lineWidth = M.w + 2; cx.stroke();
    const road = cx.createLinearGradient(0, 0, 320, 320); road.addColorStop(0, skin.road[0]); road.addColorStop(1, skin.road[1]); path(); cx.strokeStyle = road; cx.lineWidth = M.w; cx.stroke();
    path(); cx.setLineDash([2, 10]); cx.strokeStyle = '#e8efff45'; cx.lineWidth = 1; cx.stroke(); cx.setLineDash([]);
    const origin = cx.createLinearGradient(start[0], start[1] - 18, start[0], start[1] + 18); origin.addColorStop(0, '#96f2c6'); origin.addColorStop(1, '#278c75'); cx.fillStyle = origin; cx.beginPath(); cx.arc(start[0], start[1], M.w / 2 + 2, 0, 7); cx.fill();
    cx.fillStyle = '#092d2c'; cx.font = 'bold 11px sans-serif'; cx.textAlign = 'center'; cx.fillText('起點', start[0], start[1] + 4);
    const finish = cx.createLinearGradient(goal[0], goal[1] - 20, goal[0], goal[1] + 20); finish.addColorStop(0, '#fff5ca'); finish.addColorStop(1, '#dcae55'); cx.fillStyle = finish; cx.fill(new Path2D(MINI.star(goal[0], goal[1], M.w / 2 + 6)));
    if (pos) { cx.strokeStyle = state === 'fail' ? '#ff4d6d' : skin.ring; cx.lineWidth = 4; cx.beginPath(); cx.arc(pos[0], pos[1], 7, 0, 7); cx.stroke(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(pos[0], pos[1], 3, 0, 7); cx.fill(); }
  }
  function loop() {
    if (state === 'go') { const left = M.time - (performance.now() - rankStart) / 1000; mt.textContent = Math.max(0, left).toFixed(1); if (left <= 0) fail('時間到了'); }
    draw(); if (state !== 'done') requestAnimationFrame(loop);
  }
  const xy = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 320 / r.width, (e.clientY - r.top) * 320 / r.height]; };
  const onPath = ([x, y]) => { for (let i = 1; i < P.length; i++) if (segDist(x, y, P[i - 1], P[i]) <= M.w / 2 - 2) return true; return false; };
  function fail(why) {
    if (state !== 'go') return; state = 'fail'; MINI.setPlaying(false); MINI.sfx('zap'); mst.textContent = why + '，再試一次！';
    cv.classList.remove('shake'); void cv.offsetWidth; cv.classList.add('shake');
    retryTimer = setTimeout(() => { if (state === 'fail') { state = 'ready'; pos = null; mst.textContent = '按住綠色起點開始'; mt.textContent = M.time; } }, 900);
  }
  cv.onpointerdown = e => {
    const p = xy(e); if (state !== 'ready') return;
    if (Math.hypot(p[0] - start[0], p[1] - start[1]) <= M.w / 2 + 6) { state = 'go'; pos = p; rankStart = performance.now(); MINI.setPlaying(true); try { cv.setPointerCapture(e.pointerId); } catch (err) {} mst.textContent = '小心別碰到邊！'; }
  };
  cv.onpointermove = e => {
    if (state !== 'go') return;
    if (performance.now() - rankStart >= M.time * 1000) return fail('時間到了');
    pos = xy(e);
    if (!onPath(pos) && Math.hypot(pos[0] - start[0], pos[1] - start[1]) > M.w / 2 + 6) return fail('觸電了');
    if (Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < M.w / 2 + 4) {
      const durationMs = Math.max(1, Math.round(performance.now() - rankStart));
      state = 'win'; MINI.setPlaying(false); if (MINI.main || !MINI.embedded) MINI.sfx('win'); mst.textContent = '抵達終點！';
      setTimeout(() => { state = 'done'; MINI.report({ completed: true, durationMs }, '抵達終點，用了 ' + (durationMs / 1000).toFixed(MINI.tier === MAZES.length ? 3 : 1) + ' 秒'); }, 450);
    }
  };
  cv.onpointerup = cv.onpointercancel = () => { if (state === 'go') fail('手放開了'); };
  loop();
};
