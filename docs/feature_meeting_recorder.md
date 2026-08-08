# Feature Documentation: Multi-Speaker Diarized Meeting Recorder & Multilingual AI MOM Generator

## 1. Feature Overview
The **Multi-Speaker Diarized Meeting Recorder** provides end-to-end meeting capture, real-time speaker turn identification, multilingual code-switching speech-to-text, and automated Minutes of Meeting (MOM) synthesis with assigned task owners and deadlines.

---

## 2. Why It Is Required
Corporate meetings involve fast-paced discussions, mixed languages (e.g. English, Hindi, Tamil, Spanish), and ambiguous task assignments. Manually taking meeting notes causes missed action items. This feature automates transcription, translation, and structured task extraction.

---

## 3. Key Functionality & Specifications
- **Multi-Speaker Diarization**: Register meeting participants and switch active speaker bubbles manually or automatically via VAD silence gap detection (`silenceThreshold = 2000ms`).
- **Multilingual Code-Switching Recognition**: Accurately processes mixed-language conversations (English, Hinglish, Spanglish, Tamil-English).
- **Executive MOM Generation**: Synthesizes:
  - 3-sentence **Executive Summary**
  - **Key Discussion Points**
  - **Action Items with Task Owners & Deadlines** (e.g. `[ ] Finalize Q4 Budget (Owner: Sarah, Deadline: Friday)`)
  - **Decisions Agreed Upon**
- **Structured File Export**: Saves formatted `.txt` files directly to `Documents/CommunicationCoach/Month/Date/`.

---

## 4. Architecture & Technical Process
```
[ Web Speech API ] ──> [ Diarized Transcript Lines ] ──> [ Transcript Chunking (>12k chars) ]
                                                                     │
                                                                     ▼
[ Storage Export ] <── [ Supabase PostgreSQL Sync ] <── [ Gemini 1.5 Flash AI Engine ]
```

1. **Audio Capture**: Web Speech API captures speech streams in real time.
2. **Turn Detection**: VAD tracks silence gaps > 2 seconds to alternate active speaker labels.
3. **Token Chunking**: Transcripts > 12,000 characters are split into 5-minute chunks before AI processing.
4. **AI MOM Synthesis**: Sends diarized transcript to Gemini 1.5 Flash AI to generate structured JSON.
5. **Database Archiving**: Saves MOM records into Supabase `mom_records` PostgreSQL table.

---

## 5. How to Use Step-by-Step
1. Open **Meeting Recorder** from the main Dashboard.
2. Enter the **Meeting Title / Topic** and select your **Multilingual Recognition Mode**.
3. Register meeting participants (e.g. Host, VP Product, Tech Lead).
4. Tap **Start Recording**. Select speaker chips as each person speaks.
5. Tap **Stop & Generate MOM** upon meeting conclusion.
6. Review the AI-generated Minutes of Meeting and tap **Export MOM File** to save locally.
