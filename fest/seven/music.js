/* Original 6/8 score: eight phrases, layered piano, flute, harp, strings,
   celesta, bass and brushed percussion. All sounds are synthesized. */
(() => {
  'use strict';
  const eighth = 60 / 90 / 2;
  const phrases = [
    [72,null,76,79,76,74, 72,74,76,79,null,76],
    [74,null,77,81,79,77, 76,74,72,71,null,67],
    [76,79,81,84,null,81, 79,76,74,76,79,null],
    [77,null,79,81,79,76, 74,72,71,74,null,79],
    [69,null,72,76,79,76, 74,null,77,81,79,77],
    [76,79,84,86,null,84, 81,79,76,74,72,null],
    [74,77,81,79,77,74, 71,74,79,81,79,77],
    [76,null,79,84,79,76, 74,72,67,72,null,null]
  ];
  const chords = [
    [48,55,59,64], [45,52,55,60], [50,57,60,65], [43,50,57,59],
    [52,59,62,67], [45,52,55,60], [53,60,64,69], [43,50,57,59],
    [45,52,55,60], [50,57,60,65], [53,60,64,69], [48,55,59,64],
    [50,57,60,65], [43,50,57,59], [48,55,59,64], [48,55,60,64]
  ];
  const buses = new WeakMap(), voices = new Set();
  let ctx, music, room, noise, timer = null, step = 0, next = 0, muted = false;
  const hz = midi => 440 * 2 ** ((midi - 69) / 12);
  function output(context) {
    if (!buses.has(context)) {
      const compressor = context.createDynamicsCompressor(), gain = context.createGain();
      compressor.threshold.value = -18; compressor.knee.value = 12;
      compressor.ratio.value = 8; compressor.attack.value = .003; compressor.release.value = .18;
      gain.gain.value = muted ? 0 : .65;
      compressor.connect(gain).connect(window.FSGame ? FSGame.output(context) : context.destination);
      buses.set(context, {input: compressor, gain});
    }
    return buses.get(context).input;
  }
  function init(context) {
    if (ctx) return;
    ctx = context; music = ctx.createGain(); music.gain.value = .72; music.connect(output(ctx));
    room = ctx.createConvolver();
    const impulse = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 1.3), ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3 * .18;
    }
    room.buffer = impulse;
    const wet = ctx.createGain(); wet.gain.value = .19; room.connect(wet).connect(music);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  function wire(source, gain, pan, extras = [], reverb = true) {
    const stereo = ctx.createStereoPanner(); stereo.pan.value = pan;
    gain.connect(stereo).connect(music); if (reverb) stereo.connect(room);
    voices.add(source);
    source.onended = () => {
      voices.delete(source); source.disconnect(); gain.disconnect(); stereo.disconnect();
      extras.forEach(node => node.disconnect());
    };
  }
  function note(midi, at, duration, volume, kind = 'piano', pan = 0) {
    const source = ctx.createOscillator(), gain = ctx.createGain();
    const harmonics = {
      piano:[0,1,.28,.12,.035], harp:[0,1,.18,.07,.025],
      flute:[0,1,.15,.06,.015], strings:[0,1,.3,.14,.07],
      bell:[0,1,.035,.24,.015,.06], bass:[0,1,.18,.025]
    }[kind];
    source.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(harmonics.length), new Float32Array(harmonics)));
    source.frequency.value = hz(midi);
    const attack = kind === 'strings' ? .25 : kind === 'flute' ? .045 : .008;
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + attack);
    if (kind === 'strings' || kind === 'flute') gain.gain.setValueAtTime(volume * .7, at + duration * .65);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(gain); wire(source, gain, pan);
    source.start(at); source.stop(at + duration + .02);
  }
  function brush(at, accent) {
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = noise; filter.type = 'highpass'; filter.frequency.value = 4200;
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(accent ? .015 : .007, at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .09);
    source.connect(filter).connect(gain); wire(source, gain, .3, [filter], false);
    source.start(at, .1); source.stop(at + .1);
  }
  function schedule(index, at) {
    const phrase = Math.floor(index / 12) % 8, pos = index % 12, beat = pos % 6;
    const chord = chords[phrase * 2 + Math.floor(pos / 6)];
    const melody = phrases[phrase][pos];
    if (beat === 0) {
      chord.forEach((m, i) => note(m + 12, at, eighth * 6.8, .012, 'strings', (i - 1.5) * .23));
      note(chord[0] - 12, at, eighth * 2.7, .075, 'bass', -.05);
      // A soft piano chord under the sustained strings.
      chord.slice(1).forEach((m, i) => note(m + 12, at + i * .022, 1.1, .032, 'piano', -.22));
    }
    if (beat === 3) note(chord[1] - 12, at, eighth * 2.5, .046, 'bass', .05);
    note(chord[[0,1,2,3,2,1][beat]] + 12, at, .9, .038, 'harp', beat % 2 ? .36 : -.36);
    if (melody !== null) {
      note(melody, at, eighth * (pos % 3 === 0 ? 1.85 : .92), .067,
        phrase === 2 || phrase === 5 ? 'piano' : 'flute', -.1);
    }
    // Countermelody and occasional high chimes leave space for answer sounds.
    if ([1,3,5,6].includes(phrase) && beat === 4) note(chord[2] + 12, at, eighth * 1.8, .025, 'piano', .28);
    if (pos === 0 || (phrase >= 4 && pos === 9)) note(chord[3] + 24, at, 1.4, .017, 'bell', .4);
    brush(at, beat === 3);
    if (beat === 0 || beat === 3) note(36, at, .16, beat === 0 ? .025 : .016, 'bass', 0);
  }
  function tick() {
    // On returning from a hidden tab, skip missed notes instead of bursting them.
    if (next < ctx.currentTime - .15) {
      const skipped = Math.ceil((ctx.currentTime - next) / eighth);
      step += skipped; next += skipped * eighth;
    }
    while (next < ctx.currentTime + .15) { schedule(step++, next); next += eighth; }
  }
  function stop() {
    if (timer !== null) clearInterval(timer); timer = null;
    for (const voice of voices) { try { voice.stop(); } catch {} }
    voices.clear();
  }
  window.QixiMusic = {
    output,
    start(context) {
      stop(); init(context); step = 0; next = ctx.currentTime + .04;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      tick(); timer = setInterval(tick, 50);
    },
    stop,
    focus(demonstrating) {
      if (music) music.gain.setTargetAtTime(demonstrating ? .48 : .72, ctx.currentTime, .12);
    },
    setMuted(value) {
      muted = value;
      if (ctx) buses.get(ctx).gain.gain.setTargetAtTime(muted ? 0 : .65, ctx.currentTime, .015);
    },
    get playing() { return timer !== null; }
  };
})();
