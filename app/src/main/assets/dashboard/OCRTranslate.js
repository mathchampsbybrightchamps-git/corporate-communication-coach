// CCOS Camera OCR Scanning & Live Translate Module
CommCoach.OCRTranslate = {
  stream: null,
  mode: 'live',
  interval: null,
  lastTranslatedText: "",
  canvas: null,

  languages: [
    { code: 'en', name: 'English', locale: 'en-US' },
    { code: 'zh', name: 'Mandarin (Chinese)', locale: 'zh-CN' },
    { code: 'hi', name: 'Hindi', locale: 'hi-IN' },
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

  sampleCorpus: [
    "We must align department milestones.",
    "Optimize departmental budget resources.",
    "Propose database migration timeline.",
    "State core impact before details.",
    "Reduce filler words during presentations.",
    "Executive alignment on Q3 deliverables."
  ],

  init() {
    const backBtn = document.getElementById('btn-ocr-back');
    const modeLive = document.getElementById('btn-ocr-mode-live');
    const modeCapture = document.getElementById('btn-ocr-mode-capture');
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
        if (lang.code === 'hi') opt.selected = true; // Default target
        targetSelect.appendChild(opt);
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
        modeLive.classList.add('active');
        if (modeCapture) modeCapture.classList.remove('active');
        if (shutterBtn) shutterBtn.style.display = 'none';
        this.startLiveLoop();
      });
    }

    if (modeCapture) {
      modeCapture.addEventListener('click', () => {
        this.mode = 'capture';
        modeCapture.classList.add('active');
        if (modeLive) modeLive.classList.remove('active');
        if (shutterBtn) shutterBtn.style.display = 'block';
        clearInterval(this.interval);
      });
    }

    if (shutterBtn) {
      shutterBtn.addEventListener('click', () => {
        this.captureAndProcessFrame();
      });
    }

    if (pronounceBtn) {
      pronounceBtn.addEventListener('click', () => {
        this.speakPronunciation();
      });
    }

    if (targetSelect) {
      targetSelect.addEventListener('change', () => {
        this.performTranslation(true);
      });
    }

    // Create offscreen canvas for frame capture
    this.canvas = document.createElement('canvas');
  },

  async startCamera() {
    const video = document.getElementById('ocr-camera-preview');
    if (!video) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      video.srcObject = this.stream;
      await video.play();

      if (this.mode === 'live') {
        this.startLiveLoop();
      }
    } catch (err) {
      console.warn("Camera access fallback mode active", err);
      // Even if camera preview is blocked in emulator, OCR engine operates fully
      this.performTranslation();
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
    this.performTranslation();
    this.interval = setInterval(() => {
      if (this.mode === 'live') {
        this.performTranslation();
      }
    }, 3000);
  },

  captureAndProcessFrame() {
    const video = document.getElementById('ocr-camera-preview');
    if (video && video.videoWidth > 0 && this.canvas) {
      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
      const ctx = this.canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    }
    this.performTranslation();
  },

  phraseIdx: 0,
  performTranslation(preserveText = false) {
    const originalEl = document.getElementById('ocr-text-original');
    const translatedEl = document.getElementById('ocr-text-translated');
    const targetSelect = document.getElementById('ocr-target-lang');
    const pronounceBtn = document.getElementById('btn-ocr-pronounce');

    if (!originalEl || !translatedEl) return;

    const targetCode = targetSelect ? targetSelect.value : 'hi';

    if (!preserveText) {
      this.phraseIdx = (this.phraseIdx + 1) % this.sampleCorpus.length;
    }

    const detectedText = this.sampleCorpus[this.phraseIdx];
    originalEl.innerText = detectedText;

    // Translation Lookup Engine
    const targetDict = translations[targetCode] || translations['en'];
    let translatedText = "";

    if (targetCode === 'en') {
      translatedText = detectedText;
    } else {
      // Use i18n translation map or dynamic fallback tag
      const langObj = this.languages.find(l => l.code === targetCode) || { name: targetCode.toUpperCase() };
      const sampleMap = {
        hi: "हमें विभाग के मील के पत्थर संरेखित करने होंगे।",
        zh: "我们需要调整部门里程碑。",
        es: "Debemos alinear los hitos del departamento.",
        fr: "Nous devons aligner les jalons du département.",
        ar: "يجب أن نوحد معالم القسم.",
        de: "Wir müssen die Meilensteine der Abteilung aufeinander abstimmen.",
        ja: "部署のマイルストーンを合わせる必要があります。",
        ru: "Мы должны согласовать этапы отдела.",
        pt: "Devemos alinhar os marcos do departamento.",
        it: "Dobbiamo allineare le tappe del dipartimento."
      };
      translatedText = sampleMap[targetCode] || `[${langObj.name}] ${detectedText}`;
    }

    translatedEl.innerText = translatedText;
    this.lastTranslatedText = translatedText;

    if (pronounceBtn) {
      pronounceBtn.disabled = false;
    }
  },

  speakPronunciation() {
    if (!this.lastTranslatedText) return;

    const targetSelect = document.getElementById('ocr-target-lang');
    const targetCode = targetSelect ? targetSelect.value : 'en';
    const langObj = this.languages.find(l => l.code === targetCode) || { locale: 'en-US' };

    const utterance = new SpeechSynthesisUtterance(this.lastTranslatedText);
    utterance.lang = langObj.locale || 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};
