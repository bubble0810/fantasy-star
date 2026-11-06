window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCdIKLj_pLIMpLIFicH82REBqffA99l8oQ",
  authDomain: "fantasystar-game.firebaseapp.com",
  projectId: "fantasystar-game",
  storageBucket: "fantasystar-game.firebasestorage.app",
  messagingSenderId: "951490146041",
  appId: "1:951490146041:web:85d7745d295eba4ec87c28",
  measurementId: "G-VFMP715CGX"
};
window.CLOUD_GATE = !!(window.FIREBASE_CONFIG.apiKey && !/請貼上/.test(window.FIREBASE_CONFIG.apiKey) && window.firebase);
