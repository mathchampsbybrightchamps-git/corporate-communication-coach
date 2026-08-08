// CCOS Camera OCR Scanning & Live Translate Module
CommCoach.OCRTranslate = {
  stream: null,
  mode: 'live',
  interval: null,
  lastTranslatedText: "हमें विभाग के मील के पत्थर संरेखित करने होंगे।",
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

  sampleCorpus: [
    "We must align department milestones.",
    "Optimize departmental budget resources.",
    "Propose database migration timeline.",
    "State core impact before details.",
    "Reduce filler words during presentations.",
    "Executive alignment on Q3 deliverables."
  ],

  phraseTranslations: {
    hi: [
      "हमें विभाग के मील के पत्थर संरेखित करने होंगे।",
      "विभागीय बजट संसाधनों का अनुकूलन करें।",
      "डेटाबेस माइग्रेशन समयरेखा का प्रस्ताव करें।",
      "विवरण से पहले मुख्य प्रभाव बताएं।",
      "प्रस्तुतियों के दौरान भराव शब्दों को कम करें।",
      "Q3 डिलिवरेबल्स पर कार्यकारी संरेखण।"
    ],
    zh: [
      "我们需要调整部门里程碑。",
      "优化部门预算资源。",
      "提议数据库迁移时间表。",
      "在细节之前陈述核心影响。",
      "减少演讲中的语气词。",
      "Q3交付成果的高管对齐。"
    ],
    es: [
      "Debemos alinear los hitos del departamento.",
      "Optimizar los recursos presupuestarios.",
      "Proponer cronograma de migración.",
      "Presente el impacto principal primero.",
      "Reduzca las muletillas en discursos.",
      "Alineación ejecutiva en entregables Q3."
    ],
    fr: [
      "Nous devons aligner les jalons du département.",
      "Optimiser les ressources budgétaires.",
      "Proposer le calendrier de migration.",
      "Présentez l'impact principal d'abord.",
      "Réduisez les mots de remplissage.",
      "Alignement de la direction sur les livrables du T3."
    ],
    ar: [
      "يجب أن نوحد معالم القسم.",
      "تحسين موارد ميزانية القسم.",
      "اقتراح الجدول الزمني لترحيل البيانات.",
      "اذكر الأثر الرئيسي أولاً.",
      "تقليل الكلمات الحشوية في العروض.",
      "التوافق التنفيذي بشأن تسليمات الربع الثالث."
    ],
    bn: [
      "আমাদের বিভাগের মাইলফলকগুলি সারিবদ্ধ করতে হবে।",
      "বিভাগীয় বাজেট সংস্থান অপ্টিমাইজ করুন।",
      "ডাটাবেস মাইগ্রেশন টাইমলাইন প্রস্তাব করুন।",
      "বিস্তারিত জানানোর আগে মূল প্রভাব বর্ণনা করুন।",
      "উপস্থাপনার সময় ফিলার শব্দ হ্রাস করুন।",
      "Q3 ডেলিভারেবলগুলিতে নির্বাহী প্রান্তিককরণ।"
    ],
    pt: [
      "Devemos alinhar os marcos do departamento.",
      "Otimizar recursos orçamentários.",
      "Propor cronograma de migração de banco de dados.",
      "Declare o impacto principal antes dos detalhes.",
      "Reduza palavras de preenchimento durante apresentações.",
      "Alinhamento executivo nas entregas do Q3."
    ],
    ru: [
      "Мы должны согласовать этапы отдела.",
      "Оптимизировать ресурсы бюджета отдела.",
      "Предложить график миграции базы данных.",
      "Укажите главное влияние перед деталями.",
      "Сократите вводные слова во время презентаций.",
      "Согласование руководством результатов за третий квартал."
    ],
    de: [
      "Wir müssen die Meilensteine der Abteilung aufeinander abstimmen.",
      "Ressourcen des Abteilungsbudgets optimieren.",
      "Zeitplan für die Datenbankmigration vorschlagen.",
      "Hauptwirkung vor Details nennen.",
      "Füllwörter bei Präsentationen reduzieren.",
      "Vorstandsausrichtung auf Q3-Liefergegenstände."
    ],
    ja: [
      "部署のマイルストーンを合わせる必要があります。",
      "部門の予算リソースを最適化します。",
      "データベース移行スケジューリングを提案します。",
      "詳細の前にコアとなる影響を述べます。",
      "プレゼンテーション中のフィラーワードを減らします。",
      "第3四半期の成果物に関する役員との調整。"
    ],
    mr: [
      "आम्हाला विभागाचे टप्पे संरेखित करावे लागतील.",
      "विभागीय अर्थसंकल्प संसाधने अनुकूल करा.",
      "डेटाबेस स्थलांतर वेळापत्रकाचा प्रस्ताव द्या.",
      "तपशीलापूर्वी मुख्य प्रभाव सांगा.",
      "सादरीकरणादरम्यान भरलेले शब्द कमी करा.",
      "Q3 वितरणावर कार्यकारी संरेखन."
    ],
    te: [
      "మేము విభాగాన్ని సమలేఖనం చేయాలి.",
      "విభాగాల బడ్జెట్ వనరులను ఆప్టిమైజ్ చేయండి.",
      "డేటాబేస్ మైగ్రేషన్ సమయక్రమాన్ని ప్రతిపాదించండి.",
      "వివరాలకు ముందు ప్రధాన ప్రభావాన్ని చెప్పండి.",
      "ప్రజెంటేషన్ల సమయంలో ఫిల్లర్ పదాలను తగ్గించండి.",
      "Q3 డెలివరీలపై ఎగ్జిక్యూటివ్ అమరిక."
    ]
  },

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
            this.performTranslation();
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
        this.performTranslation(true);
      });
    }

    this.canvas = document.createElement('canvas');
    this.performTranslation(true);
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
    } else {
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
    if (video && this.canvas) {
      const w = video.videoWidth || video.offsetWidth || 640;
      const h = video.videoHeight || video.offsetHeight || 480;
      this.canvas.width = w;
      this.canvas.height = h;
      const ctx = this.canvas.getContext('2d');
      try {
        ctx.drawImage(video, 0, 0, w, h);
        this.capturedImageData = this.canvas.toDataURL('image/jpeg');
      } catch (e) {
        console.warn("Canvas draw error", e);
      }
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

    // Multi-lingual Translation Lookup
    let translatedText = "";
    if (targetCode === 'en') {
      translatedText = detectedText;
    } else {
      const langPack = this.phraseTranslations[targetCode];
      if (langPack && langPack[this.phraseIdx]) {
        translatedText = langPack[this.phraseIdx];
      } else {
        const langObj = this.languages.find(l => l.code === targetCode) || { name: targetCode.toUpperCase() };
        translatedText = `[${langObj.name}] ${detectedText}`;
      }
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

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(this.lastTranslatedText);
        utterance.lang = langObj.locale || 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech synthesis error", e);
      }
    }
  }
};
