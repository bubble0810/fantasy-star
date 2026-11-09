/* 節慶共用清單：主頁、星宮與管理後台讀取同一份設定。
   ready 才可挑戰；coming-soon 不扣次、不收費。日期與原有造型販售規則仍在 index.html。
   新遊戲完成並驗證後，補齊 runs / look / room，再將 status 改為 ready。 */
(() => {
  'use strict';
  const catalog = {
  "halloween": {
    "n": "萬聖節",
    "title": "找小幽靈",
    "cur": "萬聖糖果",
    "ic": "🍬",
    "runs": 3,
    "look": 240,
    "room": 300,
    "url": "fest/halloween/index.html",
    "home": "SP01",
    "lk": "SP01",
    "status": "ready"
  },
  "xmas": {
    "n": "聖誕節",
    "title": "聖誕滑雪橇",
    "cur": "聖誕襪",
    "ic": "🧦",
    "runs": 5,
    "look": 200,
    "room": 300,
    "url": "fest/xmas/index.html",
    "home": "SP02",
    "lk": "SP02",
    "status": "ready"
  },
  "newyear": {
    "n": "春節",
    "title": "趕年獸・搶紅包",
    "cur": "紅包",
    "ic": "🧧",
    "runs": 3,
    "look": 280,
    "room": 380,
    "url": "fest/newyear/index.html",
    "home": "SP03",
    "lk": "SP03",
    "status": "ready"
  },
  "duanwu": {
    "n": "端午節",
    "title": "粽力龍舟賽",
    "cur": "香包",
    "ic": "<img src=\"fest/dragonboat/img/sachet.svg\" alt=\"香包\" style=\"width:24px;height:28px;vertical-align:middle;object-fit:contain\">",
    "runs": 3,
    "look": 240,
    "room": 300,
    "url": "fest/dragonboat/index.html",
    "home": "SP05",
    "lk": "SP05",
    "status": "ready"
  },
  "children": {
    "n": "兒童節",
    "title": "氣球射擊",
    "cur": "彩票",
    "ic": "🎟️",
    "runs": 3,
    "look": 220,
    "room": 320,
    "url": "fest/children/index.html",
    "home": "SP04",
    "lk": "SP04",
    "status": "ready"
  },
  "qixi": {
    "n": "七夕",
    "title": "開發中",
    "ic": "💞",
    "status": "coming-soon",
    "url": "fest/seven/index.html",
    "home": "SP06",
    "lk": "SP06"
  },
  "moon": {
    "n": "中秋節",
    "title": "開發中",
    "ic": "🥮",
    "status": "coming-soon",
    "url": "fest/moon/index.html",
    "home": "SP07",
    "lk": "SP07"
  },
  "national": {
    "n": "國慶日",
    "title": "開發中",
    "ic": "🎆",
    "status": "coming-soon",
    "url": "fest/doubleten/index.html",
    "home": "SP08",
    "lk": "SP08"
  }
};
  window.FESTIVAL_CATALOG = catalog;
  window.GAMEF = Object.fromEntries(Object.entries(catalog).filter(([,g]) => g.status === 'ready'));
})();
