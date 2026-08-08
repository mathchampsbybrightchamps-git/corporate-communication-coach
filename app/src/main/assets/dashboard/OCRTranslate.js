// CCOS Camera OCR Scanning & Live Translate Module - 100% Real-Time & Native CORS-Free Engine
CommCoach.OCRTranslate = {
  stream: null,
  mode: 'live',
  interval: null,
  lastTranslatedText: "",
  canvas: null,
  capturedImageData: null,

  languages: [
    { code: 'en', name: 'English', locale: 'en-US' },
    { code: 'hi', name: 'Hindi', locale: 'hi-IN' },
    { code: 'zh', name: 'Mandarin (Chinese)', locale: 'zh-CN' },
    { code: 'es', name: 'Spanish', locale: 'es-ES' },
    { code: 'fr', name: 'French', locale: 'fr-FR' },
    { code: 'ar', name: 'Arabic', locale: 'ar-SA' },
    { code: 'bn', name: 'Bengali', locale: 'bn-IN' },
    { code: 'pt', name: 'Portuguese', locale: 'pt-BR' },
    { code: 'ru', name: 'Russian', locale: 'ru-RU' },
    { code: 'ur', name: 'Urdu', locale: 'ur-PK' },
    { code: 'id', name: 'Indonesian', locale: 'id-ID' },
    { code: 'de', name: 'German', locale: 'de-DE' },
    { code: 'ja', name: 'Japanese', locale: 'ja-JP' },
    { code: 'sw', name: 'Swahili', locale: 'sw-KE' },
    { code: 'mr', name: 'Marathi', locale: 'mr-IN' },
    { code: 'te', name: 'Telugu', locale: 'te-IN' },
    { code: 'tr', name: 'Turkish', locale: 'tr-TR' },
    { code: 'ta', name: 'Tamil', locale: 'ta-IN' },
    { code: 'pa', name: 'Punjabi', locale: 'pa-IN' },
    { code: 'fa', name: 'Persian', locale: 'fa-IR' },
    { code: 'vi', name: 'Vietnamese', locale: 'vi-VN' },
    { code: 'it', name: 'Italian', locale: 'it-IT' },
    { code: 'ha', name: 'Hausa', locale: 'ha-NG' },
    { code: 'th', name: 'Thai', locale: 'th-TH' },
    { code: 'gu', name: 'Gujarati', locale: 'gu-IN' },
    { code: 'pl', name: 'Polish', locale: 'pl-PL' },
    { code: 'uk', name: 'Ukrainian', locale: 'uk-UA' },
    { code: 'kn', name: 'Kannada', locale: 'kn-IN' },
    { code: 'ml', name: 'Malayalam', locale: 'ml-IN' }
  ],

  init() {
    const backBtn = document.getElementById('btn-ocr-back');
    const modeLive = document.getElementById('btn-ocr-mode-live');
    const modeCapture = document.getElementById('btn-ocr-mode-capture');
    const modeGallery = document.getElementById('btn-ocr-mode-gallery');
    const fileInput = document.getElementById('ocr-file-input');
    const shutterBtn = document.getElementById('btn-ocr-shutter');
    const pronounceBtn = document.getElementById('btn-ocr-pronounce');
    const targetSelect = document.getElementById('ocr-target-lang');

    // Populate target language select with all 29 supported languages
    if (targetSelect) {
      targetSelect.innerHTML = '';
      this.languages.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.innerText = lang.name;
        if (lang.code === 'hi') opt.selected = true;
        targetSelect.appendChild(opt);
      });
    }

    if (pronounceBtn) {
      pronounceBtn.disabled = false;
      pronounceBtn.addEventListener('click', () => {
        this.speakPronunciation();
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.stopCamera();
        CommCoach.Navigation.goBack();
      });
    }

    if (modeLive) {
      modeLive.addEventListener('click', () => {
        this.mode = 'live';
        this.setActiveModeChip(modeLive);
        if (shutterBtn) shutterBtn.style.display = 'none';
        this.showVideoPreview();
        this.startCamera();
      });
    }

    if (modeCapture) {
      modeCapture.addEventListener('click', () => {
        this.mode = 'capture';
        this.setActiveModeChip(modeCapture);
        if (shutterBtn) shutterBtn.style.display = 'block';
        this.showVideoPreview();
        this.startCamera();
        clearInterval(this.interval);
      });
    }

    if (modeGallery) {
      modeGallery.addEventListener('click', () => {
        this.mode = 'gallery';
        this.setActiveModeChip(modeGallery);
        if (shutterBtn) shutterBtn.style.display = 'none';
        clearInterval(this.interval);
        if (fileInput) fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imgPreview = document.getElementById('ocr-image-preview');
            const videoPreview = document.getElementById('ocr-camera-preview');
            if (imgPreview) {
              imgPreview.src = event.target.result;
              imgPreview.style.display = 'block';
            }
            if (videoPreview) videoPreview.style.display = 'none';
            this.capturedImageData = event.target.result;
            this.processImageData(this.capturedImageData);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (shutterBtn) {
      shutterBtn.addEventListener('click', () => {
        this.captureAndProcessFrame();
      });
    }

    if (targetSelect) {
      targetSelect.addEventListener('change', () => {
        if (this.capturedImageData) {
          this.processImageData(this.capturedImageData);
        } else {
          this.captureAndProcessFrame();
        }
      });
    }

    this.canvas = document.createElement('canvas');
  },

  setActiveModeChip(activeChip) {
    const modeLive = document.getElementById('btn-ocr-mode-live');
    const modeCapture = document.getElementById('btn-ocr-mode-capture');
    const modeGallery = document.getElementById('btn-ocr-mode-gallery');

    [modeLive, modeCapture, modeGallery].forEach(chip => {
      if (chip) chip.classList.remove('active');
    });
    if (activeChip) activeChip.classList.add('active');
  },

  showVideoPreview() {
    const imgPreview = document.getElementById('ocr-image-preview');
    const videoPreview = document.getElementById('ocr-camera-preview');
    if (imgPreview) imgPreview.style.display = 'none';
    if (videoPreview) videoPreview.style.display = 'block';
  },

  async startCamera() {
    const video = document.getElementById('ocr-camera-preview');
    if (!video) return;

    this.stopCamera();

    const constraintList = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: { ideal: 'user' } }, audio: false },
      { video: true, audio: false }
    ];

    let streamObtained = null;
    for (const constraints of constraintList) {
      try {
        streamObtained = await navigator.mediaDevices.getUserMedia(constraints);
        if (streamObtained) break;
      } catch (err) {
        console.warn("Camera constraint attempt failed", err);
      }
    }

    if (streamObtained) {
      this.stream = streamObtained;
      video.srcObject = this.stream;
      video.muted = true;
      video.playsInline = true;

      try {
        await video.play();
      } catch (playErr) {
        console.warn("Video play promise error", playErr);
      }

      if (this.mode === 'live') {
        this.startLiveLoop();
      }
    }
  },

  stopCamera() {
    const video = document.getElementById('ocr-camera-preview');
    if (video) video.srcObject = null;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    clearInterval(this.interval);
  },

  startLiveLoop() {
    clearInterval(this.interval);
    this.captureAndProcessFrame();
    this.interval = setInterval(() => {
      if (this.mode === 'live') {
        this.captureAndProcessFrame();
      }
    }, 800);
  },

  captureAndProcessFrame() {
    this.processImageData(this.capturedImageData);
  },

  processImageData(base64Image) {
    const originalEl = document.getElementById('ocr-text-original');
    const translatedEl = document.getElementById('ocr-text-translated');
    const targetSelect = document.getElementById('ocr-target-lang');
    const targetCode = targetSelect ? targetSelect.value : 'hi';

    if (originalEl && (originalEl.innerText === 'Align text inside frame or select a photo from gallery...' || originalEl.innerText === 'Scanning live frame for text...')) {
      originalEl.innerText = "Analyzing image & extracting text...";
      if (translatedEl) translatedEl.innerText = "Translating...";
    }

    // 1. Try Native CORS-Free Frame Capture & Vision OCR via Kotlin Bridge first
    if (window.AndroidBridge && typeof window.AndroidBridge.captureFrameAndProcess === 'function' && this.mode !== 'gallery') {
      try {
        window.AndroidBridge.captureFrameAndProcess(targetCode, 'onOCRResultComplete');
        return;
      } catch (e) {
        console.warn("Native captureFrameAndProcess bridge call failed", e);
      }
    }

    // 2. Try Base64 Image Processing for Gallery upload
    if (base64Image && window.AndroidBridge && typeof window.AndroidBridge.processOCRImage === 'function') {
      try {
        window.AndroidBridge.processOCRImage(base64Image, targetCode, 'onOCRResultComplete');
        return;
      } catch (e) {
        console.warn("Native processOCRImage bridge call failed", e);
      }
    }
  },

  speakPronunciation() {
    const textToSpeak = this.lastTranslatedText || document.getElementById('ocr-text-translated')?.innerText || "Sanrakshit pathya";
    if (!textToSpeak) return;

    const targetSelect = document.getElementById('ocr-target-lang');
    const targetCode = targetSelect ? targetSelect.value : 'hi';

    if (window.AndroidBridge && typeof window.AndroidBridge.speakText === 'function') {
      try {
        window.AndroidBridge.speakText(textToSpeak, targetCode);
        return;
      } catch (e) {
        console.warn("Native speakText call failed, falling back to Web Speech API", e);
      }
    }

    const langObj = this.languages.find(l => l.code === targetCode) || { locale: 'en-US' };

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = langObj.locale || 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech synthesis error", e);
      }
    }
  }
};

// Global OCR AI callback handler
window.onOCRResultComplete = function(respStr) {
  try {
    let parsed;
    try {
      const apiResp = JSON.parse(respStr);
      if (apiResp.candidates && apiResp.candidates[0] && apiResp.candidates[0].content) {
        const rawText = apiResp.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        parsed = JSON.parse(cleanJson);
      } else {
        parsed = JSON.parse(respStr);
      }
    } catch (innerErr) {
      const cleanJson = respStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    const originalEl = document.getElementById('ocr-text-original');
    const translatedEl = document.getElementById('ocr-text-translated');

    if (parsed.detected && originalEl) {
      originalEl.innerText = parsed.detected;
    }
    if (parsed.translated && translatedEl) {
      translatedEl.innerText = parsed.translated;
      CommCoach.OCRTranslate.lastTranslatedText = parsed.translated;
    }
  } catch (e) {
    console.error("OCR result parse failed", e);
  }
};
