/* ===== 幻想智慧星：Firebase 設定 =====
   請到 Firebase 後台 → 專案設定（齒輪）→ 一般 → 你的應用程式 → 網頁應用程式，
   把那一段 firebaseConfig 的內容，逐項貼到下面引號裡。
   還沒填好之前，遊戲會用「只存在這台裝置」的方式照常運作。 */
window.FIREBASE_CONFIG = {
  apiKey: "請貼上",
  authDomain: "fantasystar-game.firebaseapp.com",
  projectId: "fantasystar-game",
  storageBucket: "fantasystar-game.appspot.com",
  messagingSenderId: "請貼上",
  appId: "請貼上"
};
/* 下面不用改 */
window.CLOUD_GATE = !!(window.FIREBASE_CONFIG.apiKey && !/請貼上/.test(window.FIREBASE_CONFIG.apiKey) && window.firebase);
