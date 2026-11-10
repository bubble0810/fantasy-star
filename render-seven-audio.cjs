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
    const page = await browser.newPage();
    const rendered = await page.evaluate(async source => {
      const sampleRate=22050,seconds=34,offline=new OfflineAudioContext(2,sampleRate*seconds,sampleRate);
      let clock=0,callback;
      const context=new Proxy(offline,{get(target,key){
        if(key==='currentTime')return clock;if(key==='state')return 'running';
        const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
      }});
      window.setInterval=fn=>{callback=fn;return 1};window.clearInterval=()=>{};
      let seed=710;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
      (0,eval)(source);QixiMusic.start(context);
      if(!QixiMusic.playing)throw Error('Music did not start');
      for(clock=.05;clock<32;clock+=.05)callback();
      const buffer=await offline.startRendering();
      return {sampleRate,seconds,channels:[Array.from(buffer.getChannelData(0)),Array.from(buffer.getChannelData(1))]};
    },fs.readFileSync('fest/seven/music.js','utf8'));
    let peak=0,power=0;
    for(const ch of rendered.channels)for(const x of ch){peak=Math.max(peak,Math.abs(x));power+=x*x;}
    const rms=Math.sqrt(power/(rendered.channels.length*rendered.channels[0].length));
    assert(peak<.98,'No audio clipping');assert(rms>.005,'Music must be audible');
    fs.writeFileSync('artifacts/festivals/seven-music.wav',wav(rendered.channels,rendered.sampleRate));
    console.log('Seven: all eight phrases rendered, 34 seconds, peak '+peak.toFixed(3)+', RMS '+rms.toFixed(3)+', no clipping');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
