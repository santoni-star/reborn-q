# 🎙️ DevVoice Scratchpad

**DevVoice Scratchpad** ist ein intelligentes, sprachgesteuertes „Second Brain“, das speziell für Softwareentwickler entwickelt wurde. Es erfasst Ihre rohen Gedanken, Bug-Berichte und Architekturideen per Sprache, strukturiert sie mithilfe von KI und synchronisiert sie über alle Ihre Geräte und das lokale Dateisystem.

## 🚀 Hauptmerkmale

### 🧠 Project Brain (Permanenter Kontext)
Füttern Sie die KI mit der README Ihres Projekts, Tech-Stack-Regeln oder Codierungsstandards. Die KI wird diese Informationen bei jeder neuen Notiz priorisieren, um sicherzustellen, dass alle Vorschläge den spezifischen „Master Rules“ Ihres Projekts folgen.

### 🌐 Global & Projekt Digests
- **Project Master Digest**: Ein strukturierter JSON-basierter Bericht mit Zusammenfassungen, Status technischer Module und automatisierten Mermaid-Diagrammen Ihres Fortschritts.
- **Global Daily Digest**: Ein Master-Bericht, der die Aktivitäten aus ALLEN Projekten zusammenfasst und einen Gesamtüberblick über Ihren Tag bietet.

### 🎙️ Fortgeschrittene Spracheingabe
- **Language Identification (LID)**: Erkennt automatisch die Sprache, die Sie sprechen (DE, EN, UA, PL), und antwortet in derselben Sprache.
- **Cursor-Einfügung**: Diktieren und fügen Sie Text genau dort ein, wo sich Ihr Cursor im Editor befindet.
- **Mic Island**: Eine minimalistische, schwebende Benutzeroberfläche, die sich zu einem leistungsstarken Command Center ausbauen lässt.

### 📂 Universelle Synchronisierung
- **Local-First**: Notizen werden direkt in Ihrem physischen Dateisystem als Markdown-Dateien gespeichert.
- **Cloud-Sync**: Zwei-Wege-Synchronisation mit **Firebase Cloud** und **Google Drive**.
- **Bidirektionale GDrive-Synchronisation**: Notizen aus der Cloud werden physisch in Ihre lokalen Projektordner geschrieben.

### 🛡️ Sicherheit & Verschlüsselung
- **Client-seitige Verschlüsselung (AES-256)**: Ihre Notizen werden direkt im Browser verschlüsselt, bevor sie in die Cloud gesendet werden.
- **Master-Passwort**: Legen Sie in den Einstellungen ein Passwort fest, um Ihren Notizinhalt in Firebase und Google Drive zu schützen. Ohne dieses Passwort sind Cloud-Daten unlesbar.
- **Privatsphäre zuerst**: Wir haben keinen Zugriff auf Ihre Passwörter oder verschlüsselten Daten. Alles bleibt unter Ihrer vollen Kontrolle.
- **Local-Clear / Cloud-Encrypted**: Daten auf Ihrer Festplatte bleiben für eine schnelle lokale Suche im Klartext, während Cloud-Daten sicher geschützt sind.

### 🪄 KI-Intelligenz
- **Magic Fix**: Verarbeiten Sie jede Notiz erneut mit KI, um die Grammatik zu verbessern, eine Markdown-Struktur hinzuzufügen oder den Notiztyp zu ändern.
- **Dev Insights**: Technische Beobachtungen in Echtzeit und scharfsinnige Analysen der technischen Schulden basierend auf Ihren letzten Aktivitäten.
- **Smart Actions**: Erstellen Sie automatisch Entwürfe für GitHub Issues oder Architecture Decision Records (ADR) aus Ihren Notizen.

### 🎨 Intelligente Benutzeroberfläche
- **Auto-Kategorisierung**: Notizen werden nach Typ farblich gekennzeichnet (Bug, Idee, Architektur, Aufgabe).
- **Smart Views**: Filtern Sie Notizen sofort nach Kategorie oder suchen Sie projektübergreifend.
- **Zen-Modus**: Eine saubere, ablenkungsfreie Umgebung für konzentriertes Arbeiten.

## 🌍 Mehrsprachige Unterstützung
Vollständige Lokalisierung der Benutzeroberfläche und KI-Verarbeitung für: **Deutsch, Englisch, Ukrainisch und Polnisch**.

---
*Entwickelt für Fokus. Gesteuert durch Stimme.*