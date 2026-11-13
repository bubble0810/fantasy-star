/* Pentatonic festival arrangement: synthesized dizi, plucked strings and race drums. */
(() => {
  'use strict';
  let ctx, output, reverb, timer = 0, mode = 'quiz', step = 0, next = 0, noise;
  const voices = new Set(), strings = new Map();
  const quizPhrases = [
    [72,null,76,79,81,null,79,76,74,null,72,null,67,72,74,null],
    [76,79,81,null,84,null,81,79,76,null,74,72,74,null,67,null],
    [79,null,81,84,86,null,84,81,79,76,79,null,74,76,72,null],
    [81,79,76,null,79,76,74,72,67,null,74,76,72,null,null,null],
    [69,null,72,76,79,null,76,72,74,null,76,79,81,null,79,null],
    [79,81,84,null,86,84,81,79,76,null,79,76,74,72,67,null],
    [74,null,79,81,79,76,74,null,72,74,76,79,76,null,74,null],
    [76,79,81,79,76,74,72,null,67,72,76,74,72,null,null,null]
  ];
  const racePhrases = [
    [60,67,72,67,76,72,67,null,60,67,72,76,79,76,72,67],
    [64,69,72,76,81,null,79,76,72,76,79,81,84,81,79,76],
    [67,null,74,79,81,79,74,67,62,67,74,79,81,79,76,74],
    [74,76,79,81,86,null,84,81,79,76,74,72,67,null,74,76],
    [69,72,76,81,84,81,76,72,69,76,79,81,84,86,84,81],
    [79,null,84,86,88,86,84,81,79,76,79,81,84,81,79,76],
    [62,69,74,76,81,79,76,74,67,74,79,81,86,84,81,79],
    [76,79,84,81,79,76,74,72,67,72,76,79,72,null,67,72]
  ];
  const harmony = [[48,55,60,64,67],[45,52,57,60,64],[43,50,55,62,67],[50,57,62,64,69],
    [45,52,57,60,64],[48,55,60,64,67],[43,50,55,62,67],[48,55,60,64,67]];
  const hz = midi => 440 * 2 ** ((midi - 69) / 12);
  function init() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      output = ctx.createGain(); output.gain.value = .62; output.connect(FSGame.output(ctx));
      reverb = ctx.createConvolver();
      const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * .8), ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = ir.getChannelData(ch);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * .22;
      }
      reverb.buffer = ir; const wet = ctx.createGain(); wet.gain.value = .18; reverb.connect(wet).connect(output);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  function wire(source, gain, pan = 0, extras = [], room = true) {
    const panner = ctx.createStereoPanner(); panner.pan.value = pan;
    gain.connect(panner).connect(output); if (room) panner.connect(reverb);
    voices.add(source);
    source.onended = () => {
      voices.delete(source); source.disconnect(); gain.disconnect(); panner.disconnect();
      for (const node of extras) node.disconnect();
    };
  }
  function envelope(gain, at, attack, duration, volume) {
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
  }
  function flute(midi, at, duration, volume = .1, pan = -.16) {
    const osc = ctx.createOscillator(), gain = ctx.createGain(), vibrato = ctx.createOscillator(), depth = ctx.createGain();
    osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(6), new Float32Array([0,1,.24,.12,.04,.02])));
    osc.frequency.setValueAtTime(hz(midi) * .99, at); osc.frequency.exponentialRampToValueAtTime(hz(midi), at + .06);
    vibrato.frequency.value = 5.1; depth.gain.setValueAtTime(0, at); depth.gain.linearRampToValueAtTime(hz(midi) * .003, at + .18);
    vibrato.connect(depth).connect(osc.frequency); osc.connect(gain);
    envelope(gain, at, .035, duration, volume); wire(osc, gain, pan, [vibrato, depth]);
    vibrato.start(at); vibrato.stop(at + duration + .01); osc.start(at); osc.stop(at + duration + .02);
    if (duration > .3) percussion(at, .08, .008, 2700, pan);
  }
  function pluck(midi, at, volume = .16, pan = .24) {
    if (!strings.has(midi)) {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate), data = buffer.getChannelData(0);
      const period = Math.round(ctx.sampleRate / hz(midi));
      for (let i = 0; i < data.length; i++) data[i] = i < period ? Math.random() * 2 - 1 : .498 * (data[i - period] + data[i - period + 1]);
      strings.set(midi, buffer);
    }
    const source = ctx.createBufferSource(), gain = ctx.createGain(); source.buffer = strings.get(midi);
    source.connect(gain); envelope(gain, at, .003, 1.15, volume); wire(source, gain, pan);
    source.start(at); source.stop(at + 1.2);
  }
  function drum(at, strong = true, volume = 1) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.setValueAtTime(strong ? 145 : 210, at); osc.frequency.exponentialRampToValueAtTime(strong ? 52 : 95, at + .16);
    osc.connect(gain); envelope(gain, at, .003, strong ? .28 : .16, (strong ? .18 : .09) * volume);
    wire(osc, gain, strong ? -.06 : .18, [], false); osc.start(at); osc.stop(at + .3);
    percussion(at, .035, (strong ? .025 : .016) * volume, strong ? 850 : 1700, .08);
  }
  function percussion(at, duration, volume, cutoff = 5000, pan = .1) {
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = noise; filter.type = 'bandpass'; filter.frequency.value = cutoff; filter.Q.value = .7;
    source.connect(filter).connect(gain); envelope(gain, at, .002, duration, volume); wire(source, gain, pan, [filter], false);
    source.start(at, .17); source.stop(at + duration + .01);
  }
  function raceDrum(at, strong, volume) {
    drum(at, strong, volume);
    // Add a higher resonant body so the big drum is audible on phone speakers too.
    const body = ctx.createOscillator(), gain = ctx.createGain();
    body.type = 'triangle'; body.frequency.setValueAtTime(strong ? 170 : 240, at);
    body.frequency.exponentialRampToValueAtTime(strong ? 88 : 140, at + .11);
    body.connect(gain); envelope(gain, at, .004, strong ? .24 : .13, (strong ? .045 : .025) * volume);
    wire(body, gain, strong ? 0 : .14, [], false); body.start(at); body.stop(at + .26);
    if (strong) percussion(at, .055, .04 * volume, 1500, -.1);
  }
  function gong(at, volume = .04) {
    for (const [ratio, level] of [[1,1],[1.51,.45],[2.09,.3],[2.73,.18]]) {
      const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.frequency.value = 230 * ratio;
      osc.frequency.setValueAtTime(235 * ratio, at); osc.frequency.exponentialRampToValueAtTime(225 * ratio, at + 1.2);
      osc.connect(gain); envelope(gain, at, .004, 1.6, volume * level); wire(osc, gain, -.25);
      osc.start(at); osc.stop(at + 1.62);
    }
    percussion(at, .32, .022, 5500, .3);
  }
  function arrange(at, unit) {
    const phrase = Math.floor(step / 16) % 8, pos = step % 16, cycle = Math.floor(step / 128) % 2;
    const racing = mode === 'race', pitches = harmony[phrase];
    const tune = (racing ? racePhrases : quizPhrases)[phrase], midi = tune[pos];
    const bridge = phrase === 3 || phrase === 6;
    if (racing) {
      // Fast string lead, octave answers and broad bass drums create a racing texture.
      if (midi !== null) {
        pluck(midi, at, bridge ? .2 : .3, pos % 2 ? .22 : -.14);
        if (pos % 4 === 0 && !bridge) pluck(midi - 12, at + .008, .2, -.2);
      }
      if (pos === 0 || pos === 8) {
        pluck(pitches[0], at, .36, -.1);
        pitches.slice(1, 4).forEach((pitch, i) => pluck(pitch, at + .018 * (i + 1), .12, .32));
      }
      if (bridge && pos % 4 === 0 && midi !== null) flute(midi + (cycle ? 0 : 12), at, unit * 3.2, .09, -.25);
      if (!bridge && pos % 2 === 1) pluck(pitches[2 + ((pos + cycle) % 3)], at + unit * .5, .12, .35);
      // .175s subdivisions; the strong drum remains every 1.4s at the golden stroke window.
      if (pos % 8 === 4) raceDrum(at, true, 1.9);
      if (pos % 8 === 0) raceDrum(at, true, 1.05);
      if (pos % 4 === 2) raceDrum(at, false, 1.15);
      if (pos % 8 === 3) raceDrum(at + unit / 2, false, .55);
      if (pos % 2 === 1) percussion(at, .035, .032, 2200 + (pos % 3) * 900, .3);
      if (pos >= 13 && phrase % 2) { raceDrum(at, false, 1.05); if (pos === 15) raceDrum(at + unit / 2, false, .9); }
      if (pos === 0 && [0,2,4,7].includes(phrase)) gong(at, phrase === 7 ? .055 : .04);
      if (pos === 15 && [1,3,5].includes(phrase)) percussion(at, .26, .04, 5800, -.3);
    } else {
      // Festival courtyard: dizi theme, string responses, then a quieter bridge and return.
      const stringsLead = phrase === 1 || phrase === 5 || (cycle && phrase === 2);
      if (midi !== null) {
        if (stringsLead) pluck(midi, at, .25, .12);
        else if (pos % 2 === 0) flute(midi, at, unit * (tune[(pos + 1) % 16] === null ? 1.85 : .9), bridge ? .075 : .105);
        else pluck(midi, at, .16, .3);
      }
      if (pos % 2 === 0) pluck(pitches[1 + ((pos / 2 + cycle) % 4)], at + .025, bridge ? .08 : .13, .35);
      if (stringsLead && pos % 8 === 4) flute(pitches[3] + 12, at, unit * 2.8, .075, -.3);
      if (pos % 8 === 0) { pluck(pitches[0], at, .25, -.12); drum(at, false, .7); }
      if (!bridge && pos % 4 === 2) percussion(at, .04, .022, 2900, .25);
      if (pos === 0 && [0,4,7].includes(phrase)) gong(at, .026);
      if (pos === 14 && phrase % 2) {
        [pitches[2],pitches[3],pitches[4]].forEach((pitch, i) => pluck(pitch + 12, at + unit * i * .45, .13, -.3));
      }
      if (pos === 15 && phrase === 7) gong(at + unit / 2, .025);
    }
  }
  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    next = Math.max(next, ctx.currentTime + .01);
    const unit = mode === 'race' ? .175 : .25;
    while (next < ctx.currentTime + .15) { arrange(next, unit); next += unit; step++; }
  }
  function stop() {
    clearInterval(timer); timer = 0;
    for (const source of voices) { try { source.stop(); } catch {} }
    voices.clear();
  }
  window.DragonMusic = {
    get playing() { return !!timer; }, get mode() { return mode; },
    start(nextMode) {
      stop(); mode = nextMode;
      try { init(); step = 0; next = ctx.currentTime + .06; timer = setInterval(tick, 35); tick(); }
      catch { stop(); }
    }, stop
  };
  addEventListener('pagehide', stop);
})();
