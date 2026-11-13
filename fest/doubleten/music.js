/* Original bright ceremonial march: 116 BPM, brass calls, piccolo and snare. */
(() => {
  'use strict';
  const eighth = 60 / 116 / 2;
  const phrases = [
    [72,null,72,76,79,null,76,null,77,76,74,null,67,71,74,null],
    [76,null,76,79,84,null,79,76,74,null,71,74,72,null,null,null],
    [79,null,76,79,84,83,81,79,77,null,74,77,81,null,79,null],
    [76,79,84,null,81,79,76,74,72,null,67,71,72,null,null,null],
    [77,null,77,81,84,null,81,77,76,null,76,79,84,null,79,null],
    [74,77,81,null,79,77,74,71,72,null,76,79,84,null,null,null],
    [79,79,81,83,84,null,79,76,77,77,79,81,79,null,74,null],
    [76,79,84,79,81,79,76,74,72,null,67,71,72,null,null,null]
  ];
  const chords = [[48,55,64],[43,55,59],[48,55,64],[48,55,64],
    [53,57,60],[43,55,59],[48,55,64],[43,55,59],
    [53,57,60],[48,55,64],[50,57,65],[48,55,64],
    [48,55,64],[43,55,59],[43,55,59],[48,55,64]];
  let ctx, master, noise, timer = null, next = 0, step = 0, muted = false;
  const voices = new Set();
  const hz = midi => 440 * 2 ** ((midi - 69) / 12);
  function init(context) {
    if (ctx) return;
    ctx = context;
    master = ctx.createGain(); master.gain.value = muted ? 0 : .65;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18; limiter.knee.value = 12; limiter.ratio.value = 6;
    limiter.attack.value = .003; limiter.release.value = .16;
    master.connect(limiter).connect(window.FSGame ? FSGame.output(ctx) : ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  function wire(source, gain, pan, extras = []) {
    const stereo = ctx.createStereoPanner(); stereo.pan.value = pan;
    gain.connect(stereo).connect(master); voices.add(source);
    source.onended = () => {
      voices.delete(source); source.disconnect(); gain.disconnect(); stereo.disconnect();
      extras.forEach(node => node.disconnect());
    };
  }
  function tone(midi, at, duration, volume, kind = 'brass', pan = 0) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    const partials = kind === 'brass' ? [0,1,.48,.26,.13,.06] :
      kind === 'piccolo' ? [0,1,.09,.045] : [0,1,.22,.07];
    osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(partials.length), new Float32Array(partials)));
    osc.frequency.value = hz(midi);
    const attack = kind === 'brass' ? .022 : .009;
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + attack);
    gain.gain.exponentialRampToValueAtTime(volume * .65, at + duration * .55);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain); wire(osc, gain, pan); osc.start(at); osc.stop(at + duration + .02);
  }
  function snare(at, volume = .045, cymbal = false) {
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = noise; filter.type = cymbal ? 'highpass' : 'bandpass';
    filter.frequency.value = cymbal ? 6500 : 2300; filter.Q.value = .65;
    const duration = cymbal ? .32 : .095;
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(volume, at + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter).connect(gain); wire(source, gain, .2, [filter]);
    source.start(at); source.stop(at + duration + .01);
    if (!cymbal) tone(50, at, .075, volume * .5, 'bass', .1);
  }
  function schedule(index, at) {
    const phrase = Math.floor(index / 16) % 8, pos = index % 16;
    const beat = pos % 8, chord = chords[phrase * 2 + Math.floor(pos / 8)];
    const note = phrases[phrase][pos];
    if (note !== null) tone(note, at, eighth * (pos % 4 === 0 ? 1.65 : .82), .065, 'brass', -.15);
    // Alternating low steps and short offbeat horn chords give a light parade gait.
    if (beat % 4 === 0) tone(chord[beat === 0 ? 0 : 1] - 12, at, eighth * 1.4, .095, 'bass', 0);
    if (beat === 2 || beat === 6) chord.slice(1).forEach(m => tone(m, at, eighth * .8, .028, 'brass', .15));
    if (beat === 2 || beat === 6) snare(at, .052);
    else if (beat % 2 === 1) snare(at, .015);
    if (pos === 14 || pos === 15) snare(at + eighth * .5, .022);
    if (phrase >= 4 && note !== null && pos % 2 === 0) tone(note + 12, at, eighth * .7, .018, 'piccolo', .3);
    if (pos === 0 && phrase % 2 === 0) snare(at, .025, true);
  }
  function tick() {
    if (next < ctx.currentTime - .15) {
      const missed = Math.ceil((ctx.currentTime - next) / eighth);
      step += missed; next += missed * eighth;
    }
    while (next < ctx.currentTime + .15) { schedule(step++, next); next += eighth; }
  }
  function stop() {
    if (timer !== null) clearInterval(timer); timer = null;
    for (const voice of voices) { try { voice.stop(); } catch {} }
    voices.clear();
  }
  window.DoubleTenMusic = {
    start(context) {
      stop(); init(context); step = 0; next = ctx.currentTime + .04;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      tick(); timer = setInterval(tick, 50);
    },
    stop,
    setMuted(value) {
      muted = value;
      if (master) master.gain.setTargetAtTime(muted ? 0 : .65, ctx.currentTime, .025);
    },
    get playing() { return timer !== null; }
  };
})();
