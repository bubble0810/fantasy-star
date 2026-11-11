/* Main homepage panels. No ranking calculation or player-to-player transfers. */
(() => {
  'use strict';
  const esc=FSNickname.escape;
  let rankTab='total',marketTab='stars';
  const uiOptions={hideInactiveFestival:true};
  const activeFests=()=>FESTS.filter(f=>{try{return festState(f).on}catch{return false}});
  const smallAmount=n=>n>=1e8?(Math.floor(n/1e7)/10)+'億':n>=1e4?(Math.floor(n/1e3)/10)+'萬':String(n);
  function stageActions(){
    const active=activeFests();
    const button=(cls,attrs,icon,label)=>`<button class="stbtn ${cls}" ${attrs}><span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label">${label}</span></button>`;
    const festivals=active.map(f=>{const g=window.FESTIVAL_CATALOG?.[f.k];return button('event',`data-festival-entry data-festival-key="${esc(f.k)}"`,g?.ic||'🎉',esc(f.n))}).join('');
    return `<div class="stbar"><div class="stbar-main">${button('quest',`id="t-quest" aria-pressed="${tab==='quest'}"`,'🗺️','闖關')}${button('tp',`data-tpgo aria-label="星宮體驗館" aria-pressed="${tab==='palace'}"`,'🏰','星宮')}</div><div class="stbar-events">${festivals}</div></div>`;
  }
  function updateHud(){
    const progress=document.querySelector('.hud-level'),level=document.getElementById('lv'),experience=document.getElementById('xptxt');
    if(progress&&level&&experience){
      const label='Lv. '+level.textContent.replace(/^Lv\.\s*/,''),detail=level.textContent+'｜經驗 '+experience.textContent;
      document.querySelectorAll('.profile-level-label').forEach(e=>e.textContent=label);
      progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','升級經驗');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');progress.setAttribute('aria-valuenow',parseFloat(document.getElementById('xpbar').style.width)||0);progress.setAttribute('aria-valuetext',detail);
      document.querySelectorAll('#hudNameSlot button').forEach(button=>{const name=button.querySelector('.profile-name')?.textContent||curName();button.title=name+'｜'+detail;button.setAttribute('aria-label',name+'，'+detail+'，點擊查看帳號詳情');button.setAttribute('aria-haspopup','dialog');});
    }
    const star=document.getElementById('candy');if(star){star.textContent=smallAmount(S.candy||0);star.title=`${S.candy||0} 星星糖`;const profile=document.getElementById('hudNameSlot');profile?.style.setProperty('--profile-money-width',Math.ceil(star.parentElement.getBoundingClientRect().width)+'px');}
    const slot=document.getElementById('festCurrencyHud');if(!slot)return;
    const active=activeFests().filter(f=>window.FESTIVAL_CATALOG?.[f.k]?.cur);
    slot.hidden=!active.length;slot.closest('.hud-money').hidden=!active.length;
    slot.innerHTML=active.map(f=>{const g=FESTIVAL_CATALOG[f.k],amount=S.fest?.[f.k]?.c||0;return `<span class="currency-entry" data-currency="${esc(f.k)}" title="${esc(g.cur)} ${amount}" aria-label="${esc(g.cur)} ${amount}"><span class="currency-icon" aria-hidden="true">${g.ic}</span><span class="currency-amount">${smallAmount(amount)}</span></span>`}).join('');
    slot.title='點擊查看全部貨幣';
  }
  function wallet(){
    const fests=Object.entries(window.FESTIVAL_CATALOG||{}).filter(([k,g])=>g.cur&&(activeFests().some(f=>f.k===k)||(S.fest?.[k]?.c||0)>0));
    openSheet(head('我的貨幣')+`<div class="wallet-list"><div class="wallet-row"><span>⭐ 星星糖</span><strong>${S.candy||0}</strong></div>${fests.map(([k,g])=>`<div class="wallet-row"><span>${g.ic} ${esc(g.cur)}</span><strong>${S.fest?.[k]?.c||0}</strong></div>`).join('')}</div><p class="hint">這裡顯示完整數量；活動貨幣的使用與到期轉換依各活動規則。</p>`);
  }
  function festivalEntry(key){
    const fs=activeFests();if(!fs.length)return;
    const selected=fs.find(f=>f.k===key);if(selected){festMenu(selected.k);return;}
    if(fs.length===1){festMenu(fs[0].k);return;}
    openSheet(head('當期節慶活動')+`<div class="wallet-list">${fs.map(f=>`<button class="wallet-row" data-choose-festival="${f.k}"><span>${esc(f.n)}</span><b>進入</b></button>`).join('')}</div>`);
    document.querySelectorAll('[data-choose-festival]').forEach(b=>b.onclick=()=>festMenu(b.dataset.chooseFestival));
  }
  function saleKeys(group){return group==='flowers'?SEEDS.map(s=>s.n):group==='gifts'?PETS.map(p=>p.gift):[];}
  function sellPanel(group){
    const allowed=new Set(saleKeys(group)),items=Object.entries(S.bag||{}).filter(([k,n])=>allowed.has(k)&&n>0),total=items.reduce((n,[k,q])=>n+sellPrice(k)*q,0),title=group==='flowers'?'花朵收購':'幸運物收購';
    return `<section class="sale-section"><h3>${title}</h3><p class="hint">${group==='flowers'?'收成後可以直接在這裡賣出花朵。':'寵物帶回的幸運物可以在這裡直接賣出。'}</p>${items.length?`<div class="bag">${items.map(([k,n])=>`<div class="bi"><b class="bin">${bagIco(k)}${esc(k)}</b><small>×${n}・每個 ${sellPrice(k)} 星星糖</small><div class="petacts"><button class="act buy" data-sell="${esc(k)}">賣 1 個</button><button class="act wear" data-sellall="${esc(k)}">全賣 +${sellPrice(k)*n}</button></div></div>`).join('')}</div><button class="big sale-total" data-sellgroup="${group}">出售全部${group==='flowers'?'花朵':'幸運物'} +${total} 糖</button>`:`<p class="hint">目前沒有可出售的${group==='flowers'?'花朵':'幸運物'}。</p>`}</section>`;
  }
  function pageHeader(title,description='',backLabel='返回主頁'){
    return `<header class="content-page-head"><button class="page-back" data-home-view>← ${backLabel}</button><h2 tabindex="-1">${esc(title)}</h2>${description?`<p class="hint">${esc(description)}</p>`:''}</header>`;
  }
  function finalizePage(panel){
    if(!panel||tab==='lobby'||tab==='quest'&&questView==='hub')return;
    if(!panel.querySelector('.content-page-head')){
      const title={wardrobe:'衣櫥',room:'房間',home:'家園',market:'市場',shop:'商城',rank:'星空榜',palace:'星宮體驗館'}[tab];
      if(!title)return;
      const old=panel.querySelector('h2'),parent=old?.parentElement;
      panel.insertAdjacentHTML('afterbegin',pageHeader(title));
      if(old){old.tabIndex=-1;panel.querySelector('.content-page-head h2').replaceWith(old);if(parent!==panel&&parent?.classList.contains('fh')&&!parent.children.length)parent.remove();}
    }
    panel.querySelectorAll('h2').forEach(h=>{if(h.closest('.content-page-head'))return;const section=document.createElement('h3');for(const a of h.attributes)section.setAttribute(a.name,a.value);while(h.firstChild)section.append(h.firstChild);h.replaceWith(section);});
  }
  function scrollPanel(){
    const panel=document.getElementById('panel');if(!panel)return;
    const stickyHeight=document.getElementById('stagewrap')?.getBoundingClientRect().height||0;panel.style.scrollMarginTop=(stickyHeight+12)+'px';
    const y=panel.getBoundingClientRect().top+scrollY-stickyHeight-12;scrollTo({top:Math.max(0,y),behavior:'instant'});
    panel.querySelector('h2')?.focus({preventScroll:true});
  }
  function navigateQuest(view='hub'){
    tab='quest';questView=['hub','main','practice','competition'].includes(view)?view:'hub';trySp=null;
    stage();render();scrollPanel();
  }
  function navigateHome(){tab='lobby';trySp=null;stage();render();scrollTo({top:0,behavior:'instant'});}
  function renderLobby(panel){
    delete panel.dataset.questView;
    const active=activeFests(),gifts=(S.pets||[]).reduce((n,p)=>n+(p.gifts||0),0);
    const ready=(S.plots||[]).filter(p=>p&&plantState(p).ready).length;
    panel.innerHTML=`<section class="lobby-news"><header class="lobby-heading"><div><span class="lobby-eyebrow">YOUR LITTLE UNIVERSE</span><h2 tabindex="-1">今日星訊</h2></div><span class="lobby-spark" aria-hidden="true">✦</span></header><p class="lobby-welcome">歡迎回家，${esc(curName())}。今天也收集一點閃亮的日常。</p><div class="lobby-updates">${active.map(f=>{const g=window.FESTIVAL_CATALOG?.[f.k];return `<button class="lobby-update lobby-event" data-festival-entry data-festival-key="${esc(f.k)}"><span aria-hidden="true">${g?.ic||'✦'}</span><span><b>${esc(f.n)}進行中</b><small>活動至 ${fmtMD(festState(f).end)}</small></span><span aria-hidden="true">→</span></button>`}).join('')}${gifts?`<button class="lobby-update" data-lobby-pets><span aria-hidden="true">🐾</span><span><b>寵物帶回了幸運物</b><small>${gifts} 個等待領取</small></span><span aria-hidden="true">→</span></button>`:''}${ready?`<button class="lobby-update" data-lobby-garden><span aria-hidden="true">✿</span><span><b>花園可以收成了</b><small>${ready} 格花朵已成熟</small></span><span aria-hidden="true">→</span></button>`:''}</div>${!active.length&&!gifts&&!ready?'<p class="lobby-quiet">小屋裡一切安好，準備好就出發吧。</p>':''}<footer class="lobby-footer"><span>換上喜歡的造型，展開今天的冒險。</span><button data-quest-view="hub">前往闖關 <span aria-hidden="true">↗</span></button></footer></section>`;
  }
  function renderQuest(panel){
    if(!['hub','main','practice','competition'].includes(questView))questView='hub';
    panel.dataset.questView=questView;
    if(questView==='hub'){
      panel.innerHTML=`${pageHeader('闖關')}<div class="quest-portals"><button class="quest-portal portal-main" data-quest-view="main"><span class="portal-icon" aria-hidden="true">✦</span><span class="portal-copy"><b>一般闖關</b><span>九大章節・108 關主線</span></span><span class="portal-arrow" aria-hidden="true">→</span></button><button class="quest-portal portal-practice" data-quest-view="practice"><span class="portal-icon" aria-hidden="true">✎</span><span class="portal-copy"><b>自由練習</b><span>自選題型與難度・不限次數</span></span><span class="portal-arrow" aria-hidden="true">→</span></button><button class="quest-portal portal-competition" data-quest-view="competition"><span class="portal-icon" aria-hidden="true">◇</span><span class="portal-copy"><b>競賽挑戰</b><span>急急棒・翻牌・顏色陷阱</span></span><span class="portal-arrow" aria-hidden="true">→</span></button></div>`;
      return;
    }
    if(questView==='main')panel.innerHTML=pageHeader('一般闖關')+mapHTML();
    if(questView==='practice')panel.innerHTML=pageHeader('自由練習')+`
    <details class="page-rules"><summary>計分與獎勵規則</summary><div class="rules"><span>每關 5 題，滿分 100</span><span>答對一題 20 分</span><span>PASS 換題扣 10 分（每回合 2 次）</span><span>✦ 應援過關：每天 3 次，直接答對</span><span>8 秒內答對再 +5 糖</span><span>答對一題 +20 糖，滿分加碼 +50</span></div></details>
    <div class="diffpick"><span>難度</span>${[['easy','簡單'],['mid','普通'],['hard','困難'],['mix','綜合']].map(([k,n])=>`<button data-qd="${k}" aria-pressed="${(S.qdiff||'mix')===k}">${n}</button>`).join('')}<small>題庫 ${Q.filter(q=>!q[6]).length} 題・數學無限出題・今天應援剩 ${cheerState().left} 次</small></div>
    <div class="cats"><button class="cat all" data-c="all"><b>綜合大冒險</b><span>${CATS.length} 種題型隨機出題，最考驗實力</span></button>
    ${CATS.map(c=>`<button class="cat" data-c="${c.k}"><b>${c.n}</b><span>${c.d}</span></button>`).join('')}</div>
    <div class="records"><span>已闖關 <b>${S.played}</b> 次</span><span>累計答對 <b>${S.correct}</b> 題</span><span>全對 <b>${S.perfect}</b> 次</span><span>已收集套裝 <b>${ITEMS.filter(i=>own(i.id)&&fits(i)).length}/${ITEMS.filter(fits).length}</b></span><button class="linkbtn" id="rstlink">清除遊戲紀錄・重新開始</button></div>`;
    if(questView==='competition')panel.innerHTML=pageHeader('競賽挑戰')+`    <div class="games">
      <button class="game" data-g="maze"><b>電流急急棒</b><span>沿軌道拖曳，勿碰邊或放開。</span><em>最高 +50 糖</em></button>
      <button class="game" data-g="memory"><b>記憶翻牌</b><span>4／6／8 對，配對次數越少越好。</span><em>最高 +60 糖</em></button>
      <button class="game" data-g="stroop"><b>顏色陷阱</b><span>看字的顏色作答，限時 30 秒。</span><em>答越多拿越多</em></button>
    </div>
<details class="page-rules"><summary>排行收錄規則</summary><p class="hint">急急棒只計第三關秒數；翻牌只計第三關 8 對次數。顏色陷阱完成 30 秒即可列入，包括主線。星空榜由管理員發布更新。</p></details>`;
    panel.querySelector('#rstlink')?.addEventListener('click',playerSheet);
    panel.querySelectorAll('.cat').forEach(b=>b.onclick=()=>startQuiz(b.dataset.c));
    panel.querySelectorAll('[data-qd]').forEach(b=>b.onclick=()=>{S.qdiff=b.dataset.qd;save();render()});
    panel.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>levelIntro(+b.dataset.lv));
    panel.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{chap=+b.dataset.ch;render()});
    panel.querySelectorAll('.game').forEach(b=>b.onclick=()=>({maze:mazeMenu,memory:memMenu,stroop:stroopStart})[b.dataset.g]());
  }

  function renderMarket(panel){
    panel.innerHTML=`<section class="market-view"><h2>市場</h2><div class="sub market-tabs"><button data-market-tab="stars" aria-pressed="${marketTab==='stars'}">星星市場</button><button data-market-tab="players" aria-pressed="${marketTab==='players'}">節慶貨幣交易</button></div><div id="marketBody">${marketTab==='stars'?mkBody():`<div class="pending-card"><div class="pending-icon">🤝</div><h3>玩家交易準備中</h3><p>節慶貨幣交易尚未開放。</p><button class="act" disabled>尚未開放交易</button></div>`}</div></section>`;
    panel.querySelectorAll('[data-market-tab]').forEach(b=>b.onclick=()=>{marketTab=b.dataset.marketTab;renderMarket(panel)});
    if(marketTab==='stars')mkBind(panel);finalizePage(panel);
  }
  function renderRank(panel){
    if(!window.FSLeaderboard){panel.innerHTML='<section class="rank-view"><h2>星空榜</h2><p class="hint">排行榜模組未載入，請重新整理。</p></section>';return;}
    const state=window.FSLeaderboardSync?.state||{publicStatus:'loading'},result=state.result||{enabled:false,boards:{}};
    FSLeaderboard.render(panel,result,rankTab);
    panel.onclick=e=>{const button=e.target.closest('[data-board]');if(button){rankTab=button.dataset.board;renderRank(panel);}};
    const status={loading:'排行榜載入中',unavailable:'尚未開放',closed:'尚未開放',unpublished:'等待管理員發布',error:'暫時無法讀取排行榜'}[state.publicStatus];
    const hint=panel.querySelector('.hint');if(status&&hint)hint.textContent=status;
    const badge=panel.querySelector('.rank-status');if(badge)badge.textContent=status||'已發布';
    if(state.publishedAt){const time=document.createElement('p');time.className='hint';time.textContent='發布時間：'+new Date(state.publishedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'});panel.querySelector('.rank-view').append(time);}
    finalizePage(panel);
    if(state.syncStatus==='pending'||state.syncStatus==='storage-error'){const notice=document.createElement('p');notice.className='hint';notice.textContent='你的成績尚未完成同步，請稍後再試或聯絡管理員。';panel.querySelector('.rank-view').append(notice);}
  }
  addEventListener('fs-player-changing',()=>{tab='lobby';questView='hub';});
  addEventListener('fs-leaderboard-updated',()=>{if(tab==='rank')renderRank(document.getElementById('panel'));});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-home-view]')){navigateHome();return;}
    if(e.target.closest('[data-lobby-pets],[data-lobby-garden]')){homeSub=e.target.closest('[data-lobby-pets]')?'pets':'garden';tab='home';stage();render();scrollPanel();return;}
    const destination=e.target.closest('button[data-quest-view]');if(destination){navigateQuest(destination.dataset.questView);return;}
    if(e.target.closest('[data-wallet]'))wallet();
    if(e.target.closest('[data-festival-entry]'))festivalEntry(e.target.closest('[data-festival-entry]').dataset.festivalKey);
    if(e.target.closest('[data-rankgo]')){tab='rank';trySp=null;stage();render();}
  });
  window.FSHomeUI={stageActions,updateHud,sellPanel,saleKeys,renderMarket,renderRank,renderQuest,renderLobby,navigateHome,pageHeader,finalizePage,navigateQuest,scrollPanel,options:uiOptions};
  stage();render();
})();
