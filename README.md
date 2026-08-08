# Corporate Communication Coach (CCOS)

An AI-powered hybrid mobile application built for corporate professionals to bridge the **knowing-doing gap** and build executive presence.

---

## Key Features

### 1. Speak Studio & Voice Drills
* Real-time Speech-to-Text oral drills using Web Speech API.
* Multi-framework evaluation (STAR, PREP, Pyramid Principle).
* Automatic local audio transcript saving to `Documents/CommunicationCoach/`.

### 2. Multi-Speaker Meeting Recorder & AI MOM Generator
* Speaker registration & live identification counter.
* Real-time diarized transcript stream tagged by active speaker turns.
* Automated Minutes of Meeting (MOM) generator creating Executive Summaries, Key Discussion Points, Action Items with Assignees, and Decisions Made.
* Automatic export of MOM text files to device storage.

### 3. Deep Speech Analysis & Head-to-Head Comparison
* **Head-to-Head View**: Original user transcript vs. AI Expert Reframed version side-by-side.
* **Metric Cards**: Words Per Minute (WPM) pacing, filler word counts, corporate jargon radar, and defensiveness index.
* **Executive Presence Scoring**: Animated breakdown of Confidence, Clarity, Persuasion, and Executive Presence scores (0-100%).
* **TTS Audio Replay**: Listen to the expert reframed model answer.

### 4. Corporate Jargon & Vocabulary Dictionaries
* **25+ Corporate Jargon Terms**: Comprehensive breakdown covering Definition, Usage, Workplace Scenario, Example Sentence, Communication Impact, Perception, When To Use, How To Use, and Professional Alternatives.
* **High-Impact Vocabulary**: Boardroom definitions and real-world executive application examples.
* **Real-time Search**: Search input with accordion detail cards.

### 5. Camera OCR & Real-Time Translation
* Real-time lens translation overlay using device camera.
* Text extraction and multi-language translation across 29 languages.
* Pronunciation text-to-speech synthesis.

### 6. Immersive Native Android & State Retention
* Native Kotlin `@JavascriptInterface` bridge (`AndroidBridge`).
* Full-screen immersive UI with hidden Action Bar.
* Double-layer state retention: WebView `saveState`/`restoreState` for soft backgrounding and `localStorage` screen restoration for process force-kills.
* Custom hardware/gesture back button handling via history stack.

---

## Tech Stack & Architecture
* **Frontend**: HTML5, CSS3 (Vanilla design tokens & animations), Modular ES JavaScript.
* **Native Platform**: Android SDK (Kotlin), WebView, AppCompat, NotificationManager.
* **AI & Cloud Engine**: Google Gemini API via REST bridge, Firebase Firestore REST sync.
* **Storage**: Android Scoped Device External Storage (`Documents/CommunicationCoach/`).

---

## Building & Running

### Prerequisites
* Android Studio (Ladybug or newer) / JDK 17+
* Android SDK 34+

### CLI Build Command
```bash
./gradlew compileDebugSources --no-daemon
```

---

## License
Proprietary & Confidential - All Rights Reserved.
