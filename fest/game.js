/* Moon festival draft. Host opening remains controlled by festival-config.js. */
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d'), W = 1024, H = 1536;
const RULES = Object.freeze({ seconds:30, normal:1, gold:3, baseGoldChance:.24, stun:.85, immunity:4, flightMs:2400, hide:1.8, hideEnter:.12, hideExit:.18, jump:.9, exchange:2, cap:60 });
// Randomize once per ascent, never during a moving ring or a retry.
let ringPlan=[];
function randomRing(previous){const pick=Math.floor(Math.random()*(previous?2:3)),bucket=previous?(previous.bucket+1+pick)%3:pick,period=1.05+bucket*.35+Math.random()*.25,width=(.26+Math.random()*.14)/period,min=.20+Math.random()*(.94-width-.20);return Object.freeze({bucket,period,min,max:min+width});}
function ringSpec(){return ringPlan[Math.min(step,7)];}
const RING_VISUAL=Object.freeze({radius:152,travel:116,backdrop:174});
// One geometry drives drawing, landing points and the moving paw hit area.
const RABBIT = Object.freeze({width:180,height:270,jumpHeight:180,pawRatio:.64,dropBelowPeak:.075,hideSafeScale:.35,cakeSize:116,goldSize:132,branchSize:100});
const art = {};
const collisionArt={rabbits:[],items:{}};
const debugCollision=new URLSearchParams(location.search).get('debug')==='1';
let effects=[];
let physicsAt=0;
let moonStartedAt=0,moonElapsedMs=0,goldBonus=0,goldChance=RULES.baseGoldChance;
let mode='intro', stock=0, earned=0, caught=0, hits=0, missed=0, deadline=0, spawnAt=0, items=[], rabbits=[], step=0, ringStart=0, flight=null, nextItem=1, noticeUntil=0;
const lanes=[{x:280,y:1300,sprite:0},{x:512,y:1320,sprite:2},{x:744,y:1300,sprite:1}];
// Seven visible clouds, then the palace: exactly eight successful taps.
const route=[{x:610,y:990},{x:410,y:810},{x:567,y:670},{x:384,y:548},{x:780,y:476},{x:633,y:378},{x:747,y:293},{x:820,y:190}];
const startPosition={x:735,y:1370};
function note(text,now=performance.now()){ $('notice').textContent=text;noticeUntil=now+1500; }
function sound(kind,lane=1){MoonAudio.sfx(kind,(lane-1)*.45);}
function sprite(sheet,col,row,cols,rows,x,y,w,h,alpha=1){const im=art[sheet];if(!im)return;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,col*im.width/cols,row*im.height/rows,im.width/cols,im.height/rows,x,y,w,h);ctx.restore();}
function image(name){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{art[name]=im;resolve();};im.onerror=()=>reject(new Error(name));im.src='img/'+name;});}
function prepareCollisionArt(){
  for(let col=0;col<3;col++)collisionArt.rabbits[col]=MOON_COLLISION_ATLAS.rabbits[col].map(MoonCollision.unpack);
  for(const type of ['normal','gold','branch'])collisionArt.items[type]=MoonCollision.unpack(MOON_COLLISION_ATLAS.items[type]);
}
window.fsQuestionsReady=false;
Promise.all(['rabbit-bg.jpg','moon-bg.jpg','rabbits-alpha-v2.png','moon-atlas-alpha-v2.png'].map(image)).then(()=>{if(!window.MoonAudio||!window.MoonCollision||!window.MOON_COLLISION_ATLAS)throw new Error('必要遊戲程式未載入');prepareCollisionArt();$('go').disabled=false;$('go').textContent='開始中秋挑戰';window.fsQuestionsReady=true;}).catch(e=>{window.fsQuestionsReady=false;$('go').textContent='素材尚未備妥';$('loadStatus').textContent='素材載入失敗，請重新整理或返回。未開始不扣次。';console.error('Moon asset load failed:',e.message);});
for(let i=0;i<3;i++){
  const lane=document.createElement('div');lane.className='lane';lane.style.left=`${lanes[i].x/W*100-11}%`;
  lane.setAttribute('role','group');lane.setAttribute('aria-label',`${['左','中','右'][i]}玉兔，上滑跳接、下滑神隱`);lane.tabIndex=0;
  lane.innerHTML='<span class="swipeHint">↑ 上滑跳接<br>↓ 下滑神隱</span>';
  const pointers=new Map();
  lane.addEventListener('pointerdown',e=>{if(mode!=='rabbit')return;e.preventDefault();lane.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,fired:false});lane.classList.add('touching');});
  const swipe=e=>{const start=pointers.get(e.pointerId);if(!start||start.fired)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dy)<16||Math.abs(dy)<Math.abs(dx)*1.15)return;start.fired=true;act(i,dy<0?'jump':'hide');};
  lane.addEventListener('pointermove',e=>{if(pointers.has(e.pointerId)){e.preventDefault();swipe(e);}});
  const release=e=>{pointers.delete(e.pointerId);if(!pointers.size)lane.classList.remove('touching');};
  lane.addEventListener('pointerup',e=>{swipe(e);release(e);});lane.addEventListener('pointercancel',release);lane.addEventListener('lostpointercapture',release);
  lane.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();if(!e.repeat)act(i,e.key==='ArrowUp'?'jump':'hide');}});
  $('laneControls').append(lane);
}
function begin(){stock=earned=caught=hits=missed=0;items=[];effects=[];rabbits=[];moonElapsedMs=goldBonus=0;goldChance=RULES.baseGoldChance;$('intro').hidden=true;startMoon();}
function startRabbits(){if(mode!=='between')return;const now=performance.now();rabbits=lanes.map(p=>({...p,state:'idle',since:now,catchUntil:0,immuneUntil:0}));deadline=now+RULES.seconds*1000;physicsAt=now;spawnAt=now+900;mode='rabbit';MoonAudio.start('rabbit');$('between').hidden=true;$('laneControls').hidden=false;$('caption').textContent=`第二關・玉兔接月餅｜金月機率 +${Math.round(goldBonus*100)}%`;$('hint').textContent='兔子軌道上滑跳接・下滑神隱｜A S D 跳・Z X C 隱';note('看準落點，三隻玉兔一起守月餅！',now);update(now);}
function moonBonus(elapsedMs){return elapsedMs<=30000?.50:elapsedMs<=60000?.30:elapsedMs<=90000?.10:0;}
function percent(chance){return `${Number((chance*100).toFixed(1))}%`;}
function finishMoon(completedAt){MoonAudio.stop();sound('arrival');moonElapsedMs=Math.max(0,completedAt-moonStartedAt);goldBonus=moonBonus(moonElapsedMs);goldChance=Math.min(1,RULES.baseGoldChance*(1+goldBonus));mode='between';$('moonTap').hidden=true;$('between').hidden=false;$('timeChip').textContent='奔月完成';$('rabbitSummary').textContent=`奔月用時 ${(moonElapsedMs/1000).toFixed(1)} 秒，第二關金色月餅機率相對 +${Math.round(goldBonus*100)}%（${percent(RULES.baseGoldChance)} → ${percent(goldChance)}）。`;$('hint').textContent='準備好後，開始 30 秒玉兔挑戰';$('notice').textContent='';}
function act(lane,action){const now=performance.now();if(mode!=='rabbit')return;update(now);if(mode!=='rabbit')return;const r=rabbits[lane];if(r.state!=='idle')return;r.state=action;r.since=now;r.hideExtra=0;sound(action==='jump'?'jump':'hide',lane);}
function stateAt(r,now){if(r.state==='idle')return 'idle';const limit=r.state==='jump'?RULES.jump:r.state==='hide'?RULES.hide+(r.hideExtra||0):RULES.stun;return (now-r.since)/1000<limit?r.state:'idle';}
function dropTarget(lane,type){const feet=lanes[lane].y;return type==='branch'?feet-RABBIT.height*.34:feet-RABBIT.jumpHeight*(1-RABBIT.dropBelowPeak)-RABBIT.height*RABBIT.pawRatio;}
function rabbitPose(r,now){const state=stateAt(r,now),t=Math.max(0,(now-r.since)/1000),lift=state==='jump'?RABBIT.jumpHeight*Math.sin(Math.PI*Math.min(1,t/RULES.jump)):state==='stun'?(r.stunLift||0)*Math.max(0,1-t/.22):0,veil=state==='hide'?Math.max(0,Math.min(1,t/RULES.hideEnter,(RULES.hide+(r.hideExtra||0)-t)/RULES.hideExit)):0,scale=state==='stun'?1-((1-(r.stunScale??1))*Math.max(0,1-t/.12)):1-.85*veil;return {state,t,lift,scale,alpha:state==='stun'?1:1-veil,pawY:r.y-RABBIT.height*RABBIT.pawRatio-lift,hidden:state==='hide'&&scale<=RABBIT.hideSafeScale};}
function rabbitShape(r,now){
  const pose=rabbitPose(r,now),row=pose.state==='jump'?(now<r.catchUntil?2:1):pose.state==='stun'&&pose.lift>0?1:0,w=RABBIT.width*pose.scale,h=RABBIT.height*pose.scale,shake=pose.state==='stun'?Math.sin(pose.t*45)*8:0,x=r.x-w/2+shake,y=r.y-h-pose.lift;
  // Calibrated to the forepaws in each source sprite, including the mirrored pink rabbit.
  const center=r.sprite===0?.74:r.sprite===1?.26:.50,cy=row===2?.35:r.sprite===2?.44:.43;
  return {x,y,w,h,mask:collisionArt.rabbits[r.sprite][row],row,pose,hands:{x:x+w*center,y:y+h*cy,rx:w*(r.sprite===2?.35:.28),ry:h*.17}};
}
function dropShape(it,now){const size=it.type==='branch'?RABBIT.branchSize:it.type==='gold'?RABBIT.goldSize:RABBIT.cakeSize,p=dropProgress(it,now);return {x:(it.x??lanes[it.lane].x)-size/2,y:310+(it.target-310)*p-size/2,w:size,h:size,mask:collisionArt.items[it.type]};}
function contactPoint(it,now){const r=rabbits[it.lane],shape=rabbitShape(r,now);if(it.type==='branch'){if(shape.pose.hidden)return null;return MoonCollision.overlap(dropShape(it,now),shape);}if(shape.pose.state!=='jump')return null;return MoonCollision.overlap(dropShape(it,now),shape,shape.hands);}
function holdHideUntilClear(now){for(let lane=0;lane<rabbits.length;lane++){
  const r=rabbits[lane],age=(now-r.since)/1000,end=RULES.hide+(r.hideExtra||0);
  if(r.state!=='hide'||age<end-RULES.hideExit||age>end)continue;
  const passing=items.some(it=>{if(it.type!=='branch'||it.lane!==lane||it.resolved||now<it.born)return false;const b=MoonCollision.bounds(dropShape(it,now));return b.bottom>=r.y-RABBIT.height-80&&b.top<=r.y&&b.right>=r.x-RABBIT.width/2&&b.left<=r.x+RABBIT.width/2;});
  if(passing)r.hideExtra=Math.max(r.hideExtra||0,age+RULES.hideExit+.016-RULES.hide);
}}
function spawn(now){const lane=Math.floor(Math.random()*3);const branch=Math.random()<.29;const gold=!branch&&Math.random()<goldChance;const type=branch?'branch':gold?'gold':'normal';items.push({id:nextItem++,lane,type,born:now,travel:branch?2100:1600+Math.random()*800,pace:branch?0:(Math.random()-.5)*.44,target:dropTarget(lane,type),resolved:false});}
function dropProgress(it,now){const p=Math.max(0,Math.min(it.type==='branch'?1.21:1,(now-it.born)/it.travel));return p+(it.pace||0)*Math.sin(p*Math.PI*2)/(Math.PI*2);}
function resolveItem(it,now,point){const r=rabbits[it.lane],pose=rabbitPose(r,now),state=pose.state;
  if(it.type==='branch'){
    if(pose.hidden){note('神隱成功！',now);sound('dodge',it.lane);return;}
    if(now<r.immuneUntil){burst(r.x,r.y-RABBIT.height*.5,'shield','護罩擋住了！',now);note('金月守護！免暈眩',now);sound('shield',it.lane);return;}
    hits++;r.stunLift=pose.lift;r.stunScale=pose.scale;r.state='stun';r.since=now;burst(point?.x??r.x,point?.y??dropTarget(it.lane,'branch'),'impact','暈眩！',now);note('桂枝碰到了！暫時無法跳接或神隱',now);sound('hit',it.lane);
  }else if(state==='jump'&&point){const gold=it.type==='gold',value=gold?RULES.gold:RULES.normal;stock+=value;caught++;r.catchUntil=now+280;if(gold)r.immuneUntil=now+RULES.immunity*1000;burst(point.x,point.y,gold?'gold':'catch',gold?`＋3・守護 ${RULES.immunity} 秒`:'＋1',now);note(gold?'金月餅 ＋3！獲得免暈眩守護':'接到了！月餅 ＋1',now);sound(gold?'gold':'catch',it.lane);}
  else missed++;
}
function nextContact(it,from,to){
  if(it.resolved||it.born>to)return null;
  const end=it.born+it.travel+(it.type==='branch'?350:0),limit=Math.min(to,end),start=Math.max(from,it.born);
  const hit=start<=limit?MoonCollision.firstContact(t=>contactPoint(it,t),start,limit):null;
  if(hit)return {...hit,item:it,kind:'contact'};
  return end<=to?{at:Math.max(start,end),item:it,kind:'expire'}:null;
}
function advanceContacts(until){
  while(physicsAt<until){const end=Math.min(until,physicsAt+4);holdHideUntilClear(end);let cursor=physicsAt;
    for(let remaining=items.length;remaining>0;remaining--){const events=items.map(it=>nextContact(it,cursor,end)).filter(Boolean).sort(MoonCollision.order),event=events[0];if(!event)break;
      const it=event.item;cursor=event.at;it.resolved=true;it.contactAt=event.at;it.contactPoint=event.point||null;
      if(event.kind==='contact')resolveItem(it,event.at,event.point);
      else if(it.type!=='branch')missed++;
      else{note('神隱成功！',event.at);sound('dodge',it.lane);}
      // Recompute following contacts after a stun or a newly granted gold shield.
    }
    physicsAt=end;
  }
}
function update(now){
  if(mode==='rabbit'){
    const until=Math.min(now,deadline);
    advanceContacts(until);
    items=items.filter(it=>it.type==='branch'?until<it.born+it.travel+350:!it.resolved&&until<it.born+it.travel);
    rabbits.forEach(r=>{r.state=stateAt(r,until);});
    if(now>=deadline){stock=Math.max(0,stock);earned=Math.min(RULES.cap,stock*RULES.exchange);items=[];$('laneControls').hidden=true;finish();}
    else{if(now>=spawnAt){spawn(now);spawnAt=now+820+Math.random()*200;}$('timeChip').textContent=`${Math.ceil((deadline-now)/1000)} 秒`;}
  }else if(mode==='moon'){
    if(flight&&now>=flight.until){const completedAt=flight.until;flight=null;if(step===8){finishMoon(completedAt);return;}ringStart=now;}
    $('timeChip').textContent=`${Math.floor((now-moonStartedAt)/1000)}秒 · ${step}/8`;
  }
  $('stock').textContent=stock;
}
function startMoon(){MoonAudio.start('moon');ringPlan=[randomRing()];mode='moon';step=0;flight=null;ringStart=moonStartedAt=performance.now();$('between').hidden=true;$('laneControls').hidden=true;$('moonTap').hidden=false;$('caption').textContent='第一關・嫦娥奔月｜金色範圍亮起就點一下';$('hint').textContent='30秒內 +50%・60秒內 +30%・90秒內 +10%';note('光圈進入金色範圍，就能出發！');update(moonStartedAt);}
function ringProgress(now){const {period}=ringSpec();return ((now-ringStart)/1000%period)/period;}
function judge(){const now=performance.now();if(mode!=='moon'||flight)return;const p=ringProgress(now),spec=ringSpec();if(p>=spec.min&&p<=spec.max){const from=step===0?startPosition:route[step-1],to=route[step];flight={from,to,born:now,until:now+RULES.flightMs};step++;if(step<8)ringPlan[step]=randomRing(spec);note(step===8?'月宮就在眼前！':`月華引路・第 ${step} 次飛升`);sound('ascend');}else{note('差一點點，等金色範圍亮起再試！');sound('miss');}}
function finish(){if(mode==='result')return;MoonAudio.stop();sound('complete');mode='result';$('moonTap').hidden=true;$('hint').textContent='';$('result').hidden=false;$('caption').textContent='月宮團圓・中秋月華祭';$('timeChip').textContent='挑戰完成';$('summary').innerHTML=`<div class="stat">守住的月餅<strong>${stock} 顆</strong></div><div class="stat">本局活動月餅<strong>🥮 ${earned}</strong></div><p>奔月 ${(moonElapsedMs/1000).toFixed(1)} 秒・金月機率 +${Math.round(goldBonus*100)}%<br>接取 ${caught} 次・碰枝 ${hits} 次</p><p class="rules">月餅存量 × ${RULES.exchange}，每局最多 ${RULES.cap} 活動月餅。</p>`;fsReport(earned);}
function background(name){if(art[name])ctx.drawImage(art[name],0,0,W,H);}
function text(str,x,y,size=28,color='#ffebbe'){ctx.save();ctx.fillStyle=color;ctx.textAlign='center';ctx.font=`900 ${size}px "Microsoft JhengHei",sans-serif`;ctx.shadowColor='#20132e';ctx.shadowBlur=9;ctx.fillText(str,x,y);ctx.restore();}
function burst(x,y,kind,label,now){const count=kind==='gold'?28:16;effects.push({x,y,kind,label,born:now,life:1100,particles:Array.from({length:count},(_,i)=>({angle:i/count*Math.PI*2,speed:45+Math.random()*95,radius:3+Math.random()*4}))});}
function drawEffects(now){effects=effects.filter(e=>now-e.born<e.life);for(const e of effects){const u=Math.max(0,(now-e.born)/e.life),color=e.kind==='impact'?'#e5c3ff':e.kind==='catch'?'#fff0c5':'#ffe287';ctx.save();ctx.globalAlpha=1-u;ctx.strokeStyle=color;ctx.lineWidth=e.kind==='impact'?7:4;ctx.shadowColor=color;ctx.shadowBlur=16;ctx.beginPath();ctx.arc(e.x,e.y,18+u*(e.kind==='gold'?120:85),0,Math.PI*2);ctx.stroke();for(const p of e.particles){const dist=p.speed*u*1.7;ctx.fillStyle=color;ctx.beginPath();const x=e.x+Math.cos(p.angle)*dist,y=e.y+Math.sin(p.angle)*dist-u*45;ctx.arc(x,y,p.radius*(1-u*.6),0,Math.PI*2);ctx.fill();}text(e.label,e.x,e.y-40-u*85,e.kind==='gold'?32:34,color);ctx.restore();}}
function drawRabbits(now){background('rabbit-bg.jpg');
  for(const it of items){const s=dropShape(it,now);sprite('moon-atlas-alpha-v2.png',it.type==='branch'?3:it.type==='gold'?2:1,1,4,2,s.x,s.y,s.w,s.h);}
  rabbits.forEach((r,i)=>{const {state,t,lift,alpha}=rabbitPose(r,now);const dy=-lift;
    if(state==='hide'){const u=1-alpha;ctx.save();ctx.strokeStyle='#f9d998';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(r.x,r.y-8,RABBIT.width*(.33+.13*u),14,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    const shape=rabbitShape(r,now);sprite('rabbits-alpha-v2.png',r.sprite,shape.row,3,3,shape.x,shape.y,shape.w,shape.h,alpha);
    if(now<r.immuneUntil){ctx.save();ctx.globalAlpha=.65;ctx.strokeStyle='#ffe18b';ctx.lineWidth=5;ctx.shadowColor='#ffd25c';ctx.shadowBlur=24;ctx.beginPath();ctx.ellipse(r.x,r.y-RABBIT.height*.48+dy,RABBIT.width*.58,RABBIT.height*.53,0,0,Math.PI*2);ctx.stroke();ctx.restore();text(`免暈 ${Math.ceil((r.immuneUntil-now)/1000)} 秒`,r.x,r.y-RABBIT.height-20+dy,25,'#ffe59a');}
    if(state==='stun'){for(let star=0;star<3;star++){const angle=t*7+star*Math.PI*2/3;text('✦',r.x+Math.cos(angle)*55,r.y-RABBIT.height+Math.sin(angle)*14,26,'#efc9ff');}}
    const control=$('laneControls').children[i];control.classList.toggle('stunned',state==='stun');control.querySelector('.swipeHint').innerHTML=state==='stun'?'暈眩中…<br>稍等一下':'↑ 上滑跳接<br>↓ 下滑神隱';
  });
  drawEffects(now);
  if(debugCollision)drawCollisionDebug(now);
}
function drawCollisionDebug(now){ctx.save();ctx.lineWidth=2;
  for(const r of rabbits){const s=rabbitShape(r,now),b=MoonCollision.bounds(s);ctx.strokeStyle=s.pose.hidden?'#72ffe0':'#76d6ff';ctx.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);ctx.strokeStyle='#8fff7f';ctx.beginPath();ctx.ellipse(s.hands.x,s.hands.y,s.hands.rx,s.hands.ry,0,0,Math.PI*2);ctx.stroke();}
  for(const it of items){const b=MoonCollision.bounds(dropShape(it,now));ctx.strokeStyle=it.type==='branch'?'#ff7797':'#ffe37e';ctx.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);if(it.contactPoint){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(it.contactPoint.x,it.contactPoint.y,5,0,Math.PI*2);ctx.fill();}}
  ctx.setLineDash([9,7]);for(let i=0;i<3;i++){ctx.strokeStyle='#ffea79';ctx.beginPath();ctx.moveTo(lanes[i].x-85,dropTarget(i,'normal'));ctx.lineTo(lanes[i].x+85,dropTarget(i,'normal'));ctx.stroke();}ctx.restore();
}
// A gently winding ascending path; no ballistic jump or landing bounce.
function flightPose(f,u){const ease=u*u*(3-2*u);return {x:f.from.x+(f.to.x-f.from.x)*ease+Math.sin(u*Math.PI*2)*14,y:f.from.y+(f.to.y-f.from.y)*ease,progress:(step-1+ease)/8};}
function drawMoon(now){background('moon-bg.jpg');let pos=step===0?startPosition:route[step-1],progress=step/8,poses=step===8?[[0,1,1]]:step===0?[[0,0,1]]:[[3,0,1]];
  if(flight){const u=Math.max(0,Math.min(1,(now-flight.born)/(flight.until-flight.born))),p=flightPose(flight,u);pos=p;progress=p.progress;
    // Blended silhouettes turn the pose change into a soft transformation.
    const frames=[[step===1?0:3,0],[1,0],[2,0],[step===8?0:3,step===8?1:0]],f=u*3,index=Math.min(2,Math.floor(f)),mix=f-index;poses=[[...frames[index],1-mix],[...frames[index+1],mix]];
    ctx.save();ctx.lineCap='round';for(let ribbon=0;ribbon<2;ribbon++){ctx.beginPath();for(let k=0;k<=18;k++){const v=Math.max(0,u-.35)+Math.min(u,.35)*k/18,q=flightPose(flight,v),height=350-q.progress*210,x=q.x+Math.sin(v*16+now/900+ribbon*2)*12,y=q.y-height*.3+ribbon*14;k===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.strokeStyle=ribbon?'#e0b3ff88':'#ffe4a8aa';ctx.lineWidth=ribbon?4:8;ctx.shadowColor=ribbon?'#d9aaff':'#ffdfa0';ctx.shadowBlur=18;ctx.stroke();}ctx.restore();
  }
  const h=350-progress*210,w=h*.86,bob=Math.sin(now/900)*9;
  ctx.save();const halo=ctx.createRadialGradient(pos.x,pos.y-h*.48,5,pos.x,pos.y-h*.48,h*.65);halo.addColorStop(0,'#ffe5ac30');halo.addColorStop(1,'#edc7ff00');ctx.fillStyle=halo;ctx.fillRect(pos.x-h,pos.y-h*1.5,h*2,h*2);ctx.restore();
  for(const [col,row,alpha] of poses)sprite('moon-atlas-alpha-v2.png',col,row,4,2,pos.x-w/2+Math.sin(now/1300)*5,pos.y-h+bob,w,h,alpha);
  if(step<8&&!flight){const target=route[step];ctx.save();ctx.strokeStyle='#ffe7a5';ctx.lineWidth=5;ctx.setLineDash([10,12]);ctx.beginPath();ctx.ellipse(target.x,target.y-10,65,18,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    const p=ringProgress(now),spec=ringSpec(),cx=265,cy=1130,outer=RING_VISUAL.radius-p*RING_VISUAL.travel,good=p>=spec.min&&p<=spec.max;
    ctx.save();ctx.fillStyle='#110e32b8';ctx.beginPath();ctx.arc(cx,cy,RING_VISUAL.backdrop,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=good?'#ffdf77aa':'#b38d464f';ctx.lineWidth=RING_VISUAL.travel*(spec.max-spec.min);ctx.beginPath();ctx.arc(cx,cy,RING_VISUAL.radius-RING_VISUAL.travel*(spec.min+spec.max)/2,0,Math.PI*2);ctx.stroke();
    for(const edge of [spec.min,spec.max]){ctx.strokeStyle='#ffe09c';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(cx,cy,RING_VISUAL.radius-RING_VISUAL.travel*edge,0,Math.PI*2);ctx.stroke();}
    ctx.strokeStyle=good?'#fff8bd':'#fff5e7';ctx.lineWidth=7;ctx.shadowColor='#ffe2aa';ctx.shadowBlur=good?20:0;ctx.beginPath();ctx.arc(cx,cy,outer,0,Math.PI*2);ctx.stroke();ctx.restore();text(good?'現在點！':'等光圈縮入金框',cx,cy+8,good?30:23);text(`${step}/8 次飛升`,cx,cy+156,25);
  }
}
function loop(now){update(now);ctx.clearRect(0,0,W,H);if(['moon','between'].includes(mode))drawMoon(now);else if(mode==='intro')background('moon-bg.jpg');else drawRabbits(now);if(now>noticeUntil)$('notice').textContent='';requestAnimationFrame(loop);}
$('go').addEventListener('click',begin);$('next').addEventListener('click',startRabbits);$('moonTap').addEventListener('click',judge);canvas.addEventListener('pointerdown',judge);
addEventListener('keydown',e=>{if(e.repeat)return;if(mode==='rabbit'){const k=e.key.toLowerCase(),up='asd',down='zxc';if(up.includes(k)||down.includes(k)){e.preventDefault();act(up.includes(k)?up.indexOf(k):down.indexOf(k),up.includes(k)?'jump':'hide');}}else if(mode==='moon'&&e.code==='Space'){e.preventDefault();judge();}});
requestAnimationFrame(loop);










