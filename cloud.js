/* ===== 幻想智多星：雲端模組（登入、雲端存檔、信箱） =====
   接在遊戲主程式後面載入，不改動遊戲本身的玩法。 */
(function(){
if(!window.CLOUD_GATE){
  // 已經填好設定碼、但 Firebase 程式沒載入（網路被擋或太慢）→ 擋住畫面，不讓玩家沒登入就玩
  const cfg=window.FIREBASE_CONFIG||{};
  if(cfg.apiKey&&!/請貼上/.test(cfg.apiKey)){
    const m=document.createElement('div');
    m.style.cssText='position:fixed;inset:0;z-index:9999;background:#f4ecfb;display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML='<div style="background:#fff;border-radius:22px;padding:22px 18px;max-width:400px;width:100%;text-align:center;color:#3b2853;display:flex;flex-direction:column;gap:12px"><div style="font-size:28px;color:#c23258">幻想智多星</div><p style="margin:0">連不上雲端，暫時不能登入。<br>請確認網路後再試一次。</p><button style="min-height:46px;border:0;border-radius:14px;background:#e2508f;color:#fff;font:inherit;font-size:17px" onclick="location.reload()">重新整理</button></div>';
    document.body.appendChild(m);
  }
  return;
}
const fb=firebase.initializeApp(window.FIREBASE_CONFIG);
const auth=firebase.auth(),db=firebase.firestore(),FV=firebase.firestore.FieldValue;
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);   // 同一台裝置記住登入

/* ---------- 帳號密碼 ---------- */
const pwStr=pin=>'fsp-'+pin+'-star';                 // 交給 Firebase 的密碼；玩家使用 1 位英文＋6 位數字
const emailOf=code=>code+'@fantasystar.game';       // 假信箱，不會寄信
/* ---------- 自動登出 ----------
   LOGIN_VER：大更新時改這個日期，所有裝置下次打開都要重新登入（進度在雲端，不會不見）
   AWAY_MIN：關掉或離開遊戲超過幾分鐘，下次打開要重新登入（公用電腦用）
   遊戲開著的時候不會自動登出。 */
const LOGIN_VER='2026-11-08',AWAY_MIN=30;
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
body:has(.modal.full:not([hidden])) .cl-fab{display:none}
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
const mask=document.createElement('div');mask.className='cl-mask';mask.innerHTML=`<div class="cl-shell"><section class="cl-hero" aria-label="幻想智多星遊戲介紹"><div class="cl-hero-copy"><span class="cl-kicker">FANTASY STAR</span><h1>幻想智多星</h1><p>闖關集星・換裝佈置・節慶冒險</p></div><div class="cl-promo" id="clPromo"></div></section><div class="cl-card" id="clCard"><div class="cl-brand">歡迎來到星世界<small>正在連線中…</small></div></div></div>`;
try{const events=FESTS.filter(f=>festState(f).on);mask.querySelector('#clPromo').textContent=events.map(f=>f.n+'限定活動・至 '+fmtMD(festState(f).end)).join(' ／ ')}catch(_){};
/* 首頁背景圖：依 login/login-art.js 的設定挑圖（節慶 → 自訂日期 → 白天／夜晚 → 預設），讀不到就換下一張 */
(function loginArt(){
  const A=window.FS_LOGIN_ART||{},now=new Date(),md=now.getMonth()*100+100+now.getDate(),list=[];
  try{for(const f of FESTS)if(festState(f).on&&A.festivals&&A.festivals[f.k])list.push(A.festivals[f.k])}catch(_){}
  const toMD=s=>{const m=/^(\d{1,2})-(\d{1,2})$/.exec(String(s||''));return m?(+m[1])*100+(+m[2]):null};
  for(const d of A.dates||[]){const a=toMD(d.from),b=toMD(d.to);if(a==null||b==null||!d.img)continue;if(a<=b?(md>=a&&md<=b):(md>=a||md<=b))list.push(d.img)}
  if(A.dayNight&&A.dayNight.day&&A.dayNight.night){const h=now.getHours(),ds=A.dayNight.dayStart??6,ns=A.dayNight.nightStart??18;list.push(h>=ds&&h<ns?A.dayNight.day:A.dayNight.night)}
  // 輪流：daily＝每天換一張、random＝每次打開隨機
  if(A.rotate&&Array.isArray(A.rotate.images)&&A.rotate.images.length){const R=A.rotate.images,day=Math.floor((now-new Date(now.getFullYear(),0,0))/864e5);
    const i=A.rotate.mode==='random'?Math.floor(Math.random()*R.length):day%R.length;for(let k=0;k<R.length;k++)list.push(R[(i+k)%R.length])}
  list.push(A.default||'login/bg.webp');
  // 每張圖可另設：hero＝圖片上方保留給標題與人物的比例（0～1），bottom＝頁面底色
  const opt=src=>(A.images&&A.images[src])||{};
  const tryAt=i=>{if(i>=list.length)return;const img=new Image();img.onload=()=>{const o=opt(list[i]);mask.style.setProperty('--login-art',`url("${list[i]}")`);
    if(o.hero>0&&o.hero<1)mask.style.setProperty('--login-hero',String(o.hero*1.5));if(o.bottom)mask.style.setProperty('--login-bottom',o.bottom);mask.classList.add('has-art')};img.onerror=()=>tryAt(i+1);img.src=list[i]};
  tryAt(0);
})();
document.body.appendChild(mask);
/* 首頁音樂與音效：登入畫面顯示時播放「login」主題；進入遊戲時換回遊戲音樂並播放傳送門音效 */
(function loginSound(){
  const S=()=>(typeof SND!=='undefined'?SND:null),play=k=>{try{S()&&S().play(k)}catch(_){}};
  mask.insertAdjacentHTML('beforeend','<button type="button" class="cl-snd" id="clSnd" aria-label="聲音開關" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="snd-wave" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="snd-mute" d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>');
  mask.querySelector('#clSnd').onclick=e=>{e.stopPropagation();try{S().toggleAll()}catch(_){}};
  const sync=()=>{try{if(!S())return;if(mask.hidden){S().setTheme(typeof baseTheme==='function'?baseTheme():'main')}else S().setTheme('login');S().paint()}catch(_){}};
  let wasHidden=mask.hidden;
  new MutationObserver(()=>{const h=mask.hidden;if(h===wasHidden)return;wasHidden=h;sync();if(h)play('portal')}).observe(mask,{attributes:true,attributeFilter:['hidden']});
  sync();
  let lastSpark=0;
  mask.addEventListener('focusin',e=>{if(e.target.matches('input')&&Date.now()-lastSpark>500){lastSpark=Date.now();play('sparkle')}});
  mask.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled||b.id==='clSnd')return;play(b.id==='clSwitch'?'whoosh':'chime')},true);
})();
const card=()=>document.getElementById('clCard');
const $c=id=>document.getElementById(id);
let lastCode='',justMade=null,newChar=null,pinMem=null,regDraft=null,regCreating=false;
let loginMode='in';   // in＝登入現有帳號，new＝建立新帳號
function loginView(){
  mask.dataset.step=loginMode==='new'?'1':'0';
  const why=outMsg;outMsg='';setTimeout(()=>{if(why)err(why)},0);
  const isNew=loginMode==='new';
  const ICO_USER='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/></svg>';
  const ICO_LOCK='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2.5" fill="currentColor"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
  const ICO_EYE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>';
  const field=(id,ico,label,hint,attrs,eye)=>`<label class="cl-field"><span class="cl-sr">${label}</span><span class="cl-ico">${ico}</span><input id="${id}" placeholder="${label}" aria-describedby="${id}H" ${attrs}>${eye?`<button type="button" class="cl-eye" data-eye="${id}" aria-label="顯示密碼" aria-pressed="false">${ICO_EYE}</button>`:''}</label><small class="cl-hint" id="${id}H">${hint}</small>`;
  const pwAttrs=ac=>`type="password" inputmode="text" pattern="[A-Za-z][0-9]{6}" autocomplete="${ac}" maxlength="7"`;
  card().innerHTML=`<div class="cl-brand">${isNew?'建立玩家帳號':'歡迎回來'}<small>${isNew?'Create Account':'Welcome Back'}</small></div>${isNew?registrationSteps(1):''}
  <form id="clForm" class="cl-form" autocomplete="${isNew?'off':'on'}">
    ${field('clCode',ICO_USER,'玩家帳號',isNew?'自己取一個，英文字母或數字，4～12 個字；不要用真實姓名或學號':'英文字母或數字，4～12 個字',`autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="12" value="${lastCode}"`)}
    ${field('clPin',ICO_LOCK,'密碼','1 個英文字母＋6 個數字'+(isNew?'，例如 K381427':''),pwAttrs(isNew?'new-password':'current-password'),true)}
    ${isNew?field('clPin2',ICO_LOCK,'再輸入一次密碼','確認沒有打錯',pwAttrs('new-password'),true):''}
    <p class="cl-err" id="clErr" role="alert"></p>
    <button class="cl-go" id="clGo"><span>${isNew?'下一步':'登入遊戲'}</span><small>${isNew?'NEXT':'SIGN IN'}</small></button>
  </form>
  <button type="button" class="cl-sub cl-alt" id="clSwitch"><span>${isNew?'已有帳號，返回登入':'建立玩家帳號'}</span><small>${isNew?'BACK TO SIGN IN':'CREATE ACCOUNT'}</small></button>
  <p class="cl-note"><span class="cl-shield" aria-hidden="true">🛡</span>${isNew?'請記住你的帳號和 7 碼密碼，換電腦或手機時要用。':'登入帳號，保存遊玩紀錄。在公用電腦玩完記得登出。'}</p>`;
  const sw=m=>{if(loginMode===m)return;lastCode=$c('clCode').value.trim();loginMode=m;loginView()};
  $c('clSwitch').onclick=()=>sw(isNew?'in':'new');
  card().querySelectorAll('[data-eye]').forEach(b=>b.onclick=()=>{const f=$c(b.dataset.eye),on=f.type==='password';f.type=on?'text':'password';b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'隱藏密碼':'顯示密碼')});

  $c('clCode').addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'')});
  ['clPin','clPin2'].forEach(id=>{const f=$c(id);if(f)f.addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,7)})});
  $c('clForm').onsubmit=e=>{e.preventDefault();doLogin()};
  setTimeout(()=>{const f=$c(lastCode?'clPin':'clCode');if(f)f.focus()},50);
}
const err=t=>{const e=$c('clErr');if(e)e.textContent=t;if(t){try{SND.play('softerr')}catch(_){}}};
function busy(b,t){const g=$c('clGo');if(g){g.disabled=b;const s=g.querySelector('span');if(b){if(s)s.textContent='請稍候…';else g.textContent='請稍候…'}else if(t){if(s)s.textContent=t;else g.textContent=t}}}
const netErr=e=>e.code==='auth/network-request-failed'?'網路好像斷了，請檢查網路':e.code==='auth/too-many-requests'?'錯太多次了，請休息一下再試':null;
async function doLogin(){
  const isNew=loginMode==='new',btn=isNew?'下一步':'登入遊戲';
  const code=$c('clCode').value.trim(),pin=$c('clPin').value.trim().toUpperCase();
  if(!/^[a-z0-9]{4,12}$/.test(code))return err('帳號要用 4～12 個英文字母或數字');
  if(!/^[A-Z][0-9]{6}$/.test(pin))return err('密碼要用 1 個英文字母＋6 個數字，例如 K381427');
  if(isNew&&$c('clPin2').value.trim().toUpperCase()!==pin){$c('clPin2').value='';return err('兩次輸入的密碼不一樣，請再輸入一次')}
  lastCode=code;pinMem={code,pin};err('');
  if(!isNew){
    busy(true);
    try{await auth.signInWithEmailAndPassword(emailOf(code),pwStr(pin))}
    catch(e){busy(false,btn);$c('clPin').value='';
      err(netErr(e)||'帳號或密碼不對，再檢查一次。第一次玩請按下方的「建立玩家帳號」')}
    return}
  // 註冊資料先只放在本機記憶體；此時不建立 Firebase 帳號。
  regDraft={code,pin,char:null,name:''};newChar=null;regCharView();
}
/* 新玩家：確認 → 選角色 → 取暱稱 */
/* 新版註冊：填資料 → 選角色 → 暱稱 → 最後確認 → 才建立 Firebase 帳號 */
function registrationSteps(step){return `<ol class="cl-steps" aria-label="註冊進度">${['帳號','角色','暱稱','確認'].map((n,i)=>`<li ${i+1===step?'aria-current="step"':''} class="${i+1<step?'done':''}"><span>${i+1<step?'✓':i+1}</span>${n}</li>`).join('')}</ol>`}
function regCharView(){
  mask.dataset.step='2';
  card().innerHTML=`${registrationSteps(2)}<div class="cl-brand">選一位角色<small>之後也可以在衣櫥切換</small></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${['f','m'].map(k=>`<button class="cl-sub" data-rck="${k}" style="border-radius:18px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:200px">${dollSvg(k)}<b>${charName(k)}</b></button>`).join('')}</div>
  <button class="cl-sub" id="clRegBack">返回修改帳號與密碼</button>`;
  $c('clRegBack').onclick=()=>{loginMode='new';lastCode=regDraft&&regDraft.code||lastCode;loginView()};
  card().querySelectorAll('[data-rck]').forEach(b=>b.onclick=()=>{newChar=b.dataset.rck;regDraft.char=newChar;regNameView()});
}
function regNameView(){
  mask.dataset.step='3';
  card().innerHTML=`${registrationSteps(3)}<div class="cl-brand">取一個暱稱<small>遊戲裡大家看到的名字</small></div>
  <form id="clRNF" style="display:flex;flex-direction:column;gap:12px">
    <label>暱稱<small>最多 7 個中文字或 14 個英數字，可混合，不可含符號或空格</small><input id="clRName" maxlength="28" value="${esc(regDraft.name||'')}"></label><small class="nickname-count" id="clRNameCount" aria-live="polite"></small>
    <p class="cl-err" id="clErr" role="alert"></p>
    <button class="cl-go">下一步</button><button type="button" class="cl-sub" id="clRegCharBack">重新選角色</button>
  </form>`;
  FSNickname.bind($c('clRName'),$c('clRNameCount'));
  $c('clRegCharBack').onclick=regCharView;setTimeout(()=>$c('clRName')?.focus(),50);
  $c('clRNF').onsubmit=e=>{e.preventDefault();const name=$c('clRName').value,issue=FSNickname.error(name);if(issue)return err(issue);if(BAD.some(w=>name.includes(w)))return err('這個暱稱不太適合，換一個吧');regDraft.name=name;regConfirmView()};
}
function regConfirmView(msg=''){
  mask.dataset.step='4';
  card().innerHTML=`${registrationSteps(4)}<div class="cl-brand">確認建立帳號<small>確認後才會正式建立並進入遊戲</small></div>
  <div style="background:#f7f3fb;border-radius:14px;padding:12px;line-height:1.8"><div>帳號：<b>${esc(regDraft.code)}</b></div><div>密碼：<b>•••••••</b></div><div>角色：<b>${esc(charName(regDraft.char))}</b></div><div>暱稱：<b>${esc(regDraft.name)}</b></div></div>
  <p class="cl-err" id="clErr" role="alert">${esc(msg)}</p>
  <button class="cl-go" id="clRegCreate">建立帳號並進入遊戲</button>
  <button class="cl-sub" id="clRegEdit">返回修改</button>`;
  $c('clRegEdit').onclick=regNameView;$c('clRegCreate').onclick=finishRegistration;
}
function regAccountFix(){
  card().innerHTML=`<div class="cl-brand">重新設定帳號<small>角色與暱稱會保留</small></div>
  <form id="clRAF" style="display:flex;flex-direction:column;gap:12px">
    <label>帳號<small>英文字母或數字，4～12 個字</small><input id="clRCode" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="12" value="${esc(regDraft.code)}"></label>
    <p class="cl-err" id="clErr" role="alert">這個帳號已經有人使用了，請換一個。</p>
    <button class="cl-go">重新確認</button><button type="button" class="cl-sub" id="clRABack">返回確認頁</button>
  </form>`;
  const f=$c('clRCode');f.addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'')});$c('clRABack').onclick=()=>regConfirmView();
  $c('clRAF').onsubmit=e=>{e.preventDefault();const code=f.value.trim();if(!/^[a-z0-9]{4,12}$/.test(code))return err('帳號要用 4～12 個英文字母或數字');regDraft.code=code;pinMem={code,pin:regDraft.pin};lastCode=code;regConfirmView()};
}
async function finishRegistration(){
  if(!regDraft)return;const issue=FSNickname.error(regDraft.name);if(issue)return err(issue);
  if(regCreating)return;regCreating=true;let createdUser=null;const b=$c('clRegCreate');if(b){b.disabled=true;b.textContent='建立中…'}err('');
  try{
    const cred=await auth.createUserWithEmailAndPassword(emailOf(regDraft.code),pwStr(regDraft.pin)),user=cred.user;createdUser=user;
    const uid=user.uid,now=FV.serverTimestamp(),d={code:regDraft.code,name:regDraft.name,createdAt:now,lastLogin:now,updatedAt:now,adminRev:0,disabled:false,saveSchema:1,saveVersion:0,sj:'',exp:0,candy:0,char:regDraft.char,maxLv:0,looks:0,homes:1};
    await db.doc('players/'+uid).set(d);await db.doc('private/'+uid).set({pw:regDraft.pin,at:now});
    ME=user;justMade=null;newChar=regDraft.char;pinMem={code:regDraft.code,pin:regDraft.pin};regDraft=null;regCreating=false;enter(user,d,true);
  }catch(e){
    if(createdUser){try{await db.doc('players/'+createdUser.uid).delete()}catch(_){}try{await db.doc('private/'+createdUser.uid).delete()}catch(_){}try{await createdUser.delete()}catch(_){try{await auth.signOut()}catch(__){}}}
    regCreating=false;
    if(e.code==='auth/email-already-in-use')return regAccountFix();
    const b=$c('clRegCreate');if(b){b.disabled=false;b.textContent='建立帳號並進入遊戲'}err(netErr(e)||'建立失敗，未完成的帳號已撤銷，請再試一次（'+(e.code||e.message)+'）')
  }
}
/* 舊版未完成帳號的相容流程 */
function confirmNew(user){
  const code=justMade?justMade.code:(user.email||'').split('@')[0];
  card().innerHTML=`<div class="cl-brand">歡迎新玩家！</div>
  <p style="text-align:center;margin:0;font-size:16px">帳號 <b style="color:#c23258">${esc(code)}</b> 還沒有人用過，<br>要用這個帳號開始玩嗎？</p>
  <p class="cl-note">請記住你的帳號和 7 碼密碼，換電腦或手機時要用。</p>
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
    <label>暱稱<small>最多 7 個中文字或 14 個英數字，可混合，不可含符號或空格</small><input id="clName" maxlength="28"></label><small class="nickname-count" id="clNameCount" aria-live="polite"></small>
    <p class="cl-err" id="clErr" role="alert"></p>
    <button class="cl-go" id="clGo">開始玩！</button>
    <button type="button" class="cl-sub" id="clBackC">重新選角色</button>
  </form>`;
  FSNickname.bind($c('clName'),$c('clNameCount'));
  $c('clBackC').onclick=()=>charView(user);
  setTimeout(()=>$c('clName')?.focus(),50);
  $c('clNF').onsubmit=async e=>{e.preventDefault();
    const name=$c('clName').value,issue=FSNickname.error(name);
    if(issue)return err(issue);
    if(BAD.some(w=>name.includes(w)))return err('這個暱稱不太適合，換一個吧');
    busy(true);err('');
    try{
      const uid=user.uid,now=FV.serverTimestamp(),code=(user.email||'').split('@')[0];
      const d={code,name,createdAt:now,lastLogin:now,updatedAt:now,adminRev:0,disabled:false,saveSchema:1,saveVersion:0,sj:'',exp:0,candy:0,char:newChar,maxLv:0,looks:0,homes:1};
      await db.doc('players/'+uid).set(d);
      if(pinMem&&pinMem.code===code)await db.doc('private/'+uid).set({pw:pinMem.pin,at:now}).catch(()=>{});
      justMade=null;enter(user,d,true);
    }catch(e){busy(false,'開始玩！');err('建立失敗，請再試一次（'+(e.code||e.message)+'）')}
  };
}

/* ---------- 雲端存檔 ---------- */
let ME=null,adminRev=0,timer=0,ready=false,unsubs=[],saveRevision=0,saveAttempt=0;
let saveSession=null;
const saveClient=crypto.randomUUID(),pendingSaveKey=uid=>'fs-save-pending-v1:'+uid;
const saveVersion=d=>Number.isSafeInteger(d?.saveVersion)&&d.saveVersion>=0?d.saveVersion:0;
const parsedSave=sj=>{try{const x=JSON.parse(sj);return x&&typeof x==='object'&&!Array.isArray(x)?x:null}catch(_){return null}};
function pendingSaveRead(uid){
  let raw;try{raw=localStorage.getItem(pendingSaveKey(uid));if(!raw)return null;const p=JSON.parse(raw);
    if(p.schemaVersion!==1||p.uid!==uid||!Number.isSafeInteger(p.baseVersion)||p.baseVersion<0||!Number.isInteger(p.baseAdminRev)||typeof p.baseSj!=='string'||!parsedSave(p.draft?.sj||p.op?.sj||'{}'))throw Error('invalid-save-envelope');
    if(p.op&&(!/^[0-9a-f-]{36}$/i.test(p.op.id)||!Number.isSafeInteger(p.op.baseVersion)||typeof p.op.baseSj!=='string'||!parsedSave(p.op.sj)))throw Error('invalid-save-operation');
    return p;
  }catch(_){return {invalid:true,raw:raw||''};}
}
function saveSessionCurrent(s){return saveSession===s&&ME?.uid===s.uid;}
function persistSave(s){
  if(!s)return false;
  try{
    if(!s.draft&&!s.op&&!s.blocked)localStorage.removeItem(pendingSaveKey(s.uid));
    else localStorage.setItem(pendingSaveKey(s.uid),JSON.stringify({schemaVersion:1,uid:s.uid,baseVersion:s.baseVersion,baseAdminRev:s.baseAdminRev,baseSj:s.baseSj,draft:s.draft,op:s.op,unverified:!!s.unverified,brokenPending:s.brokenPending||null}));
    return true;
  }catch(_){foot('同步失敗：此裝置無法保留未同步資料，請保持連線');return false;}
}
function saveSummary(sj){const x=parsedSave(sj)||{};return 'Lv.'+levelOf(Number(x.exp)||0)+' · '+(Number(x.candy)||0)+' 星星糖 · '+(x.items||[]).filter(i=>String(i).startsWith('L-')).length+' 套造型';}
function showSaveConflict(s,remote,reason='另一台裝置已更新進度，這台裝置已暫停上傳。'){
  if(!saveSessionCurrent(s))return;
  s.blocked=true;clearTimeout(timer);timer=0;persistSave(s);window.FS_CLOUD_READY=false;
  try{closeQuiz()}catch(_){}
  foot('進度衝突：已保留此裝置資料，請確認雲端最新進度');
  mask.hidden=false;mask.style.zIndex='20000';mask.dataset.step='0';
  const local=s.draft?.sj||s.op?.sj||s.baseSj;
  card().innerHTML=`<div class="cl-brand">進度保護<small>避免舊存檔蓋掉新進度</small></div><p class="cl-note">${esc(reason)}</p><div class="cl-mail"><small>雲端目前進度</small><p>${esc(saveSummary(remote?.sj||''))}</p></div><div class="cl-mail"><small>此裝置未同步進度</small><p>${esc(saveSummary(local))}</p></div><p class="cl-note">不會自動合併星星糖或覆蓋雲端。你可以先下載此裝置備份。</p><button class="cl-sub" id="cloudDraftDownload">下載此裝置未同步備份</button><button class="cl-go" id="cloudUseLatest" ${remote?.sj&&!parsedSave(remote.sj)?'disabled':''}>載入雲端最新進度</button><p class="cl-err" id="cloudConflictError" role="alert"></p>`;
  let downloaded=false;
  document.getElementById('cloudDraftDownload').onclick=()=>{
    const content={format:'fantasy-star-unsynced-v1',uid:s.uid,exportedAt:Date.now(),state:s.draft?.sj||s.op?.sj||s.baseSj,pending:pendingSaveRead(s.uid)};
    const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='fantasy-star-unsynced-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);downloaded=true;
  };
  document.getElementById('cloudUseLatest').onclick=()=>{
    try{localStorage.setItem('fs-save-recovery-v1:'+s.uid+':'+crypto.randomUUID(),JSON.stringify({schemaVersion:1,uid:s.uid,at:Date.now(),state:s.draft?.sj||s.op?.sj||s.baseSj,pending:pendingSaveRead(s.uid)}));}
    catch(_){if(!downloaded){document.getElementById('cloudConflictError').textContent='此裝置無法保留備份，請先下載未同步備份，再載入雲端進度。';return;}}
    s.resolving=true;ready=false;clearTimeout(timer);timer=0;
    try{localStorage.removeItem(pendingSaveKey(s.uid));localStorage.removeItem(skey('u_'+s.uid));}catch(_){document.getElementById('cloudConflictError').textContent='無法清除暫存，請先下載備份並檢查瀏覽器儲存空間。';return;}
    location.reload();
  };
}
function beginSaveSession(user,d){
  const pending=pendingSaveRead(user.uid),serverSj=d.sj||'',version=saveVersion(d),revision=d.adminRev||0;
  const s=saveSession={uid:user.uid,baseVersion:version,baseAdminRev:revision,baseSj:serverSj,draft:null,op:null,writing:null,blocked:false};
  if(pending&&!pending.invalid){
    Object.assign(s,{baseVersion:pending.baseVersion,baseAdminRev:pending.baseAdminRev,baseSj:pending.baseSj,draft:pending.draft||null,op:pending.op||null,unverified:!!pending.unverified,brokenPending:pending.brokenPending||null});
    if(s.op&&d.saveCommitId===s.op.id&&version===s.op.baseVersion+1&&revision===s.op.baseAdminRev){
      if(s.draft?.sj===s.op.sj)s.draft=null;
      s.op=null;s.baseVersion=version;s.baseAdminRev=revision;s.baseSj=serverSj;
    }
    if(s.unverified||s.brokenPending||version!==s.baseVersion||revision!==s.baseAdminRev||serverSj!==s.baseSj){showSaveConflict(s,d,'這台裝置有未同步資料，但雲端已是另一個版本；已停止覆蓋。');return null;}
    persistSave(s);
    return {sj:s.draft?.sj||s.op?.sj||serverSj};
  }
  let local=null;try{local=localStorage.getItem(skey('u_'+user.uid))}catch(_){}
  const old=parsedSave(local),cloud=parsedSave(serverSj);
  const important=x=>JSON.stringify(Object.fromEntries(Object.entries(x||{}).filter(([k])=>!['savedAt','st'].includes(k)).sort(([a],[b])=>a.localeCompare(b))));
  if(pending?.invalid||(old&&Number(old.savedAt)>Number(cloud?.savedAt||0)&&important(old)!==important(cloud))){
    s.draft={sj:local||serverSj,revision:0};s.unverified=true;s.brokenPending=pending?.invalid?pending.raw:null;
    showSaveConflict(s,d,'此裝置留下較新的舊版存檔，無法確認是否與雲端來自同一版本；已先保留，避免覆蓋。');return null;
  }
  if(serverSj&&!cloud){s.blocked=true;showSaveConflict(s,d,'雲端存檔格式異常，已停止寫入；請保留備份並聯絡管理員。');return null;}
  return {sj:serverSj};
}
function applyState(sj,name){
  lbStop();
  dispatchEvent(new Event('fs-player-changing'));
  const id='u_'+ME.uid;
  PL.list=[{id,name}];PL.cur=id;savePL();
  try{if(sj)localStorage.setItem(skey(id),sj);else localStorage.removeItem(skey(id))}catch(e){}
  loadS(id);if(sj&&!STORAGE_OK){try{Object.assign(S,JSON.parse(sj))}catch(e){}}
  try{chap=Math.min(8,Math.floor((S.maxLv||0)/12))}catch(e){}
  try{closeQuiz()}catch(e){}
  ownBase=null;stage(true);render();
}
function snapshot(sj=JSON.stringify(S)){
  const value=JSON.parse(sj);
  return {sj,exp:value.exp|0,candy:value.candy|0,char:value.char||null,maxLv:value.maxLv|0,
    looks:(value.items||[]).filter(x=>x.startsWith('L-')).length,homes:(value.homes||[]).length,updatedAt:FV.serverTimestamp()};
}
async function push(){
  clearTimeout(timer);timer=0;
  const s=saveSession;if(!s||!ME||!ready||!saveSessionCurrent(s)||s.blocked)return false;
  if(s.writing)return s.writing;
  if(!s.op&&!s.draft)return true;
  if(navigator.onLine===false){foot('同步失敗：目前離線，未同步資料已保留');return false;}
  foot('儲存中…');
  s.writing=(async()=>{
    try{
      while(saveSessionCurrent(s)&&ready&&!s.blocked&&(s.op||s.draft)){
        if(!s.op){s.op={id:crypto.randomUUID(),writer:saveClient,baseVersion:s.baseVersion,baseAdminRev:s.baseAdminRev,baseSj:s.baseSj,sj:s.draft.sj};persistSave(s);}
        const op=s.op,ref=db.doc('players/'+s.uid);
        const result=await db.runTransaction(async tx=>{
          if(!saveSessionCurrent(s)||!ready||s.blocked)throw Object.assign(new Error('session-changed'),{code:'save-session-changed'});
          const snap=await tx.get(ref),remote=snap.exists?snap.data():null;
          if(!saveSessionCurrent(s)||!ready||s.blocked)throw Object.assign(new Error('session-changed'),{code:'save-session-changed'});
          const version=saveVersion(remote),revision=remote?.adminRev||0;
          if(remote?.saveCommitId===op.id&&version===op.baseVersion+1&&revision===op.baseAdminRev)return {version,sj:remote.sj,adminRev:revision};
          if(!remote||remote.disabled||version!==op.baseVersion||revision!==op.baseAdminRev||(remote.sj||'')!==op.baseSj)throw Object.assign(new Error('save-conflict'),{code:'save-conflict',remote});
          tx.set(ref,{...snapshot(op.sj),saveSchema:1,saveVersion:version+1,saveCommitId:op.id,saveWriter:op.writer},{merge:true});
          return {version:version+1,sj:op.sj,adminRev:revision};
        });
        if(!saveSessionCurrent(s)||!ready)return false;
        s.baseVersion=result.version;s.baseAdminRev=result.adminRev;s.baseSj=result.sj;s.op=null;
        if(s.draft?.sj===op.sj)s.draft=null;
        persistSave(s);
      }
      if(saveSessionCurrent(s)&&ready&&!s.blocked){if(!s.draft&&!s.op)foot('已存到雲端');void lbFlush();return true;}
      return false;
    }catch(e){
      if(saveSessionCurrent(s)&&ready){
        if(e.code==='save-conflict'){showSaveConflict(s,e.remote);}
        else if(e.code!=='save-session-changed'){persistSave(s);foot('同步失敗，未同步資料已保留；連線恢復後會再試');clearTimeout(timer);timer=setTimeout(()=>{if(saveSessionCurrent(s)&&!s.blocked)void push()},10000);}
      }
      return false;
    }finally{s.writing=null;}
  })();
  return s.writing;
}
function queue(){
  const s=saveSession;if(!ME||!ready||!s||!saveSessionCurrent(s))return;saveRevision++;
  s.draft={sj:JSON.stringify(S),revision:saveRevision};const stored=persistSave(s);
  if(s.blocked){foot('進度衝突：已保留此裝置資料，請確認雲端最新進度');return;}
  if(stored)foot(navigator.onLine===false?'同步失敗：目前離線，未同步資料已保留':'儲存中…');
  clearTimeout(timer);if(!s.writing)timer=setTimeout(push,2500);
}
addEventListener('online',()=>{if(ME&&ready)queue()});
function foot(t){const f=document.getElementById('savefoot');if(f){f.setAttribute('role','status');f.setAttribute('aria-live','polite');f.dataset.cloudSave=t==='已存到雲端'?'saved':t.startsWith('進度衝突')?'conflict':t.startsWith('同步失敗')?'error':'saving';f.textContent=`☁ ${t}（${new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}）`}}
const _save=window.save;
window.save=function(){if(!ME||!ready||saveSession?.resolving)return;try{ownCheck();lbCollectionCheck()}catch(e){}_save.apply(this,arguments);queue()};
addEventListener('pagehide',()=>{if(ME&&ready)seen(true);if(timer)void push()});
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>{if(ME&&ready)seen()},{passive:true}));
document.addEventListener('visibilitychange',()=>{if(ME&&ready&&document.visibilityState==='hidden')seen(true)});
setInterval(()=>{if(ME&&ready&&document.visibilityState==='visible')seen(true)},60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&timer)void push()});


/* ---------- Private leaderboard history and durable per-account outbox ---------- */
let lbSession=null;
const lbView={syncStatus:'signed-out',publicStatus:'loading',result:null,publishedAt:null,pending:0,errorCode:null};
const lbMillis=v=>v&&typeof v.toMillis==='function'?Math.floor(v.toMillis()):Number.isSafeInteger(v)?v:null;
const lbSameTimestamp=(a,b)=>a?.isEqual&&b?.toMillis?a.isEqual(b):lbMillis(a)===lbMillis(b);
const lbKey=uid=>'fs-leaderboard-outbox-v1:'+uid;
const lbLegacyKey=uid=>'fs-leaderboard-import-v1:'+uid;
function lbCanonical(v){return Array.isArray(v)?v.map(lbCanonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,lbCanonical(v[k])])):v;}
const lbFingerprint=v=>JSON.stringify({...v,lookIds:v.lookIds?.slice().sort(),roomIds:v.roomIds?.slice().sort()});
function lbNotify(patch={}){Object.assign(lbView,patch);dispatchEvent(new CustomEvent('fs-leaderboard-updated',{detail:{...lbView}}));}
function lbCurrent(s){return lbSession===s&&ME?.uid===s.uid&&ready;}
function lbStore(s){try{localStorage.setItem(lbKey(s.uid),JSON.stringify(s.outbox));return true}catch(e){if(lbCurrent(s))lbNotify({syncStatus:'storage-error',errorCode:'local-storage'});return false;}}
function lbStop(){if(lbSession)lbSession.unsubs.forEach(f=>f());lbSession=null;lbNotify({syncStatus:'signed-out',publicStatus:'loading',result:null,publishedAt:null,pending:0,errorCode:null});}
function lbEnqueue(s,type,value,clientAchievedAt=Date.now()){
  if(!lbCurrent(s)||!Object.hasOwn(FSLeaderboard.types,type))return;
  const entry={id:'r_'+crypto.randomUUID(),type,value:JSON.parse(JSON.stringify(value)),clientAchievedAt};
  s.outbox.push(entry);S.leaderboardV1=S.leaderboardV1||{modernTypes:{}};S.leaderboardV1.modernTypes=S.leaderboardV1.modernTypes||{};S.leaderboardV1.modernTypes[type]=true;if(type==='looks')S.leaderboardV1.lastCollection=lbFingerprint(value);if(type==='quest')S.leaderboardV1.lastQuest=JSON.stringify(value);
  lbStore(s);lbNotify({pending:s.outbox.length,syncStatus:'pending'});
  void lbFlush(s);
}
async function lbImport(s){
  if(s.imported)return;
  const ref=db.doc('players/'+s.uid+'/leaderboardState/v1');
  await db.runTransaction(async tx=>{
    const meta=await tx.get(ref);if(meta.exists)return;
    const legacy=s.legacyRecords;
    tx.set(ref,{schemaVersion:1,importedAt:FV.serverTimestamp()});
    for(const r of legacy)tx.set(db.doc('players/'+s.uid+'/leaderboardRecords/'+r.id),{id:r.id,uid:s.uid,type:r.type,value:r.value,legacy:true,achievedAt:null,recordedAt:FV.serverTimestamp(),schemaVersion:1});
  });
  s.imported=true;try{localStorage.removeItem(lbLegacyKey(s.uid));}catch(e){}
}
function lbFlush(s=lbSession){
  if(!s||!lbCurrent(s))return Promise.resolve();
  if(s.flushing)return s.flushing;
  s.flushing=(async()=>{
    try{
      await lbImport(s);
      while(lbCurrent(s)&&s.outbox.length){
        const r=s.outbox[0],ref=db.doc('players/'+s.uid+'/leaderboardRecords/'+r.id);
        await db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists){const d=old.data();if(d.uid!==s.uid||d.type!==r.type||JSON.stringify(lbCanonical(d.value))!==JSON.stringify(lbCanonical(r.value)))throw new Error('leaderboard-record-conflict');return;}
          tx.set(ref,{id:r.id,uid:s.uid,type:r.type,value:r.value,legacy:false,clientAchievedAt:r.clientAchievedAt,achievedAt:FV.serverTimestamp(),recordedAt:FV.serverTimestamp(),schemaVersion:1});
        });
        s.outbox.shift();lbStore(s);
      }
      if(lbCurrent(s)){lbNotify({syncStatus:s.outbox.length?'pending':'synced',pending:s.outbox.length,errorCode:null});lbRetryPublic(s);}
    }catch(e){if(lbCurrent(s))lbNotify({syncStatus:'pending',pending:s.outbox.length,errorCode:e.code||e.message||'sync-failed'});}
    finally{s.flushing=null;}
  })();return s.flushing;
}
/* Realtime single boards: after a new best, a player places only their own row with a transaction.
   Filters (no network): eligibility/config read once per session, best since reset/start, cached 3rd place. */
function lbContext(s){
  if(s.ctx)return Promise.resolve(s.ctx);
  if(!s.ctxLoading)s.ctxLoading=Promise.all([db.doc('leaderboardEligibility/'+s.uid).get(),db.doc('leaderboardConfig/current').get()])
    .then(([e,c])=>{if(lbCurrent(s))s.ctx={eligibility:e.exists?e.data():{},config:c.exists?c.data():null};return s.ctx;})
    .finally(()=>{s.ctxLoading=null;});
  return s.ctxLoading;
}
function lbRankBest(){const v=S.leaderboardV1=S.leaderboardV1||{};return v.rankBest=v.rankBest&&typeof v.rankBest==='object'?v.rankBest:{};}
async function lbConsiderPublic(s,type,value){
  try{
    if(!lbCurrent(s)||!Object.hasOwn(FSLeaderboard.types,type))return;
    const m=FSLeaderboard.publicValue(type,value);if(!m)return;
    const ctx=await lbContext(s);if(!lbCurrent(s)||!ctx)return;
    const config=s.config||ctx.config;
    if(ctx.eligibility.excluded===true||!config||config.enabled!==true||lbMillis(config.startsAt)>Date.now())return;
    // Filter 1: only a best since this type's reset and the season start can change the board.
    const store=lbRankBest(),old=store[type],reset=lbMillis(ctx.eligibility.resetAt?.[type])||0,start=lbMillis(config.startsAt)||0;
    const baseline=old&&old.at>reset&&old.at>=start?FSLeaderboard.publicValue(type,old.value):null;
    if(baseline&&!FSLeaderboard.publicBetter(type,m,baseline))return;
    store[type]={value:JSON.parse(JSON.stringify(value)),at:Date.now()};
    // Filter 2: a cached board for this config that the score cannot enter.
    const cached=s.published||s.lastPublic,rows=cached?.boards?.[type];
    if(cached&&lbSameTimestamp(cached.configUpdatedAt,config.updatedAt)&&Array.isArray(rows)&&!FSLeaderboard.placePublic(type,rows,{u:s.uid,m}))return;
    s.publicPending[type]=value;
    await lbSubmitPublic(s,type,value);
  }catch(e){}
}
async function lbSubmitPublic(s,type,value,attempt=0){
  if(!lbCurrent(s)||s.publicPending[type]!==value)return;
  const ref=db.doc('leaderboardPublic/current'),m=FSLeaderboard.publicValue(type,value);
  try{
    const ctx=await lbContext(s);
    if(!lbCurrent(s)||s.publicPending[type]!==value)return;
    if(!ctx||ctx.eligibility.excluded===true){delete s.publicPending[type];return;}
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists||!lbCurrent(s))return false;
      const d=snap.data(),config=s.config||s.ctx?.config;s.lastPublic=d;
      if(d.enabled!==true||!config||!lbSameTimestamp(d.configUpdatedAt,config.updatedAt))return false;
      const rows=FSLeaderboard.placePublic(type,d.boards?.[type],{u:s.uid,n:ME.name,l:Math.max(1,FSGameRecords.levelOf(S.exp|0)|0),m,t:Date.now()});
      if(!rows)return false; // board unchanged (e.g. the threshold rose while waiting): no write
      tx.update(ref,{['boards.'+type]:rows,publishedAt:FV.serverTimestamp(),lastWriter:s.uid,lastType:type});
      return true;
    },{maxAttempts:3});
    if(s.publicPending[type]===value)delete s.publicPending[type];
  }catch(e){
    if(!lbCurrent(s))return;
    // permission-denied is usually the 2-second spacing after another player's write; settings may also have changed.
    if(e.code==='permission-denied'){s.ctx=null;if(attempt<2){setTimeout(()=>void lbSubmitPublic(s,type,value,attempt+1),2500+Math.random()*2000);return;}delete s.publicPending[type];}
    // Other failures (offline) keep the entry; it is retried after the next successful record sync.
  }
}
function lbRetryPublic(s){for(const [type,value] of Object.entries(s.publicPending||{}))void lbSubmitPublic(s,type,value);}
function lbPublic(data){
  const boards={};for(const type of ['total',...Object.keys(FSLeaderboard.types)])boards[type]=(type==='total'&&data.lastWriter?FSLeaderboard.publicTotal(data.boards):Array.isArray(data.boards?.[type])?data.boards[type]:[]).slice(0,3).map((r,i)=>({uid:String(r.u||''),name:String(r.n||'玩家'),level:r.l,rank:i+1,...(type!=='total'?{value:FSLeaderboard.publicValue(type,r.m)}:{})}));
  return {enabled:data.enabled===true,startsAt:lbMillis(data.startsAt)||0,boards};
}
// Spark: subscribe to the shared boards only while their panel is visible.
function lbWatchPublic(){
  const s=lbSession;if(!s||!lbCurrent(s))return;
  const visible=typeof tab!=='undefined'&&tab==='rank'&&!document.hidden&&!!document.querySelector('#panel .rank-view');
  if(visible===!!s.watching)return;
  s.watching=visible;
  s.watchToken=(s.watchToken||0)+1;
  s.unsubs.splice(0).forEach(stop=>stop());
  if(!visible)return;
  const token=s.watchToken,current=()=>lbCurrent(s)&&s.watching&&s.watchToken===token;
  s.config=null;s.published=null;
  lbNotify({publicStatus:'loading',result:null,publishedAt:null});
  const refresh=()=>{if(!current()||!s.config)return;if(!s.config.enabled){lbNotify({publicStatus:'closed',result:{enabled:false,boards:{}},publishedAt:null});return;}const d=s.published;if(!d||!lbSameTimestamp(d.configUpdatedAt,s.config.updatedAt)){lbNotify({publicStatus:'unpublished',result:null,publishedAt:null});return;}lbNotify({publicStatus:'ready',result:lbPublic(d),publishedAt:lbMillis(d.publishedAt)});};
  const readError=e=>{if(current())lbNotify({publicStatus:'error',result:null,errorCode:e.code||'read-failed'});};
  s.unsubs.push(db.doc('leaderboardConfig/current').onSnapshot(snap=>{if(!current())return;s.config=snap.exists?snap.data():{enabled:false};refresh();},readError));
  s.unsubs.push(db.doc('leaderboardPublic/current').onSnapshot(snap=>{if(!current())return;s.published=snap.exists?snap.data():null;refresh();},readError));
}
const lbPanel=document.getElementById('panel');
if(lbPanel)new MutationObserver(lbWatchPublic).observe(lbPanel,{childList:true});
document.addEventListener('visibilitychange',lbWatchPublic);
function lbStart(uid,isNew=false,previous=null){
  lbStop();if(!window.FSLeaderboard||!window.FSGameRecords||typeof db.runTransaction!=='function'){lbNotify({syncStatus:'unavailable',publicStatus:'unavailable'});return;}
  let outbox=[];try{const stored=JSON.parse(localStorage.getItem(lbKey(uid))||'[]');if(Array.isArray(stored))outbox=stored.filter(r=>/^r_[0-9a-f-]{36}$/i.test(r.id)&&Object.hasOwn(FSLeaderboard.types,r.type)&&r.value&&Number.isSafeInteger(r.clientAchievedAt)&&!(r.type==='memory'&&r.value.pairs!==12)&&!(r.type==='stroop'&&!Number.isSafeInteger(r.value.correct))); /* drop old-format memory/stroop records: the rules now reject them and they would block the queue */}catch(e){}
  const collection=FSLeaderboard.collectionValue(S,FSGameRecords.catalog());
  const s=lbSession={uid,isNew,initial:JSON.parse(JSON.stringify(S)),outbox,legacySkip:new Set(outbox.map(r=>r.type)),imported:false,flushing:null,unsubs:[],collection:lbFingerprint(collection),config:null,published:null,ctx:null,ctxLoading:null,lastPublic:null,publicPending:{}};
  const modern=s.initial.leaderboardV1?.modernTypes||{};let frozen=null;try{const stored=JSON.parse(localStorage.getItem(lbLegacyKey(uid))||'null');if(stored&&stored.uid===uid&&Array.isArray(stored.records))frozen=stored.records.filter(r=>r.type==='quest'||r.type==='looks'); /* legacy import now covers quest/looks only */}catch(e){}
  s.legacyRecords=frozen||(isNew?[]:FSLeaderboard.legacyRecords(uid,s.initial,Date.now(),FSGameRecords.catalog()).filter(r=>!modern[r.type]&&!s.legacySkip.has(r.type)));
  try{localStorage.setItem(lbLegacyKey(uid),JSON.stringify({uid,records:s.legacyRecords}));}catch(e){}
  lbNotify({syncStatus:'pending',publicStatus:'loading',pending:outbox.length});
  lbWatchPublic();
  // Baseline for realtime public updates: existing bests are assumed to be on the admin-published board.
  if(isNew)S.leaderboardV1.rankBest={};
  else if(!S.leaderboardV1.rankBest||typeof S.leaderboardV1.rankBest!=='object'){const pb=FSGameRecords.personalBest();S.leaderboardV1.rankBest=Object.fromEntries(Object.entries(pb).filter(([,b])=>b&&b.value).map(([type,b])=>[type,{value:b.value,at:Number.isSafeInteger(b.achievedAt)&&b.achievedAt>0?b.achievedAt:1}]));}
  if(isNew){S.leaderboardV1.personalBest={};FSGameRecords.record('looks',collection);}
  else if((previous&&previous.collection!==s.collection)||(typeof s.initial.leaderboardV1?.lastCollection==='string'&&s.initial.leaderboardV1.lastCollection!==s.collection))FSGameRecords.record('looks',collection);
  if((previous&&previous.quest!==JSON.stringify(FSGameRecords.questValue()))||(typeof s.initial.leaderboardV1?.lastQuest==='string'&&s.initial.leaderboardV1.lastQuest!==JSON.stringify(FSGameRecords.questValue())))FSGameRecords.record('quest',FSGameRecords.questValue());
  S.leaderboardV1.lastCollection=s.collection;S.leaderboardV1.lastQuest=JSON.stringify(FSGameRecords.questValue());try{_save();queue();}catch(e){}
  void lbFlush(s);
}
function lbCollectionCheck(){
  const s=lbSession;if(!s||!lbCurrent(s))return;
  const value=FSLeaderboard.collectionValue(S,FSGameRecords.catalog()),fingerprint=lbFingerprint(value);
  if(fingerprint!==s.collection){s.collection=fingerprint;FSGameRecords.record('looks',value);}
}
addEventListener('fs-leaderboard-record',e=>{const s=lbSession,d=e.detail;if(s&&d){lbEnqueue(s,d.type,d.value,d.clientAchievedAt);void lbConsiderPublic(s,d.type,d.value);}});
window.FSLeaderboardSync=Object.freeze({
  get state(){return {...lbView};},flush:()=>lbFlush(),
  async readOwnRecords(){const s=lbSession;if(!s||!lbCurrent(s))return [];const snapshot=await db.collection('players/'+s.uid+'/leaderboardRecords').get();if(!lbCurrent(s))return [];return snapshot.docs.map(d=>({...d.data(),id:d.id,achievedAt:lbMillis(d.data().achievedAt),recordedAt:lbMillis(d.data().recordedAt)}));}
});

/* ---------- 統計（給管理後台看：玩了什麼、買了什麼、哪天有上線） ---------- */
const dk=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function stS(){if(!S.st||typeof S.st!=='object')S.st={t:{},d:{}};S.st.t=S.st.t||{};S.st.d=S.st.d||{};return S.st}
function stAdd(key,n=1){const s=stS(),k=dk();s.t[key]=(s.t[key]||0)+n;const d=s.d[k]=s.d[k]||{};d[key]=(d[key]||0)+n;
  const ks=Object.keys(s.d).sort();while(ks.length>62)delete s.d[ks.shift()]}
window.FSTAT=function(key,n=1){if(!ME||!ready||!S)return;try{stAdd(key,n);_save();queue()}catch(e){}};
function markDay(){if(!ME||!ready)return;const s=stS(),d=s.d[dk()];if(!d||!d.login){stAdd('login');try{_save()}catch(e){}queue()}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')markDay()});
/* 包住遊戲的開始函式：每開一局記一次 */
[['startQuiz',a=>'q:'+a[0]],['startMainQuiz',a=>'q:'+(a[0]&&a[0].dom)],['startPractice',a=>'q:'+a[0]],['mazePlay',()=>'g:maze'],['memStart',()=>'g:memory'],['stroopStart',()=>'g:stroop'],['rollDice',()=>'g:dice']].forEach(([fn,key])=>{
  const f=window[fn];if(typeof f!=='function')return;
  window[fn]=function(){try{if(ME&&ready)stAdd(key(arguments))}catch(e){}return f.apply(this,arguments)};
});
/* 買到的東西：比對存檔前後多了哪些造型、小屋、寵物 */
let ownBase=null;
function ownSet(){const o=new Set();(S.items||[]).forEach(x=>{if(String(x).startsWith('L-'))o.add('b:'+x)});(S.homes||[]).forEach(x=>o.add('b:'+x));(S.pets||[]).forEach(x=>x&&x.k&&o.add('b:pet-'+x.k));return o}
function ownCheck(){if(!ME||!ready||!S)return;const now=ownSet();if(ownBase){for(const k of now)if(!ownBase.has(k))stAdd(k)}ownBase=now}

/* ---------- 登入後 ---------- */
auth.onAuthStateChanged(async user=>{
  if(regCreating)return;
  lbStop();window.FS_CLOUD_READY=false;dispatchEvent(new Event('fs-player-changing'));
  unsubs.forEach(f=>f());unsubs=[];ready=false;clearTimeout(timer);timer=0;saveAttempt++;saveRevision=0;saveSession=null;ME=user;
  const restored=firstAuth;firstAuth=false;
  if(!user){mask.hidden=false;loginView();fab(false);return}
  // 只接受玩家帳號（帳號@fantasystar.game）。舊的匿名登入、管理員信箱等 → 不能直接進遊戲
  if(user.isAnonymous||!/@fantasystar\.game$/i.test(user.email||'')){
    mask.hidden=false;fab(false);
    card().innerHTML=`<div class="cl-brand">幻想智多星</div><p style="text-align:center;margin:0">這台裝置記住的是舊的測試登入或管理員帳號，不能直接進遊戲。<br>請換成玩家帳號登入。</p><button class="cl-go" id="clOut">換成玩家帳號</button>`;
    $c('clOut').onclick=async()=>{try{if(user.isAnonymous)await user.delete()}catch(e){}try{await auth.signOut()}catch(e){}};
    return}
  // 打開網頁時自動帶入的舊登入：遊戲大更新過、或離開超過 30 分鐘 → 請他重新登入
  if(restored){const last=+lsGet(K_SEEN)||0,newVer=lsGet(K_VER)!==LOGIN_VER;
    if(newVer||!last||Date.now()-last>AWAY_MIN*60000){
      outMsg=newVer?'遊戲更新了，請重新輸入帳號和密碼':'離開超過 30 分鐘，已經自動登出，請重新登入';
      ME=null; // Keep any per-account local or pending progress through forced reauthentication.
      try{await auth.signOut()}catch(e){}return}}
  mask.hidden=false;
  card().innerHTML=`<div class="cl-brand">幻想智多星<small>正在讀取你的進度…</small></div>`;
  try{
    const snap=await db.doc('players/'+user.uid).get({source:'server'});
    if(ME?.uid!==user.uid)return;
    if(!snap.exists){charView(user);return}   // 新玩家（或上次沒建完）
    enter(user,snap.data()||{},false);
  }catch(e){card().innerHTML=`<div class="cl-brand">幻想智多星</div><p class="cl-err">讀取進度失敗：${e.code||e.message}</p><button class="cl-go" onclick="location.reload()">重新整理</button>`;mask.hidden=false}
});
function enter(user,d,isNew){
  const ref=db.doc('players/'+user.uid);
  if(d.disabled){card().innerHTML=`<div class="cl-brand">幻想智多星</div><p class="cl-err">這個帳號暫停使用中，請找老師或管理員。</p><button class="cl-sub" id="clOut">換一個帳號</button>`;
    $c('clOut').onclick=()=>auth.signOut();mask.hidden=false;return}
  adminRev=d.adminRev||0;ME.name=d.name||'玩家';ME.code=d.code||'';ME.nameAt=d.nameAt&&typeof d.nameAt.toMillis==='function'?d.nameAt.toMillis():0;ME.pw='';ME.pwAt=0;ME.pwLoaded=false;
  const recovery=beginSaveSession(user,d);if(!recovery)return;
  applyState(recovery.sj,ME.name);
  if(isNew&&d.char){S.char=d.char;try{_save()}catch(e){}stage(true);render()}
  ready=true;window.FS_CLOUD_READY=true;lbStart(user.uid,isNew);lsSet(K_VER,LOGIN_VER);seen(true);ownBase=ownSet();markDay();mask.hidden=true;fab(true);
  if(!isNew)ref.update({lastLogin:FV.serverTimestamp()}).catch(()=>{});
  if(!S.char)pickChar(true);else toast(isNew?`歡迎來到幻想智多星，${ME.name}！`:`歡迎回來，${ME.name}！`);
  if(!d.sj)push();
  dispatchEvent(new Event('fs-player-ready'));
  // A change from another device pauses this copy instead of silently overwriting it.
  const activeSave=saveSession;
  unsubs.push(ref.onSnapshot(snap=>{
    if(!saveSessionCurrent(activeSave)||!ready)return;
    const x=snap.data();if(!x){ready=false;outMsg='這個帳號已經被刪除，請找老師或管理員';auth.signOut();return;}
    if(x.disabled){auth.signOut();return;}
    if(snap.metadata?.hasPendingWrites)return;
    if(x.nameAt&&typeof x.nameAt.toMillis==='function')ME.nameAt=x.nameAt.toMillis();
    if(x.name&&x.name!==ME.name){ME.name=x.name;const p=PL.list.find(y=>y.id===PL.cur);if(p){p.name=x.name;savePL()}fab(true)}
    const version=saveVersion(x),revision=x.adminRev||0,op=activeSave.op;
    if(op&&x.saveCommitId===op.id&&version===op.baseVersion+1&&revision===op.baseAdminRev)return;
    if(version!==activeSave.baseVersion||revision!==activeSave.baseAdminRev||(x.sj||'')!==activeSave.baseSj){
      showSaveConflict(activeSave,x,revision!==activeSave.baseAdminRev?'管理員已更新進度，請載入雲端最新資料；此裝置未同步內容已保留。':undefined);
    }
  }));
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
  document.getElementById('clMailBtn')?.remove();document.getElementById('clMeBtn')?.remove();fabEl.innerHTML='';
  const localName=document.getElementById('pbtn'),guestMail=document.getElementById('hudMailGuest');
  if(localName)localName.hidden=!!on;if(guestMail)guestMail.hidden=!!on;
  if(!on)return;
  const n=MAIL.filter(m=>live(m)&&(isGift(m)||!m.read)).length,name=ME&&ME.name||'';
  fabEl.innerHTML=`<button id="clMailBtn" aria-label="信箱${n?'，'+n+' 封未處理信件':''}"><span aria-hidden="true">✉</span><span>信箱</span>${n?`<b class="dot">${n>99?'99+':n}</b>`:''}</button><button id="clMeBtn" title="${esc(name)}" aria-label="我的帳號：${esc(name)}"><span class="profile-level-label">等級1</span><span class="profile-name">${esc(name)}</span></button>`;
  const mail=document.getElementById('clMailBtn'),me=document.getElementById('clMeBtn');
  document.getElementById('hudNameSlot')?.appendChild(me);document.getElementById('hudMailSlot')?.appendChild(mail);
  mail.onclick=mailbox;me.onclick=meSheet;
  window.FSHomeUI?.updateHud();
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
  const L=levelOf(S.exp),a=need(L),b=need(L+1);
  openSheet(head('玩家資料')+`<dl class="dialog-facts"><div class="fact-wide"><dt>暱稱</dt><dd class="account-full-name">${esc(ME.name)}</dd></div><div class="fact-wide"><dt>帳號</dt><dd>${esc(ME.code)}</dd></div><div><dt>等級</dt><dd class="account-level">${L>=LV_MAX?L+'（已滿級）':L}</dd></div><div><dt>星星糖</dt><dd class="account-candy">${S.candy||0}</dd></div><div class="fact-wide"><dt>升級經驗</dt><dd class="account-experience">${L>=LV_MAX?'已滿級（累計 '+S.exp+'）':(S.exp-a)+' / '+(b-a)}</dd></div></dl>`);
}
/* 更改暱稱：每 7 天一次（firestore.rules 也會檢查 nameAt） */
const NAME_GAP=7*24*60*60*1000;
const fmtNameDate=ms=>{const d=new Date(ms);return `${d.getMonth()+1} 月 ${d.getDate()} 日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
function renameSheet(){
  openSheet(head('更改暱稱')+`<form id="clRenameForm" style="display:flex;flex-direction:column;gap:10px">
    <label style="display:flex;flex-direction:column;gap:6px">新的暱稱<small class="hint">最多 7 個中文字或 14 個英數字，可混合，不可含符號或空格</small><input id="clNewName" maxlength="28" value="${esc(ME.name)}" style="font:inherit;font-size:1.05rem;padding:10px;border-radius:12px;border:2px solid #e6dcef"></label>
    <small class="nickname-count" id="clNewNameCount"></small>
    <p class="hint">改完之後要等 7 天才能再改一次。排行榜上的名字會在下次更新成績時換成新暱稱。</p>
    <p class="cl-err" id="clRenameErr" role="alert" style="color:#c23258;margin:0"></p>
    <div class="petacts"><button type="button" class="act ghost2" id="clRenameCancel">取消</button><button type="submit" class="act buy" id="clRenameGo">確定更改</button></div></form>`);
  const input=document.getElementById('clNewName'),msg=t=>{document.getElementById('clRenameErr').textContent=t};
  FSNickname.bind(input,document.getElementById('clNewNameCount'));
  document.getElementById('clRenameCancel').onclick=window.FSAccountSettings;
  document.getElementById('clRenameForm').onsubmit=async e=>{
    e.preventDefault();
    const name=input.value.trim(),issue=FSNickname.error(name);
    if(issue)return msg(issue);
    if(BAD.some(w=>name.includes(w)))return msg('這個暱稱不太適合，換一個吧');
    if(name===ME.name)return msg('新暱稱和現在的一樣喔');
    if(Date.now()<(ME.nameAt||0)+NAME_GAP)return msg('這週已經改過暱稱了');
    const go=document.getElementById('clRenameGo');go.disabled=true;go.textContent='正在儲存…';
    try{
      await db.doc('players/'+ME.uid).update({name,nameAt:FV.serverTimestamp()});
      ME.name=name;ME.nameAt=Date.now();
      const p=PL.list.find(x=>x.id===PL.cur);if(p){p.name=name;savePL()}
      fab(true);window.FSAccountSettings();toast('暱稱已改成「'+name+'」');
    }catch(err){
      go.disabled=false;go.textContent='確定更改';
      msg(err&&err.code==='permission-denied'?'這週已經改過暱稱，或暫時不能修改，請稍後再試。':'沒有改成功，請確認網路後再試一次。');
    }
  };
}
/* 密碼：玩家可以看自己的密碼紀錄（private/{uid}），每 7 天可改一次（firestore.rules 檢查 pwAt） */
async function loadPrivate(){
  try{const s=await db.doc('private/'+ME.uid).get();const d=s.exists?s.data():{};ME.pw=d.pw||'';ME.pwAt=d.pwAt&&typeof d.pwAt.toMillis==='function'?d.pwAt.toMillis():0;ME.pwExists=s.exists}
  catch(e){ME.pw='';ME.pwAt=0;ME.pwExists=false}
  ME.pwLoaded=true;
}
function passwordSheet(){
  const f=(id,label,hint,ac)=>`<label style="display:flex;flex-direction:column;gap:6px">${label}<small class="hint">${hint}</small><input id="${id}" type="password" inputmode="text" maxlength="7" autocomplete="${ac}" style="font:inherit;font-size:1.05rem;padding:10px;border-radius:12px;border:2px solid #e6dcef"></label>`;
  openSheet(head('更改密碼')+`<form id="clPwForm" style="display:flex;flex-direction:column;gap:10px">
    ${f('clPwOld','現在的密碼','先輸入目前使用的密碼','current-password')}
    ${f('clPwNew','新的密碼','1 個英文字母＋6 個數字，例如 K381427','new-password')}
    ${f('clPwNew2','再輸入一次新密碼','確認沒有打錯','new-password')}
    <p class="hint">改完之後要等 7 天才能再改一次。換電腦或手機時要用新密碼登入。</p>
    <p class="cl-err" id="clPwErr" role="alert" style="color:#c23258;margin:0"></p>
    <div class="petacts"><button type="button" class="act ghost2" id="clPwCancel">取消</button><button type="submit" class="act buy" id="clPwGo">確定更改</button></div></form>`);
  const msg=t=>{document.getElementById('clPwErr').textContent=t},val=id=>document.getElementById(id).value.trim().toUpperCase();
  ['clPwOld','clPwNew','clPwNew2'].forEach(id=>document.getElementById(id).addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,7)}));
  document.getElementById('clPwCancel').onclick=window.FSAccountSettings;
  document.getElementById('clPwForm').onsubmit=async e=>{
    e.preventDefault();
    const old=val('clPwOld'),pin=val('clPwNew'),pin2=val('clPwNew2'),ok=/^[A-Z][0-9]{6}$/;
    if(!ok.test(old))return msg('請輸入現在的密碼（1 個英文字母＋6 個數字）');
    if(!ok.test(pin))return msg('新密碼要用 1 個英文字母＋6 個數字，例如 K381427');
    if(pin!==pin2)return msg('兩次輸入的新密碼不一樣，請再輸入一次');
    if(pin===old)return msg('新密碼和現在的一樣喔');
    if(Date.now()<(ME.pwAt||0)+NAME_GAP)return msg('這週已經改過密碼了');
    const go=document.getElementById('clPwGo');go.disabled=true;go.textContent='正在更改…';
    const user=auth.currentUser;
    try{await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email,pwStr(old)))}
    catch(err){go.disabled=false;go.textContent='確定更改';return msg(/wrong-password|invalid-credential|invalid-login/.test(err&&err.code||'')?'現在的密碼不對，再檢查一次。':(netErr(err)||'沒有改成功，請確認網路後再試一次。'))}
    // 先寫老師看得到的紀錄（規則會擋一週內第二次），成功後才改登入密碼
    const ref=db.doc('private/'+ME.uid);
    try{await ref.set({pw:pin,pwAt:FV.serverTimestamp()},{merge:true})}
    catch(err){go.disabled=false;go.textContent='確定更改';return msg(err&&err.code==='permission-denied'?'這週已經改過密碼，或暫時不能修改，請稍後再試。':'沒有改成功，請確認網路後再試一次。')}
    try{await user.updatePassword(pwStr(pin))}
    catch(err){
      go.disabled=false;go.textContent='確定更改';
      return msg('登入密碼沒有改成功，請先用舊密碼登入，並請老師或管理員協助確認密碼。');
    }
    ME.pw=pin;ME.pwAt=Date.now();ME.pwExists=true;
    window.FSAccountSettings();toast('密碼已更改，下次登入請用新密碼');
  };
}
window.FSAccountSettings=function(){
  if(!ME||!ready)return;
  const nextAt=(ME.nameAt||0)+NAME_GAP,canRename=Date.now()>=nextAt;
  const pwNext=(ME.pwAt||0)+NAME_GAP,canPw=ME.pwLoaded&&Date.now()>=pwNext;
  // 每列：左邊「標籤＋內容」、右邊小按鈕、下方一行說明；字級統一為 標籤 13／內容 16／按鈕 14／說明 12
  const row=(label,value,btn,hint)=>`<div class="acct-row"><div class="acct-main"><span class="acct-label">${label}</span><span class="acct-val">${value}</span></div>${btn||''}<p class="acct-hint">${hint}</p></div>`;
  const abtn=(id,text,on)=>`<button type="button" class="acct-btn" id="${id}" ${on?'':'disabled'}>${text}</button>`;
  const pwText=ME.pwLoaded?(ME.pw?`<span id="clPwVal" data-show="0">•••••••</span> <button type="button" class="acct-show" id="clPwShow">顯示</button>`:'（沒有紀錄）'):'讀取中…';
  openSheet(head('設定')+`<section class="acct" aria-label="帳號資料">
    ${row('帳號',esc(ME.code),'','帳號不能修改。')}
    ${row('暱稱',esc(ME.name),abtn('clRename','更改',canRename),canRename?'每 7 天可以改一次。':'這週已改過，'+fmtNameDate(nextAt)+' 後可再改。')}
    ${row('密碼',pwText,abtn('clPwChange','更改',canPw),!ME.pwLoaded?'正在讀取密碼資料…':canPw?'每 7 天可以改一次，改完請記住新密碼。':'這週已改過，'+fmtNameDate(pwNext)+' 後可再改。')}
    </section>
    <p class="acct-note">進度會自動存到雲端。使用公用裝置時，玩完請登出。</p><button class="big" id="clLogout">登出帳號</button>`);
  if(canRename)document.getElementById('clRename').onclick=renameSheet;
  if(canPw)document.getElementById('clPwChange').onclick=passwordSheet;
  const show=document.getElementById('clPwShow');
  if(show)show.onclick=()=>{const v=document.getElementById('clPwVal'),on=v.dataset.show!=='1';v.dataset.show=on?'1':'0';v.textContent=on?ME.pw:'•••••••';show.textContent=on?'隱藏':'顯示'};
  if(!ME.pwLoaded)loadPrivate().then(()=>{if(document.getElementById('clPwChange'))window.FSAccountSettings()});
  document.getElementById('clLogout').onclick=()=>{
    openSheet(head('確認登出')+'<p>要登出目前的帳號嗎？</p><div class="petacts"><button class="act ghost2" id="logoutCancel">取消</button><button class="act buy" id="logoutConfirm">確定登出</button></div>');
    document.getElementById('logoutCancel').onclick=window.FSAccountSettings;
    document.getElementById('logoutConfirm').onclick=async function(){
      this.disabled=true;this.textContent='正在儲存…';
      try{const stateKey=skey(PL.cur);save();if(!await push())throw new Error('save-not-confirmed');await lbFlush();closeQuiz();await auth.signOut();try{localStorage.removeItem(stateKey);localStorage.removeItem(K_SEEN)}catch(_){}} 
      catch(e){this.disabled=false;this.textContent='重新嘗試登出';toast('尚未完成雲端儲存，請確認連線後重試。');}
    };
  };
};

})();
