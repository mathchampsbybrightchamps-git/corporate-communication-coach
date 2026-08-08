// CCOS Dashboard Hub Module
CommCoach.Dashboard = {
  init() {
    const speakCard = document.getElementById('action-speak-studio');
    const ocrCard = document.getElementById('action-ocr-translate');
    const quizCard = document.getElementById('action-daily-quiz');
    const libraryCard = document.getElementById('action-browse-library');

    if (speakCard) {
      speakCard.addEventListener('click', () => {
        if (CommCoach.SpeakStudio) {
          CommCoach.SpeakStudio.openChallenge({
            text: 'Propose a cloud database migration project to a Client. Focus on security and cost alignment.',
            framework: 'PREP'
          });
        }
      });
    }

    if (ocrCard) {
      ocrCard.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-ocr');
      });
    }

    if (quizCard) {
      quizCard.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-quiz');
      });
    }

    if (libraryCard) {
      libraryCard.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-library');
      });
    }
    const meetingCard = document.getElementById('action-meeting-recorder');
    if (meetingCard) {
      meetingCard.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-meeting-recorder');
      });
    }
  }
};
