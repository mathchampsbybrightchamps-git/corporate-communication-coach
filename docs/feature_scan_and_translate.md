# Feature Documentation: Real-Time Multimodal Document Scan & Translate

## 1. Feature Overview
The **Real-Time Multimodal Scan & Translate** feature enables corporate professionals to point their mobile camera at physical documents, slide decks, whiteboards, or foreign language signage to extract original text and translate it into 29 global languages in real time.

---

## 2. Why It Is Required
In multinational corporate environments, professionals encounter multi-lingual collateral (contracts, presentation slides, regional compliance notices). Immediate on-device text recognition and translation removes language barriers during high-stakes client meetings, travels, and negotiations.

---

## 3. Key Functionality & Specifications
- **Dual Capture Modes**:
  1. **Live Camera Reticle Lens**: Continuous 1.2s auto-scanning inside a centered focus frame.
  2. **Gallery Photo Upload**: High-resolution image import from device storage.
- **Multimodal Gemini 1.5 Flash AI**: Directly processes visual pixels for high-precision text recognition.
- **Native TextToSpeech Pronunciation**: Audio readout in target language via native Android TTS hardware speakers.
- **Low-Light Detection**: Real-time canvas brightness monitoring (`avgBrightness < 45`) alerting users when lighting conditions impair OCR quality.

---

## 4. Architecture & Technical Process
```
[ WebRTC <video> Stream ] ──> [ HTML5 <canvas> Frame Crop ] ──> [ JPEG Base64 Payload ]
                                                                       │
                                                                       ▼
[ Native Hardware TTS ] <── [ Base64 Decode & UI Render ] <── [ Gemini 1.5 Flash Vision API ]
```

1. **Frame Capture**: `captureVideoFrameBase64()` grabs video pixel data directly from the `<video>` element into an internal `<canvas>`.
2. **Reticle Region Cropping**: Crops the top 10%–55% center frame, isolating target text.
3. **Payload Compression**: Compresses image to 480px JPEG (~12KB payload), eliminating API timeouts.
4. **IPC Bridge Execution**: Calls `AndroidBridge.processOCRImage(base64Data, targetLang, callback)` in Kotlin.
5. **AI Vision Recognition**: Sends image bytes to Google Gemini 1.5 Flash Vision API (`generateContent`).
6. **Result Handling**: Decodes Base64 JSON payload via `onOCRResultComplete`, populating original and translated text fields.

---

## 5. How to Use Step-by-Step
1. Tap **Scan & Translate** from the main Dashboard.
2. Grant Camera hardware permissions when prompted.
3. Select your desired **Target Language** from the dropdown menu (e.g. Hindi, Spanish, French, German).
4. Align document text inside the central Reticle Frame.
5. Watch extracted text and translation update on screen.
6. Tap **Listen Pronunciation** to hear native audio readout.
