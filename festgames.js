/* ===== 幻想智慧星：節慶小遊戲模組 =====
   每個節慶遊戲是 fest/ 資料夾裡的獨立網頁，在遊戲上方開啟；
   玩完回報拿到的節慶貨幣，這裡負責：每日次數、貨幣、兌換商店、活動結束自動換星星糖。 */

// 活動資料由 festival-config.js 提供；未載入時不啟動遊戲。
window.GAMEF = window.GAMEF || {};

/* ===== 共用節慶設定 ===== */

const FG_RATE=3;
// 1 個節慶貨幣 = 3 顆星星糖

const TRIAL_PRICE=50;
// 星宮每次體驗 50 顆星星糖

const TRIAL_DAILY=3;
// 星宮每一個小遊戲每天可體驗 3 次


/* ===== 星宮卡片圖片 ===== */

const TRIAL_COVER={
  moon:['fest/moon/img/moon-bg.jpg','50%'],
  qixi:['fest/seven/img/background.jpg','50%'],
  duanwu:['fest/dragonboat/img/river.png','58%'],
  halloween:[
    'fest/halloween/img/scene1.webp',
    '5%'
  ],

  xmas:[
    'fest/xmas/img/bg_slope.webp',
    '0%'
  ],

  newyear:[
    'fest/newyear/img/scene1.webp',
    '62%'
  ],

  children:[
    'fest/children/img/background.jpg',
    '28%'
  ]
};


/* ===== 尚未完成的小遊戲 =====
   資料夾名稱完全依正式 Master：
   dragonboat = 端午
   seven      = 七夕
   moon       = 中秋
   doubleten  = 國慶
*/

const TRIAL_SOON=Object.entries(window.FESTIVAL_CATALOG||{})
  .filter(([,g])=>g.status!=='ready').map(([k,g])=>[k,g.n,g.ic]);


(function(){

/* =========================================================
   節慶活動／星宮版面
========================================================= */

const css=document.createElement('style');

css.textContent=`

.fg-hero{
  position:relative;
  border-radius:16px;
  overflow:hidden;
  aspect-ratio:3/2;
  background:#2a1d4a
}

.fg-hero img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block
}

.fg-hero div{
  position:absolute;
  left:10px;
  right:10px;
  bottom:10px;
  background:#ffffffeb;
  border-radius:14px;
  padding:8px 12px;
  display:flex;
  flex-direction:column;
  gap:2px
}

.fg-hero b{
  font-family:var(--display);
  font-weight:400;
  font-size:1.3rem;
  color:var(--berry)
}

.fg-hero small{
  color:var(--muted)
}

.fg-bal{
  display:flex;
  justify-content:space-between;
  align-items:center;
  background:#fff5e0;
  border-radius:12px;
  padding:8px 12px;
  margin:10px 0;
  font-weight:700
}

.fg-bal span{
  font-size:1.4rem;
  color:#b7811a
}

.fg-shop{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
  margin-top:8px
}

.fg-item{
  border:2px solid var(--line);
  border-radius:14px;
  padding:8px;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:4px;
  text-align:center
}

.fg-item img{
  height:84px;
  max-width:100%;
  object-fit:contain
}

.fg-item.room img{
  width:100%;
  height:70px;
  object-fit:cover;
  border-radius:8px
}

.fg-item b{
  font-size:.9rem
}

.fg-item small{
  color:var(--muted);
  font-size:.75rem
}


/* ===== 節慶遊戲 iframe ===== */

#fgFrame{
  position:fixed;
  top:0;
  bottom:0;
  left:var(--fl,0);
  right:var(--fl,0);
  z-index:5000;
  background:#000
}

#fgFrame iframe{
  width:100%;
  height:100%;
  border:0;
  display:block
}


/* ===== 星宮入口 ===== */

.tp-entry{
  display:flex;
  align-items:center;
  gap:12px;
  border:2px solid #d9c6f2;
  border-radius:16px;
  padding:10px 12px;
  background:linear-gradient(120deg,#efe4ff,#ffe9f4);
  width:100%;
  text-align:left;
  font:inherit;
  color:inherit;
  cursor:pointer;
  margin-bottom:12px
}

.tp-entry .ic{
  font-size:2rem;
  line-height:1
}

.tp-entry b{
  font-family:var(--display);
  font-weight:400;
  font-size:1.15rem;
  color:#6b3fa0;
  display:block
}

.tp-entry small{
  color:var(--muted);
  font-size:.78rem
}


/* ===== 星宮遊戲卡片 ===== */

.tp-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px
}

.tp-card{
  border:2px solid var(--line);
  border-radius:14px;
  overflow:hidden;
  display:flex;
  flex-direction:column;
  background:#fff
}

.tp-card .pic{
  aspect-ratio:3/2;
  background:#efe4ff center/cover no-repeat;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:2.4rem
}

.tp-card .tx{
  padding:8px;
  display:flex;
  flex-direction:column;
  gap:3px;
  flex:1
}

.tp-card b{
  font-size:.95rem
}

.tp-card small{
  color:var(--muted);
  font-size:.74rem
}

.tp-card .tagx{
  align-self:flex-start;
  font-size:.68rem;
  background:#efe4ff;
  color:#6b3fa0;
  border-radius:99px;
  padding:1px 8px
}

.tp-card.soon{
  opacity:.8
}
.fg-loading{position:absolute;inset:0;z-index:2;display:grid;place-items:center;background:var(--bg,#f4ecfb);padding:24px;color:var(--ink,#3b2853);text-align:center}
.fg-loading>div{max-width:340px}
.fg-loading button{width:100%;min-height:44px}

.tp-card .act{
  margin-top:auto
}

`;

document.head.appendChild(css);


/* =========================================================
   節慶玩家資料
========================================================= */

function FS(k){

  S.fest=S.fest||{};

  const f=
    S.fest[k]=
    S.fest[k]||{
      c:0,
      day:'',
      left:0
    };

  const d=new Date().toDateString();

  if(f.day!==d){
    f.day=d;
    f.left=GAMEF[k].runs;
  }

  /* 舊版萬聖糖果資料轉移 */
  if(k==='halloween'&&!f.mig){
    f.mig=1;

    if(S.hw&&S.hw.c){
      f.c+=S.hw.c;
      S.hw.c=0;
    }
  }

  return f;
}


/* =========================================================
   節慶日期
========================================================= */

const FE=k=>
  FESTS.find(f=>f.k===k);

const onNow=k=>{
  try{
    return GAMEF[k]?.status==='ready' && festState(FE(k)).on
  }catch(e){
    return false
  }
};


/* =========================================================
   節慶造型
========================================================= */

const lookId=k=>
  'L-'+(S.char==='m'?'M':'F')+GAMEF[k].lk;


/* =========================================================
   舞台節慶按鈕
========================================================= */

window.stBadge=function(){

  try{

    return Object.keys(GAMEF)
      .filter(onNow)
      .map(k=>{

        const g=GAMEF[k];
        const f=FS(k);

        return `
          <button
            class="stbadge"
            data-fgo="${k}"
            aria-label="${g.n}・${g.title}，今天剩 ${f.left} 次"
          >
            ${g.ic} ${g.n}
            <small>剩${f.left}</small>
          </button>
        `;

      }).join('');

  }catch(e){

    return '';

  }

};


/* 舊萬聖節入口相容 */

window.hwMenu=()=>
  festMenu('halloween');


document.addEventListener(
  'click',
  e=>{

    const b=e.target.closest('[data-fgo]');

    if(b){

      e.preventDefault();
      e.stopPropagation();

      festMenu(b.dataset.fgo);

    }

  },
  true
);


/* =========================================================
   節慶活動頁
========================================================= */

function comingSoon(k){
  const g=window.FESTIVAL_CATALOG?.[k];if(!g||g.status==='ready')return;
  openSheet(head(g.n)+`<div class="result"><h2>COMING SOON</h2><p>${g.n}小遊戲開發中，完成後就能在這裡遊玩。</p><p class="hint">目前不會扣除挑戰次數或星星糖。節慶商品仍依原有販售設定開放。</p><button class="big" id="fsSoonBack">返回星宮體驗館</button></div>`);
  document.getElementById('fsSoonBack').onclick=()=>starPalace();
}

window.festMenu=function(k){
  if(window.FESTIVAL_CATALOG?.[k]?.status!=='ready'){comingSoon(k);return;}

  const g=GAMEF[k];
  const F=FE(k);

  if(!g||!F)return;

  if(!onNow(k)){

    toast(`${g.n}活動目前沒有開放喔`);
    return;

  }

  const f=FS(k);
  const st=festState(F);

  const days=Math.max(
    1,
    Math.ceil((st.end-Date.now())/864e5)
  );

  try{
    SND.setTheme(k)
  }catch(e){}


  const look=
    ITEMS.find(i=>i.id===lookId(k));

  const home=
    HOMES.find(h=>h.id===g.home);

  const hasL=
    S.items.includes(lookId(k));

  const hasR=
    (S.homes||[]).includes(g.home);


  const shop=[

    {
      id:'look',
      cls:'',
      img:`outfits/${(S.char==='m'?'M':'F')+g.lk}.webp`,
      n:look?look.n:'節慶套裝',
      d:'SP'+g.lk.slice(2)+' 節慶專屬造型',
      c:g.look,
      own:hasL
    },

    {
      id:'room',
      cls:'room',
      img:home?home.img:'',
      n:home?home.n:'節慶小屋',
      d:'RSP'+g.home.slice(2)+' 不用等級，直接搬進去',
      c:g.room,
      own:hasR
    },

    {
      id:'stars',
      cls:'',
      img:'',
      n:'星星糖 300',
      d:'馬上拿到 300 星星糖',
      c:Math.ceil(300/FG_RATE),
      own:false
    },

    {
      id:'dice',
      cls:'',
      img:'',
      n:'骰子加碼券 ×2',
      d:'家園骰子多擲 2 次',
      c:20,
      own:false
    }

  ];


  openSheet(

    head(`${g.ic} ${g.n}特別活動`)

    +`

    <div class="fg-hero">

      <img
        src="${home?home.img:''}"
        alt=""
      >

      <div>

        <b>${g.title}</b>

        <small>
          活動到 ${fmtMD(st.end)}
          ・還剩 ${days} 天
          ・今天還能玩 ${f.left} 次
        </small>

      </div>

    </div>


    <div class="fg-bal">

      ${g.ic} 我的${g.cur}

      <span>${f.c}</span>

    </div>


    <button
      class="big"
      id="fgGo"
      style="width:100%"
      ${f.left<=0?'disabled':''}
    >

      ${
        f.left>0
        ?`出發！（今天還剩 ${f.left} 次）`
        :'今天的次數用完了，明天再來！'
      }

    </button>


    <h3 style="margin:14px 0 0">
      ${g.cur}兌換所
    </h3>


    <p class="hint mobile-compact">

      ${g.cur}只能在活動期間使用，

      ${fmtMD(st.end)} 活動結束後，

      剩下的會自動換成星星糖

      （1 個 = ${FG_RATE} 顆）。

    </p>


    <div class="fg-shop">

      ${shop.map(x=>`

        <div class="fg-item ${x.cls}">

          ${
            x.img
            ?`<img src="${x.img}" alt="">`
            :`
              <div style="font-size:42px;line-height:84px">
                ${x.id==='stars'?'⭐':'🎲'}
              </div>
            `
          }

          <b>${x.n}</b>

          <small>${x.d}</small>


          ${
            x.own

            ?'<button class="act" disabled>已擁有</button>'

            :x.c==null

            ?'<button class="act" disabled>價格待定</button>'

            :`
              <button
                class="act buy"
                data-fx="${x.id}"
                ${f.c<x.c?'disabled':''}
              >
                ${g.ic} ${x.c}
              </button>
            `
          }

        </div>

      `).join('')}

    </div>

  `);


  document.getElementById('fgGo').onclick=
    ()=>launch(k);


  document
    .querySelectorAll('[data-fx]')
    .forEach(b=>

      b.onclick=()=>{

        const x=
          shop.find(s=>s.id===b.dataset.fx);

        if(!onNow(k)){toast('活動已結束，現在無法兌換。');closeQuiz();return;}
        const f=FS(k);

        if(
          !x||
          x.c==null||
          f.c<x.c||
          x.own||
          (x.id==='look'&&S.items.includes(lookId(k)))||
          (x.id==='room'&&(S.homes||[]).includes(g.home))
        )return;


        f.c-=x.c;

        window.FSTAT&&
          FSTAT('fx:'+k+':'+x.id);


        if(x.id==='look'){

          if(!S.items.includes(lookId(k)))
            S.items.push(lookId(k));

        }

        else if(x.id==='room'){

          if(!S.homes.includes(g.home))
            S.homes.push(g.home);

        }

        else if(x.id==='stars'){

          S.candy+=300;

        }

        else if(x.id==='dice'){

          S.diceBonus=
            (S.diceBonus||0)+2;

        }


        save();

        toast(`兌換成功：${x.n}`);

        try{
          SND.play('coin')
        }catch(e){}

        festMenu(k);

        render();

        stage(true);

      }

    );

};


/* =========================================================
   開啟節慶小遊戲
========================================================= */

let cur=null;


function launch(k,trial){
  if(cur||window.CLOUD_GATE&&!window.FS_CLOUD_READY)return;
  if(!GAMEF[k]||GAMEF[k].status!=='ready'){comingSoon(k);return;}
  if(!trial&&(!onNow(k)||FS(k).left<=0))return;
  if(trial&&((TS().used[k]|0)>=TRIAL_DAILY||S.candy<TRIAL_PRICE))return;
  closeQuiz();try{SND.pause()}catch(e){}
  const session=crypto.randomUUID();
  const box=document.createElement('div');box.id='fgFrame';
  box.innerHTML=`<iframe src="${GAMEF[k].url}?embed=1&char=${S.char||'f'}&session=${session}&trialPrice=${TRIAL_PRICE}${trial?'&trial=1':''}" title="${GAMEF[k].title}" allow="autoplay"></iframe><div class="fg-loading" id="fgLoading"><div><p id="fgLoadText" role="status">正在載入遊戲，尚未扣除次數或星星糖…</p><button class="big" id="fgLoadBack">${trial?'返回星宮體驗館':'返回活動頁'}</button></div></div>`;
  document.body.appendChild(box);
  cur={k,frame:box.querySelector('iframe'),session,got:false,started:false,ready:false,trial:!!trial};
  cur.loadTimer=setTimeout(()=>{const text=document.getElementById('fgLoadText');if(text)text.textContent='遊戲載入較久或素材無法取得，尚未扣次。可以先返回再試一次。';},12000);
  document.getElementById('fgLoadBack').onclick=closeCurrentGame;
}

function closeCurrentGame(){
  if(!cur)return;
  const {k,trial,loadTimer}=cur;clearTimeout(loadTimer);
  document.getElementById('fgFrame')?.remove();cur=null;
  try{SND.resume()}catch(e){}render();stage();
  if(trial)starPalace();else if(onNow(k))festMenu(k);else{closeQuiz();toast('活動已結束，可從星宮繼續體驗。');}
}

/* =========================================================
   🏰 星宮體驗館
   每個節慶遊戲每天可體驗 3 次
   每次 50 星星糖
   沒有正式節慶獎勵
========================================================= */

function TS(){

  const d=
    new Date().toDateString();


  if(
    !S.trial||
    S.trial.day!==d
  ){

    S.trial={
      day:d,
      used:{}
    };

  }


  S.trial.used=
    S.trial.used||{};


  return S.trial;

}


window.starPalace=function(){

  const t=TS();


  const cards=

    Object.keys(GAMEF)

    .map(k=>{

      const g=GAMEF[k];

      const home=
        HOMES.find(h=>h.id===g.home);

      const used=
        t.used[k]|0;


      const cv=

        TRIAL_COVER[k]

        ||

        (
          home&&home.img
          ?[home.img,'50%']
          :null
        );


      return `

        <div class="tp-card">

          <div
            class="pic"
            style="${
              cv
              ?`
                background-image:url('${cv[0]}');
                background-position:50% ${cv[1]}
              `
              :''
            }"
          >
            ${cv?'':g.ic}
          </div>


          <div class="tx">

            <b>
              ${g.ic}
              ${g.n}・${g.title}
            </b>

            <span class="tagx">
              體驗模式・沒有獎勵
            </span>


            ${
              used>=TRIAL_DAILY

              ?`
                <button
                  class="act"
                  disabled
                >
                  今天已體驗
                  ${TRIAL_DAILY}/${TRIAL_DAILY}
                </button>
              `

              :`
                <button
                  class="act buy"
                  data-tp="${k}"
                  ${S.candy<TRIAL_PRICE?'disabled':''}
                >
                  ⭐ ${TRIAL_PRICE}
                  體驗一次
                  （${used}/${TRIAL_DAILY}）
                </button>
              `
            }

          </div>

        </div>

      `;

    })

    .join('')


    +

    TRIAL_SOON

    .map(
      ([k,n,ic])=>`

        <div class="tp-card soon">

          <div class="pic">
            ${ic}
          </div>

          <div class="tx">

            <b>
              ${ic} ${n}
            </b>

            <span class="tagx">
              COMING SOON｜開發中
            </span>

            <button
              class="act"
              data-fsoon="${k}"
            >
              查看開發狀態
            </button>

          </div>

        </div>

      `
    )

    .join('');


  openSheet(

    head('🏰 星宮體驗館')

    +`

    <p class="hint mobile-compact">

      已完成的節慶小遊戲可在這裡體驗；標示 COMING SOON 的遊戲尚在開發。

      每個遊戲每天可以體驗

      ${TRIAL_DAILY} 次，

      每次 ${TRIAL_PRICE} 顆星星糖。

      <br>

      體驗模式

      <b>沒有任何獎勵</b>，

      也不會用掉節慶活動的次數。

    </p>


    <div class="fg-bal">

      ⭐ 我的星星糖

      <span>${S.candy}</span>

    </div>


    <div class="tp-grid">

      ${cards}

    </div>

  `);


  document.querySelectorAll('[data-fsoon]').forEach(b=>b.onclick=()=>comingSoon(b.dataset.fsoon));

  document
    .querySelectorAll('[data-tp]')
    .forEach(b=>

      b.onclick=()=>{

        const k=
          b.dataset.tp;

        const g=
          GAMEF[k];

        const t=
          TS();


        if(
          (t.used[k]|0)>=TRIAL_DAILY
          ||
          S.candy<TRIAL_PRICE
        )return;


        if(
          !confirm(
            `花 ${TRIAL_PRICE} 顆星星糖體驗「${g.title}」一次？\n體驗模式沒有任何獎勵喔！`
          )
        )return;


        launch(k,true);

      }

    );

};


/* 星宮入口 */

document.addEventListener(
  'click',
  e=>{

    const b=
      e.target.closest('[data-tpgo]');

    if(b){

      e.preventDefault();

      starPalace();

    }

  }
);


/* =========================================================
   接收節慶小遊戲訊息
========================================================= */

addEventListener('message',e=>{
  if(window.CLOUD_GATE&&!window.FS_CLOUD_READY)return;
  if(!cur||e.source!==cur.frame.contentWindow||e.origin!==location.origin)return;
  const d=e.data||{};
  if(d.session!==cur.session||d.fsGame!==cur.k)return;
  const reply=(type,extra={})=>cur.frame.contentWindow.postMessage({type,session:cur.session,...extra},location.origin==='null'?'*':location.origin);
  const close=closeCurrentGame;
  if(d.type==='fsGameReady'){
    cur.ready=true;clearTimeout(cur.loadTimer);document.getElementById('fgLoading')?.remove();return;
  }
  if(d.type==='fsGameStart'){
    if(!cur.ready||GAMEF[cur.k]?.status!=='ready'){reply('fsGameStarted',{ok:false,message:'遊戲尚未準備完成，請返回後再試。'});return;}
    if(cur.started){reply('fsGameStarted',{ok:true});return}
    const k=cur.k;
    if(cur.trial){
      const t=TS();
      if((t.used[k]|0)>=TRIAL_DAILY||S.candy<TRIAL_PRICE){reply('fsGameStarted',{ok:false,message:'體驗次數或星星糖不足，請返回體驗館。'});return}
      S.candy-=TRIAL_PRICE;t.used[k]=(t.used[k]|0)+1;window.FSTAT&&FSTAT('t:'+k);
    }else{
      if(!onNow(k)||FS(k).left<=0){reply('fsGameStarted',{ok:false,message:'活動未開放或今日次數已用完，請返回活動頁。'});return}
      FS(k).left--;window.FSTAT&&FSTAT('f:'+k);
    }
    cur.started=true;save();reply('fsGameStarted',{ok:true});return;
  }
  if(d.type==='fsGameResult'){
    if(!cur.started||d.completed!==true||!Number.isInteger(d.earned)||d.earned<0)return;
    if(!cur.got){
      cur.got=true;cur.earned=Math.min(500,d.earned);
      if(!cur.trial){FS(cur.k).c+=cur.earned;window.FSTAT&&FSTAT('fc:'+cur.k,cur.earned);save()}
    }
    reply('fsGameSettled',{trial:cur.trial,earned:cur.trial?0:cur.earned});return;
  }
  if(d.type==='fsGameReplay'&&cur.got){
    const {k,trial}=cur;
    const can=trial?(TS().used[k]|0)<TRIAL_DAILY&&S.candy>=TRIAL_PRICE:onNow(k)&&FS(k).left>0;
    close();if(can)launch(k,trial);else toast(trial?'今日體驗次數已用完或星星糖不足':'今天的活動次數已用完，或活動已結束');
    return;
  }
  if(d.type==='fsGameClose')close();
});

/* =========================================================
   活動結束：
   剩餘節慶貨幣自動換星星糖
========================================================= */

let checking=false,conversionNotices=[],noticeTimer=0;
function showConversionNotice(){
  clearTimeout(noticeTimer);noticeTimer=0;
  if(!conversionNotices.length||cur)return;
  const modal=document.getElementById('modal');if(modal&&!modal.hidden)return;
  const done=conversionNotices.splice(0);
  openSheet(head('🔔 節慶活動結束了')+`<p class="qtext">剩餘節慶貨幣已自動換成星星糖：</p><ul>${done.map(x=>`<li>${x}</li>`).join('')}</ul><button class="big" onclick="closeQuiz()">好的</button>`);
}


function convert(){

  if(
    checking||
    (window.CLOUD_GATE&&!window.FS_CLOUD_READY)||
    cur||
    !S||
    !S.fest
  )return;


  checking=true;


  const done=[];


  for(
    const k
    of Object.keys(GAMEF)
  ){

    const f=
      S.fest[k];


    if(
      !f||
      !(f.c>0)||
      onNow(k)
    )continue;


    const stars=
      f.c*FG_RATE;


    done.push(
      `${GAMEF[k].n}的 ${f.c} 個${GAMEF[k].cur} → ${stars} 顆星星糖`
    );


    S.candy+=stars;

    f.c=0;

  }


  if(done.length){

    save();


    conversionNotices.push(...done);
    noticeTimer=setTimeout(showConversionNotice,900);

  }


  checking=false;

}


/* =========================================================
   Render 包裝
========================================================= */

const _render=
  window.render;


window.render=function(){

  const r=
    _render.apply(
      this,
      arguments
    );


  try{
    convert();if(conversionNotices.length&&!noticeTimer)noticeTimer=setTimeout(showConversionNotice,900);
  }catch(e){}


  return r;

};


/* =========================================================
   啟動
========================================================= */

setTimeout(
  ()=>{

    try{

      convert();

      stage();

    }catch(e){}

  },

  500

);


// Account changes invalidate the old round and pending notices before loading new progress.
addEventListener('fs-player-changing',()=>{
  if(cur){clearTimeout(cur.loadTimer);document.getElementById('fgFrame')?.remove();cur=null;try{SND.resume()}catch(e){}}
  clearTimeout(noticeTimer);noticeTimer=0;conversionNotices=[];
});
addEventListener('fs-player-ready',()=>{convert();stage();});

// Refresh calendar-driven entries after returning from a background tab.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!cur){convert();stage();showConversionNotice();}});
setInterval(()=>{if(!document.hidden&&!cur){convert();stage();showConversionNotice();}},60000);

})();
