// CCOS Bootstrapper & Namespace Initializer
window.CommCoach = {
  state: {
    currentScreen: 'screen-splash',
    currentLanguage: 'en',
    currentLevel: null,
    targetLevel: null,
    displayName: 'User',
    totalDrills: 0,
    totalQuizzes: 0,
    streak: 7
  },
  levels: [
    { id: 'L1', name: 'Associate', desc: 'Entry level executing technical tasks' },
    { id: 'L2', name: 'Team Leader', desc: 'Guiding small execution units' },
    { id: 'L3', name: 'Manager', desc: 'Aligning department outputs' },
    { id: 'L4', name: 'Director', desc: 'Directing multiple operational units' },
    { id: 'L5', name: 'Head of Department', desc: 'Setting strategic department scopes' },
    { id: 'L6', name: 'VP', desc: 'Managing regional operations metrics' },
    { id: 'L7', name: 'Chief Officer', desc: 'C-Suite aligning organizational keys' },
    { id: 'L8', name: 'Executive Director', desc: 'Board governance and stakeholder alignment' }
  ],
  drills: [] // Scenarios dynamically registered by module files
};

// Global Boot Callback Register
window.addEventListener('DOMContentLoaded', () => {
  feather.replace();
  
  // Initialization sequences in modular order
  if (CommCoach.Supabase) CommCoach.Supabase.init();
  if (CommCoach.State) CommCoach.State.load();
  if (CommCoach.Navigation) CommCoach.Navigation.init();
  if (CommCoach.i18n) CommCoach.i18n.init();
  if (CommCoach.WelcomeScreen) CommCoach.WelcomeScreen.init();
  if (CommCoach.LevelSelection) CommCoach.LevelSelection.init();
  if (CommCoach.Permissions) CommCoach.Permissions.init();
  if (CommCoach.Dashboard) CommCoach.Dashboard.init();
  if (CommCoach.OCRTranslate) CommCoach.OCRTranslate.init();
  if (CommCoach.DailyQuiz) CommCoach.DailyQuiz.init();
  if (CommCoach.SpeakStudio) CommCoach.SpeakStudio.init();
  if (CommCoach.PracticeLibrary) CommCoach.PracticeLibrary.init();
  if (CommCoach.Profile) CommCoach.Profile.init();
  if (CommCoach.SubscriptionPaywall) CommCoach.SubscriptionPaywall.init();
  if (CommCoach.FeedbackSummary) CommCoach.FeedbackSummary.init();
  if (CommCoach.JargonDict) CommCoach.JargonDict.init();
  if (CommCoach.VocabDict) CommCoach.VocabDict.init();
  if (CommCoach.MyAccount) CommCoach.MyAccount.init();
  if (CommCoach.MeetingRecorder) CommCoach.MeetingRecorder.init();
  if (CommCoach.LearningHub) CommCoach.LearningHub.init();
  if (CommCoach.Nudges) CommCoach.Nudges.init();

  // Route URL hashes if any
  if (CommCoach.Navigation) CommCoach.Navigation.initRouter();

  // Splash load fade sequence
  setTimeout(() => {
    if (!window.location.hash) {
      const savedScreen = CommCoach.state.currentScreen;
      let startScreen = (savedScreen && savedScreen !== 'screen-splash') ? savedScreen : (CommCoach.state.currentLevel ? 'screen-dashboard' : 'screen-welcome');
      
      // If booting into a secondary screen, seed history with dashboard
      if (startScreen !== 'screen-dashboard' && startScreen !== 'screen-welcome' && startScreen !== 'screen-auth') {
        if (CommCoach.Navigation) CommCoach.Navigation.history.push('screen-dashboard');
      }

      if (CommCoach.Navigation) CommCoach.Navigation.navigate(startScreen);
    }
  }, 1500);
});
