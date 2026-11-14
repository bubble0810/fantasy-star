/* Shared nickname policy: Han = 2 units, ASCII letters/digits = 1, up to 14. */
(() => {
  'use strict';
  const allowed=/^[\p{Unified_Ideograph}〇A-Za-z0-9]+$/u;
  const units=name=>Array.from(String(name)).reduce((n,c)=>n+(/[A-Za-z0-9]/.test(c)?1:2),0);
  const error=name=>!name?'請輸入暱稱':!allowed.test(name)?'暱稱只能使用中文、英文或數字，不可含空格、符號或 Emoji':units(name)>14?'暱稱最多 7 個中文字或 14 個英數字，可混合使用':'';
  const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function bind(input,counter){
    if(!input)return;
    input.maxLength=28;input.setAttribute('aria-describedby',counter.id);
    const update=()=>{const n=units(input.value);counter.textContent=`長度 ${n}／14 格（中文 2 格，英數 1 格）`;counter.classList.toggle('invalid',!!input.value&&!!error(input.value));};
    input.addEventListener('input',update);input.addEventListener('compositionend',update);update();
  }
  window.FSNickname=Object.freeze({units,error,isValid:name=>!error(name),escape,bind});
})();
