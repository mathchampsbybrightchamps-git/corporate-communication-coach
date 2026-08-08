// CCOS Core Navigation Router
CommCoach.Navigation = {
  history: [],

  init() {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        this.navigate(target);
      });
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

    // Highlighting bottom nav active buttons
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-target') === screenId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },

  goBack() {
    if (this.history.length > 0) {
      const previousScreen = this.history.pop();
      // Navigate without pushing current screen back onto history
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

        // Sync bottom nav highlight
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
          if (item.getAttribute('data-target') === previousScreen) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      }
      return true; // Back was handled
    }
    return false; // No history; let native handle (exit app)
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
