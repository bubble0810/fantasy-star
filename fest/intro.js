/* Opening pages only. Existing game buttons and their listeners stay intact. */
(() => {
  'use strict';
  const pages = {
    halloween: {
      label:'萬聖夜・幽靈捉迷藏', title:'萬聖節找小幽靈',
      lead:'找出藏起來的小幽靈，把萬聖糖果帶回家。',
      rules:['點擊小幽靈；第三關要點場景中的藏匿處。','三關限時 10／10／20 秒，找齊 5 隻普通幽靈或時間到就換關。','完成第三關後結算；金色幽靈是額外獎勵，不影響過關。'],
      detail:'普通幽靈每隻給 1～5 顆糖果，金色幽靈給 10 顆。想拿金色獎勵，要在找齊普通幽靈前點牠。剩餘秒數不帶到下一關；第三關可留意冒煙與沙沙聲。', art:'.lvls'
    },
    xmas: {
      label:'聖誕佳節・雪地送暖', title:'聖誕滑雪橇',
      lead:'駕著雪橇接禮物，穿過正確答案的閘門！',
      rules:['左右滑動或按方向鍵換線，接禮物並閃開障礙。','40 秒內有 2 次答題閘門，滑進正確答案的線道。','完成後統計禮物，另加 10 隻聖誕襪完成獎勵。'],
      detail:'小禮物給 1 隻聖誕襪，中禮物給 2～3 隻，金色禮物給 4～6 隻；完成一局另加 10 隻。一般版中禮物機率 25%，碰撞不掉禮物；進階版為 40%，禮物更多、速度更快，碰撞只掉 1 個小禮物，中與金色禮物保留。', mode:'#modePick'
    },
    newyear: {
      label:'新春迎福・熱鬧趕年獸', title:'趕年獸・搶紅包',
      lead:'先點鞭炮迎新春，再把年獸趕跑！',
      rules:['第一關 20 秒：點燃出現的鞭炮與煙火，收集紅包。','第二關：點年獸投出鞭炮；3 隻小年獸各命中 10 下，大年獸命中 50 下。','第二關不限時，全部擊退後才結算。'],
      detail:'第一關鞭炮給 1 個紅包，煙火給 2 個。第二關小年獸每次命中給 1 個，大年獸每次給 0～1 個；擊退大年獸另給 5～10 個。', art:'.steps'
    },
    children: {
      label:'兒童樂園・繽紛氣球派對', title:'氣球射擊',
      lead:'瞄準繽紛氣球，點一下就能射箭！',
      rules:['40 秒內直接點氣球，弓會自動朝目標射箭。','七彩氣球彩票較多；射中神秘氣球可獲得一次「萬箭齊發」。','按技能一次射向多顆氣球；技能期間仍繼續倒數。'],
      detail:'普通氣球給 0～2 張彩票，七彩氣球給 3～5 張，神秘氣球提供技能。萬箭齊發會暫時凍結當前氣球，最多瞄準 18 顆。完成一局另加 8 張彩票；時間到後會完成已射出的箭矢再結算。'
    },
    duanwu: {
      label:'端午競渡・粽力全開', title:'粽力龍舟賽',
      lead:'先用問答備好粽子，再抓準節奏划向終點。',
      rules:['第一關 30 秒：答對累積分數，最多帶入 5 顆攻擊粽子。','第二關競速 1000 公尺：游標進入金色區域時按「划船」，連續成功能加速。','用粽子攻擊紅舟或藍舟；任一船抵達就排名結算。'],
      detail:'每題 5 秒，答對 +1、答錯 −1，分數最低為 0；PASS 或逾時未答不扣分。競速一般約 40 秒、熟練者約 15～20 秒。第一／二／三名分別得 55／35／25 個香包，同距離並列。攻擊粽子不另換獎勵。題庫介紹歷史民俗；雄黃有毒，不可飲用雄黃酒。'
    },
    qixi: {
      label:'七夕星河・喜鵲傳情', title:'七夕・心心相印',
      lead:'記住愛心的順序，為牛郎織女築起鵲橋。',
      rules:['每輪先看 3～5 顆愛心依序亮起，再依同樣順序點擊。','連續答對，喜鵲築橋更快；答錯不會失去已完成的橋。','築好鵲橋讓兩人相會，再依表現結算紙鶴。'],
      detail:'愛心每顆展示 650 毫秒。完成時間、命中率與最高連擊會影響獎勵，完成可得 25～55 紙鶴。'
    },
    moon: {
      label:'中秋月圓・玉兔送團圓', title:'中秋月華祭',
      lead:'陪嫦娥登上月宮，再和三隻玉兔接月餅。',
      rules:['第一關：光圈進入金色範圍時點一下，完成 8 次飛升。','第二關 30 秒：在左、中、右軌道上滑跳接月餅，下滑神隱躲桂枝。','金月餅分數更高；撞桂枝會暈眩但不扣月餅，兩關完成後結算。'],
      detail:'第一關每次的速度與金色範圍隨機變化，沒抓準可再試。30／60／90 秒內完成，第二關金月餅原機率分別乘以 1.5／1.3／1.1；超過 90 秒維持預設機率。普通月餅 +1，金月餅 +3，並讓該隻玉兔免暈眩 4 秒。月餅需跳起接取，蹲坐及神隱都接不到。最後每點成績換 2 個活動月餅，最多 60 個。'
    },
    national: {
      label:'國慶同歡・旗海與煙火', title:'國慶旗海慶典',
      lead:'穿梭廣場收集旗幟，讓身後的旗海越來越壯觀！',
      rules:['按住角色拖曳移動，旗幟光圈亮起時碰到才算收集。','挑戰 60 秒；接功能旗獲得加速、無敵或雙倍效果。','看到煙火紅圈快閃開，結束後依保留旗數換國慶徽章。'],
      detail:'功能旗隨機出現並停留 5 秒；效果各維持 5 秒，不同效果可共存，同種效果再次取得會刷新時間。煙火先預警 1 秒，炸開後危險維持 1 秒；被炸到會後退跌坐並掉約 20% 旗數，最少 1、最多 5 面，無敵可抵擋。完成獲得 20 徽章，每保留 4 面旗另加 1，最多 60。旗數是本局成績，徽章是活動貨幣。', art:'#charPreview'
    }
  };
  window.FSIntro = {
    prepare(card, {key, start, note, exit, embedded, trial, root}) {
      const data=pages[key]; if(!data||!start)return;
      const overlay=card.parentElement.closest('.overlay,.panel');
      if(overlay&&root&&!root.contains(overlay))root.append(overlay);
      // In the first games, the panel is the overlay and the card is its child.
      overlay?.classList.add('fs-intro-overlay');
      card.classList.add('fs-intro-card');card.dataset.festival=key;
      if(key==='qixi'){card.style.setProperty('--intro-unit','calc(1px / var(--scale, 1))');overlay?.style.setProperty('--intro-unit','calc(1px / var(--scale, 1))')}
      const art=data.art&&card.querySelector(data.art),mode=data.mode&&card.querySelector(data.mode);
      const load=card.querySelector('#loadStatus'),alerts=[...card.querySelectorAll('[role="alert"]')];
      const heading=document.createElement('header');heading.className='fs-intro-heading';
      const label=document.createElement('div');label.className='fs-intro-label';label.textContent=data.label;
      const title=document.createElement('h1');title.textContent=data.title;heading.append(label,title);
      const scrollHint=document.createElement('div');scrollHint.className='fs-intro-scrollhint';scrollHint.textContent='↕ 下滑查看完整玩法';scrollHint.hidden=true;heading.append(scrollHint);
      const body=document.createElement('div');body.className='fs-intro-body';body.tabIndex=0;body.setAttribute('aria-label','玩法說明，可上下捲動');
      const lead=document.createElement('p');lead.className='fs-intro-lead';lead.textContent=data.lead;body.append(lead);
      if(mode){
        const h=document.createElement('h2');h.textContent='選擇模式';
        for(const button of mode.querySelectorAll('button')){
          button.innerHTML=button.dataset.m==='1'?'<b>進階版</b><small>中禮物 40%<br>碰撞掉 1 個小禮物</small>':'<b>一般版</b><small>中禮物 25%<br>碰撞不掉禮物</small>';
        }
        body.append(h,mode);
      }
      const list=document.createElement('ol');list.className='fs-intro-rules';
      for(const text of data.rules){const li=document.createElement('li');li.textContent=text;list.append(li)}body.append(list);
      const details=document.createElement('details');details.className='fs-intro-details';
      const summary=document.createElement('summary');summary.textContent='詳細規則與獎勵';
      const description=document.createElement('p');description.textContent=data.detail;details.append(summary,description);
      if(art){art.classList.add('fs-intro-art');details.append(art)}body.append(details,...alerts);
      const footer=document.createElement('footer');footer.className='fs-intro-actions';
      start.classList.add('fs-intro-start');exit.classList.add('fs-intro-return');
      exit.textContent=embedded?(trial?'返回星宮體驗館':'返回活動頁'):'返回主頁';
      const buttons=document.createElement('div');buttons.className='fs-intro-buttons';buttons.append(start,exit);
      footer.append(note);if(load)footer.append(load);footer.append(buttons);
      card.replaceChildren(heading,body,footer);
      const resize=new ResizeObserver(()=>{scrollHint.hidden=body.scrollHeight<=body.clientHeight+1});resize.observe(body);
      const labelStart=()=>{if(!start.disabled&&start.textContent!=='開始遊戲')start.textContent='開始遊戲'};
      labelStart();const observer=new MutationObserver(labelStart);observer.observe(start,{attributes:true,attributeFilter:['disabled'],childList:true,subtree:true,characterData:true});
      if(load){const status=()=>{load.hidden=!start.disabled&&!/失敗|錯誤|無法|不足|未備妥/.test(load.textContent)};status();new MutationObserver(status).observe(load,{childList:true,subtree:true,characterData:true});new MutationObserver(status).observe(start,{attributes:true,attributeFilter:['disabled']})}
      return () => {observer.disconnect();resize.disconnect();card.classList.remove('fs-intro-card');overlay?.classList.remove('fs-intro-overlay')};
    }
  };
})();
