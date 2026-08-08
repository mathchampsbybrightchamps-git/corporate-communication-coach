# Feature Documentation: Speech Practice Studio & Delivery Analytics Engine

## 1. Feature Overview
The **Speech Practice Studio** provides corporate executives and professionals with real-time speech delivery analytics (Pace/WPM, Filler Words, Jargon Density) and AI-driven Executive Reframing to transform casual phrasing into authoritative executive communication.

---

## 2. Why It Is Required
Professionals often struggle with filler words ("um", "like", "you know"), improper pacing (too fast/slow), or overly casual phrasing during high-stakes presentations and executive updates. The Speech Practice Studio provides objective delivery metrics and coaching.

---

## 3. Key Functionality & Specifications
- **Real-Time WPM (Words Per Minute)**: Calculates speaking speed (Ideal target: 130–160 WPM).
- **Filler Word Radar**: Counts instances of "um", "ah", "like", "you know", "basically", "actually".
- **Jargon Density Index**: Detects buzzwords and evaluates plain-language clarity.
- **Executive AI Reframer**: Re-writes user speech turns into 3 structured executive styles:
  1. **Direct Executive (PREP Framework)**: Point, Reason, Example, Point.
  2. **Pyramid Principle**: Answer first, supported by key arguments.
  3. **STAR Framework**: Situation, Task, Action, Result.

---

## 4. Architecture & Technical Process
```
[ Microphone Input ] ──> [ Web Speech API Stream ] ──> [ WPM / Filler / Jargon Analyzer ]
                                                                   │
                                                                   ▼
[ UI Delivery Badges ] <── [ Supabase drill_logs ] <── [ Gemini Executive Reframer ]
```

---

## 5. How to Use Step-by-Step
1. Select a practice drill scenario (e.g. Project Update, Salary Negotiation, Crisis Management).
2. Tap **Start Recording** and speak your response into the microphone.
3. Tap **Stop & Analyze**.
4. View your delivery metrics (WPM, Filler Count, Jargon Score).
5. Compare your transcript with the **AI Executive Reframed Version**.
