// CCOS Camera OCR Scanning & Live Translate Module
CommCoach.OCRTranslate = {
  stream: null,
  mode: 'live',
  interval: null,
  lastTranslatedText: "",
  mockPhrases: [
    "We must align department milestones.",
    "Optimize departmental budget resources.",
    "Propose database migration timeline.",
    "State core impact before details.",
    "Reduce filler words during presentations."
  ],
  mockTranslations: {
    en: { prefix: "" },
    zh: { prefix: "[CN] ", phrases: ["我们需要调整部门里程碑。", "优化部门预算资源。", "提议数据库迁移时间表。", "在细节之前陈述核心影响。", "减少演讲中的语气词。"] },
    hi: { prefix: "[HI] ", phrases: ["हमें विभाग के मील के पत्थर संरेखित करने होंगे।", "विभागीय बजट संसाधनों का अनुकूलन करें।", "डेटाबेस माइग्रेशन समयरेखा का प्रस्ताव करें।", "विवरण से पहले मुख्य प्रभाव बताएं।", "प्रस्तुतियों के दौरान भराव शब्दों को कम करें।"] },
    es: { prefix: "[ES] ", phrases: ["Debemos alinear los hitos del departamento.", "Optimizar los recursos presupuestarios.", "Proponer cronograma de migración.", "Presente el impacto principal primero.", "Reduzca las muletillas en discursos."] },
    fr: { prefix: "[FR] ", phrases: ["Nous devons aligner les jalons du département.", "Optimiser les ressources budgétaires.", "Proposer le calendrier de migration.", "Présentez l'impact principal d'abord.", "Réduisez les mots de remplissage."] },
    ar: { prefix: "[AR] ", phrases: ["يجب أن نوحد معالم القسم.", "تحسين موارد ميزانية القسم.", "اقتراح الجدول الزمني لترحيل البيانات.", "اذكر الأثر الرئيسي أولاً.", "تقليل الكلمات الحشوية في العروض."] }
  },

  init() {
    const backBtn = document.getElementById('btn-ocr-back');
    const modeLive = document.getElementById('btn-ocr-mode-live');
    const modeCapture = document.getElementById('btn-ocr-mode-capture');
    const shutterBtn = document.getElementById('btn-ocr-shutter');
    const pronounceBtn = document.getElementById('btn-ocr-pronounce');
    const targetSelect = document.getElementById('ocr-target-lang');

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
        this.performTranslation();
      });
    }

    if (pronounceBtn) {
      pronounceBtn.addEventListener('click', () => {
        if (this.lastTranslatedText) {
          const targetLang = targetSelect ? targetSelect.value : 'en';
          const utterance = new SpeechSynthesisUtterance(this.lastTranslatedText);
          if (targetLang === 'zh') utterance.lang = 'zh-CN';
          else if (targetLang === 'hi') utterance.lang = 'hi-IN';
          else if (targetLang === 'es') utterance.lang = 'es-ES';
          else if (targetLang === 'fr') utterance.lang = 'fr-FR';
          else if (targetLang === 'ar') utterance.lang = 'ar-SA';
          else utterance.lang = 'en-US';

          window.speechSynthesis.speak(utterance);
        }
      });
    }

    if (targetSelect) {
      targetSelect.addEventListener('change', () => {
        if (this.mode === 'live') {
          this.performTranslation(true);
        }
      });
    }
  },

  async startCamera() {
    const video = document.getElementById('ocr-camera-preview');
    if (!video) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      video.srcObject = this.stream;

      if (this.mode === 'live') {
        this.startLiveLoop();
      }
    } catch (err) {
      console.error("Camera access failed", err);
      document.getElementById('ocr-text-original').innerText = "Camera permission blocked. Check device settings.";
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
      this.performTranslation();
    }, 2500);
  },

  lastPhraseIdx: 0,
  performTranslation(preserveText = false) {
    const originalEl = document.getElementById('ocr-text-original');
    const translatedEl = document.getElementById('ocr-text-translated');
    const targetSelect = document.getElementById('ocr-target-lang');
    const pronounceBtn = document.getElementById('btn-ocr-pronounce');

    if (!originalEl || !translatedEl) return;

    const targetLang = targetSelect ? targetSelect.value : 'en';

    if (!preserveText) {
      this.lastPhraseIdx = (this.lastPhraseIdx + 1) % this.mockPhrases.length;
    }
    const originalText = this.mockPhrases[this.lastPhraseIdx];
    originalEl.innerText = originalText;

    let translatedText = originalText;
    const langPack = this.mockTranslations[targetLang];
    if (langPack) {
      if (langPack.phrases && langPack.phrases[this.lastPhraseIdx]) {
        translatedText = langPack.phrases[this.lastPhraseIdx];
      } else {
        translatedText = langPack.prefix + originalText;
      }
    }

    translatedEl.innerText = translatedText;
    this.lastTranslatedText = translatedText;

    if (pronounceBtn) pronounceBtn.disabled = false;
  }
};
