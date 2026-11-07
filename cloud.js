Claude
此回應未能載入。

































Cloud · JS
/* ===== 幻想智慧星：雲端模組（登入、雲端存檔、信箱） =====
   接在遊戲主程式後面載入，不改動遊戲本身的玩法。 */
(function(){
if(!window.CLOUD_GATE){
  // 已經填好設定碼、但 Firebase 程式沒載入（網路被擋或太慢）→ 擋住畫面，不讓玩家沒登入就玩
  const cfg=window.FIREBASE_CONFIG||{};
  if(cfg.apiKey&&!/請貼上/.test(cfg.apiKey)){
    const m=document.createElement('div');
    m.style.cssText='position:fixed;inset:0;z-index:9999;background:#f4ecfb;display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML='<div style="background:#fff;border-radius:22px;padding:22px 18px;max-width:400px;width:100%;text-align:center;color:#3b2853;display:flex;flex-direction:column;gap:12px"><div style="font-size:28px;color:#c23258">幻想智慧星</div><p style="margin:0">連不上雲端，暫時不能登入。<br>請確認網路後再試一次。</p><button style="min-height:46px;border:0;border-radius:14px;background:#e2508f;color:#fff;font:inherit;font-size:17px" onclick="location.reload()">重新整理</button></div>';
    document.body.appendChild(m);
  }
  return;
}
const fb=firebase.initializeApp(window.FIREBASE_CONFIG);
const auth=firebase.auth(),db=firebase.firestore(),FV=firebase.firestore.FieldValue;
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);   // 同一台裝置記住登入
 
/* ---------- 帳號密碼 ---------- */
const pwStr=pin=>'fsp-'+pin+'-star';                 // 交給 Firebase 的密碼（Firebase 至少要 6 碼，玩家只要記 4 個數字）
const emailOf=code=>code+'@fantasystar.game';       // 假信箱，不會寄信
/* ---------- 自動登出 ----------
   LOGIN_VER：大更新時改這個日期，所有裝置下次打開都要重新登入（進度在雲端，不會不見）
   AWAY_MIN：關掉或離開遊戲超過幾分鐘，下次打開要重新登入（公用電腦用）
   遊戲開著的時候不會自動登出。 */
const LOGIN_VER='2026-11-07',AWAY_MIN=30;
const K_VER='fs-login-ver',K_SEEN='fs-last-seen';
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
let firstAuth=true,seenT=0,outMsg='';
function seen(force){const n=Date.now();if(force||n-seenT>30000){seenT=n;lsSet(K_SEEN,String(n))}}
const BAD=['笨蛋','白痴','智障','去死','幹','靠北','屁'];
 
/* ---------- 樣式 ---------- */
const css=document.createElement('style');css.textContent=`
#saveicon,#saveboard,#swbtn,#rstlink,#pkrestore,#pbtn{display:none!important}
.cl-mask{position:fixed;inset:0;z-index:9999;background:#f4ecfb;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;
  background-image:radial-gradient(circle at 12% 8%,#ffe6f2 0,transparent 40%),radial-gradient(circle at 90% 30%,#e3f1ff 0,transparent 38%)}
.cl-mask[hidden]{display:none}
.cl-card{background:#fff;border-radius:22px;padding:20px 18px;width:100%;max-width:400px;box-shadow:0 10px 30px -10px #8a5bb066;display:flex;flex-direction:column;gap:12px;color:#3b2853}
.cl-brand{text-align:center;font-family:var(--display,inherit);font-size:30px;color:#c23258;line-height:1.1}
.cl-brand small{display:block;font-size:13px;color:#7d6a94;margin-top:4px;font-family:inherit}
.cl-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#f4ecfb;border-radius:14px;padding:4px}
.cl-tabs button{min-height:44px;border:0;border-radius:11px;background:none;font:inherit;font-weight:700;color:#7d6a94;cursor:pointer}
.cl-tabs button[aria-selected="true"]{background:#fff;color:#c23258;box-shadow:0 2px 6px #0001}
.cl-card label{font-size:14px;font-weight:700;display:flex;flex-direction:column;gap:4px}
.cl-card label small{font-weight:400;color:#7d6a94;font-size:12px}
.cl-card input{min-height:46px;border:2px solid #e5d8f2;border-radius:12px;padding:0 12px;font:inherit;font-size:17px;color:#3b2853}
.cl-card input:focus{outline:3px solid #e2508f55;border-color:#e2508f}
.cl-pw{display:flex;gap:8px;justify-content:center;min-height:46px;align-items:center;background:#f7f3fb;border-radius:12px}
.cl-pw i{width:30px;height:30px;border-radius:50%;border:2px dashed #c9b6e0;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:18px;color:#3b2853}
.cl-pw i.on{background:#e2508f;border:2px solid #e2508f;color:#fff}
.cl-pad{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.cl-pad button{min-height:52px;border:2px solid #e5d8f2;background:#fff;border-radius:12px;font-size:26px;cursor:pointer}
.cl-pad button:active{transform:scale(.94);background:#ffe1ee}
.cl-row{display:flex;gap:8px}.cl-row>*{flex:1}
.cl-go{min-height:52px;border:0;border-radius:999px;background:#e2508f;color:#fff;font:inherit;font-size:19px;font-weight:700;cursor:pointer}
.cl-go:disabled{opacity:.5}
.cl-sub{min-height:44px;border:2px solid #e5d8f2;border-radius:999px;background:#fff;color:#3b2853;font:inherit;font-weight:700;cursor:pointer}
.cl-err{color:#b42318;font-size:14px;font-weight:700;text-align:center;min-height:20px;margin:0}
.cl-note{font-size:12px;color:#7d6a94;text-align:center;margin:0;line-height:1.5}
.cl-fab{position:fixed;z-index:900;top:10px;right:calc(var(--fl,0px) + 10px);display:flex;gap:6px}
.cl-fab button{position:relative;min-width:44px;height:44px;border-radius:999px;border:2px solid #e5d8f2;background:#fff;color:#3b2853;font:inherit;font-size:14px;font-weight:700;padding:0 12px;cursor:pointer;box-shadow:0 2px 8px #0001}
.cl-fab b.dot{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:999px;background:#e2508f;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;padding:0 5px}
.cl-mail{border:2px solid #e5d8f2;border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}
.cl-mail.new{border-color:#e2508f;background:#fff5f9}
.cl-mail h4{margin:0;font-size:15px}.cl-mail p{margin:0;font-size:14px;color:#5b4a70;white-space:pre-wrap}
.cl-mail small{color:#7d6a94;font-size:12px}
.cl-att{font-size:13px;font-weight:700;color:#b7811a;display:inline-flex;align-items:center;gap:6px}
.cl-atts{display:flex;flex-wrap:wrap;gap:4px 12px}
.cl-att .bagico{width:30px;height:30px}
.cl-boxmini .cl-boxsvg{width:64px;height:64px}
.cl-open{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;user-select:none}
.cl-stage{position:relative;width:220px;height:220px;display:flex;align-items:center;justify-content:center}
.cl-stage .cl-boxsvg{width:190px;height:190px;transition:opacity .4s,transform .4s}
.cl-open.shake .cl-boxsvg{animation:clShake .35s ease-in-out 3}
@keyframes clShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
.cl-boxsvg{overflow:visible}.cl-boxsvg .lid{transition:transform .5s cubic-bezier(.3,1.6,.5,1);transform-box:fill-box;transform-origin:50% 100%}
.cl-open.pop .lid{transform:translate(8px,-30px) rotate(-14deg)}
.cl-open.done .cl-boxsvg{opacity:.18;transform:scale(.86)}
.cl-prize{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;opacity:0;transform:scale(.4);transition:opacity .4s,transform .5s cubic-bezier(.3,1.6,.5,1)}
.cl-open.done .cl-prize{opacity:1;transform:none}
.cl-prize .bagico{width:96px;height:96px}
.cl-prize b{font-size:22px;color:#c23258}
.cl-prize em{font-style:normal;font-weight:700;color:#e39b00;font-size:18px}
.cl-spark{position:absolute;inset:0;pointer-events:none}
.cl-spark i{position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:50%;background:#ffd166;opacity:0}
.cl-open.big.done .cl-spark i{animation:clSpark 1.2s ease-out forwards}
${[...Array(14)].map((_,i)=>`.cl-spark i:nth-child(${i+1}){--a:${i*360/14}deg;animation-delay:${(i%4)*.06}s!important;background:${['#ffd166','#ff8fb8','#9fd8ff','#c9a0ff'][i%4]}}`).join('')}
@keyframes clSpark{0%{opacity:1;transform:translate(-50%,-50%) rotate(var(--a)) translateY(0)}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--a)) translateY(-110px)}}
@media (prefers-reduced-motion:reduce){.cl-open *{animation:none!important;transition:none!important}}
.cl-list{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto}
`;document.head.appendChild(css);
 
/* ---------- 登入畫面 ---------- */
const mask=document.createElement('div');mask.className='cl-mask';mask.innerHTML=`<div class="cl-card" id="clCard"><div class="cl-brand">幻想智慧星<small>正在連線中…</small></div></div>`;
document.body.appendChild(mask);
const card=()=>document.getElementById('clCard');
const $c=id=>document.getElementById(id);
let lastCode='',justMade=null,newChar=null,pinMem=null;
let loginMode='in';   // in＝登入現有帳號，new＝建立新帳號
function loginView(){
  const why=outMsg;outMsg='';setTimeout(()=>{if(why)err(why)},0);
  const isNew=loginMode==='new';
  card().innerHTML=`<div class="cl-brand">幻想智慧星<small>答題闖關 · 收集造型 · 布置小屋</small></div>
  <div class="cl-tabs" role="tablist"><button type="button" role="tab" id="clTIn" aria-selected="${!isNew}">登入</button><button type="button" role="tab" id="clTNew" aria-selected="${isNew}">建立新帳號</button></div>
  <form id="clForm" style="display:flex;flex-direction:column;gap:12px" autocomplete="on">
    <label>帳號<small>${isNew?'自己取一個，英文字母或數字，4～12 個字':'英文字母或數字，4～12 個字'}</small><input id="clCode" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="12" value="${lastCode}"></label>
    <label>密碼<small>${isNew?'自己設定 4 個數字':'4 個數字'}</small><input id="clPin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="${isNew?'new-password':'current-password'}" maxlength="4"></label>
    ${isNew?'<label>再輸入一次密碼<small>確認沒有打錯</small><input id="clPin2" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="new-password" maxlength="4"></label>':''}
    <p class="cl-err" id="clErr" role="alert"></p>
    <button class="cl-go" id="clGo">${isNew?'建立帳號':'進入遊戲'}</button>
  </form>
  <p class="cl-note">${isNew?'請記住你的帳號和 4 位數密碼，換電腦或手機時要用。<br>帳號不要用真實姓名或學號喔！':'第一次玩？請按上面的「建立新帳號」。<br>忘記密碼請找老師或管理員。在學校或公用電腦玩完，記得按「登出」。'}</p>`;
  const sw=m=>{if(loginMode===m)return;lastCode=$c('clCode').value.trim();loginMode=m;loginView()};
  $c('clTIn').onclick=()=>sw('in');$c('clTNew').onclick=()=>sw('new');
  $c('clCode').addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'')});
  ['clPin','clPin2'].forEach(id=>{const f=$c(id);if(f)f.addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,4)})});
  $c('clForm').onsubmit=e=>{e.preventDefault();doLogin()};
  setTimeout(()=>{const f=$c(lastCode?'clPin':'clCode');if(f)f.focus()},50);
}
const err=t=>{const e=$c('clErr');if(e)e.textContent=t};
function busy(b,t){const g=$c('clGo');if(g){g.disabled=b;if(b)g.textContent='請稍候…';else if(t)g.textContent=t}}
const netErr=e=>e.code==='auth/network-request-failed'?'網路好像斷了，請檢查網路':e.code==='auth/too-many-requests'?'錯太多次了，請休息一下再試':null;
async function doLogin(){
  const isNew=loginMode==='new',btn=isNew?'建立帳號':'進入遊戲';
  const code=$c('clCode').value.trim(),pin=$c('clPin').value.trim();
  if(!/^[a-z0-9]{4,12}$/.test(code))return err('帳號要用 4～12 個英文字母或數字');
  if(!/^\d{4}$/.test(pin))return err('密碼要輸入 4 個數字');
  if(isNew&&$c('clPin2').value.trim()!==pin){$c('clPin2').value='';return err('兩次輸入的密碼不一樣，請再輸入一次')}
  lastCode=code;pinMem={code,pin};busy(true);err('');
  if(!isNew){   // 登入：只登入，不會自動建立帳號
    try{await auth.signInWithEmailAndPassword(emailOf(code),pwStr(pin))}
    catch(e){busy(false,btn);$c('clPin').value='';
      err(netErr(e)||'帳號或密碼不對，再檢查一次。第一次玩請按上面的「建立新帳號」')}
    return}
  // 建立新帳號：帳號有人用了就換一個
  try{justMade={code,pin};await auth.createUserWithEmailAndPassword(emailOf(code),pwStr(pin))}
  catch(e){justMade=null;busy(false,btn);
    if(e.code==='auth/email-already-in-use'){err('這個帳號已經有人用了，換一個吧！如果是你自己的帳號，請按「登入」');$c('clCode').focus()}
    else{$c('clPin').value='';$c('clPin2').value='';err(netErr(e)||'建立失敗，請再試一次（'+(e.code||e.message)+'）')}}
}
/* 新玩家：確認 → 選角色 → 取暱稱 */
function confirmNew(user){
  const code=justMade?justMade.code:(user.email||'').split('@')[0];
  card().innerHTML=`<div class="cl-brand">歡迎新玩家！</div>
  <p style="text-align:center;margin:0;font-size:16px">帳號 <b style="color:#c23258">${esc(code)}</b> 還沒有人用過，<br>要用這個帳號開始玩嗎？</p>
  <p class="cl-note">請記住你的帳號和 4 位數密碼，換電腦或手機時要用。</p>
  <button class="cl-go" id="clYes">好，建立新帳號</button><button class="cl-sub" id="clNo">我打錯了，重新輸入</button>`;
  $c('clYes').onclick=()=>charView(user);
  $c('clNo').onclick=async()=>{justMade=null;try{await user.delete()}catch(e){await auth.signOut()}};
}
function dollSvg(k){try{return `<svg viewBox="${vb3(k,'all')}" style="width:100%;height:150px">${ONLY_SETS?plainDoll(k):doll3(k,defEq(k),'cl'+k)}</svg>`}catch(e){return `<div style="font-size:70px">${k==='f'?'👧':'👦'}</div>`}}
function charName(k){try{return BASES[k].n}catch(e){return k==='f'?'女孩':'男孩'}}
function charView(user){
  card().innerHTML=`<div class="cl-brand">選一位角色<small>之後也可以在衣櫥切換</small></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${['f','m'].map(k=>`<button class="cl-sub" data-ck="${k}" style="border-radius:18px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:200px">${dollSvg(k)}<b>${charName(k)}</b></button>`).join('')}</div>`;
  card().insertAdjacentHTML('beforeend','<button class="cl-sub" id="clBackA">帳號打錯了，回上一步</button>');
  $c('clBackA').onclick=async()=>{justMade=null;loginMode='new';try{await user.delete()}catch(e){await auth.signOut()}};
  card().querySelectorAll('[data-ck]').forEach(b=>b.onclick=()=>{newChar=b.dataset.ck;nameView(user)});
}
function nameView(user){
  card().innerHTML=`<div class="cl-brand">取一個暱稱<small>遊戲裡大家看到的名字</small></div>
  <form id="clNF" style="display:flex;flex-direction:column;gap:12px">
    <label>暱稱<small>可以用中文，最多 8 個字</small><input id="clName" maxlength="8"></label>
    <p class="cl-err" id="clErr" role="alert"></p>
    <button class="cl-go" id="clGo">開始玩！</button>
    <button type="button" class="cl-sub" id="clBackC">重新選角色</button>
  </form>`;
  $c('clBackC').onclick=()=>charView(user);
  setTimeout(()=>$c('clName').focus(),50);
  $c('clNF').onsubmit=async e=>{e.preventDefault();
    const name=$c('clName').value.trim();
    if(!name)return err('請取一個暱稱');
    if(BAD.some(w=>name.includes(w)))return err('這個暱稱不太適合，換一個吧');
    busy(true);err('');
    try{
      const uid=user.uid,now=FV.serverTimestamp(),code=(user.email||'').split('@')[0];
      const d={code,name,createdAt:now,lastLogin:now,updatedAt:now,adminRev:0,disabled:false,sj:'',exp:0,candy:0,char:newChar,maxLv:0,looks:0,homes:1};
      await db.doc('players/'+uid).set(d);
      if(pinMem&&pinMem.code===code)await db.doc('private/'+uid).set({pw:pinMem.pin,at:now}).catch(()=>{});
      justMade=null;enter(user,d,true);
    }catch(e){busy(false,'開始玩！');err('建立失敗，請再試一次（'+(e.code||e.message)+'）')}
  };
}
 
/* ---------- 雲端存檔 ---------- */
let ME=null,adminRev=0,timer=0,ready=false,unsubs=[];
function applyState(sj,name){
  const id='u_'+ME.uid;
  PL.list=[{id,name}];PL.cur=id;savePL();
  try{if(sj)localStorage.setItem(skey(id),sj);else localStorage.removeItem(skey(id))}catch(e){}
  loadS(id);if(sj&&!STORAGE_OK){try{Object.assign(S,JSON.parse(sj))}catch(e){}}
  try{chap=Math.min(8,Math.floor((S.maxLv||0)/12))}catch(e){}
  try{closeQuiz()}catch(e){}
  ownBase=null;stage(true);render();
}
function snapshot(){
  return {sj:JSON.stringify(S),exp:S.exp|0,candy:S.candy|0,char:S.char||null,maxLv:S.maxLv|0,
    looks:(S.items||[]).filter(x=>x.startsWith('L-')).length,homes:(S.homes||[]).length,updatedAt:FV.serverTimestamp()};
}
async function push(){
  clearTimeout(timer);timer=0;if(!ME||!ready)return;
  try{await db.doc('players/'+ME.uid).set(snapshot(),{merge:true});foot('已存到雲端')}
  catch(e){foot('雲端存檔失敗，網路恢復後會再試')}
}
function queue(){if(!ME||!ready)return;clearTimeout(timer);timer=setTimeout(push,2500)}
function foot(t){const f=document.getElementById('savefoot');if(f)f.textContent=`☁ ${t}（${new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}）`}
const _save=window.save;
window.save=function(){try{ownCheck()}catch(e){}_save.apply(this,arguments);queue()};
addEventListener('pagehide',()=>{if(ME&&ready)seen(true);if(timer)push()});
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>{if(ME&&ready)seen()},{passive:true}));
document.addEventListener('visibilitychange',()=>{if(ME&&ready&&document.visibilityState==='hidden')seen(true)});
setInterval(()=>{if(ME&&ready&&document.visibilityState==='visible')seen(true)},60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&timer)push()});
 
/* ---------- 統計（給管理後台看：玩了什麼、買了什麼、哪天有上線） ---------- */
const dk=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function stS(){if(!S.st||typeof S.st!=='object')S.st={t:{},d:{}};S.st.t=S.st.t||{};S.st.d=S.st.d||{};return S.st}
function stAdd(key,n=1){const s=stS(),k=dk();s.t[key]=(s.t[key]||0)+n;const d=s.d[k]=s.d[k]||{};d[key]=(d[key]||0)+n;
  const ks=Object.keys(s.d).sort();while(ks.length>62)delete s.d[ks.shift()]}
window.FSTAT=function(key,n=1){if(!ME||!ready||!S)return;try{stAdd(key,n);_save();queue()}catch(e){}};
function markDay(){if(!ME||!ready)return;const s=stS(),d=s.d[dk()];if(!d||!d.login){stAdd('login');try{_save()}catch(e){}queue()}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')markDay()});
/* 包住遊戲的開始函式：每開一局記一次 */
[['startQuiz',a=>'q:'+a[0]],['mazePlay',()=>'g:maze'],['memStart',()=>'g:memory'],['stroopStart',()=>'g:stroop'],['rollDice',()=>'g:dice']].forEach(([fn,key])=>{
  const f=window[fn];if(typeof f!=='function')return;
  window[fn]=function(){try{if(ME&&ready)stAdd(key(arguments))}catch(e){}return f.apply(this,arguments)};
});
/* 買到的東西：比對存檔前後多了哪些造型、小屋、寵物 */
let ownBase=null;
function ownSet(){const o=new Set();(S.items||[]).forEach(x=>{if(String(x).startsWith('L-'))o.add('b:'+x)});(S.homes||[]).forEach(x=>o.add('b:'+x));(S.pets||[]).forEach(x=>x&&x.k&&o.add('b:pet-'+x.k));return o}
function ownCheck(){if(!ME||!ready||!S)return;const now=ownSet();if(ownBase){for(const k of now)if(!ownBase.has(k))stAdd(k)}ownBase=now}
 
/* ---------- 登入後 ---------- */
auth.onAuthStateChanged(async user=>{
  unsubs.forEach(f=>f());unsubs=[];ready=false;ME=user;
  const restored=firstAuth;firstAuth=false;
  if(!user){mask.hidden=false;loginView();fab(false);return}
  // 只接受玩家帳號（帳號@fantasystar.game）。舊的匿名登入、管理員信箱等 → 不能直接進遊戲
  if(user.isAnonymous||!/@fantasystar\.game$/i.test(user.email||'')){
    mask.hidden=false;fab(false);
    card().innerHTML=`<div class="cl-brand">幻想智慧星</div><p style="text-align:center;margin:0">這台裝置記住的是舊的測試登入或管理員帳號，不能直接進遊戲。<br>請換成玩家帳號登入。</p><button class="cl-go" id="clOut">換成玩家帳號</button>`;
    $c('clOut').onclick=async()=>{try{if(user.isAnonymous)await user.delete()}catch(e){}try{await auth.signOut()}catch(e){}};
    return}
  // 打開網頁時自動帶入的舊登入：遊戲大更新過、或離開超過 30 分鐘 → 請他重新登入
  if(restored){const last=+lsGet(K_SEEN)||0,newVer=lsGet(K_VER)!==LOGIN_VER;
    if(newVer||!last||Date.now()-last>AWAY_MIN*60000){
      outMsg=newVer?'遊戲更新了，請重新輸入帳號和密碼':'離開超過 30 分鐘，已經自動登出，請重新登入';
      ME=null;try{localStorage.removeItem(skey('u_'+user.uid))}catch(e){}
      try{await auth.signOut()}catch(e){}return}}
  mask.hidden=false;
  card().innerHTML=`<div class="cl-brand">幻想智慧星<small>正在讀取你的進度…</small></div>`;
  try{
    const snap=await db.doc('players/'+user.uid).get();
    if(!snap.exists){charView(user);return}   // 新玩家（或上次沒建完）
    enter(user,snap.data()||{},false);
  }catch(e){card().innerHTML=`<div class="cl-brand">幻想智慧星</div><p class="cl-err">讀取進度失敗：${e.code||e.message}</p><button class="cl-go" onclick="location.reload()">重新整理</button>`;mask.hidden=false}
});
function enter(user,d,isNew){
  const ref=db.doc('players/'+user.uid);
  if(d.disabled){card().innerHTML=`<div class="cl-brand">幻想智慧星</div><p class="cl-err">這個帳號暫停使用中，請找老師或管理員。</p><button class="cl-sub" id="clOut">換一個帳號</button>`;
    $c('clOut').onclick=()=>auth.signOut();mask.hidden=false;return}
  adminRev=d.adminRev||0;ME.name=d.name||'玩家';ME.code=d.code||'';
  applyState(d.sj||'',ME.name);
  if(isNew&&d.char){S.char=d.char;try{_save()}catch(e){}stage(true);render()}
  ready=true;lsSet(K_VER,LOGIN_VER);seen(true);ownBase=ownSet();markDay();mask.hidden=true;fab(true);
  if(!isNew)ref.update({lastLogin:FV.serverTimestamp()}).catch(()=>{});
  if(!S.char)pickChar(true);else toast(isNew?`歡迎來到幻想智慧星，${ME.name}！`:`歡迎回來，${ME.name}！`);
  if(!d.sj)push();
  // 管理員修改了資料 → 自動重新讀取
  unsubs.push(ref.onSnapshot(s=>{const x=s.data();if(!x){if(ready){ready=false;outMsg='這個帳號已經被刪除，請找老師或管理員';auth.signOut()}return}
    if(x.disabled){auth.signOut();return}
    if((x.adminRev||0)>adminRev){adminRev=x.adminRev;ME.name=x.name||ME.name;applyState(x.sj||'',ME.name);ownBase=ownSet();toast('管理員更新了你的資料');fab(true)}}));
  // 信箱
  cleaned=false;popped=false;mailA=[];mailB=[];listenMail(ref);
  syncBroadcasts();
}
 
/* ---------- 右上角：信箱、帳號（v6 禮物系統） ---------- */
let MAIL=[],popped=false,cleaned=false,mailA=[],mailB=[];
const DAY=864e5;
const tms=t=>t&&t.toMillis?t.toMillis():0;
const expired=m=>!!(m.expireAt&&tms(m.expireAt)&&tms(m.expireAt)<Date.now());
const isBox=m=>m.kind==='box'||!!(m.att&&m.att.box);
const hasAtt=a=>!!a&&!!(a.box||a.candy||a.exp||a.dice||(a.bag&&Object.keys(a.bag).length)||(a.looks||[]).length||(a.homes||[]).length);
const isGift=m=>isBox(m)||hasAtt(m.att);
const live=m=>!m.claimed&&!expired(m);
function mergeMail(){const seen=new Set();MAIL=[...mailA,...mailB].filter(m=>!seen.has(m.id)&&seen.add(m.id))
  .sort((a,b)=>(live(b)&&isGift(b))-(live(a)&&isGift(a))||tms(b.createdAt)-tms(a.createdAt));fab(true);popGift();cleanMail()}
function listenMail(ref){
  unsubs.push(ref.collection('inbox').where('claimed','==',false).onSnapshot(s=>{mailA=s.docs.map(x=>({id:x.id,...x.data()}));mergeMail()}));
  unsubs.push(ref.collection('inbox').orderBy('claimedAt','desc').limit(20).onSnapshot(s=>{mailB=s.docs.map(x=>({id:x.id,...x.data()}));mergeMail()},()=>{}));
}
/* 自動整理：已領取 30 天、已讀公告 30 天、過期禮物 → 刪掉。沒領、沒過期的禮物永遠不會刪 */
function cleanMail(){
  if(cleaned||!ME||!MAIL.length)return;cleaned=true;const now=Date.now();
  MAIL.forEach(m=>{let del=false;
    if(m.claimed&&tms(m.claimedAt)&&now-tms(m.claimedAt)>30*DAY)del=true;
    else if(!isGift(m)&&m.read&&now-tms(m.createdAt)>30*DAY)del=true;
    else if(isGift(m)&&!m.claimed&&expired(m))del=true;
    if(del)db.doc(`players/${ME.uid}/inbox/${m.id}`).delete().catch(()=>{})});
}
const fabEl=document.createElement('div');fabEl.className='cl-fab';document.body.appendChild(fabEl);
function fab(on){
  if(!on){fabEl.innerHTML='';return}
  const n=MAIL.filter(m=>live(m)&&(isGift(m)||!m.read)).length;
  fabEl.innerHTML=`<button id="clMailBtn" aria-label="信箱">✉${n?`<b class="dot">${n}</b>`:''}</button><button id="clMeBtn">👤 ${esc(ME&&ME.name||'')}</button>`;
  document.getElementById('clMailBtn').onclick=mailbox;
  document.getElementById('clMeBtn').onclick=meSheet;
}
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ico=n=>{try{return bagIco(n)}catch(e){return ''}};
const STAR_I=`<svg class="bagico" viewBox="0 0 100 100" aria-hidden="true"><path d="${typeof star==='function'?star(50,50,40):''}" fill="#ffc93c" stroke="#e39b00" stroke-width="4"/><circle cx="38" cy="38" r="6" fill="#fff" opacity=".8"/></svg>`;
const EXP_I=`<svg class="bagico" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="#e2508f"/><text x="50" y="62" text-anchor="middle" font-size="34" font-weight="700" fill="#fff" font-family="sans-serif">EXP</text></svg>`;
const DICE_I=`<svg class="bagico" viewBox="0 0 100 100" aria-hidden="true"><rect x="12" y="12" width="76" height="76" rx="18" fill="#fff" stroke="#c9a0ff" stroke-width="5"/><circle cx="32" cy="32" r="8" fill="#3b2853"/><circle cx="50" cy="50" r="8" fill="#e2335b"/><circle cx="68" cy="68" r="8" fill="#3b2853"/></svg>`;
/* 附件 → [圖示, 文字] */
function attParts(a){const o=[];if(!a)return o;
  if(a.candy)o.push([STAR_I,`星星糖 ×${a.candy}`]);if(a.exp)o.push([EXP_I,`經驗值 ×${a.exp}`]);
  if(a.bag)Object.entries(a.bag).forEach(([k,n])=>o.push([ico(k),`${k} ×${n}`]));
  if(a.dice)o.push([DICE_I,`骰子加碼券 ×${a.dice}`]);
  (a.looks||[]).forEach(id=>{const it=ITEMS.find(i=>i.id==='L-'+id);o.push(['','造型：'+(it?it.n:id)])});
  (a.homes||[]).forEach(id=>{const h=HOMES.find(x=>x.id===id);o.push(['','小屋：'+(h?h.n:id)])});return o}
const attText=a=>attParts(a).map(x=>x[1]).join('・');
const attHtml=a=>attParts(a).map(([i,t])=>`<span class="cl-att">${i}${esc(t)}</span>`).join('');
function applyAtt(a){
  if(a.candy)S.candy+=a.candy|0;if(a.exp)S.exp+=a.exp|0;
  if(a.bag)Object.entries(a.bag).forEach(([k,n])=>{S.bag=S.bag||{};S.bag[k]=(S.bag[k]||0)+(n|0)});
  if(a.dice)S.diceBonus=(S.diceBonus||0)+(a.dice|0);
  (a.looks||[]).forEach(x=>{const k='L-'+x;if(!S.items.includes(k))S.items.push(k)});
  (a.homes||[]).forEach(x=>{if(!S.homes.includes(x))S.homes.push(x)});
}
const mIcon=m=>isBox(m)?'🎲':isGift(m)?'🎁':m.kind==='system'?'🔔':'📢';
const dstr=t=>t&&t.toDate?t.toDate().toLocaleDateString('zh-TW'):'';
function mailCard(m){const g=isGift(m),box=isBox(m);
  let act='';
  if(g){if(m.claimed)act=`<small>✓ 已經收下了${box&&m.result?'：'+esc(attText(m.result)):''}</small>`;
    else act=box?`<button class="act buy" data-open="${m.id}">🎁 打開禮物盒</button>`:`<button class="act buy" data-claim="${m.id}">收下</button>`}
  return `<div class="cl-mail ${live(m)&&(g||!m.read)?'new':''}"><h4>${mIcon(m)} ${esc(m.title||'')}</h4>
    ${m.body?`<p>${esc(m.body)}</p>`:''}${g&&!box?`<div class="cl-atts">${attHtml(m.att)}</div>`:''}${box&&!m.claimed?`<div class="cl-boxmini">${BOX_SVG}</div>`:''}
    <small>${dstr(m.createdAt)}${m.expireAt&&!m.claimed?' ・ '+dstr(m.expireAt)+' 前要領取':''}</small>${act}</div>`}
function bindMail(){
  document.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(b.dataset.claim));
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openBox(b.dataset.open));
  const ca=document.getElementById('clClaimAll');if(ca)ca.onclick=claimAll;
}
function mailbox(){
  const list=MAIL.filter(m=>!(isGift(m)&&!m.claimed&&expired(m)));
  const fixed=list.filter(m=>live(m)&&isGift(m)&&!isBox(m)).length;
  openSheet(head('✉ 信箱')+`${fixed>1?`<button class="big" id="clClaimAll" style="width:100%">全部收下（${fixed} 份禮物）</button>`:''}
  <div class="cl-list">${list.length?list.map(mailCard).join(''):'<p class="hint">信箱是空的。</p>'}</div>`);
  bindMail();
  list.filter(m=>!m.read&&!isGift(m)).forEach(m=>db.doc(`players/${ME.uid}/inbox/${m.id}`).update({read:true}).catch(()=>{}));
}
async function claim(id,quiet){
  const m=MAIL.find(x=>x.id===id);if(!m||m.claimed||!live(m)||isBox(m))return false;
  const a=m.att||{};
  try{
    await db.doc(`players/${ME.uid}/inbox/${id}`).update({claimed:true,read:true,claimedAt:FV.serverTimestamp()});
    m.claimed=true;applyAtt(a);
    if(!quiet){ownBase=ownSet();save();push();stage(true);render();toast('收下了：'+attText(a));try{SND.play('coin')}catch(e){}mailbox()}
    return true;
  }catch(e){if(!quiet)toast('領取失敗，請稍後再試');return false}
}
async function claimAll(){
  const ids=MAIL.filter(m=>live(m)&&isGift(m)&&!isBox(m)).map(m=>m.id);let n=0;
  for(const id of ids)if(await claim(id,true))n++;
  ownBase=ownSet();save();push();stage(true);render();toast(`收下了 ${n} 份禮物！`);try{SND.play('coin')}catch(e){}mailbox();
}
 
/* ===== 🎲 隨機禮物盒 ===== */
const GIFT_FLOWERS=[['小雛菊',30],['鬱金香',25],['向日葵',18],['玫瑰',12],['繡球花',8],['粉蓮花',5],['星光百合',2]];
const GIFT_PETS=[['幸運草',30],['古錢幣',25],['葉子護身符',18],['幸運珍珠',14],['彩虹寶石',9],['星晶碎片',4]];
const rint=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const wpick=list=>{let t=list.reduce((s,x)=>s+x[1],0),r=Math.random()*t;for(const x of list){if((r-=x[1])<0)return x}return list[list.length-1]};
function tier(max,rows){const r=wpick(rows);return r[0]==='max'?{n:max,big:true}:{n:Math.min(max,rint(r[0][0],r[0][1])),big:false}}
function rollBox(cfg){
  cfg=cfg||{};const sMax=Math.max(1688,cfg.starMax|0),eMax=Math.max(1000,cfg.expMax|0);
  const kind=wpick([['candy',40],['exp',30],['flower',15],['pet',10],['dice',5]])[0];
  if(kind==='candy'){const t=tier(sMax,[[[88,300],60],[[301,800],30],[[801,1288],9],['max',1]]);return {att:{candy:t.n},big:t.big}}
  if(kind==='exp'){const t=tier(eMax,[[[100,250],60],[[251,600],30],[[601,900],9],['max',1]]);return {att:{exp:t.n},big:t.big}}
  if(kind==='flower'){const f=wpick(GIFT_FLOWERS);return {att:{bag:{[f[0]]:rint(2,8)}},big:f[0]==='星光百合'}}
  if(kind==='pet'){const f=wpick(GIFT_PETS);return {att:{bag:{[f[0]]:rint(2,6)}},big:f[0]==='星晶碎片'}}
  return {att:{dice:rint(1,3)},big:false};
}
const BOX_SVG=`<svg viewBox="0 0 120 120" class="cl-boxsvg" aria-hidden="true"><g class="lid"><rect x="16" y="30" width="88" height="22" rx="6" fill="#ff7fb0" stroke="#c23258" stroke-width="3"/><rect x="52" y="30" width="16" height="22" fill="#ffd166"/><path d="M60,30C44,8 30,16 40,28ZM60,30C76,8 90,16 80,28Z" fill="#ffd166" stroke="#e39b00" stroke-width="3"/></g><rect x="22" y="52" width="76" height="56" rx="6" fill="#ff9fc6" stroke="#c23258" stroke-width="3"/><rect x="52" y="52" width="16" height="56" fill="#ffd166"/></svg>`;
async function openBox(id){
  const m=MAIL.find(x=>x.id===id);if(!m||m.claimed||!live(m)||!isBox(m))return;
  const r=rollBox(m.att&&m.att.box);
  try{  // 先存結果再播動畫：中途關掉也不能重抽
    await db.doc(`players/${ME.uid}/inbox/${id}`).update({claimed:true,read:true,claimedAt:FV.serverTimestamp(),result:r.att});
  }catch(e){toast('打開失敗，請稍後再試');return}
  m.claimed=true;m.result=r.att;applyAtt(r.att);ownBase=ownSet();save();push();
  const [ic,tx]=attParts(r.att)[0]||['',''];
  openSheet(head('🎲 '+esc(m.title||'禮物盒'))+`<div class="cl-open ${r.big?'big':''}" id="clOpen">
    <div class="cl-stage">${BOX_SVG}<div class="cl-prize">${ic}<b>${esc(tx)}</b>${r.big?'<em>🌟 大獎！</em>':''}</div><div class="cl-spark">${'<i></i>'.repeat(14)}</div></div>
    <p class="hint" id="clTap">點一下可以跳過</p></div>
    <button class="big" id="clTake" style="width:100%;visibility:hidden">收下</button>`);
  const box=document.getElementById('clOpen'),take=document.getElementById('clTake');
  let done=false;const finish=()=>{if(done)return;done=true;box.classList.add('done');take.style.visibility='visible';document.getElementById('clTap').textContent='';
    try{SND.play(r.big?'win':'coin')}catch(e){}};
  try{SND.play('open')}catch(e){}
  box.classList.add('shake');setTimeout(()=>box.classList.add('pop'),1100);setTimeout(finish,2300);
  box.onclick=finish;
  take.onclick=()=>{stage(true);render();toast('收下了：'+tx);mailbox()};
}
function popGift(){
  if(popped)return;const g=MAIL.find(m=>live(m)&&isGift(m));if(!g)return;popped=true;
  setTimeout(()=>{if(!document.getElementById('modal').hidden)return;
    openSheet(head('🎁 你收到禮物了！')+`<div class="cl-list">${mailCard(g)}</div><button class="ghost" id="clAllMail" style="width:100%">打開信箱</button>`);
    bindMail();document.getElementById('clAllMail').onclick=mailbox},1200);
}
/* 給全部玩家的信：只抓上次之後新寄的（不限封數），第一次看到時複製一份到自己的信箱 */
async function syncBroadcasts(){
  try{const since=S.bcT|0;let q=db.collection('broadcasts').orderBy('createdAt');
    if(since)q=q.where('createdAt','>',firebase.firestore.Timestamp.fromMillis(since));
    const bs=await q.get();let maxT=since;
    for(const b of bs.docs){const d=b.data();maxT=Math.max(maxT,tms(d.createdAt));
      if(expired(d))continue;
      const ref=db.doc(`players/${ME.uid}/inbox/${b.id}`);const ex=await ref.get();
      if(!ex.exists)await ref.set({title:d.title||'',body:d.body||'',kind:d.kind||'notice',att:d.att||{},createdAt:d.createdAt,expireAt:d.expireAt||null,read:false,claimed:false,bc:true})}
    if(maxT>since){S.bcT=maxT;try{_save()}catch(e){}queue()}}
  catch(e){}
}
function meSheet(){
  openSheet(head('👤 我的帳號')+`<p>暱稱：<b>${esc(ME.name)}</b></p><p>帳號：<b>${esc(ME.code)}</b></p>
  <p class="hint">進度會自動存到雲端。在學校或別人的電腦玩完，記得按登出。</p>
  <button class="big" id="clLogout" style="width:100%">登出</button>`);
  document.getElementById('clLogout').onclick=async()=>{await push();try{localStorage.removeItem(skey(PL.cur))}catch(e){}closeQuiz();try{localStorage.removeItem(K_SEEN)}catch(e){}await auth.signOut()};
}
})();
 
