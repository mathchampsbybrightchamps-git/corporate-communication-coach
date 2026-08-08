// CCOS Internationalization & Translations Module
CommCoach.i18n = {
  init() {
    const selectors = document.querySelectorAll('.lang-selector');
    selectors.forEach(selector => {
      selector.addEventListener('change', (e) => {
        this.setLanguage(e.target.value);
      });
    });

    // Set initial configuration
    this.setLanguage(CommCoach.state.currentLanguage || 'en');
  },

  setLanguage(lang) {
    CommCoach.state.currentLanguage = lang;
    CommCoach.State.save();

    // Sync all drop-down selectors values
    document.querySelectorAll('.lang-selector').forEach(sel => sel.value = lang);

    // Apply translations dictionary fields
    const dict = translations[lang] || translations['en'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.innerText = dict[key];
      }
    });

    if (CommCoach.Profile) CommCoach.Profile.updateUI();
  }
};
