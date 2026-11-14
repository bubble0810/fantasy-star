/* 首頁登入畫面的背景圖設定
   ─────────────────────────────────────────────
   挑圖順序（由上往下，第一個符合且讀得到的就用）：
     1. 節慶期間：遊戲裡的節慶活動正在進行時（日期跟遊戲內節慶同步）
     2. 自訂日期：每年固定的月-日區間，可以跨年（例如 12-20 到 01-05）
     3. 白天／夜晚
     4. 預設圖（一定要有）
   還沒放進 login/ 的圖片不用刪設定，讀不到會自動跳到下一張。
   圖片規格：1024×1536 或 1080×1620（直式 2:3），WebP，300 KB 以內；
   上方 62% 放標題和人物，下方留給登入卡片，最下面漸層成深紫色。
   改完這個檔案後，記得把 index.html 裡 login-art.js?v= 後面的版本號改一下，玩家才會抓到新設定。 */
window.FS_LOGIN_ART = {
  // 4. 預設圖
  default: 'login/bg.webp',

  // 1. 節慶圖（拿掉前面的 // 就會啟用；鍵名要跟遊戲節慶代號一樣）
  festivals: {
    // xmas:      'login/xmas.webp',      // 聖誕節
    // newyear:   'login/newyear.webp',   // 春節
    // children:  'login/children.webp',  // 兒童節
    // duanwu:    'login/duanwu.webp',    // 端午節
    // qixi:      'login/qixi.webp',      // 七夕
    // moon:      'login/moon.webp',      // 中秋節
    // national:  'login/national.webp',  // 國慶日
    // halloween: 'login/halloween.webp', // 萬聖節
  },

  // 2. 自訂日期（月-日），例如寒假、開學週
  dates: [
    // { from: '01-20', to: '02-15', img: 'login/winter.webp' },
    // { from: '09-01', to: '09-07', img: 'login/school.webp' },
  ],

  // 3. 白天／夜晚（不用的話維持 null）
  // dayNight: { day: 'login/day.webp', night: 'login/night.webp', dayStart: 6, nightStart: 18 },
  dayNight: null,

  // 3.5 平常輪流（沒有節慶、自訂日期、白天夜晚時才用）
  //   mode: 'daily' 每天換一張；'random' 每次打開隨機
  // rotate: { mode: 'daily', images: ['login/bg.webp', 'login/bg2.webp'] },
  rotate: null,  // 暫停輪流：目前固定只用預設圖

  // 每張圖的個別設定（可省略）
  //   hero：（不建議設定）所有圖統一露出上方 62%，登入卡片位置才會一致
  //   bottom：頁面底色，接圖片最下方的顏色
  images: {
    'login/bg.webp':  { bottom: '#322888' },
    'login/bg2.webp': { bottom: '#584095' },
  },
};
