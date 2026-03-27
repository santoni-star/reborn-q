# 🎙️ DevVoice Scratchpad

**DevVoice Scratchpad** to inteligentny „Drugi Mózg” dla programistów, zaprojektowany z myślą o sterowaniu głosowym. Przechwytuje Twoje surowe myśli, raporty o błędach i pomysły architektoniczne za pomocą głosu, strukturyzuje je przy użyciu AI i synchronizuje między wszystkimi urządzeniami oraz lokalnym systemem plików.

## 🚀 Kluczowe funkcje

### 🧠 Project Brain (Stały kontekst)
Dostarcz AI plik README swojego projektu, zasady stosu technologicznego lub standardy kodowania. AI będzie priorytetyzować te informacje przy każdym dyktowaniu nowej notatki, zapewniając, że wszystkie sugestie są zgodne ze specyficznymi „Głównymi zasadami” Twojego projektu.

### 🌐 Digesty globalne i projektowe
- **Project Master Digest**: Strukturalny raport oparty na formacie JSON, zawierający podsumowania, status modułów technicznych i automatyczne diagramy Mermaid Twoich postępów.
- **Global Daily Digest**: Główny raport agregujący aktywność ze WSZYSTKICH projektów, zapewniający pełny wgląd w cały dzień pracy.

### 🎙️ Zaawansowane wprowadzanie głosowe
- **Language Identification (LID)**: Automatycznie rozpoznaje język, w którym mówisz (PL, EN, UA, DE) i odpowiada w tym samym języku.
- **Wstawianie kursorem**: Dyktuj i wstawiaj tekst dokładnie tam, gdzie znajduje się kursor w edytorze.
- **Mic Island**: Minimalistyczny, pływający interfejs, który rozwija się w potężne Centrum Dowodzenia.

### 📂 Uniwersalna synchronizacja
- **Local-First**: Notatki są zapisywane bezpośrednio w systemie plików jako pliki Markdown.
- **Cloud Sync**: Dwukierunkowa synchronizacja z **Firebase Cloud** i **Google Drive**.
- **Dwukierunkowa synchronizacja GDrive**: Notatki z chmury są fizycznie zapisywane w lokalnych folderach projektów.

### 🛡️ Bezpieczeństwo i szyfrowanie
- **Szyfrowanie po stronie klienta (AES-256)**: Twoje notatki są szyfrowane bezpośrednio w przeglądarce przed wysłaniem do chmury.
- **Hasło główne**: Ustaw hasło w Ustawieniach, aby chronić treść notatek w Firebase i Google Drive. Bez tego hasła dane w chmurze są nieczytelne.
- **Prywatność przede wszystkim**: Nie mamy dostępu do Twoich haseł ani zaszyfrowanych danych. Wszystko pozostaje pod Twoją pełną kontrolą.
- **Local-Clear / Cloud-Encrypted**: Dane na dysku pozostają w formie tekstowej dla szybkiego wyszukiwania, podczas gdy dane w chmurze są bezpiecznie chronione.

### 🪄 Inteligencja AI
- **Magic Fix**: Przetwarzaj dowolną notatkę ponownie za pomocą AI, aby poprawić gramatykę, dodać strukturę markdown lub zmienić typ notatki.
- **Dev Insights**: Obserwacje techniczne w czasie rzeczywistym i błyskotliwa analiza długu technicznego na podstawie Twojej ostatniej aktywności.
- **Smart Actions**: Automatycznie twórz szkice zgłoszeń GitHub Issue lub rekordów decyzji architektonicznych (ADR) ze swoich notatek.

### 🎨 Inteligentny interfejs użytkownika
- **Auto-kategoryzacja**: Notatki są kolorowane według typu (Błąd, Pomysł, Architektura, Zadanie).
- **Smart Views**: Natychmiastowe filtrowanie notatek według kategorii lub wyszukiwanie we wszystkich projektach.
- **Zen Mode**: Czyste środowisko wolne od rozproszeń do głębokiej pracy.

## 🌍 Obsługa wielu języków
Pełna lokalizacja interfejsu i przetwarzania AI dla: **polskiego, angielskiego, ukraińskiego i niemieckiego**.

---
*Zaprojektowany dla koncentracji. Sterowany głosem.*