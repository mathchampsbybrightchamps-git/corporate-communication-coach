// CCOS Core State Controller
CommCoach.State = {
  load() {
    const saved = localStorage.getItem('ccos_state');
    if (saved) {
      Object.assign(CommCoach.state, JSON.parse(saved));
    }
  },
  
  save() {
    localStorage.setItem('ccos_state', JSON.stringify(CommCoach.state));
    
    // Forward document data to native Firestore sync
    if (window.AndroidBridge && typeof window.AndroidBridge.saveStats === 'function') {
      try {
        window.AndroidBridge.saveStats(
          CommCoach.state.totalDrills,
          CommCoach.state.totalQuizzes,
          CommCoach.state.streak,
          CommCoach.state.currentLanguage,
          CommCoach.state.currentLevel || ""
        );
      } catch (e) {
        console.warn("Native bridge stats sync failed", e);
      }
    }
  }
};
