// polyfill.js
// Це код, який виконується в контексті сторінки.
// Qwen Implementation v1.0

(function() {
  console.log('[Qwen]: Ініціалізація симуляції Web Speech API...');

  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    console.log('[Qwen]: Браузер вже має підтримку Speech API. Поліфіл не потрібен, але ми можемо його перевизначити, якщо треба.');
    // return; // Розкоментуйте, якщо не хочете переписувати існуючий API (але в Firefox його зазвичай немає або він вимкнений)
  }

  // Емуляція подій
  class SpeechRecognitionEvent extends Event {
    constructor(type, eventInitDict) {
      super(type, eventInitDict);
      this.resultIndex = eventInitDict.resultIndex || 0;
      this.results = eventInitDict.results || [];
    }
  }

  // Основний клас емуляції
  class SpeechRecognitionShim extends EventTarget {
    constructor() {
      super();
      this.continuous = false;
      this.interimResults = false;
      this.lang = 'uk-UA'; // Дефолтна мова
      this.maxAlternatives = 1;
      
      // Події
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
      this.onaudiostart = null;
      this.onaudioend = null;
      
      this._isRecording = false;
      console.log('[Qwen]: SpeechRecognitionShim створено.');
    }

    start() {
      if (this._isRecording) return;
      this._isRecording = true;
      
      console.log('[Qwen]: start() викликано. Починаємо "слухати"...');
      
      // 1. Симулюємо подію onstart
      this._dispatchEvent('start');
      this._dispatchEvent('audiostart');

      // ТУТ МАЄ БУТИ ЛОГІКА ЗАПИСУ (MediaRecorder)
      // Наразі ми просто зробимо "заглушку", яка через 3 секунди поверне тестовий текст.
      
      // Доступ до мікрофона, щоб браузер показав індикатор запису (для правдоподібності)
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          this._stream = stream;
          console.log('[Qwen]: Доступ до мікрофона отримано. Потік активний.');
          
          // Імітація розпізнавання (через 3 секунди)
          this._timer = setTimeout(() => {
            this._simulateResult("Привіт, це тестове розпізнавання від Qwen у Firefox!");
            this.stop();
          }, 3000);
        })
        .catch(err => {
          console.error('[Qwen]: Помилка доступу до мікрофона:', err);
          this._dispatchEvent('error', { error: 'not-allowed', message: err.message });
          this._isRecording = false;
        });
    }

    stop() {
      if (!this._isRecording) return;
      console.log('[Qwen]: stop() викликано.');
      
      if (this._stream) {
        this._stream.getTracks().forEach(track => track.stop());
        this._stream = null;
      }
      
      if (this._timer) clearTimeout(this._timer);

      this._isRecording = false;
      this._dispatchEvent('audioend');
      this._dispatchEvent('end');
    }

    abort() {
      console.log('[Qwen]: abort() викликано.');
      this.stop();
    }

    // Внутрішній метод для відправки подій
    _dispatchEvent(type, data = {}) {
      const event = new Event(type);
      Object.assign(event, data);
      
      // Виклик on-обробника (наприклад, this.onresult)
      if (typeof this[`on${type}`] === 'function') {
        this[`on${type}`](event);
      }
      
      // Виклик стандартних слухачів
      this.dispatchEvent(event);
    }

    // Внутрішній метод для симуляції результату
    _simulateResult(transcript) {
      console.log(`[Qwen]: Симуляція результату: "${transcript}"`);
      
      // Формуємо структуру SpeechRecognitionResultList (спрощено)
      const result = [
        { transcript: transcript, confidence: 0.99 }
      ];
      result.isFinal = true;
      
      const results = [result]; // Список результатів
      
      const event = new SpeechRecognitionEvent('result', {
        results: results,
        resultIndex: 0
      });
      
      this._dispatchEvent('result', event);
    }
  }

  // Інжектимо в глобальну область видимості
  window.SpeechRecognition = SpeechRecognitionShim;
  window.webkitSpeechRecognition = SpeechRecognitionShim;
  
  console.log('[Qwen]: window.SpeechRecognition успішно підмінено!');

})();