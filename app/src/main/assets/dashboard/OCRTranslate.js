// CCOS Multimodal Scan & Translate Engine
// Modes: live (auto-scan loop), capture (single shot from camera), gallery (single shot from file).
// Frames are extracted from the <video> element via canvas and handed to the native
// Kotlin bridge, which calls Gemini Vision and replies through window.onOCRResultComplete.
CommCoach.OCRTranslate = {
  mode: 'live',
  interval: null,
  stream: null,
  capturedImageData: null,
  targetLanguage: 'hi',

  // Request lifecycle guards
  inFlight: false,
  inFlightTimer: null,
  requestTimeoutMs: 25000,

  // Live-loop tuning. Gemini free tier allows ~15 requests/min, so a 1.2s poll would be
  // rate-limited into uselessness. Poll slower and skip frames that have not changed.
  pollMs: 2500,
  lastFrameSignature: null,
  signatureTolerance: 4,

  hasResult: false,

  init() {
    const btnBack = document.getElementById('btn-ocr-back');
    const btnLive = document.getElementById('btn-ocr-mode-live');
    const btnCapture = document.getElementById('btn-ocr-mode-capture');
    const btnGallery = document.getElementById('btn-ocr-mode-gallery');
    const btnShutter = document.getElementById('btn-ocr-shutter');
    const btnPronounce = document.getElementById('btn-ocr-pronounce');
    const fileInput = document.getElementById('ocr-file-input');
    const targetSelect = document.getElementById('ocr-target-lang');

    if (btnBack) {
      btnBack.addEventListener('click', () => {
        this.stopCamera();
        CommCoach.Navigation.goBack();
      });
    }

    if (btnLive) btnLive.addEventListener('click', () => this.setMode('live'));
    if (btnCapture) btnCapture.addEventListener('click', () => this.setMode('capture'));
    if (btnGallery) btnGallery.addEventListener('click', () => this.setMode('gallery'));

    if (btnShutter) {
      btnShutter.addEventListener('click', () => this.shutterCapture());
    }

    if (btnPronounce) {
      btnPronounce.addEventListener('click', () => this.speakPronunciation());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) this.handleGalleryFile(file);
      });
    }

    if (targetSelect) {
      this.targetLanguage = targetSelect.value || 'hi';
      targetSelect.addEventListener('change', (e) => {
        this.targetLanguage = e.target.value;
        // Re-translate the frame already on screen rather than making the user re-scan.
        if (this.capturedImageData) {
          this.setStatus('Re-translating into the selected language...');
          this.processImageData(this.capturedImageData, true);
        }
      });
    }

    this.updateModeChips();
  },

  // ---------------------------------------------------------------- mode control

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;

    this.stopLiveLoop();
    this.updateModeChips();

    const video = document.getElementById('ocr-camera-preview');
    const imgPreview = document.getElementById('ocr-image-preview');
    const reticle = document.getElementById('ocr-reticle');
    const fileInput = document.getElementById('ocr-file-input');

    if (mode === 'gallery') {
      this.stopCamera();
      if (video) video.style.display = 'none';
      if (imgPreview) imgPreview.style.display = 'block';
      if (reticle) reticle.style.display = 'none';
      this.setStatus('Choose a photo to scan.');
      if (fileInput) fileInput.click();
      return;
    }

    // live + capture both use the camera
    if (video) video.style.display = 'block';
    if (imgPreview) imgPreview.style.display = 'none';
    if (reticle) reticle.style.display = 'block';
    this.startCamera();
  },

  updateModeChips() {
    const map = {
      live: document.getElementById('btn-ocr-mode-live'),
      capture: document.getElementById('btn-ocr-mode-capture'),
      gallery: document.getElementById('btn-ocr-mode-gallery')
    };

    Object.keys(map).forEach(key => {
      const el = map[key];
      if (!el) return;
      if (key === this.mode) el.classList.add('active');
      else el.classList.remove('active');
    });

    // The shutter only makes sense in single-shot camera mode.
    const shutter = document.getElementById('btn-ocr-shutter');
    if (shutter) shutter.style.display = (this.mode === 'capture') ? 'flex' : 'none';
  },

  // ---------------------------------------------------------------- camera

  async startCamera() {
    if (this.mode === 'gallery') return;

    const video = document.getElementById('ocr-camera-preview');
    if (!video) return;

    // Already streaming - just make sure the loop matches the mode.
    if (this.stream && video.srcObject) {
      if (this.mode === 'live') this.startLiveLoop();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setStatus('Camera not available on this device. Use Gallery mode.', true);
      return;
    }

    this.setStatus('Starting camera...');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      video.srcObject = this.stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      await video.play().catch(e => console.warn('Video play exception', e));

      if (this.mode === 'live') {
        this.startLiveLoop();
      } else {
        this.setStatus('Align text in the frame, then tap Capture.');
      }
    } catch (e) {
      console.warn('Camera access failed', e);
      this.setStatus('Camera blocked. Grant camera permission, or use Gallery mode.', true);
    }
  },

  stopCamera() {
    this.stopLiveLoop();

    const video = document.getElementById('ocr-camera-preview');
    if (video) video.srcObject = null;

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  },

  startLiveLoop() {
    this.stopLiveLoop();
    this.setStatus('Live scanning...');
    this.lastFrameSignature = null;

    this.interval = setInterval(() => {
      if (this.mode !== 'live') return;
      this.tickLiveScan();
    }, this.pollMs);
  },

  stopLiveLoop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },

  /**
   * One live-scan iteration. Skips work when a request is already outstanding
   * or when the camera is pointed at an unchanged scene.
   */
  tickLiveScan() {
    if (this.inFlight) return;

    const video = document.getElementById('ocr-camera-preview');
    if (!video || video.readyState < 2 || video.videoWidth === 0) return;

    if (this.isLowLight(video)) {
      this.setStatus('Low light - move somewhere brighter for accurate scanning.', true);
      return;
    }

    const signature = this.frameSignature(video);
    if (signature && this.lastFrameSignature && this.hasResult &&
        this.signaturesMatch(signature, this.lastFrameSignature)) {
      return; // Scene unchanged, nothing new to read.
    }
    this.lastFrameSignature = signature;

    const frame = this.captureVideoFrameBase64();
    if (!frame) return;

    this.capturedImageData = frame;
    this.processImageData(frame);
  },

  // ---------------------------------------------------------------- frame extraction

  /**
   * Draw the current video frame to a canvas, crop to the reticle area, and return JPEG base64.
   * A getUserMedia stream does not taint the canvas, so toDataURL is safe here.
   */
  captureVideoFrameBase64() {
    const video = document.getElementById('ocr-camera-preview');
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;

    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // Crop matches the on-screen reticle: centered, 80% wide, 55% tall.
      const cropW = Math.floor(vw * 0.80);
      const cropH = Math.floor(vh * 0.55);
      const startX = Math.floor((vw - cropW) / 2);
      const startY = Math.floor((vh - cropH) / 2);

      // Cap the long edge at 1024px: enough detail for OCR, small enough to stay fast.
      const maxEdge = 1024;
      const scale = Math.min(1, maxEdge / Math.max(cropW, cropH));

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(cropW * scale));
      canvas.height = Math.max(1, Math.round(cropH * scale));

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, canvas.width, canvas.height);

      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.warn('Canvas capture exception', e);
      return null;
    }
  },

  /** Coarse 4x4 brightness grid used to detect whether the scene changed. */
  frameSignature(video) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 32, 32);
      const data = ctx.getImageData(0, 0, 32, 32).data;

      const cells = new Array(16).fill(0);
      const counts = new Array(16).fill(0);

      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const idx = (y * 32 + x) * 4;
          const cell = Math.floor(y / 8) * 4 + Math.floor(x / 8);
          cells[cell] += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          counts[cell]++;
        }
      }

      return cells.map((sum, i) => sum / counts[i]);
    } catch (e) {
      return null;
    }
  },

  signaturesMatch(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > this.signatureTolerance) return false;
    }
    return true;
  },

  isLowLight(video) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 32, 32);
      const data = ctx.getImageData(0, 0, 32, 32).data;

      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        total += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      return (total / (data.length / 4)) < 40;
    } catch (e) {
      return false;
    }
  },

  // ---------------------------------------------------------------- single-shot capture

  shutterCapture() {
    const frame = this.captureVideoFrameBase64();
    if (!frame) {
      this.setStatus('Camera not ready yet. Wait a moment and try again.', true);
      return;
    }

    // Freeze the captured still so the user sees exactly what was scanned.
    const video = document.getElementById('ocr-camera-preview');
    const imgPreview = document.getElementById('ocr-image-preview');
    if (imgPreview) {
      imgPreview.src = frame;
      imgPreview.style.display = 'block';
    }
    if (video) video.style.display = 'none';

    this.capturedImageData = frame;
    this.setStatus('Scanning captured photo...');
    this.processImageData(frame, true);
  },

  handleGalleryFile(file) {
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const imgPreview = document.getElementById('ocr-image-preview');
      const video = document.getElementById('ocr-camera-preview');

      if (imgPreview) {
        imgPreview.src = dataUrl;
        imgPreview.style.display = 'block';
      }
      if (video) video.style.display = 'none';

      this.capturedImageData = dataUrl;
      this.setStatus('Scanning selected photo...');
      this.processImageData(dataUrl, true);
    };

    reader.onerror = () => this.setStatus('Could not read that image file.', true);
    reader.readAsDataURL(file);
  },

  // ---------------------------------------------------------------- OCR dispatch

  processImageData(base64Image, force) {
    if (!base64Image) {
      this.setStatus('No image to scan yet.', true);
      return;
    }

    if (this.inFlight && !force) return;

    const targetSelect = document.getElementById('ocr-target-lang');
    const targetCode = targetSelect ? targetSelect.value : this.targetLanguage;

    const bridge = window.AndroidBridge;
    if (!bridge || typeof bridge.processOCRImage !== 'function') {
      this.setStatus('Native scanner bridge unavailable. Run this inside the Android app.', true);
      return;
    }

    // Surface a missing API key immediately instead of waiting for a failed request.
    if (typeof bridge.isAiConfigured === 'function' && !bridge.isAiConfigured()) {
      this.setStatus('Gemini API key not configured. Add GEMINI_API_KEY to local.properties and rebuild.', true);
      return;
    }

    this.beginRequest();

    try {
      bridge.processOCRImage(base64Image, targetCode, 'onOCRResultComplete');
    } catch (e) {
      console.warn('Native processOCRImage bridge call failed', e);
      this.endRequest();
      this.setStatus('Scanner bridge error: ' + (e.message || e), true);
    }
  },

  beginRequest() {
    this.inFlight = true;
    clearTimeout(this.inFlightTimer);

    // Without this the flag could stick forever if the native callback never arrives.
    this.inFlightTimer = setTimeout(() => {
      if (!this.inFlight) return;
      this.inFlight = false;
      this.setStatus('Scan timed out. Check your connection and try again.', true);
    }, this.requestTimeoutMs);
  },

  endRequest() {
    this.inFlight = false;
    clearTimeout(this.inFlightTimer);
    this.inFlightTimer = null;
  },

  // ---------------------------------------------------------------- result handling

  handleResult(respStr) {
    this.endRequest();

    const originalEl = document.getElementById('ocr-text-original');
    const translatedEl = document.getElementById('ocr-text-translated');

    let envelope = null;
    try {
      envelope = JSON.parse(respStr);
    } catch (e) {
      // Not JSON at all - show the raw payload so the failure is at least diagnosable.
      this.setStatus('Unreadable scanner response: ' + String(respStr).slice(0, 120), true);
      return;
    }

    // Error envelope from Gemini or from our own bridge.
    if (envelope && envelope.error) {
      const msg = (envelope.error.message || 'Unknown error').toString();
      this.setStatus(msg, true);
      return;
    }

    // Unwrap the Gemini candidates envelope, then the model's JSON payload.
    let parsed = envelope;
    if (envelope && envelope.candidates && envelope.candidates[0] &&
        envelope.candidates[0].content && envelope.candidates[0].content.parts) {
      const rawText = envelope.candidates[0].content.parts[0].text || '';
      const cleanJson = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        // The model answered in prose rather than JSON - still better than showing nothing.
        if (cleanJson) {
          if (originalEl) originalEl.innerText = cleanJson;
          if (translatedEl) translatedEl.innerText = cleanJson;
          this.hasResult = true;
          this.setStatus('Scanned (unstructured response).');
          this.setPronounceEnabled(true);
          return;
        }
        this.setStatus('Scanner returned an empty response.', true);
        return;
      }
    }

    const detected = parsed && parsed.detected ? String(parsed.detected).trim() : '';
    const translated = parsed && parsed.translated ? String(parsed.translated).trim() : '';

    if (!detected && !translated) {
      this.setStatus('No text found in frame. Move closer or steady the camera.');
      return;
    }

    if (originalEl) originalEl.innerText = detected || '(no text detected)';
    if (translatedEl) translatedEl.innerText = translated || '(nothing to translate)';

    this.hasResult = true;
    this.setPronounceEnabled(!!translated);
    this.setStatus(this.mode === 'live' ? 'Live scanning...' : 'Scan complete.');
  },

  setPronounceEnabled(enabled) {
    const btn = document.getElementById('btn-ocr-pronounce');
    if (btn) btn.disabled = !enabled;
  },

  setStatus(message, isError) {
    const el = document.getElementById('ocr-status');
    if (!el) return;
    el.innerText = message;
    el.style.color = isError ? 'var(--error)' : 'var(--text-muted)';
  },

  // ---------------------------------------------------------------- pronunciation

  speakPronunciation() {
    const translatedEl = document.getElementById('ocr-text-translated');
    const targetSelect = document.getElementById('ocr-target-lang');
    const textToSpeak = translatedEl ? translatedEl.innerText.trim() : '';
    const langCode = targetSelect ? targetSelect.value : this.targetLanguage;

    const placeholders = [
      'Waiting for input...', 'Translating...', '(nothing to translate)', ''
    ];
    if (placeholders.indexOf(textToSpeak) !== -1) return;

    // Native Android TTS handles the non-Latin target languages far better than the WebView.
    if (window.AndroidBridge && typeof window.AndroidBridge.speakText === 'function') {
      try {
        window.AndroidBridge.speakText(textToSpeak, langCode);
        return;
      } catch (e) {
        console.warn('Native speakText failed, falling back to Web Speech', e);
      }
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = langCode;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }
};

// Native Android bridge invokes this by name once Gemini Vision responds.
window.onOCRResultComplete = function (respStr) {
  if (CommCoach.OCRTranslate) {
    CommCoach.OCRTranslate.handleResult(respStr);
  }
};
