/* ===== 幻想智慧星：Firebase 設定 =====
   來源：Firebase 後台 → 專案設定 → 你的應用程式 → 網頁應用程式 → SDK 設定（設定）。
   這段設定碼本來就是公開的，資料由 Firestore 安全規則保護。 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCdIKLj_pLIMpLIFicH82REBqffA99l8oQ",
  authDomain: "fantasystar-game.firebaseapp.com",
  projectId: "fantasystar-game",
  storageBucket: "fantasystar-game.firebasestorage.app",
  messagingSenderId: "951490146041",
  appId: "1:951490146041:web:85d7745d295eba4ec87c28",
  measurementId: "G-VFMP715CGX"
};
/* 下面不用改 */
window.CLOUD_GATE = !!(window.FIREBASE_CONFIG.apiKey && !/請貼上/.test(window.FIREBASE_CONFIG.apiKey) && window.firebase);
