/* Main homepage panels. No ranking calculation or player-to-player transfers. */
(() => {
  'use strict';
  const esc=FSNickname.escape;
  const rankTypes=[['total','幻想智多星'],['stroop','最佳變色王'],['memory','最佳記憶王'],['maze','最佳電流王'],['quest','最佳闖關王'],['looks','最佳造型王']];
  let rankTab='total',marketTab='stars';
  const uiOptions={hideInactiveFestival:true};
  const activeFests=()=>FESTS.filter(f=>{try{return festState(f).on}catch{return false}});
  const smallAmount=n=>n>=1e8?(Math.floor(n/1e7)/10)+'億':n>=1e4?(Math.floor(n/1e3)/10)+'萬':String(n);
  function stageActions(){
    const active=activeFests(),f=active[0],g=f&&window.FESTIVAL_CATALOG?.[f.k];
    const button=(cls,attrs,icon,label)=>`<button class="stbtn ${cls}" ${attrs}><span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label">${label}</span></button>`;
    const festival=f?button('event','data-festival-entry',active.length>1?'🎉':g?.ic||'🎉',active.length>1?'節慶活動':esc(f.n)):uiOptions.hideInactiveFestival?'<span class="stbtn event-placeholder" aria-hidden="true"></span>':button('event','disabled aria-label="節慶活動尚未開放"','✧','尚未開放');
    return `<div class="stbar ${!f&&uiOptions.hideInactiveFestival?'no-event':''}">${button('quest',`id="t-quest" aria-pressed="${tab==='quest'}"`,'🗺️','闖關')}${button('tp','data-tpgo aria-label="星宮體驗館"','🏰','星宮')}${festival}${button('rank',`data-rankgo aria-pressed="${tab==='rank'}"`,'🏆','星空榜')}</div>`;
  }
  function updateHud(){
    const progress=document.querySelector('.hud-level'),level=document.getElementById('lv'),experience=document.getElementById('xptxt');
    if(progress&&level&&experience){const detail=level.textContent+'｜經驗 '+experience.textContent;progress.title=detail;progress.setAttribute('aria-label',detail+'，點擊查看');progress.setAttribute('role','button');progress.setAttribute('aria-haspopup','dialog');progress.tabIndex=0;}
    const star=document.getElementById('candy');if(star){star.textContent=smallAmount(S.candy||0);star.title=`${S.candy||0} 星星糖`;}
    const slot=document.getElementById('festCurrencyHud');if(!slot)return;
    const active=activeFests().filter(f=>window.FESTIVAL_CATALOG?.[f.k]?.cur),f=active[0],g=f&&FESTIVAL_CATALOG[f.k];
    slot.hidden=!g;
    slot.innerHTML=g?`<span class="currency-icon" aria-hidden="true">${g.ic}</span><span>${smallAmount(S.fest?.[f.k]?.c||0)}</span>${active.length>1?`<small class="currency-more">+${active.length-1}</small>`:''}`:'';
    slot.title=g?`${g.cur} ${S.fest?.[f.k]?.c||0}；點擊查看全部貨幣`:'';
  }
  function experienceDetails(){
    const level=document.getElementById('lv')?.textContent||'',experience=document.getElementById('xptxt')?.textContent||'';
    openSheet(head('等級與經驗')+'<div class="wallet-list xp-details"><div class="wallet-row"><span>目前等級</span><strong>'+esc(level)+'</strong></div><div class="wallet-row"><span>本級經驗／升級所需</span><strong>'+esc(experience)+'</strong></div></div>');
  }
  function wallet(){
    const fests=Object.entries(window.FESTIVAL_CATALOG||{}).filter(([k,g])=>g.cur&&(activeFests().some(f=>f.k===k)||(S.fest?.[k]?.c||0)>0));
    openSheet(head('我的貨幣')+`<div class="wallet-list"><div class="wallet-row"><span>⭐ 星星糖</span><strong>${S.candy||0}</strong></div>${fests.map(([k,g])=>`<div class="wallet-row"><span>${g.ic} ${esc(g.cur)}</span><strong>${S.fest?.[k]?.c||0}</strong></div>`).join('')}</div><p class="hint">這裡顯示完整數量；活動貨幣的使用與到期轉換依各活動規則。</p>`);
  }
  function festivalEntry(){
    const fs=activeFests();if(!fs.length)return;
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
    const selected=rankTypes.find(([k])=>k===rankTab)||rankTypes[0];
    panel.innerHTML=`<section class="rank-view"><h2>星空榜</h2><p class="rank-intro">五大單項與幻想智多星總榜，各呈現前三名。排行榜資料準備中。</p><div class="rank-tabs" role="tablist" aria-label="排行榜類別">${rankTypes.map(([k,n])=>`<button role="tab" aria-selected="${rankTab===k}" data-rank-tab="${k}">${n}</button>`).join('')}</div><div class="rank-heading"><h3>${selected[1]}</h3><span class="rank-status">尚未開放</span></div><div class="rank-table-head"><span>名次</span><span>暱稱</span><span>等級</span></div><div class="rank-top3">${[1,2,3].map(n=>`<div class="rank-person"><span class="rank-medal">${n}</span><div><b>等待榜單開放</b><small>尚無排名資料</small></div><span class="rank-level">—</span></div>`).join('')}</div><p class="hint">排名計算、起算時間與資料更新方式，將於功能開放時另行說明。</p></section>`;
    panel.querySelectorAll('[data-rank-tab]').forEach(b=>b.onclick=()=>{rankTab=b.dataset.rankTab;renderRank(panel)});
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('.hud-level'))experienceDetails();
    if(e.target.closest('[data-wallet]'))wallet();
    if(e.target.closest('[data-festival-entry]'))festivalEntry();
    if(e.target.closest('[data-rankgo]')){tab='rank';trySp=null;stage();render();}
  });
  document.addEventListener('keydown',e=>{
    if(e.target.closest('.hud-level')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();experienceDetails();}
  });
  window.FSHomeUI={stageActions,updateHud,sellPanel,saleKeys,renderMarket,renderRank,options:uiOptions};
  stage();hud();
})();
