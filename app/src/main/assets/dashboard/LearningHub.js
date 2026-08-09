// CCOS Learning Hub — reference material entry point for the bottom nav.
// Groups the Jargon Dictionary, Vocabulary Dictionary and Daily Quiz, which were
// previously reachable only from deep inside the Profile screen.
CommCoach.LearningHub = {
  init() {
    const routes = {
      'learn-card-jargon': 'screen-jargon-dict',
      'learn-card-vocab': 'screen-vocab-dict',
      'learn-card-quiz': 'screen-quiz'
    };

    Object.keys(routes).forEach(cardId => {
      const card = document.getElementById(cardId);
      if (card) {
        card.addEventListener('click', () => {
          CommCoach.Navigation.navigate(routes[cardId]);
        });
      }
    });
  }
};
