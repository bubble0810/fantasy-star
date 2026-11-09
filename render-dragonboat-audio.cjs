// Render the actual in-game score through OfflineAudioContext for repeatable audio QA/previews.
const fs = require('fs'), path = require('path'), assert = require('assert');
const runtime = path.join(require('os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = require(path.join(runtime, 'playwright'));
function wav(channels, sampleRate) {
  const frames = channels[0].length, count = channels.length, data = Buffer.alloc(44 + frames * count * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(count, 22);
  data.writeUInt32LE(sampleRate, 24); data.writeUInt32LE(sampleRate * count * 2, 28);
  data.writeUInt16LE(count * 2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(data.length - 44, 40);
  for (let i = 0; i < frames; i++) for (let ch = 0; ch < count; ch++) {
    const fade = Math.min(1, (frames - i) / (sampleRate * .2));
    const value = Math.max(-1, Math.min(1, channels[ch][i] * fade));
    data.writeInt16LE(Math.round(value * 32767), 44 + (i * count + ch) * 2);
  }
  return data;
}
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    fs.mkdirSync('artifacts/festivals', {recursive:true});
    for (const mode of ['quiz','race']) {
      const page = await browser.newPage();
      const rendered = await page.evaluate(async ({source, mode}) => {
        const sampleRate = 22050, seconds = mode === 'quiz' ? 32 : 24, offline = new OfflineAudioContext(2, sampleRate * seconds, sampleRate);
        let clock = 0, callback;
        const context = new Proxy(offline, {get(target, key) {
          if (key === 'currentTime') return clock;
          if (key === 'state') return 'running';
          const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
        }});
        window.AudioContext = function () { return context; };
        window.setInterval = fn => { callback = fn; return 1; }; window.clearInterval = () => {};
        window.FSGame = {output() {
          const compressor = offline.createDynamicsCompressor(), gain = offline.createGain();
          compressor.threshold.value = -18; compressor.knee.value = 12; compressor.ratio.value = 8;
          compressor.attack.value = .003; compressor.release.value = .18;
          gain.gain.value = .65; compressor.connect(gain).connect(offline.destination); return compressor;
        }};
        // A seeded source makes comparison across arrangement changes repeatable.
        let seed = 419; Math.random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 2 ** 32);
        (0, eval)(source); DragonMusic.start(mode);
        if (!DragonMusic.playing) throw new Error('Music failed to start');
        for (clock = .05; clock < seconds - .2; clock += .05) callback();
        const buffer = await offline.startRendering();
        return {sampleRate, seconds, channels: [Array.from(buffer.getChannelData(0)), Array.from(buffer.getChannelData(1))]};
      }, {source:fs.readFileSync('fest/dragonboat/music.js','utf8'), mode});
      let peak = 0, power = 0;
      for (const ch of rendered.channels) for (const x of ch) { peak = Math.max(peak, Math.abs(x)); power += x*x; }
      const rms = Math.sqrt(power / (rendered.channels.length * rendered.channels[0].length));
      assert(peak < .98, 'audio must not clip'); assert(rms > .005, 'music must not be silent');
      fs.writeFileSync(`artifacts/festivals/dragonboat-${mode}-music.wav`, wav(rendered.channels, rendered.sampleRate));
      console.log(`${mode}: rendered ${rendered.seconds} seconds, peak ${peak.toFixed(3)}, RMS ${rms.toFixed(3)}, no clipping`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
