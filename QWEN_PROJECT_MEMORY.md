# DevVoice Scratchpad REBORN_2 - Пам'ятка Проекту

## 📋 Основна Інформація

**Назва:** DevVoice Scratchpad REBORN_2  
**Тип:** Voice-нотатки для розробників з AI обробкою  
**Локація:** `/mnt/Data/pr/Reborn_qwen/`

## 🛠 Технологічний Стек

| Категорія | Технології |
|-----------|------------|
| **Frontend** | React 19, TypeScript, Vite 6 |
| **State** | Zustand 5 |
| **Styling** | Tailwind CSS 3.4, Custom CSS |
| **Backend** | Firebase (Auth, Firestore) |
| **AI** | Groq API, OpenAI API, Gemini API |
| **Sync** | Google Drive, Local File System |
| **DB** | IndexedDB (Dexie), Firestore |
| **PWA** | Vite PWA Plugin |

## 📁 Структура Проекту

```
REBORN_2/
├── src/
│   ├── components/       # UI компоненти
│   │   ├── Sidebar.tsx          # Лівий сайдбар
│   │   ├── RightPanel.tsx       # Правий сайдбар (AI)
│   │   ├── NoteItem.tsx         # Картка нотатки
│   │   ├── NoteList.tsx         # Список нотаток
│   │   ├── ProjectList.tsx      # Сітка проектів
│   │   ├── VoiceInput.tsx       # Голосове введення
│   │   ├── SettingsModal.tsx    # Налаштування
│   │   ├── EditProjectModal.tsx # Редагування проекту
│   │   └── ...
│   ├── services/
│   │   ├── aiService.ts         # AI обробка
│   │   ├── unifiedSyncService.ts # Синхронізація
│   │   ├── firebaseService.ts   # Firebase
│   │   ├── syncService.ts       # Local file sync
│   │   └── googleDriveSyncService.ts
│   ├── store/
│   │   ├── useStore.ts          # Zustand store
│   │   └── slices/notesSlice.ts # Slice з усіма станами
│   ├── domain/sync/             # Sync архітектура
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── utils/
│   │   ├── localAi.ts           # Local AI аналіз
│   │   ├── toast.ts             # Toast notifications
│   │   └── conflictResolution.ts
│   ├── types/entities.ts        # TypeScript типи
│   ├── i18n.ts                  # Інтернаціоналізація
│   ├── App.tsx                  # Головний компонент
│   └── main.tsx                 # Entry point
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .env                         # Firebase keys
```

## ✅ Реалізовані Функції

### 1. Управління Проектами
- ✅ Створення/редагування/видалення проектів
- ✅ Вибір кольору проекту (16 пресетів)
- ✅ Збереження в localStorage
- ✅ Фільтрація системних проектів (view-*, digest)

### 2. Нотатки
- ✅ Голосове введення з розпізнаванням
- ✅ AI обробка (категоризація, теги, формат)
- ✅ Розумні дії:
  - 🐛 GitHub Issue Draft
  - 📐 ADR (Architecture Decision Record)
- ✅ Markdown preview з повним рендерингом
- ✅ Завантаження як .md файл
- ✅ Друк нотатки
- ✅ Розширення при hover (вліво для крайніх справа)

### 3. Синхронізація
- ✅ Firebase Cloud Sync
- ✅ Google Drive Sync
- ✅ Local File System Sync
- ✅ Збереження стану підключення

### 4. UI/UX
- ✅ Лівий сайдбар з секціями (Workspace, Smart Views, Projects)
- ✅ Правий сайдбар з AI інсайтами
- ✅ Зміна ширини сайдбарів (перетягування)
- ✅ Випадаючий список проектів в хедері
- ✅ Модальні вікна з анімаціями
- ✅ Приховані скроллбари
- ✅ Responsive дизайн

### 5. Налаштування
- ✅ Вибір AI провайдера (Groq, OpenAI, Gemini, Browser)
- ✅ API ключі збережені в localStorage
- ✅ Мова інтерфейсу (en, uk, pl, de)
- ✅ Розмір шрифту (sm, base, lg, xl)
- ✅ Zen Mode

## 🔧 Команди Запуску

```bash
# Перейти в директорію
cd /mnt/Data/pr/Reborn_qwen/

# Встановити залежності (якщо потрібно)
npm install

# Запустити dev сервер
npm run dev

# Збірка
npm run build

# Тести
npm run test:run

# Lint
npm run lint
```

## 🐛 Відомі Виправлення

### CSS/Анімації
- Додано `.ui-window`, `.ui-window-header`, `.ui-window-content`
- Додано `@keyframes fadeIn`, `slideInFromTop`, `shimmer`
- Додано `.scrollbar-hide` utility
- Виправлено `animate-in`, `fade-in` класи

### Store
- Додано всі необхідні властивості в `NotesSlice`
- Додано `sidebarSections`, `searchCache`, `currentUser`
- Додано методи: `updateSettings`, `toggleNoteCompleted`, `addProject`
- localStorage персистентність для notes, projects, settings

### Синхронізація
- Створено `unifiedSyncService` singleton
- Додано методи: `syncNote`, `syncProject`, `deleteNote`, `deleteProject`
- Збереження кольорів проектів при перепідключенні папки

### Компоненти
- `NoteItem`: Markdown preview, download, print
- `EditProjectModal`: Вибір кольору проекту
- `ProjectList`: Фільтр системних проектів
- `Sidebar`: Розгортання секцій
- `App.tsx`: Випадаючий список проектів

## 🚀 Швидкий Старт

1. Відкрити термінал
2. `cd /mnt/Data/pr/Reborn_qwen/`
3. `npm run dev`
4. Відкрити http://localhost:5173

## 📝 Наступні Кроки (TODO)

- [ ] Імплементація `loadInitialData()` в store
- [ ] Повна інтеграція Firebase Realtime Listeners
- [ ] Оптимізація продуктивності для великої кількості нотаток
- [ ] Додаткові AI провайдери (Claude, Grok)
- [ ] PWA offline режим
- [ ] Експорт/імпорт всіх даних

## 🔑 Ключові Файли

| Файл | Призначення |
|------|-------------|
| `src/store/slices/notesSlice.ts` | Весь стан додатку |
| `src/services/unifiedSyncService.ts` | Синхронізація |
| `src/services/aiService.ts` | AI обробка |
| `src/components/NoteItem.tsx` | Картка нотатки з preview |
| `src/index.css` | Custom CSS класи |

---

**Останнє оновлення:** 2026-03-25  
**Статус:** Працездатний, готовий до розширення
