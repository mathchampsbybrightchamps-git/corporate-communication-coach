// CCOS Speak Studio Voice Recording Module
CommCoach.SpeakStudio = {
  isRecording: false,
  timer: null,
  seconds: 0,
  recognition: null,
  transcript: "",

  init() {
    const recordBtn = document.getElementById('btn-record-action');
    const backBtn = document.getElementById('btn-recorder-back');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.isRecording) this.stopRecording();
        CommCoach.Navigation.goBack();
      });
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-IN'; 

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += chunk.trim() + ' ';
          } else {
            interimTranscript += chunk;
          }
        }

        this.transcript = finalTranscript;
        const textLabel = document.getElementById('transcription-text');
        if (textLabel) {
          textLabel.innerText = (this.transcript + interimTranscript).trim() || "Listening...";
        }
      };
    }

    if (recordBtn) {
      recordBtn.addEventListener('click', () => {
        if (!this.isRecording) {
          this.startRecording();
        } else {
          this.stopRecording();
        }
      });
    }
  },

  startRecording() {
    const recordBtn = document.getElementById('btn-record-action');
    const timerLabel = document.getElementById('recording-timer');
    const textLabel = document.getElementById('transcription-text');

    this.isRecording = true;
    this.seconds = 0;
    this.transcript = "";

    if (timerLabel) timerLabel.innerText = "00:00";
    if (textLabel) textLabel.innerText = "Listening...";
    if (recordBtn) recordBtn.classList.add('recording');

    if (this.recognition) {
      try { this.recognition.start(); } catch (e) { console.warn(e); }
    }

    this.timer = setInterval(() => {
      this.seconds++;
      let mins = Math.floor(this.seconds / 60).toString().padStart(2, '0');
      let secs = (this.seconds % 60).toString().padStart(2, '0');
      if (timerLabel) timerLabel.innerText = `${mins}:${secs}`;

      if (this.seconds >= 90) {
        this.stopRecording();
      }
    }, 1000);
  },

  stopRecording() {
    const recordBtn = document.getElementById('btn-record-action');
    this.isRecording = false;
    if (recordBtn) recordBtn.classList.remove('recording');
    clearInterval(this.timer);

    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) { console.warn(e); }
    }

    CommCoach.state.totalDrills++;
    CommCoach.State.save();
    if (CommCoach.Profile) CommCoach.Profile.updateUI();

    // Save drill transcript to local storage
    const scenarioTag = this.currentScenarioTag || 'General';
    if (CommCoach.RecordingStorage) {
      CommCoach.RecordingStorage.saveDrillTranscript(this.transcript, this.seconds, scenarioTag);
    }

    if (CommCoach.FeedbackSummary) {
      CommCoach.FeedbackSummary.showAnalysis(this.transcript, this.seconds, scenarioTag);
    }
  },

  openChallenge(challengeData) {
    const promptText = document.getElementById('recorder-prompt-text');
    const frameworkTag = document.getElementById('recorder-framework-tag');
    
    if (promptText) promptText.innerText = challengeData.text;
    if (frameworkTag) frameworkTag.innerText = `${challengeData.framework} Framework`;

    // Track which scenario is active for file naming
    this.currentScenarioTag = challengeData.framework || 'General';

    CommCoach.Navigation.navigate('screen-recorder');
  }
};
