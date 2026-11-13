(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const beatPeriod = 1.4;
  let phase = 'loading', score = 0, ammo = 0, deck = [], current, number = 0;
  let quizEnd = 0, questionEnd = 0, transitionEnd = 0, raceStart = 0, race, raf;
  let previousQuestion = '', lastStroke = -Infinity, feedbackUntil = 0, audioContext, lastBeat = -1;
  const valid = Array.isArray(window.DRAGONBOAT_QUESTIONS) && DRAGONBOAT_QUESTIONS.length >= 20 &&
    DRAGONBOAT_QUESTIONS.every(q => Array.isArray(q) && typeof q[0] === 'string' && Array.isArray(q[1]) &&
      q[1].length === 3 && q[1].every(a => typeof a === 'string') && Number.isInteger(q[2]) && q[2] >= 0 && q[2] < 3);
  window.fsQuestionsReady = false;
  const shuffle = arr => { const out = [...arr]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
  function sound(freq = 180) {
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const o = audioContext.createOscillator(), g = audioContext.createGain(), t = audioContext.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq / 2, t + .12);
      g.gain.setValueAtTime(.13, t); g.gain.exponentialRampToValueAtTime(.001, t + .15);
      o.connect(g).connect(FSGame.output(audioContext)); o.start(t); o.stop(t + .16);
    } catch { /* Audio is optional; play remains available. */ }
  }
  function nextQuestion(start) {
    if (!deck.length) {
      deck = shuffle(DRAGONBOAT_QUESTIONS);
      if (deck.length > 1 && deck[deck.length - 1][0] === previousQuestion) [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
    }
    const q = deck.pop(); previousQuestion = q[0];
    current = {text: q[0], choices: shuffle(q[1].map((text, index) => ({text, correct: index === q[2]})))};
    number++; questionEnd = start + 5000;
    $('#questionNo').textContent = `第 ${number} 題`; $('#question').textContent = current.text;
    $('#answers').replaceChildren(...current.choices.map((choice, i) => {
      const b = document.createElement('button'), letter = document.createElement('span');
      letter.textContent = 'ABC'[i]; b.append(letter, document.createTextNode(choice.text));
      b.onclick = () => answer(i); return b;
    }));
  }
  function paintScore() { $('#score').textContent = score; $('#ammo').textContent = Math.min(score, 5); }
  function feedback(text, time) { $('#feedback').textContent = text; feedbackUntil = time + 800; }
  function begin() {
    if (phase !== 'ready') return;
    $('#intro').hidden = true; $('#quiz').hidden = false; $('#chapter').hidden = false;
    $('#chapter span').textContent = '第一關'; $('#chapter b').textContent = '粽子問答大賽';
    phase = 'quiz'; score = 0; number = 0; deck = []; previousQuestion = '';
    const now = performance.now(); quizEnd = now + 30000; nextQuestion(now); paintScore(); sound(350);
    DragonMusic.start('quiz');
    raf = requestAnimationFrame(tick);
  }
  function answer(index) {
    const now = performance.now();
    // Resolve elapsed deadlines before accepting input from a throttled tab.
    const oldNumber = number; update(now);
    if (phase !== 'quiz' || number !== oldNumber) return;
    const correct = current.choices[index].correct;
    score = Math.max(0, score + (correct ? 1 : -1)); paintScore();
    feedback(correct ? '答對了！+1' : '答錯了 −1', now); sound(correct ? 520 : 140); nextQuestion(now);
  }
  function pass() {
    const now = performance.now(), oldNumber = number;
    update(now);
    if (phase !== 'quiz' || number !== oldNumber) return;
    feedback('PASS，不扣分', now); nextQuestion(now);
  }
  function endQuiz() {
    phase = 'transition'; ammo = Math.min(score, 5); transitionEnd = quizEnd + 3000;
    $('#quiz').hidden = true; $('#chapter').hidden = true; $('#transition').hidden = false;
    $('#quizSummary').textContent = `問答成績 ${score} 分，帶入 ${ammo} 次水浪攻擊。`;
    const icon = new Image(); icon.src = 'img/zongzi.png'; icon.alt = '粽子'; icon.className = 'carry-icon';
    $('#carry').replaceChildren(icon, document.createTextNode(` × ${ammo}`)); $('#timeChip').textContent = '準備出發';
  }
  function startRace() {
    phase = 'race'; raceStart = transitionEnd; race = new DragonRace(ammo);
    DragonMusic.start('race');
    $('#transition').hidden = true; $('#race').hidden = false;
    $('#game').style.backgroundImage = "url('img/river.png')";
    $('#game').style.backgroundSize = 'auto 135%'; $('#game').style.backgroundPosition = 'center bottom';
    $('#boats').replaceChildren(...race.boats.map(b => {
      const el = document.createElement('button'); el.className = 'boat'; el.id = `boat${b.id}`;
      const lane = [1, 0, 2][b.id]; // Red left, player center, blue right.
      el.style.left = `${(lane + .5) * 100 / 3}%`;
      const img = document.createElement('img'); img.src = `img/boat-${['green', 'red', 'blue'][b.id]}.png`; img.alt = b.name;
      const label = document.createElement('em'); el.append(img, label);
      el.setAttribute('aria-label', b.id ? `對${b.name}發動粽子水浪` : '玩家綠龍舟');
      el.onclick = () => { if (b.id) attack(b.id); }; return el;
    }));
    sound(250);
  }
  function paintRace() {
    $('#timeChip').textContent = `${Math.ceil(race.boats[0].remaining)} m`;
    $('#ammo').textContent = race.boats[0].ammo;
    $('#leaderboard').replaceChildren(...[race.boats[1], race.boats[0], race.boats[2]].map(b => {
      const el = document.createElement('div'), strong = document.createElement('b');
      el.textContent = `${['🟢', '🔴', '🔵'][b.id]} ${b.name} · 第${race.rank(b.id)}名`;
      strong.textContent = `${Math.ceil(b.remaining)} m`; el.append(strong); return el;
    }));
    for (const b of race.boats) {
      const el = $(`#boat${b.id}`), t = race.time;
      el.style.top = `${12 + b.remaining / 1000 * 40}%`;
      el.className = `boat${t < b.protectedUntil ? ' protected' : ''}${t < b.hitUntil ? ' hit' : ''}${t < b.waterUntil ? (b.water > 1 ? ' flow' : ' whirl') : ''}`;
      el.querySelector('em').textContent = t < b.hitUntil ? '💦 減速中' : t < b.waterUntil ? (b.water > 1 ? '順流加速' : '漩渦減速') : `${Math.round(b.speed)} m/s`;
      el.disabled = !b.id || race.finished || !race.boats[0].ammo || t < b.protectedUntil;
    }
    $('#beat').style.left = `${((race.time / beatPeriod) % 1) * 100}%`;
    for (const id of [1, 2]) {
      const b = race.boats[id], button = $(`#attack${id}`), protectedNow = race.time < b.protectedUntil;
      button.disabled = race.finished || !race.boats[0].ammo || protectedNow;
      button.querySelector('.attack-status').textContent = protectedNow ? '保護中' : !race.boats[0].ammo ? '粽子用完' : '發射';
    }
    $('#attackHelp span').textContent = `剩餘 × ${race.boats[0].ammo} · 每次發射消耗 1 顆`;
    while (race.events.length) {
      const event = race.events.shift();
      if (event.kind === 'attack') $('#raceMessage').textContent = `${race.boats[event.from].name} → ${race.boats[event.to].name}：水浪攻擊！`;
    }
  }
  function paddle() {
    const now = performance.now(); update(now); if (phase !== 'race') return;
    if (now - lastStroke < 220) return; lastStroke = now;
    const beat = (race.time / beatPeriod) % 1;
    if (Math.abs(beat - .5) <= .22) {
      if (race.stroke()) {
        const b = race.boats[0];
        $('#raceMessage').textContent = `節奏漂亮！連續 ${b.streak} 次 · 划船 ${b.drive} m/s`; sound(350);
      }
    } else { race.missStroke(); $('#raceMessage').textContent = '跟著白色游標，在金色區域划船！'; sound(150); }
  }
  function attack(id) {
    update(performance.now()); if (phase !== 'race') return;
    if (race.attack(0, id)) { sound(90); paintRace(); }
  }
  function finish() {
    phase = 'result'; cancelAnimationFrame(raf); $('#paddle').disabled = true;
    DragonMusic.stop();
    const rank = race.rank(0), earned = [55, 35, 25][rank - 1];
    $('#medal').textContent = ['🥇', '🥈', '🥉'][rank - 1]; $('#placing').textContent = `第 ${rank} 名`;
    $('#earned').textContent = earned; $('#resultQuiz').textContent = `問答 ${score} 分 · 使用 ${ammo - race.boats[0].ammo} 顆粽子 · 競速 ${race.time.toFixed(2)} 秒`;
    $('#resultRows').replaceChildren(...race.order.map(b => {
      const el = document.createElement('div'); el.textContent = `第 ${race.rank(b.id)} 名　${b.name}　剩餘 ${b.remaining.toFixed(1)} m`; return el;
    }));
    $('#result').hidden = false; sound(650); fsReport(earned);
  }
  function update(now) {
    if (phase === 'quiz') {
      // Process only fully expired questions preceding the global deadline.
      while (now >= questionEnd && questionEnd < quizEnd) {
        const expired = questionEnd; feedback('本題未答，不扣分', now); nextQuestion(expired);
      }
      if (now >= quizEnd) endQuiz();
      else {
        $('#timeChip').textContent = `${Math.ceil((quizEnd - now) / 1000)} 秒`;
        $('#questionSeconds').textContent = Math.max(0, Math.ceil((Math.min(questionEnd, quizEnd) - now) / 1000));
        $('#questionBar').style.width = `${Math.max(0, (Math.min(questionEnd, quizEnd) - now) / 50)}%`;
        if (now > feedbackUntil) $('#feedback').textContent = '答對 +1 · 答錯 −1 · 未答不扣分';
      }
    }
    if (phase === 'transition') {
      $('#countdown').textContent = `${Math.max(0, Math.ceil((transitionEnd - now) / 1000))} 秒後出發`;
      if (now >= transitionEnd) startRace();
    }
    if (phase === 'race') {
      race.advance((now - raceStart) / 1000); paintRace();
      const beat = Math.floor((race.time - beatPeriod / 2) / beatPeriod);
      if (!race.finished && beat > lastBeat) { lastBeat = beat; sound(110); }
      if (race.finished) finish();
    }
  }
  function tick(now) { update(now); if (phase !== 'result') raf = requestAnimationFrame(tick); }
  $('#go').onclick = begin; $('#paddle').onclick = paddle; $('#pass').onclick = pass;
  $('#attack1').onclick = () => attack(1); $('#attack2').onclick = () => attack(2);
  addEventListener('keydown', e => {
    if (e.code === 'Space' && phase === 'race' && e.target.tagName !== 'BUTTON') { e.preventDefault(); if (!e.repeat) paddle(); }
  });
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') update(performance.now()); });
  Promise.all(['quiz.png', 'river.png', 'boat-green.png', 'boat-red.png', 'boat-blue.png', 'zongzi.png', 'sachet.svg'].map(file => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = resolve; img.onerror = () => reject(new Error(file)); img.src = `img/${file}`;
  }))).then(() => {
    if (!valid) throw new Error('題庫格式不正確或不足20題');
    phase = 'ready'; window.fsQuestionsReady = true; $('#go').disabled = false; $('#loadStatus').textContent = '素材與20題題庫已就緒';
  }).catch(error => { $('#loadStatus').textContent = `無法開始：${error.message}。請重新載入。`; });
})();
