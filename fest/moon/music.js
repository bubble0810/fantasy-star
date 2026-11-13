/* Original synthesized score: moonlit flute/strings/matsuri drums;
   playful Korean-inspired plucked lead and dance percussion for the rabbits. */
(() => {
  'use strict';
  let ctx,master,music,fx,room,noise,timer=0,mode='',step=0,next=0;
  const voices=new Set(),strings=new Map();
  const moonPhrases=[
    [74,null,78,81,83,null,81,78,76,null,74,null,69,74,76,null],
    [78,81,83,null,86,null,83,81,78,null,76,74,76,null,69,null],
    [81,null,83,86,88,null,86,83,81,78,76,null,74,null,69,null],
    [83,null,81,78,76,null,74,null,69,null,71,74,76,null,null,null],
    [71,74,78,null,81,null,78,74,76,null,78,81,83,null,81,null],
    [81,83,86,null,88,86,83,81,78,null,81,78,76,74,69,null],
    [76,null,81,83,81,78,76,null,74,null,76,78,81,null,76,null],
    [78,81,83,81,78,null,76,74,69,null,74,76,74,null,null,null]
  ];
  const rabbitPhrases=[
    [74,81,83,81,78,81,86,null,83,81,78,76,74,null,76,78],
    [78,83,86,83,81,null,78,76,78,81,83,86,88,86,83,null],
    [76,81,83,86,83,81,78,null,76,78,81,83,81,78,76,null],
    [83,null,86,88,86,83,81,78,76,78,81,null,76,74,69,null],
    [71,78,81,83,81,78,74,null,71,74,78,81,83,86,83,81],
    [86,83,81,null,78,81,83,86,88,null,86,83,81,78,76,null],
    [76,81,83,81,78,76,74,69,74,null,78,81,83,81,78,76],
    [78,81,86,83,81,78,76,74,69,74,76,78,74,null,81,null]
  ];
  const harmony=[[50,57,62,66,69],[47,54,59,62,66],[45,52,57,64,69],[50,57,62,64,69],
    [47,54,59,62,66],[50,57,62,66,69],[45,52,57,64,69],[50,57,62,66,69]];
  const hz=n=>440*2**((n-69)/12);
  function init(){
    if(!ctx){
      ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.8;master.connect(FSGame.output(ctx));
      music=ctx.createGain();music.gain.value=.65;music.connect(master);fx=ctx.createGain();fx.gain.value=.85;fx.connect(master);
      room=ctx.createConvolver();const ir=ctx.createBuffer(2,Math.floor(ctx.sampleRate*.65),ctx.sampleRate);
      for(let ch=0;ch<2;ch++){const a=ir.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3)*.18;}room.buffer=ir;
      const wet=ctx.createGain();wet.gain.value=.15;room.connect(wet).connect(master);
      noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const a=noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function env(g,at,attack,duration,vol){g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+duration);}
  function wire(source,gain,pan=0,bus=music,extras=[],reverb=true){
    const p=ctx.createStereoPanner();p.pan.value=pan;gain.connect(p).connect(bus);if(reverb)p.connect(room);
    const voice={source,bus};voices.add(voice);source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();p.disconnect();extras.forEach(n=>n.disconnect());};
  }
  function note(midi,at,duration=.35,vol=.07,type='sine',pan=0,bus=music,end=midi){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz(midi),at);o.frequency.exponentialRampToValueAtTime(hz(end),at+duration);o.connect(g);env(g,at,.012,duration,vol);wire(o,g,pan,bus);o.start(at);o.stop(at+duration+.02);
  }
  function flute(midi,at,duration=.6,vol=.065){
    const o=ctx.createOscillator(),g=ctx.createGain(),v=ctx.createOscillator(),depth=ctx.createGain();
    o.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(6),new Float32Array([0,1,.15,.06,.02,.01])));o.frequency.setValueAtTime(hz(midi)*.985,at);o.frequency.exponentialRampToValueAtTime(hz(midi),at+.08);
    v.frequency.value=4.7;depth.gain.value=hz(midi)*.0025;v.connect(depth).connect(o.frequency);o.connect(g);env(g,at,.055,duration,vol);wire(o,g,-.24,music,[v,depth]);v.start(at);v.stop(at+duration);o.start(at);o.stop(at+duration+.02);
    noiseHit(at,.10,.004,1800,-.25,music);
  }
  function pluck(midi,at,vol=.12,pan=.2,bus=music,bend=false){
    if(!strings.has(midi)){const b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*1.1),ctx.sampleRate),a=b.getChannelData(0),period=Math.round(ctx.sampleRate/hz(midi));for(let i=0;i<a.length;i++)a[i]=i<period?Math.random()*2-1:.497*(a[i-period]+a[i-period+1]);strings.set(midi,b);}
    const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=strings.get(midi);if(bend){s.playbackRate.setValueAtTime(.982,at);s.playbackRate.exponentialRampToValueAtTime(1.015,at+.11);s.playbackRate.linearRampToValueAtTime(1,at+.3);}s.connect(g);env(g,at,.003,1.05,vol);wire(s,g,pan,bus);s.start(at);s.stop(at+1.1);
  }
  function silk(midi,at,vol=.045,pan=.24){
    // A rounder second string voice, with a soft bend and a wooden overtone.
    for(const [ratio,level] of [[1,1],[2,.24],[3,.07]]){
      const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(hz(midi)*ratio*.994,at);o.frequency.exponentialRampToValueAtTime(hz(midi)*ratio,at+.045);o.connect(g);env(g,at,.006,.95,vol*level);wire(o,g,pan);o.start(at);o.stop(at+.97);
    }
  }
  function moonVeil(chord,at,duration){
    // A quiet shared harmonic bed joins flute phrases and both string colours.
    for(const [midi,pan] of [[chord[0]+12,-.18],[chord[1]+12,.18]]){
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=hz(midi);o.connect(g);env(g,at,.42,duration,.012);wire(o,g,pan);o.start(at);o.stop(at+duration+.02);
    }
  }
  function bell(midi,at,vol=.045,bus=music){for(const [ratio,level] of [[1,1],[2.01,.32],[3.98,.13]]){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=hz(midi)*ratio;o.connect(g);env(g,at,.005,.8,vol*level);wire(o,g,.3,bus);o.start(at);o.stop(at+.82);}}
  function noiseHit(at,duration,vol,cutoff=4500,pan=.15,bus=music){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;f.type='bandpass';f.frequency.value=cutoff;f.Q.value=.8;s.connect(f).connect(g);env(g,at,.003,duration,vol);wire(s,g,pan,bus,[f],false);s.start(at,.1);s.stop(at+duration+.01);}
  function drum(at,low=true,vol=.10,bus=music){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(low?155:280,at);o.frequency.exponentialRampToValueAtTime(low?62:135,at+.13);o.connect(g);env(g,at,.003,.25,vol);wire(o,g,low?-.1:.2,bus,[],false);o.start(at);o.stop(at+.27);noiseHit(at,.04,vol*.14,low?850:2300,.1,bus);}
  function gong(at,vol=.025,bus=music){for(const [ratio,level] of [[1,1],[1.52,.4],[2.08,.22]]){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=225*ratio;o.connect(g);env(g,at,.005,1.4,vol*level);wire(o,g,-.2,bus);o.start(at);o.stop(at+1.42);}}
  function arrange(at,unit){
    const phrase=Math.floor(step/16)%8,pos=step%16,cycle=Math.floor(step/128)%2,chord=harmony[phrase],rabbit=mode==='rabbit',midi=(rabbit?rabbitPhrases:moonPhrases)[phrase][pos],bridge=phrase===3||phrase===6;
    if(rabbit){
      // Bright bent plucks, syncopation and contrasting low/high drum strokes.
      if(midi!==null){pluck(midi,at,bridge?.15:.20,pos%2?.22:-.18,music,true);if(pos%4===0)note(midi+12,at,.13,.022,'sine',.22);}
      if(pos%4===0){note(chord[0]-12,at,unit*1.8,.07,'triangle',-.12);drum(at,true,.12);}
      if(pos%4===2){drum(at,false,.075);noiseHit(at,.055,.022,1700,-.2);}
      if(pos%2===1)noiseHit(at,.035,.018,5400,.28);
      if([3,6,11,14].includes(pos))pluck(chord[2+pos%3],at+unit*.5,.075,.35,music,true);
      if(pos===0)chord.slice(1,4).forEach((n,i)=>pluck(n,at+i*.018,.065,-.3));
      if(pos===15&&phrase%2){drum(at,false,.055);drum(at+unit*.5,false,.045);}
      if(pos===0&&[0,4,7].includes(phrase))bell(chord[4]+12,at,.024);
    }else{
      // Interwoven flute, two string colours and the same soft festival pulse.
      if(midi!==null){
        if(pos%2===0){flute(midi,at,unit*(moonPhrases[phrase][(pos+1)%16]===null?2.45:1.65),bridge?.040:.058);silk(midi-12,at+unit*.48,bridge?.025:.037,.22);}
        else{pluck(midi,at,.075,-.18);silk(chord[2+((pos+cycle)%3)],at+unit*.42,.035,.26);}
      }
      if(pos%2===0)pluck(chord[1+(pos/2+cycle)%4],at+.035,bridge?.043:.060,-.25);
      if(pos%8===0){moonVeil(chord,at,unit*8.8);pluck(chord[0],at,.115,-.12);silk(chord[2],at+.025,.045,.2);drum(at,true,.052);}
      if(pos%8===4)drum(at,false,.034);
      if([3,6,11,14].includes(pos)&&!bridge)noiseHit(at+unit*.35,.045,.009,2200,.15);
      if(pos===0&&[0,4,7].includes(phrase))gong(at,.016);
      if(pos===6||pos===12)bell(chord[3]+12,at+unit*.3,bridge?.011:.016);
      if(pos===14&&[1,5,7].includes(phrase))[chord[2],chord[3],chord[4]].forEach((n,i)=>silk(n+12,at+i*unit*.38,.042,-.1+i*.12));
    }
  }
  function tick(){if(!ctx||ctx.state!=='running')return;const unit=60/(mode==='rabbit'?144:96)/2;next=Math.max(next,ctx.currentTime+.01);while(next<ctx.currentTime+.14){arrange(next,unit);next+=unit;step++;}}
  function stop(){clearInterval(timer);timer=0;for(const v of voices)if(v.bus===music){try{v.source.stop();}catch{}}}
  function start(nextMode){stop();mode=nextMode;try{init();step=0;next=ctx.currentTime+.04;timer=setInterval(tick,35);tick();}catch{stop();}}
  function sfx(kind,pan=0){try{init();const t=ctx.currentTime+.005;
    if(kind==='jump')note(67,t,.22,.065,'triangle',pan,fx,81);
    else if(kind==='hide'){noiseHit(t,.24,.04,1400,pan,fx);note(76,t,.25,.06,'sine',pan,fx,52);}
    else if(kind==='catch'){bell(86,t,.065,fx);pluck(81,t,.12,pan,fx);}
    else if(kind==='gold'){[81,86,90,93].forEach((n,i)=>bell(n,t+i*.075,.055,fx));gong(t,.025,fx);}
    else if(kind==='shield'){[81,88].forEach((n,i)=>bell(n,t+i*.06,.055,fx));noiseHit(t,.16,.025,4200,pan,fx);}
    else if(kind==='hit'){drum(t,true,.12,fx);note(64,t,.27,.075,'triangle',pan,fx,52);[86,83,81].forEach((n,i)=>bell(n,t+.09+i*.09,.025,fx));}
    else if(kind==='dodge'){pluck(78,t,.10,pan,fx);pluck(86,t+.07,.08,pan,fx);}
    else if(kind==='miss'){pluck(69,t,.07,pan,fx);pluck(66,t+.09,.05,pan,fx);}
    else if(kind==='ascend'){[74,78,81,86,90].forEach((n,i)=>bell(n,t+i*.105,.04,fx));noiseHit(t,.45,.018,2400,pan,fx);}
    else if(kind==='arrival'||kind==='complete'){[74,78,81,86].forEach((n,i)=>{pluck(n,t+i*.10,.15,pan,fx);bell(n+12,t+.18+i*.10,.035,fx);});gong(t,.035,fx);}
  }catch{}}
  // Action glides use the FX bus, like every other effect.
  const api={start,stop,sfx,get playing(){return !!timer;},get mode(){return mode;}};
  window.MoonAudio=api;
  addEventListener('pagehide',()=>{stop();for(const v of voices){try{v.source.stop();}catch{}}});
})();

