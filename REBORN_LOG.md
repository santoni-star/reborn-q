# REBORN Project Log: Intelligence & Architecture Evolution

## Current State (Checkpoint 0)
- **Status:** 100% stable clone of original.
- **Build:** Success (Vite v6 + React 19).
- **Environment:** .env configured, GitHub repo linked.

## Found Issues & Technical Debt (to be fixed in Iterations)
1. **i18n Duplication:** Found duplicate `syncNow` key in `src/i18n.ts` (fixed during clone).
2. **Circular Dependencies:** `useStore.ts` <-> `unifiedSyncService.ts` circular imports via dynamic imports. Need to move sync logic to Application Layer.
3. **Monolithic Store:** `useStore.ts` is 600+ lines. Hard to test.
4. **Hardcoded Prompts:** AI prompts are hardcoded in `aiService.ts`. No versioning for prompts.
5. **Sync Conflicts:** Conflict resolution is scattered across UI and Services.

## Evolutionary Goals
1. **[Iteration 1] Modular Directory Structure:** Create `domain`, `application`, `infrastructure`.
2. **[Iteration 2] Store Slicing:** Break down the big store into specialized stores (Notes, Projects, Sync, UI).
3. **[Iteration 3] AI Provider Pattern:** Support Local Qwen, Gemini API, and Extension Bridge through a common interface.
4. **[Iteration 4] Atomic Sync Queue:** Ensure data integrity during offline/online transitions.

## Technical Nuances
- Project uses `crypto.randomUUID()` which requires HTTPS or Localhost.
- Sync logic depends on `idb-keyval` for storing Directory Handles.
- PWA is enabled via `vite-plugin-pwa`.
- UI uses Framer Motion for premium animations.
--- ПОЧАТОК МОДУЛЯЦІЇ (AUTONOMOUS) ---
1. Структура адаптерів: src/domain/sync/adapters/ створена.
Модулі адаптерів ініційовані.
--- ЕТАП 2: ЛОГІКУ ПЕРЕНЕСЕНО В АДАПТЕРИ ---
FirebaseAdapter та GoogleDriveAdapter оновлені даними з моноліту.
--- ЕТАП 3: МОНОЛІТ ОЧИЩЕНО ТА ПІДКЛЮЧЕНО ДО ОРКЕСТРАТОРА ---
--- ЕТАП 4: ВАЛІДАЦІЯ ЧЕРЕЗ VITEST ---
--- ЕТАП 5: ВІЗУАЛЬНА МОДУЛЯЦІЯ (TAILWIND) ---
Index.css переписано на Tailwind v4 стандарти.
--- ЕТАП 6-7: СТОР СЛАЙСИ ТА ОЧИЩЕННЯ UI ---
