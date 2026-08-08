// CCOS User Profile Dashboard Settings Module
CommCoach.Profile = {
  init() {
    const paywallBtn = document.getElementById('btn-open-paywall');
    const jargonBtn = document.getElementById('profile-btn-jargon');
    const vocabBtn = document.getElementById('profile-btn-vocab');
    const accountBtn = document.getElementById('profile-btn-account');

    if (paywallBtn) {
      paywallBtn.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-paywall');
      });
    }

    if (jargonBtn) {
      jargonBtn.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-jargon-dict');
      });
    }

    if (vocabBtn) {
      vocabBtn.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-vocab-dict');
      });
    }

    if (accountBtn) {
      accountBtn.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-my-account');
      });
    }

    this.updateUI();
  },

  updateUI() {
    const nameEl = document.getElementById('profile-display-name');
    const levelEl = document.getElementById('profile-level-badge');
    const drillsEl = document.getElementById('profile-total-drills');
    const quizzesEl = document.getElementById('profile-total-quizzes');
    const streakEl = document.getElementById('streak-indicator');

    if (nameEl) nameEl.innerText = CommCoach.state.displayName;
    if (levelEl && CommCoach.state.currentLevel) {
      const found = CommCoach.levels.find(l => l.id === CommCoach.state.currentLevel);
      levelEl.innerText = `Current Level: ${found ? found.name : CommCoach.state.currentLevel}`;
    }
    if (drillsEl) drillsEl.innerText = CommCoach.state.totalDrills;
    if (quizzesEl) quizzesEl.innerText = CommCoach.state.totalQuizzes;
    if (streakEl) streakEl.innerText = `Streak: ${CommCoach.state.streak} Days`;
  }
};
