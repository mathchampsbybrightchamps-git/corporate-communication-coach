# Feature Documentation: Multi-Speaker Diarized Meeting Recorder & Multilingual AI MOM Generator

## 1. Feature Overview
Captures meeting audio natively, automatically identifies **how many people are speaking and
which one is speaking at any moment** from their voices, detects the **language of every
utterance** (including regional languages and mid-sentence code-switching), transcribes
verbatim in the original script, translates to English, and synthesises Minutes of Meeting.

No speaker registration and no language selection are required before recording.

---

## 2. Why the Architecture Changed (v2)

v1 used the **Web Speech API**, which made the headline capabilities impossible:

| v1 limitation | Cause |
| :--- | :--- |
| Could not tell who was speaking | Web Speech returns text only. The waveform never reaches the app, so voice-based diarization is impossible. The old code rotated speaker labels round-robin on a 2s silence gap — it recognised nobody. |
| Required manual speaker registration | No acoustic data to cluster on. |
| Could not detect language | `SpeechRecognition.lang` accepts exactly one BCP-47 tag and never auto-detects. The old "multilingual code-switching" option set `en-US`. |
| No regional language support | Android's recognizer has no Bhojpuri/Maithili/Awadhi models. |

v2 therefore captures **raw audio natively** and sends it to a multimodal model that performs
diarization, language ID, transcription and translation in a single pass.

---

## 3. Architecture & Technical Process

```
[ MeetingCaptureService ]  (foreground service, microphone type + partial wake lock)
              │
[ AudioRecord 16kHz mono PCM16 ]  (Kotlin, native)
              │  accumulates 20s
              ▼
[ WAV wrap + base64 ]  ──►  [ Gemini 1.5 Flash (audio inline_data) ]
              │                            │
              │                            ▼
              │              { segments: [ { speaker, language,
              │                              original, english } ] }
              ▼
[ onMeetingChunkComplete ] ──► [ Live diarized transcript UI ]
              │
              ▼
[ English-normalised transcript ] ──► [ MOM synthesis ] ──► [ Supabase + .txt export ]
```

**Key implementation points**

1. **Native capture in a foreground service** — `AudioRecord(MIC, 16000, MONO, PCM16)` runs
   inside `MeetingCaptureService`, not the Activity, so recording survives screen lock,
   app backgrounding and activity recreation. 16 kHz mono is the speech sweet spot:
   intelligible, and a 20s chunk stays well under the inline request size limit.
2. **Chunking** — audio is flushed every 20s (configurable 5–60s). The trailing partial chunk
   is flushed on stop so the last words are not lost. Anything under 1 second is discarded as noise.
3. **Payload stays native** — the base64 WAV never crosses the JS bridge. The web layer only
   sends a small context object, avoiding ~850KB string marshalling per chunk.
4. **Speaker-label continuity** — the model labels speakers independently per chunk, so the
   running roster is injected into every prompt with an instruction to reuse exact labels.
   The web layer keeps canonical labels (`Speaker 1`) immutable; user-assigned display names
   are a client-side overlay only, so renaming never destabilises the model's continuity.
5. **Language identification** — returned per utterance as an English language name. The prompt
   explicitly forbids collapsing Bhojpuri, Maithili or Awadhi into "Hindi". Mixed utterances
   come back joined (`"Hindi + English"`).

---

## 4. Key Functionality & Specifications
- **Records through screen lock** — capture runs in a foreground service with a persistent
  notification (showing elapsed time and a Stop action) and a partial wake lock. Locking the
  phone, switching apps, or letting the device doze does not interrupt recording.
- **Survives activity recreation** — transcript, roster and start time are mirrored to
  `localStorage`; results produced while the UI was detached are buffered natively and
  replayed on return, so nothing is lost.
- **Automatic speaker discovery** — no upper limit on speaker count; labels are created as new
  voices appear. Tap any speaker chip to rename it inline.
- **Automatic language detection** — per utterance, not per meeting. Handles code-switching
  within a single sentence.
- **Optional language hint** — free-text field used only to disambiguate closely related
  regional languages. Detection works without it.
- **Bilingual transcript** — verbatim original in native script plus fluent English translation,
  both preserved in the export.
- **Executive MOM** — summary, key points, action items with owners and deadlines, decisions.
- **Structured export** — `.txt` to `Documents/CommunicationCoach/Month/Date/`, including the
  full bilingual transcript.

---

## 5. Accuracy Limits (read before relying on this)

- **Diarization degrades with speaker count.** Reliable for roughly 2–6 speakers on a phone mic.
  Beyond that, similar-sounding voices merge and distant speakers are missed. A single
  far-field microphone is the binding constraint, not the model.
- **Chunk-boundary continuity is best-effort.** A speaker who talks in chunk 1 and again in
  chunk 8 may occasionally get a new label. The roster prompt mitigates this but does not
  guarantee it.
- **Bhojpuri and similar low-resource languages are not a solved problem.** No commercial ASR
  supports Bhojpuri as a first-class language. Gemini is the best available option and will
  often produce usable output, but it may label Bhojpuri as Hindi or transcribe it
  approximately. The language hint improves this materially. Treat regional-language
  transcripts as drafts requiring review.
- **Not true real-time.** Transcripts appear one chunk behind — roughly a 20–25s lag. True
  streaming would require the Gemini Live API (bidirectional WebSocket), a substantially
  larger change.
- **Cost scales with meeting length.** One Gemini request per 20s of audio: ~3 requests/minute,
  ~180 for a one-hour meeting.

---

## 6. How to Use
1. Open **Meeting Recorder** from the Dashboard.
2. Enter the **Meeting Title / Topic**.
3. Optionally list expected languages (e.g. `Hindi, Bhojpuri, English`).
4. Tap **Start Meeting Recording**. Speakers appear automatically as they talk.
5. Rename any detected speaker by tapping its chip.
6. Tap **End Meeting & Generate MOM**.
7. Tap **Export MOM & Save File** for the minutes plus the full bilingual transcript.

---

## 7. Requirements
- `RECORD_AUDIO` permission granted (Android 14+ refuses to promote the service otherwise).
- `POST_NOTIFICATIONS` granted, so the ongoing recording notification is visible. The service
  still runs if the notification is suppressed, but the user loses the Stop control.
- `GEMINI_API_KEY` present in `local.properties` (see README).

### Aggressive battery optimisation
Some OEM skins (Xiaomi/MIUI, Oppo/ColorOS, Vivo, Samsung to a lesser degree) kill foreground
services regardless of Android policy. If recording stops on such a device, the app must be
excluded from battery optimisation in system settings. This is an OEM behaviour, not something
the app can fully defend against.
