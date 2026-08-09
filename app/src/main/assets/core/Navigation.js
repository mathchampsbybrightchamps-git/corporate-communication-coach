// CCOS Core Navigation Router
CommCoach.Navigation = {
  history: [],

  // Rendered into every <nav data-bottom-nav> so the bar is defined once rather than
  // copy-pasted into each screen. The mic is a centred action button, not a route.
  navItems: [
    { target: 'screen-dashboard', icon: 'grid',      label: 'Daily',    i18n: 'nav_daily' },
    { target: 'screen-library',   icon: 'book',      label: 'Library',  i18n: 'nav_library' },
    { action: 'record',           icon: 'mic',       label: 'Record' },
    { target: 'screen-learning',  icon: 'book-open', label: 'Learning', i18n: 'nav_learning' },
    { target: 'screen-profile',   icon: 'user',      label: 'Profile',  i18n: 'nav_profile' }
  ],

  init() {
    this.renderBottomNavs();
  },

  renderBottomNavs() {
    const bars = document.querySelectorAll('nav[data-bottom-nav]');

    bars.forEach(bar => {
      bar.innerHTML = '';

      this.navItems.forEach(item => {
        const btn = document.createElement('button');

        if (item.action === 'record') {
          btn.className = 'nav-item nav-item-mic';
          btn.setAttribute('aria-label', 'Start recording');
          btn.innerHTML = `<i data-feather="${item.icon}"></i>`;
          btn.addEventListener('click', () => this.startDirectRecording());
        } else {
          btn.className = 'nav-item';
          btn.setAttribute('data-target', item.target);
          const i18nAttr = item.i18n ? ` data-i18n="${item.i18n}"` : '';
          btn.innerHTML =
            `<i data-feather="${item.icon}"></i><span${i18nAttr}>${item.label}</span>`;
          btn.addEventListener('click', () => this.navigate(item.target));
        }

        bar.appendChild(btn);
      });
    });

    // feather is a CDN dependency; never let its absence break navigation.
    if (typeof feather !== 'undefined' && feather.replace) {
      try { feather.replace(); } catch (e) { console.warn('feather.replace failed', e); }
    }

    this.syncNavHighlight(CommCoach.state.currentScreen);
  },

  /** Mic button: jump straight into Speak Studio and begin capturing. */
  startDirectRecording() {
    if (!CommCoach.SpeakStudio) return;

    if (CommCoach.SpeakStudio.isRecording) {
      CommCoach.SpeakStudio.stopRecording();
      return;
    }

    CommCoach.SpeakStudio.openChallenge({
      text: 'Free-form drill. Speak on any topic and get delivery analysis.',
      framework: 'PREP'
    });

    // Let the screen transition settle before the mic engages.
    setTimeout(() => {
      if (CommCoach.SpeakStudio && !CommCoach.SpeakStudio.isRecording) {
        CommCoach.SpeakStudio.startRecording();
      }
    }, 350);
  },

  syncNavHighlight(screenId) {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      const target = item.getAttribute('data-target');
      if (target && target === screenId) item.classList.add('active');
      else item.classList.remove('active');
    });
  },

  navigate(screenId, updateHash = true) {
    const previousScreen = CommCoach.state.currentScreen;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      // Push previous screen to history stack (avoid duplicate pushes)
      if (previousScreen && previousScreen !== screenId) {
        this.history.push(previousScreen);
        // Cap history depth at 20 entries to prevent memory leaks
        if (this.history.length > 20) this.history.shift();
      }

      target.classList.add('active');
      CommCoach.state.currentScreen = screenId;
      CommCoach.State.save();

      if (updateHash) {
        window.location.hash = `#/${screenId.replace('screen-', '')}`;
      }

      // Stop camera when moving away from OCR translate screen
      if (screenId !== 'screen-ocr') {
        if (CommCoach.OCRTranslate) CommCoach.OCRTranslate.stopCamera();
      } else {
        if (CommCoach.OCRTranslate) CommCoach.OCRTranslate.startCamera();
      }

      // Sync paywall local rates if relevant
      if (screenId === 'screen-paywall') {
        if (CommCoach.SubscriptionPaywall) CommCoach.SubscriptionPaywall.updatePricing();
      }
    }

    this.syncNavHighlight(screenId);
  },

  goBack() {
    if (this.history.length > 0) {
      const previousScreen = this.history.pop();
      // Navigate to previous screen without re-pushing current screen
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const target = document.getElementById(previousScreen);
      if (target) {
        target.classList.add('active');
        CommCoach.state.currentScreen = previousScreen;
        CommCoach.State.save();
        window.location.hash = `#/${previousScreen.replace('screen-', '')}`;

        if (previousScreen !== 'screen-ocr') {
          if (CommCoach.OCRTranslate) CommCoach.OCRTranslate.stopCamera();
        } else {
          if (CommCoach.OCRTranslate) CommCoach.OCRTranslate.startCamera();
        }

        this.syncNavHighlight(previousScreen);
        return true;
      }
    }
    
    // Fallback: If history stack is empty, safely navigate back to main dashboard
    this.navigate('screen-dashboard');
    return true;
  },

  initRouter() {
    window.addEventListener('hashchange', () => this.handleRoute());
    if (window.location.hash) {
      this.handleRoute();
    }
  },

  handleRoute() {
    const hash = window.location.hash.substring(2);
    const parts = hash.split('?');
    const path = parts[0];
    const screenId = `screen-${path}`;

    const target = document.getElementById(screenId);
    if (target) {
      this.navigate(screenId, false);

      // Deep link scenario parameters support
      if (path === 'recorder' && parts[1]) {
        const params = new URLSearchParams(parts[1]);
        const scenarioId = params.get('scenario');
        const found = CommCoach.drills.find(d => d.id === scenarioId);
        if (found && CommCoach.SpeakStudio) {
          CommCoach.SpeakStudio.openChallenge({
            text: found.desc,
            framework: found.framework
          });
        }
      }
    }
  }
};
