/* FS leaderboard v1. Pure calculation + optional UI; no Firebase or game-state writes. */
(function (root) {
  'use strict';
  const TYPES = Object.freeze({stroop:'最佳變色王', memory:'最佳記憶王', maze:'最佳電流王', quest:'最佳闖關王', looks:'最佳造型王'});
  const POINTS = [30, 20, 15];
  const integer = n => Number.isSafeInteger(n) && n >= 0;
  // All times are epoch milliseconds. The cloud adapter converts Firestore timestamps.
  const time = n => integer(n) && n > 0;
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId = (a,b) => a < b ? -1 : a > b ? 1 : 0;
  function values(r) {
    const v = r.value || {};
    switch (r.type) {
      case 'stroop': return integer(v.score) ? [v.score] : null;
      case 'memory': return v.completed === true && v.pairs === 8 && integer(v.tries) && v.tries >= 8 ? [-v.tries] : null;
      case 'maze': return v.completed === true && v.stage === 3 && integer(v.durationMs) && v.durationMs > 0 ? [-v.durationMs] : null;
      case 'quest': return integer(v.cleared) && v.cleared <= 108 && integer(v.stars) && v.stars <= v.cleared * 3 ? [v.cleared,v.stars] : null;
      case 'looks': return integer(v.count) ? [v.count] : null;
      default: return null;
    }
  }
  function compare(a,b) {
    for (let i=0;i<a.metric.length;i++) if(a.metric[i]!==b.metric[i]) return b.metric[i]-a.metric[i];
    return a.at-b.at || byId(a.uid,b.uid) || byId(a.id,b.id);
  }
  function prepare(input, now) {
    const config=input.config||{}, start=config.startsAt==null?0:config.startsAt;
    if (!integer(start)) throw new TypeError('startsAt must be epoch milliseconds');
    const players=new Map();
    for(const p of input.players||[]) {
      if(typeof p.uid!=='string'||!p.uid||players.has(p.uid)) throw new TypeError('Unique player uid required');
      players.set(p.uid,p);
    }
    const ids=new Set(), events=[];
    for(const r of input.records||[]) {
      if(typeof r.id!=='string'||!r.id||ids.has(r.id)) throw new TypeError('Unique record id required');
      ids.add(r.id);
      const p=players.get(r.uid), metric=values(r);
      if(!p||p.disabled||p.excluded||!metric||!time(r.recordedAt)||r.recordedAt>now) continue;
      const at=time(r.achievedAt)?r.achievedAt:r.legacy===true?r.recordedAt:null;
      if(at===null||at<start||at>now||at>r.recordedAt) continue;
      const reset=p.resetAt?.[r.type];
      if(reset!=null && (!time(reset)||at<=reset)) continue;
      events.push({...r,at,metric});
    }
    // Legacy records use their stable first-registration time, never the current time.
    events.sort((a,b)=>a.at-b.at||byId(a.id,b.id));
    return {players,events,config};
  }
  function singleBoards(best, players) {
    const boards={};
    for(const type of Object.keys(TYPES)) {
      boards[type]=[...best.values()].filter(r=>r.type===type).sort(compare).slice(0,3).map((r,i)=>({
        uid:r.uid, name:players.get(r.uid).name||'玩家', level:players.get(r.uid).level,
        rank:i+1, points:POINTS[i], achievedAt:r.at, value:r.value
      }));
    }
    return boards;
  }
  function calculate(input, now=Date.now()) {
    if(!time(now)) throw new TypeError('now must be epoch milliseconds');
    const {players,events,config}=prepare(input,now), best=new Map(), scores=new Map(), reached=new Map();
    // Replay each timestamp as a batch so simultaneous results are not ordered by arrival.
    for(let i=0;i<events.length;) {
      const at=events[i].at;
      do {
        const r=events[i++], key=r.uid+':'+r.type, old=best.get(key);
        if(!old||compare(r,old)<0) best.set(key,r);
      } while(i<events.length&&events[i].at===at);
      const current=new Map();
      for(const rows of Object.values(singleBoards(best,players))) for(const r of rows) current.set(r.uid,(current.get(r.uid)||0)+r.points);
      for(const uid of players.keys()) {
        const score=current.get(uid)||0;
        if(score!==(scores.get(uid)||0)) reached.set(uid,at);
        scores.set(uid,score);
      }
    }
    const boards=singleBoards(best,players);
    boards.total=[...scores].filter(([,score])=>score>0).map(([uid,raw])=>({
      uid,name:players.get(uid).name||'玩家',level:players.get(uid).level,
      score:raw/5,achievedAt:reached.get(uid)
    })).sort((a,b)=>b.score-a.score||a.achievedAt-b.achievedAt||byId(a.uid,b.uid)).slice(0,3).map((r,i)=>({...r,rank:i+1}));
    return {enabled:config.enabled===true,startsAt:config.startsAt||0,boards};
  }
  function collectionValue(state, catalog) {
    // Catalogs prevent arbitrary inventory strings from counting as owned designs.
    const looks=new Set(catalog.lookIds), rooms=new Set(catalog.roomIds);
    const ownedLooks=[...new Set(state.items||[])].filter(id=>looks.has(id));
    const ownedRooms=[...new Set(state.homes||[])].filter(id=>rooms.has(id));
    return {count:ownedLooks.length+ownedRooms.length,lookIds:ownedLooks,roomIds:ownedRooms};
  }
  function legacyRecords(uid,state,recordedAt,catalog) {
    if(!time(recordedAt)) throw new TypeError('Stable first-registration time required');
    const out=[], add=(type,value)=>out.push({id:'legacy:'+uid+':'+type,uid,type,value,legacy:true,achievedAt:null,recordedAt});
    if(integer(state.best?.stroop)) add('stroop',{score:state.best.stroop});
    if(integer(state.best?.memory)&&state.best.memory>=8) add('memory',{completed:true,pairs:8,tries:state.best.memory});
    const stars=Object.entries(state.lvStars||{}).filter(([id,n])=>/^\d+$/.test(id)&&+id<108&&integer(n)&&n>=1&&n<=3);
    if(stars.length) add('quest',{cleared:stars.length,stars:stars.reduce((n,[,s])=>n+s,0)});
    if(catalog) add('looks',collectionValue(state,catalog));
    // S.best.maze is an unlock indicator, not a third-stage duration.
    return out;
  }
  function publicValue(type,value) {
    const v=value||{};
    if(type==='stroop'&&integer(v.score))return {score:v.score};
    if(type==='memory'&&integer(v.tries)&&v.tries>=8)return {tries:v.tries};
    if(type==='maze'&&integer(v.durationMs)&&v.durationMs>0)return {durationMs:v.durationMs};
    if(type==='quest'&&integer(v.cleared)&&v.cleared<=108&&integer(v.stars)&&v.stars<=v.cleared*3)return {cleared:v.cleared,stars:v.stars};
    if(type==='looks'&&integer(v.count))return {count:v.count};
    return null;
  }
  function performanceText(type,value) {
    const v=publicValue(type,value);if(!v)return '—';
    return type==='stroop'?`${v.score} 分`:type==='memory'?`${v.tries} 次`:type==='maze'?`${(v.durationMs/1000).toFixed(3)} 秒`:type==='quest'?`${v.cleared} 關・${v.stars} 顆星`:`共 ${v.count} 款`;
  }
  function render(container,result,selected='total') {
    if(!container||typeof container.replaceChildren!=='function') throw new TypeError('DOM container required');
    const names={total:'幻想智多星',...TYPES}, active=Object.hasOwn(names,selected)?selected:'total';
    const rows=result?.enabled?result.boards?.[active]||[]:[];
    const detail=active!=='total',label={stroop:'分數',memory:'配對次數',maze:'通關時間',quest:'闖關進度',looks:'收集數'}[active];
    container.innerHTML=`<section class="rank-view${detail?' rank-with-performance':''}"><h2>星空榜</h2><div class="rank-tabs" role="tablist" aria-label="排行榜類別">${Object.entries(names).map(([key,name])=>`<button type="button" role="tab" aria-selected="${key===active}" data-board="${key}">${name}</button>`).join('')}</div><div class="rank-heading"><h3>${names[active]}</h3><span class="rank-status">${result?.enabled?'總榜':'尚未開放'}</span></div><div class="rank-table-head"><span>名次</span><span>暱稱</span><span>等級</span>${detail?`<span class="rank-performance">${label}</span>`:''}</div><div class="rank-top3">${rows.map(r=>`<div class="rank-person"><span class="rank-medal">${escape(r.rank)}</span><div><b>${escape(r.name)}</b></div><span class="rank-level">${integer(r.level)&&r.level>0?escape(r.level):'—'}</span>${detail?`<span class="rank-performance">${escape(performanceText(active,r.value))}</span>`:''}</div>`).join('')}</div>${rows.length?'':`<p class="hint">${result?.enabled?'尚無排名資料':'等待榜單開放'}</p>`}</section>`;
    container.querySelectorAll('[data-board]').forEach(button=>button.addEventListener('click',()=>render(container,result,button.dataset.board)));
  }
  const api=Object.freeze({version:1,types:TYPES,calculate,collectionValue,legacyRecords,publicValue,performanceText,render});
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.FSLeaderboard=api;
})(typeof window==='object'?window:globalThis);
