/* ===== 幻想智慧星：節慶小遊戲模組 =====
   每個節慶遊戲是 fest/ 資料夾裡的獨立網頁，在遊戲上方開啟；
   玩完回報拿到的節慶貨幣，這裡負責：每日次數、貨幣、兌換商店、活動結束自動換星星糖。 */
window.GAMEF={
  halloween:{n:'萬聖節',title:'找小幽靈',cur:'萬聖糖果',ic:'🍬',runs:3,look:240,room:300,url:'fest/halloween/index.html',home:'SP01',lk:'SP01'},
  xmas:     {n:'聖誕節',title:'聖誕滑雪橇',cur:'聖誕襪',ic:'🧦',runs:5,look:180,room:220,url:'fest/xmas/index.html',home:'SP02',lk:'SP02'},
  newyear:  {n:'春節',title:'趕年獸・搶紅包',cur:'紅包',ic:'🧧',runs:3,look:320,room:400,url:'fest/newyear/index.html',home:'SP03',lk:'SP03'}
};
const FG_RATE=3;   // 1 個節慶貨幣 = 3 顆星星糖
const TRIAL_PRICE=50;   // 星宮體驗館：每個遊戲每天體驗 1 次的價格（星星糖）
const TRIAL_COVER={   // 體驗館卡片圖：直接用各節慶遊戲的場景圖裁一段（第二個值＝從上往下的位置）
  halloween:['fest/halloween/img/scene1.webp','5%'],xmas:['fest/xmas/img/bg_slope.webp','0%'],newyear:['fest/newyear/img/scene1.webp','62%']};
const TRIAL_SOON=[['children','兒童節','🎈'],['dragon','端午節','🐉'],['qixi','七夕','💞'],['moon','中秋節','🥮'],['national','國慶日','🎆']];   // 還沒做好的節慶遊戲
(function(){
const css=document.createElement('style');css.textContent=`
.fg-hero{position:relative;border-radius:16px;overflow:hidden;aspect-ratio:3/2;background:#2a1d4a}
.fg-hero img{width:100%;height:100%;object-fit:cover;display:block}
.fg-hero div{position:absolute;left:10px;right:10px;bottom:10px;background:#ffffffeb;border-radius:14px;padding:8px 12px;display:flex;flex-direction:column;gap:2px}
.fg-hero b{font-family:var(--display);font-weight:400;font-size:1.3rem;color:var(--berry)}
.fg-hero small{color:var(--muted)}
.fg-bal{display:flex;justify-content:space-between;align-items:center;background:#fff5e0;border-radius:12px;padding:8px 12px;margin:10px 0;font-weight:700}
.fg-bal span{font-size:1.4rem;color:#b7811a}
.fg-shop{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.fg-item{border:2px solid var(--line);border-radius:14px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.fg-item img{height:84px;max-width:100%;object-fit:contain}
.fg-item.room img{width:100%;height:70px;object-fit:cover;border-radius:8px}
.fg-item b{font-size:.9rem}.fg-item small{color:var(--muted);font-size:.75rem}
#fgFrame{position:fixed;top:0;bottom:0;left:var(--fl,0);right:var(--fl,0);z-index:5000;background:#000}
.tp-entry{display:flex;align-items:center;gap:12px;border:2px solid #d9c6f2;border-radius:16px;padding:10px 12px;background:linear-gradient(120deg,#efe4ff,#ffe9f4);width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;margin-bottom:12px}
.tp-entry .ic{font-size:2rem;line-height:1}
.tp-entry b{font-family:var(--display);font-weight:400;font-size:1.15rem;color:#6b3fa0;display:block}
.tp-entry small{color:var(--muted);font-size:.78rem}
.tp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tp-card{border:2px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;background:#fff}
.tp-card .pic{aspect-ratio:3/2;background:#efe4ff center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:2.4rem}
.tp-card .tx{padding:8px;display:flex;flex-direction:column;gap:3px;flex:1}
.tp-card b{font-size:.95rem}.tp-card small{color:var(--muted);font-size:.74rem}
.tp-card .tagx{align-self:flex-start;font-size:.68rem;background:#efe4ff;color:#6b3fa0;border-radius:99px;padding:1px 8px}
.tp-card.soon{opacity:.6}
.tp-card .act{margin-top:auto}
#fgFrame iframe{width:100%;height:100%;border:0;display:block}
`;document.head.appendChild(css);

function FS(k){
  S.fest=S.fest||{};const f=S.fest[k]=S.fest[k]||{c:0,day:'',left:0};
  const d=new Date().toDateString();if(f.day!==d){f.day=d;f.left=GAMEF[k].runs}
  if(k==='halloween'&&!f.mig){f.mig=1;if(S.hw&&S.hw.c){f.c+=S.hw.c;S.hw.c=0}}   // 舊版萬聖糖果併過來
  return f;
}
const FE=k=>FESTS.find(f=>f.k===k);
const onNow=k=>{try{return festState(FE(k)).on}catch(e){return false}};
const lookId=k=>'L-'+(S.char==='m'?'M':'F')+GAMEF[k].lk;

/* 舞台上的節慶徽章 */
window.stBadge=function(){try{return Object.keys(GAMEF).filter(onNow).map(k=>{const g=GAMEF[k],f=FS(k);
  return `<button class="stbadge" data-fgo="${k}" aria-label="${g.n}・${g.title}，今天剩 ${f.left} 次">${g.ic} ${g.n}<small>剩${f.left}</small></button>`}).join('')}catch(e){return ''}};
window.hwMenu=()=>festMenu('halloween');
document.addEventListener('click',e=>{const b=e.target.closest('[data-fgo]');if(b){e.preventDefault();e.stopPropagation();festMenu(b.dataset.fgo)}},true);

/* 節慶活動頁 */
window.festMenu=function(k){
  const g=GAMEF[k],F=FE(k);if(!g||!F)return;
  if(!onNow(k)){toast(`${g.n}活動目前沒有開放喔`);return}
  const f=FS(k),st=festState(F),days=Math.max(1,Math.ceil((st.end-Date.now())/864e5));
  try{SND.setTheme(k)}catch(e){}
  const look=ITEMS.find(i=>i.id===lookId(k)),home=HOMES.find(h=>h.id===g.home);
  const hasL=S.items.includes(lookId(k)),hasR=(S.homes||[]).includes(g.home);
  const shop=[
    {id:'look',cls:'',img:`outfits/${(S.char==='m'?'M':'F')+g.lk}.webp`,n:look?look.n:'節慶套裝',d:'SP'+g.lk.slice(2)+' 節慶專屬造型',c:g.look,own:hasL},
    {id:'room',cls:'room',img:home?home.img:'',n:home?home.n:'節慶小屋',d:'RSP'+g.home.slice(2)+' 不用等級，直接搬進去',c:g.room,own:hasR},
    {id:'stars',cls:'',img:'',n:'星星糖 300',d:'馬上拿到 300 星星糖',c:Math.ceil(300/FG_RATE),own:false},
    {id:'dice',cls:'',img:'',n:'骰子加碼券 ×2',d:'家園骰子多擲 2 次',c:20,own:false}];
  openSheet(head(`${g.ic} ${g.n}特別活動`)+`
    <div class="fg-hero"><img src="${home?home.img:''}" alt=""><div><b>${g.title}</b><small>活動到 ${fmtMD(st.end)}・還剩 ${days} 天・今天還能玩 ${f.left} 次</small></div></div>
    <div class="fg-bal">${g.ic} 我的${g.cur}<span>${f.c}</span></div>
    <button class="big" id="fgGo" style="width:100%" ${f.left<=0?'disabled':''}>${f.left>0?`出發！（今天還剩 ${f.left} 次）`:'今天的次數用完了，明天再來！'}</button>
    <h3 style="margin:14px 0 0">${g.cur}兌換所</h3>
    <p class="hint">${g.cur}只能在活動期間使用，${fmtMD(st.end)} 活動結束後，剩下的會自動換成星星糖（1 個 = ${FG_RATE} 顆）。</p>
    <div class="fg-shop">${shop.map(x=>`<div class="fg-item ${x.cls}">${x.img?`<img src="${x.img}" alt="">`:`<div style="font-size:42px;line-height:84px">${x.id==='stars'?'⭐':'🎲'}</div>`}
      <b>${x.n}</b><small>${x.d}</small>
      ${x.own?'<button class="act" disabled>已擁有</button>':`<button class="act buy" data-fx="${x.id}" ${f.c<x.c?'disabled':''}>${g.ic} ${x.c}</button>`}</div>`).join('')}</div>`);
  document.getElementById('fgGo').onclick=()=>launch(k);
  document.querySelectorAll('[data-fx]').forEach(b=>b.onclick=()=>{const x=shop.find(s=>s.id===b.dataset.fx),f=FS(k);if(!x||f.c<x.c||x.own)return;
    f.c-=x.c;window.FSTAT&&FSTAT('fx:'+k+':'+x.id);
    if(x.id==='look'){if(!S.items.includes(lookId(k)))S.items.push(lookId(k))}
    else if(x.id==='room'){if(!S.homes.includes(g.home))S.homes.push(g.home)}
    else if(x.id==='stars')S.candy+=300;
    else if(x.id==='dice')S.diceBonus=(S.diceBonus||0)+2;
    save();toast(`兌換成功：${x.n}`);try{SND.play('coin')}catch(e){}festMenu(k);render();stage(true)});
};

/* 開啟節慶遊戲 */
let cur=null;
function launch(k,trial){
  if(!trial){const f=FS(k);if(f.left<=0)return;f.left--;window.FSTAT&&FSTAT('f:'+k);save()}
  closeQuiz();try{SND.pause()}catch(e){}try{if(trial)SND.setTheme(k)}catch(e){}
  const box=document.createElement('div');box.id='fgFrame';
  box.innerHTML=`<iframe src="${GAMEF[k].url}?embed=1&char=${S.char||'f'}${trial?'&trial=1':''}" title="${GAMEF[k].title}" allow="autoplay"></iframe>`;
  document.body.appendChild(box);cur={k,frame:box.querySelector('iframe'),got:false,trial:!!trial};
}

/* ===== 🏰 星宮體驗館：每個節慶遊戲每天花星星糖體驗 1 次，沒有任何獎勵，不影響節慶活動 ===== */
function TS(){const d=new Date().toDateString();if(!S.trial||S.trial.day!==d)S.trial={day:d,used:{}};S.trial.used=S.trial.used||{};return S.trial}
window.starPalace=function(){
  const t=TS();
  const cards=Object.keys(GAMEF).map(k=>{const g=GAMEF[k],home=HOMES.find(h=>h.id===g.home),used=!!t.used[k];
    const cv=TRIAL_COVER[k]||(home&&home.img?[home.img,'50%']:null);
    return `<div class="tp-card"><div class="pic" style="${cv?`background-image:url('${cv[0]}');background-position:50% ${cv[1]}`:''}">${cv?'':g.ic}</div><div class="tx">
      <b>${g.ic} ${g.n}・${g.title}</b><span class="tagx">體驗模式・沒有獎勵</span>
      ${used?'<button class="act" disabled>今天已體驗</button>':`<button class="act buy" data-tp="${k}" ${S.candy<TRIAL_PRICE?'disabled':''}>⭐ ${TRIAL_PRICE} 體驗一次</button>`}</div></div>`}).join('')
   +TRIAL_SOON.map(([k,n,ic])=>`<div class="tp-card soon"><div class="pic">${ic}</div><div class="tx"><b>${ic} ${n}</b><span class="tagx">敬請期待</span><button class="act" disabled>還沒開放</button></div></div>`).join('');
  openSheet(head('🏰 星宮體驗館')+`<p class="hint">八大節慶的小遊戲都可以在這裡體驗！每個遊戲每天可以體驗 1 次，每次 ${TRIAL_PRICE} 顆星星糖。<br>體驗模式<b>沒有任何獎勵</b>，也不會用掉節慶活動的次數。</p>
    <div class="fg-bal">⭐ 我的星星糖<span>${S.candy}</span></div><div class="tp-grid">${cards}</div>`);
  document.querySelectorAll('[data-tp]').forEach(b=>b.onclick=()=>{const k=b.dataset.tp,g=GAMEF[k],t=TS();
    if(t.used[k]||S.candy<TRIAL_PRICE)return;
    if(!confirm(`花 ${TRIAL_PRICE} 顆星星糖體驗「${g.title}」一次？\n體驗模式沒有任何獎勵喔！`))return;
    S.candy-=TRIAL_PRICE;t.used[k]=1;window.FSTAT&&FSTAT('t:'+k);save();render();launch(k,true)});
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-tpgo]');if(b){e.preventDefault();starPalace()}});
addEventListener('message',e=>{
  if(!cur||e.source!==cur.frame.contentWindow)return;const d=e.data||{};
  if(d.fsGame&&!cur.got){cur.got=true;if(cur.trial)return;const n=Math.max(0,Math.min(500,d.earned|0)),f=FS(cur.k);f.c+=n;window.FSTAT&&FSTAT('fc:'+cur.k,n);save();}
  if(d.fsClose){const k=cur.k,n=cur.got,cur0trial=cur.trial;document.getElementById('fgFrame')?.remove();cur=null;try{SND.resume()}catch(e){}
    render();stage();if(cur0trial)starPalace();else festMenu(k)}
});

/* 活動結束：剩下的貨幣自動換成星星糖 */
let checking=false;
function convert(){
  if(checking||!S||!S.fest)return;checking=true;
  const done=[];
  for(const k of Object.keys(GAMEF)){const f=S.fest[k];if(!f||!(f.c>0)||onNow(k))continue;
    const stars=f.c*FG_RATE;done.push(`${GAMEF[k].n}的 ${f.c} 個${GAMEF[k].cur} → ${stars} 顆星星糖`);S.candy+=stars;f.c=0;}
  if(done.length){save();setTimeout(()=>{openSheet(head('🔔 節慶活動結束了')+`<p class="qtext">活動結束了，剩下的節慶貨幣已經自動換成星星糖：</p><ul>${done.map(x=>`<li>${x}</li>`).join('')}</ul><button class="big" style="width:100%" onclick="closeQuiz()">好的</button>`);render()},900)}
  checking=false;
}
const _render=window.render;
window.render=function(){const r=_render.apply(this,arguments);try{convert()}catch(e){}
  return r};
setTimeout(()=>{try{convert();stage()}catch(e){}},500);
})();