// content.js
// Цей скрипт працює в "ізольованому світі", тому він не може напряму змінити window.SpeechRecognition сторінки.
// Замість цього ми ін'єктуємо скрипт polyfill.js у контекст сторінки.

(function() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('polyfill.js');
  script.onload = function() {
    this.remove(); // Прибираємо тег після завантаження, щоб не смітити в DOM
  };
  (document.head || document.documentElement).appendChild(script);
  console.log('[Google Engineer Orchestrator]: Polyfill injector deployed.');
})();