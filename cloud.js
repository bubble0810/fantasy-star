/* ===== 幻想智慧星：雲端模組（登入、雲端存檔、信箱） =====
   接在遊戲主程式後面載入，不改動遊戲本身的玩法。 */
(function(){
if(!window.CLOUD_GATE)return;           // 還沒設定 Firebase：維持原本的本機存檔
const fb=firebase.initializeApp(window.FIREBASE_CONFIG);
const auth=firebase.auth(),db=firebase.firestore(),FV=firebase.firestore.FieldValue;
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);   // 同一台裝置記住登入

/* ---------- 圖案密碼 ---------- */
const ICONS=['🍓','⭐','🐰','🌙','🎀','🍰','🐱','🌸','🍀','🎈','🐟','☁️'];
const ICON_N=['草莓','星星','兔子','月亮','蝴蝶結','蛋糕','貓咪','櫻花','幸運草','氣球','小魚','雲朵'];
const pwStr=a=>'fsp-'+a.map(i=>i.toString(16)).join('')+'-star';  // 交給 Firebase 的密碼（使用者看不到）
const emailOf=code=>code+'@fantasystar.game';                     // 假信箱，不會寄信
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
.cl-fab{position:fixed;z-index:900;top:10px;right:10px;display:flex;gap:6px}
.cl-fab button{position:relative;min-width:44px;height:44px;border-radius:999px;border:2px solid #e5d8f2;background:#fff;color:#3b2853;font:inherit;font-size:14px;font-weight:700;padding:0 12px;cursor:pointer;box-shadow:0 2px 8px #0001}
.cl-fab b.dot{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:999px;background:#e2508f;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;padding:0 5px}
.cl-mail{border:2px solid #e5d8f2;border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}
.cl-mail.new{border-color:#e2508f;background:#fff5f9}
.cl-mail h4{margin:0;font-size:15px}.cl-mail p{margin:0;font-size:14px;color:#5b4a70;white-space:pre-wrap}
.cl-mail small{color:#7d6a94;font-size:12px}
.cl-att{font-size:13px;font-weight:700;color:#b7811a}
.cl-list{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto}
`;document.head.appendChild(css);

/* ---------- 登入畫面 ---------- */
const mask=document.createElement('div');mask.className='cl-mask';mask.innerHTML=`<div class="cl-card" id="clCard"><div class="cl-brand">幻想智慧星<small>正在連線中…</small></div></div>`;
document.body.appendChild(mask);
const card=()=>document.getElementById('clCard');
let pw=[],mode='login';
function loginView(){
  pw=[];
  card().innerHTML=`<div class="cl-brand">幻想智慧星<small>答題闖關 · 收集造型 · 布置小屋</small></div>
  <div class="cl-tabs" role="tablist"><button role="tab" data-m="login" aria-selected="${mode==='login'}">我有帳號</button><button role="tab" data-m="new" aria-selected="${mode==='new'}">我是新玩家</button></div>
  <form id="clForm" style="display:flex;flex-direction:column;gap:12px">
    <label>代號<small>英文字母或數字，4～12 個字${mode==='new'?'。不要用真實姓名或學號喔！':''}</small><input id="clCode" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="12" inputmode="latin"></label>
    ${mode==='new'?`<label>顯示名稱<small>遊戲裡看到的名字，可以用中文，最多 8 個字</small><input id="clName" maxlength="8"></label>`:''}
    <div><b style="font-size:14px">${mode==='new'?'選 4 個圖案當密碼（要記住順序喔！）':'依序點你的 4 個圖案'}</b></div>
    <div class="cl-pw" id="clPw">${'<i></i>'.repeat(4)}</div>
    <div class="cl-pad">${ICONS.map((c,i)=>`<button type="button" data-i="${i}" aria-label="${ICON_N[i]}">${c}</button>`).join('')}</div>
    <div class="cl-row"><button type="button" class="cl-sub" id="clBack">退一格</button><button type="button" class="cl-sub" id="clClr">全部清除</button></div>
    <p class="cl-err" id="clErr" role="alert"></p>
    <button class="cl-go" id="clGo">${mode==='new'?'建立帳號，開始玩！':'登入'}</button>
  </form>
  ${mode==='login'?'<p class="cl-note">忘記圖案密碼了嗎？請找老師或管理員幫忙。</p>':'<p class="cl-note">遊戲進度會存在雲端，換電腦或手機也能接著玩。</p>'}`;
  card().querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{mode=b.dataset.m;loginView()});
  card().querySelectorAll('.cl-pad button').forEach(b=>b.onclick=()=>{if(pw.length<4){pw.push(+b.dataset.i);paintPw()}});
  document.getElementById('clBack').onclick=()=>{pw.pop();paintPw()};
  document.getElementById('clClr').onclick=()=>{pw=[];paintPw()};
  document.getElementById('clCode').addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'')});
  document.getElementById('clForm').onsubmit=e=>{e.preventDefault();mode==='new'?doRegister():doLogin()};
}
function paintPw(){document.querySelectorAll('#clPw i').forEach((el,i)=>{el.className=i<pw.length?'on':'';el.textContent=i<pw.length?'●':''})}
const err=t=>{const e=document.getElementById('clErr');if(e)e.textContent=t};
function busy(b){const g=document.getElementById('clGo');if(g){g.disabled=b;g.textContent=b?'請稍候…':(mode==='new'?'建立帳號，開始玩！':'登入')}}
function check(){
  const code=document.getElementById('clCode').value.trim();
  if(!/^[a-z0-9]{4,12}$/.test(code))return err('代號要用 4～12 個英文字母或數字'),null;
  if(pw.length<4)return err('請點滿 4 個圖案'),null;
  return code;
}
async function doLogin(){
  const code=check();if(!code)return;busy(true);err('');
  try{await auth.signInWithEmailAndPassword(emailOf(code),pwStr(pw))}
  catch(e){busy(false);pw=[];paintPw();
    err(e.code==='auth/too-many-requests'?'錯太多次了，請休息一下再試':e.code==='auth/network-request-failed'?'網路好像斷了，請檢查網路':'代號或圖案密碼不對喔，再試一次！')}
}
async function doRegister(){
  const code=check();if(!code)return;
  const name=(document.getElementById('clName').value||'').trim();
  if(!name)return err('請取一個顯示名稱');
  if(BAD.some(w=>name.includes(w)))return err('這個名稱不太適合，換一個吧');
  busy(true);err('');
  try{
    const cr=await auth.createUserWithEmailAndPassword(emailOf(code),pwStr(pw));
    const uid=cr.user.uid,now=FV.serverTimestamp();
    await db.doc('players/'+uid).set({code,name,createdAt:now,lastLogin:now,updatedAt:now,adminRev:0,disabled:false,sj:'',exp:0,candy:0,char:null,maxLv:0,looks:0,homes:1});
    await db.doc('private/'+uid).set({pw:pw.map(i=>ICONS[i]).join(''),pwName:pw.map(i=>ICON_N[i]).join('、'),at:now});
  }catch(e){busy(false);
    err(e.code==='auth/email-already-in-use'?'這個代號有人用了，換一個吧':e.code==='auth/network-request-failed'?'網路好像斷了，請檢查網路':'建立帳號失敗，請再試一次（'+(e.code||e.message)+'）')}
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
  stage(true);render();
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
window.save=function(){_save.apply(this,arguments);queue()};
addEventListener('pagehide',()=>{if(timer)push()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&timer)push()});

/* ---------- 登入後 ---------- */
auth.onAuthStateChanged(async user=>{
  unsubs.forEach(f=>f());unsubs=[];ready=false;ME=user;
  if(!user){mask.hidden=false;loginView();fab(false);return}
  card().innerHTML=`<div class="cl-brand">幻想智慧星<small>正在讀取你的進度…</small></div>`;
  try{
    const ref=db.doc('players/'+user.uid);
    let snap=await ref.get();
    for(let i=0;i<5&&!snap.exists;i++){await new Promise(r=>setTimeout(r,600));snap=await ref.get()}  // 剛註冊時等資料寫好
    const d=snap.data()||{};
    if(d.disabled){card().innerHTML=`<div class="cl-brand">幻想智慧星</div><p class="cl-err">這個帳號暫停使用中，請找老師或管理員。</p><button class="cl-sub" id="clOut">換一個帳號</button>`;
      document.getElementById('clOut').onclick=()=>auth.signOut();mask.hidden=false;return}
    adminRev=d.adminRev||0;ME.name=d.name||'玩家';ME.code=d.code||'';
    applyState(d.sj||'',ME.name);
    ready=true;mask.hidden=true;fab(true);
    ref.update({lastLogin:FV.serverTimestamp()}).catch(()=>{});
    if(!S.char)pickChar(true);else toast(`歡迎回來，${ME.name}！`);
    if(!d.sj)push();
    // 管理員修改了資料 → 自動重新讀取
    unsubs.push(ref.onSnapshot(s=>{const x=s.data();if(!x)return;
      if(x.disabled){auth.signOut();return}
      if((x.adminRev||0)>adminRev){adminRev=x.adminRev;ME.name=x.name||ME.name;applyState(x.sj||'',ME.name);toast('管理員更新了你的資料');fab(true)}}));
    // 信箱
    unsubs.push(ref.collection('inbox').orderBy('createdAt','desc').limit(50).onSnapshot(s=>{MAIL=s.docs.map(x=>({id:x.id,...x.data()}));fab(true);popGift()}));
    syncBroadcasts();
  }catch(e){card().innerHTML=`<div class="cl-brand">幻想智慧星</div><p class="cl-err">讀取進度失敗：${e.code||e.message}</p><button class="cl-go" onclick="location.reload()">重新整理</button>`;mask.hidden=false}
});

/* ---------- 右上角：信箱、帳號 ---------- */
let MAIL=[],popped=false;
const live=m=>!m.claimed&&!(m.expireAt&&m.expireAt.toMillis&&m.expireAt.toMillis()<Date.now());
const fabEl=document.createElement('div');fabEl.className='cl-fab';document.body.appendChild(fabEl);
function fab(on){
  if(!on){fabEl.innerHTML='';return}
  const n=MAIL.filter(m=>live(m)&&(!m.read||(m.att&&!m.claimed))).length;
  fabEl.innerHTML=`<button id="clMailBtn" aria-label="信箱">✉${n?`<b class="dot">${n}</b>`:''}</button><button id="clMeBtn">👤 ${esc(ME&&ME.name||'')}</button>`;
  document.getElementById('clMailBtn').onclick=mailbox;
  document.getElementById('clMeBtn').onclick=meSheet;
}
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function attText(a){if(!a)return '';const o=[];if(a.candy)o.push(`星星糖 +${a.candy}`);if(a.exp)o.push(`經驗值 +${a.exp}`);
  (a.looks||[]).forEach(id=>{const it=ITEMS.find(i=>i.id==='L-'+id);o.push('造型：'+(it?it.n:id))});
  (a.homes||[]).forEach(id=>{const h=HOMES.find(x=>x.id===id);o.push('小屋：'+(h?h.n:id))});return o.join('・')}
const hasAtt=a=>a&&(a.candy||a.exp||(a.looks||[]).length||(a.homes||[]).length);
function mailbox(){
  const list=MAIL.filter(m=>!(m.expireAt&&m.expireAt.toMillis&&m.expireAt.toMillis()<Date.now()&&!m.claimed));
  openSheet(head('✉ 信箱')+`<div class="cl-list">${list.length?list.map(m=>{const att=hasAtt(m.att);
    return `<div class="cl-mail ${live(m)&&(!m.read||att)?'new':''}"><h4>${m.kind==='gift'?'🎁':m.kind==='system'?'🔔':'📢'} ${esc(m.title||'')}</h4>
    ${m.body?`<p>${esc(m.body)}</p>`:''}${att?`<span class="cl-att">${esc(attText(m.att))}</span>`:''}
    <small>${m.createdAt&&m.createdAt.toDate?m.createdAt.toDate().toLocaleDateString('zh-TW'):''}${m.expireAt&&m.expireAt.toDate&&!m.claimed?' ・ '+m.expireAt.toDate().toLocaleDateString('zh-TW')+' 前要領取':''}</small>
    ${att?(m.claimed?'<small>✓ 已經收下了</small>':`<button class="act buy" data-claim="${m.id}">收下</button>`):''}</div>`}).join(''):'<p class="hint">信箱是空的。</p>'}</div>`);
  document.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(b.dataset.claim));
  list.filter(m=>!m.read&&!hasAtt(m.att)).forEach(m=>db.doc(`players/${ME.uid}/inbox/${m.id}`).update({read:true}).catch(()=>{}));
}
async function claim(id){
  const m=MAIL.find(x=>x.id===id);if(!m||m.claimed||!live(m))return;
  const a=m.att||{};
  try{
    await db.doc(`players/${ME.uid}/inbox/${id}`).update({claimed:true,read:true,claimedAt:FV.serverTimestamp()});
    if(a.candy)S.candy+=a.candy;if(a.exp)S.exp+=a.exp;
    (a.looks||[]).forEach(x=>{const k='L-'+x;if(!S.items.includes(k))S.items.push(k)});
    (a.homes||[]).forEach(x=>{if(!S.homes.includes(x))S.homes.push(x)});
    save();push();stage(true);render();toast('收下了：'+attText(a));mailbox();
  }catch(e){toast('領取失敗，請稍後再試')}
}
function popGift(){
  if(popped)return;const g=MAIL.find(m=>live(m)&&hasAtt(m.att));if(!g)return;popped=true;
  setTimeout(()=>{if(document.getElementById('modal').hidden)openSheet(head('🎁 你收到禮物了！')+`<div class="cl-mail new"><h4>${esc(g.title||'')}</h4>${g.body?`<p>${esc(g.body)}</p>`:''}<span class="cl-att">${esc(attText(g.att))}</span><button class="act buy" data-claim="${g.id}">收下</button></div><button class="ghost" id="clAllMail" style="width:100%">打開信箱</button>`),
    document.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(b.dataset.claim)),document.getElementById('clAllMail').onclick=mailbox},1200);
}
/* 給全部玩家的信：第一次看到時複製一份到自己的信箱 */
async function syncBroadcasts(){
  try{const bs=await db.collection('broadcasts').orderBy('createdAt','desc').limit(20).get();
    for(const b of bs.docs){const ref=db.doc(`players/${ME.uid}/inbox/${b.id}`);const ex=await ref.get();
      if(!ex.exists){const d=b.data();if(d.expireAt&&d.expireAt.toMillis()<Date.now())continue;
        await ref.set({title:d.title||'',body:d.body||'',kind:d.kind||'notice',att:d.att||{},createdAt:d.createdAt,expireAt:d.expireAt||null,read:false,claimed:false,bc:true})}}}
  catch(e){}
}
function meSheet(){
  openSheet(head('👤 我的帳號')+`<p>顯示名稱：<b>${esc(ME.name)}</b></p><p>代號：<b>${esc(ME.code)}</b></p>
  <p class="hint">進度會自動存到雲端。在學校或別人的電腦玩完，記得按登出。</p>
  <button class="big" id="clLogout" style="width:100%">登出</button>`);
  document.getElementById('clLogout').onclick=async()=>{await push();try{localStorage.removeItem(skey(PL.cur))}catch(e){}closeQuiz();await auth.signOut();mode='login'};
}
})();
