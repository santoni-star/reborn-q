// extension/content-script.js
// Цей скрипт просто створює плаваючу кнопку на всіх сторінках (за бажанням)
// Ми прибираємо звідси зайвий код, що викликав помилки

(function() {
  if (window.DEVVOICE_CONTENT_SCRIPT_LOADED) return;
  window.DEVVOICE_CONTENT_SCRIPT_LOADED = true;

  console.log("DevVoice: Content helper active");

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "process_selected_text") {
      // Тут може бути логіка обробки виділеного тексту
      console.log("Selected text for processing:", request.text);
    }
  });
})();
