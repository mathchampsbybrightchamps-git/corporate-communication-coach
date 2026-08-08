// CCOS Multimodal Scan & Translate Engine with Sub-Second Performance & Low-Light Detection
CommCoach.OCRTranslate = {
  mode: 'live',
  interval: null,
  stream: null,
  capturedImageData: null,
  targetLanguage: 'hi',

  init() {
    const tabLive = document.getElementById('tab-ocr-live');
    const tabGallery = document.getElementById('tab-ocr-gallery');
    const btnCapture = document.getElementById('btn-ocr-capture');
    const btnBack = document.getElementById('btn-ocr-back');
    const btnPronounce = document.getElementById('btn-ocr-pronounce');
    const galleryInput = document.getElementById('input-ocr-gallery');
    const targetSelect = document.getElementById('ocr-target-lang');
    const cardAction = document.getElementById('action-scan-translate');

    if (cardAction) {
      cardAction.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-scan-translate');
      });
    }

    if (btnBack) {
      btnBack.addEventListener('click', () => {
        this.stopCamera();
        CommCoach.Navigation.goBack();
      });
    }

    if (tabLive) {
      tabLive.addEventListener('click', () => {
        this.mode = 'live';
        tabLive.classList.add('active');
        if (tabGallery) tabGallery.classList.remove('active');
        document.getElementById('container-ocr-live').style.display = 'block';
        document.getElementById('container-ocr-gallery').style.display = 'none';
        this.startCamera();
      });
    }

    if (tabGallery) {
      tabGallery.addEventListener('click', () => {
        this.mode = 'gallery';
        tabGallery.classList.add('active');
        if (tabLive) tabLive.classList.remove('active');
        document.getElementById('container-ocr-live').style.display = 'none';
        document.getElementById('container-ocr-gallery').style.display = 'block';
        this.stopCamera();
      });
    }

    if (btnCapture) {
      btnCapture.addEventListener('click', () => {
        this.captureAndProcessFrame();
      });
    }

    if (btnPronounce) {
      btnPronounce.addEventListener('click', () => {
        this.speakPronunciation();
      });
    }

    if (galleryInput) {
      galleryInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const preview = document.getElementById('ocr-gallery-preview');
            if (preview) {
              preview.src = event.target.result;
              preview.style.display = 'block';
            }
            this.capturedImageData = event.target.result;
            this.processImageData(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (targetSelect) {
      targetSelect.addEventListener('change', (e) => {
        this.targetLanguage = e.target.value;
        if (this.capturedImageData) {
          this.processImageData(this.capturedImageData);
        }
      });
    }

    // Auto-start camera if booted directly into scan screen
    const screen = document.getElementById('screen-scan-translate');
    if (screen && screen.classList.contains('active')) {
      this.startCamera();
    }
  },

  async startCamera() {
    const video = document.getElementById('ocr-camera-preview');
    if (!video) return;

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 },
            aspectRatio: 1.33
          }
        });
        video.srcObject = this.stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.play().catch(e => console.warn("Video play exception", e));

        if (this.mode === 'live') {
          this.startLiveLoop();
        }
      }
    } catch (e) {
      console.warn("Camera access fallback", e);
      const originalEl = document.getElementById('ocr-text-original');
      if (originalEl) originalEl.innerText = "Camera access unavailable. Select photo from gallery.";
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
        this.checkLowLightCondition();
      }
    }, 800);
  },

  /**
   * Issue 9: Detect low-light conditions and notify user
   */
  checkLowLightCondition() {
    const video = document.getElementById('ocr-camera-preview');
    if (!video || video.videoWidth === 0) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(video, 0, 0, 100, 100);
      const imgData = ctx.getImageData(0, 0, 100, 100);
      const data = imgData.data;

      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
      }
      const avgBrightness = totalBrightness / (data.length / 4);
      const lowLightBanner = document.getElementById('ocr-lowlight-warning');

      if (avgBrightness < 45) {
        if (!lowLightBanner) {
          const banner = document.createElement('div');
          banner.id = 'ocr-lowlight-warning';
          banner.className = 'font-11 text-center pad-4';
          banner.style.background = 'rgba(239, 68, 68, 0.2)';
          banner.style.color = '#ef4444';
          banner.style.borderRadius = 'var(--radius-sm)';
          banner.style.marginTop = '8px';
          banner.innerText = 'Low light detected. Move to brighter area for optimal OCR accuracy.';
          const parent = document.getElementById('container-ocr-live');
          if (parent) parent.appendChild(banner);
        }
      } else if (lowLightBanner) {
        lowLightBanner.remove();
      }
    } catch (e) {
      // Ignored for surface draw
    }
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
    const translatedEl = document.getElementById('ocr-text-translated');
    const targetSelect = document.getElementById('ocr-target-lang');
    const textToSpeak = translatedEl ? translatedEl.innerText : '';
    const langCode = targetSelect ? targetSelect.value : 'hi';

    if (!textToSpeak || textToSpeak === 'Waiting for input...' || textToSpeak === 'Translating...') {
      return;
    }

    // 1. Call Native Android TextToSpeech engine via Bridge if available
    if (window.AndroidBridge && typeof window.AndroidBridge.speakText === 'function') {
      try {
        window.AndroidBridge.speakText(textToSpeak, langCode);
        return;
      } catch (e) {
        console.warn("Native speakText bridge call failed, falling back to Web Speech", e);
      }
    }

    // 2. Fallback to Web Speech API window.speechSynthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = langCode;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }
};

// Global callback for Native Android Bridge Vision OCR completion with Issue 5 JSON code block cleaning
window.onOCRResultComplete = function(respStr) {
  const originalEl = document.getElementById('ocr-text-original');
  const translatedEl = document.getElementById('ocr-text-translated');

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

    if (originalEl && parsed.detected) {
      originalEl.innerText = parsed.detected;
    }

    if (translatedEl && parsed.translated) {
      translatedEl.innerText = parsed.translated;
    }
  } catch (e) {
    console.error("OCR response parse error", e);
    if (originalEl && originalEl.innerText === "Analyzing image & extracting text...") {
      originalEl.innerText = "Align text inside frame or select a photo from gallery...";
    }
    if (translatedEl && translatedEl.innerText === "Translating...") {
      translatedEl.innerText = "Waiting for input...";
    }
  }
};
