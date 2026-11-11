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
    return `<div class="stbar"><div class="stbar-main">${button('quest',`id="t-quest" aria-pressed="${tab==='quest'}"`,'🗺️','闖關')}${button('tp','data-tpgo aria-label="星宮體驗館"','🏰','星宮')}</div><div class="stbar-events">${festivals}</div></div>`;
  }
  function updateHud(){
    const progress=document.querySelector('.hud-level'),level=document.getElementById('lv'),experience=document.getElementById('xptxt');
    if(progress&&level&&experience){
      const label='Lv. '+level.textContent.replace(/^Lv\.\s*/,''),detail=level.textContent+'｜經驗 '+experience.textContent;
      document.querySelectorAll('.profile-level-label').forEach(e=>e.textContent=label);
      progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','升級經驗');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');progress.setAttribute('aria-valuenow',parseFloat(document.getElementById('xpbar').style.width)||0);progress.setAttribute('aria-valuetext',detail);
      document.querySelectorAll('#hudNameSlot button').forEach(button=>{const name=button.querySelector('.profile-name')?.textContent||curName();button.title=name+'｜'+detail;button.setAttribute('aria-label',name+'，'+detail+'，點擊查看帳號詳情');button.setAttribute('aria-haspopup','dialog');});
    }
    const star=document.getElementById('candy');if(star){star.textContent=smallAmount(S.candy||0);star.title=`${S.candy||0} 星星糖`;}
    const slot=document.getElementById('festCurrencyHud');if(!slot)return;
    const active=activeFests().filter(f=>window.FESTIVAL_CATALOG?.[f.k]?.cur);
    slot.hidden=!active.length;
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
  function renderMarket(panel){
    panel.innerHTML=`<section class="market-view"><h2>市場</h2><div class="sub market-tabs"><button data-market-tab="stars" aria-pressed="${marketTab==='stars'}">星星市場</button><button data-market-tab="players" aria-pressed="${marketTab==='players'}">節慶貨幣交易</button></div><div id="marketBody">${marketTab==='stars'?mkBody():`<div class="pending-card"><div class="pending-icon">🤝</div><h3>玩家交易準備中</h3><p>未來可在這裡交易節慶貨幣。<br>交易規則確認後開放。</p><button class="act" disabled>尚未開放交易</button></div>`}</div></section>`;
    panel.querySelectorAll('[data-market-tab]').forEach(b=>b.onclick=()=>{marketTab=b.dataset.marketTab;renderMarket(panel)});
    if(marketTab==='stars')mkBind(panel);
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
    if(state.syncStatus==='pending'||state.syncStatus==='storage-error'){const notice=document.createElement('p');notice.className='hint';notice.textContent='你的成績尚未完成同步，請稍後再試或聯絡管理員。';panel.querySelector('.rank-view').append(notice);}
  }
  addEventListener('fs-leaderboard-updated',()=>{if(tab==='rank')renderRank(document.getElementById('panel'));});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-wallet]'))wallet();
    if(e.target.closest('[data-festival-entry]'))festivalEntry(e.target.closest('[data-festival-entry]').dataset.festivalKey);
    if(e.target.closest('[data-rankgo]')){tab='rank';trySp=null;stage();render();}
  });
  window.FSHomeUI={stageActions,updateHud,sellPanel,saleKeys,renderMarket,renderRank,options:uiOptions};
  stage();hud();
})();
