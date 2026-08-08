// CCOS Daily Quiz Game Module
CommCoach.DailyQuiz = {
  activeIdx: 0,
  selectedOpt: null,
  questions: [
    {
      q: "What does the STAR framework stand for in situational communication?",
      a: ["Situation, Task, Action, Result", "Status, Task, Analysis, Report", "Strategy, Timeline, Action, Review", "Structure, Tone, Audience, Relevance"],
      correct: 0
    },
    {
      q: "Under the Pyramid Principle, where should your primary conclusion be placed?",
      a: ["At the very beginning", "In the summary slide at the end", "Gradually introduced in the middle", "Inside the appendix support paths"],
      correct: 0
    },
    {
      q: "What is the primary function of the 'Point' inside the PREP structure?",
      a: ["State your core message clearly and directly on launch", "Explain details of the case context", "Provide statistical graphs and metrics", "Open up for question sessions"],
      correct: 0
    }
  ],

  init() {
    const backBtn = document.getElementById('btn-quiz-back');
    const submitBtn = document.getElementById('btn-quiz-submit');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        CommCoach.Navigation.goBack();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitAnswer());
    }

    this.loadQuestion(0);
  },

  loadQuestion(idx) {
    const progressText = document.getElementById('quiz-progress-text');
    const questionTitle = document.getElementById('quiz-question-title');
    const optionsBox = document.getElementById('quiz-options-box');
    const submitBtn = document.getElementById('btn-quiz-submit');

    if (!optionsBox) return;
    optionsBox.innerHTML = '';
    this.selectedOpt = null;
    if (submitBtn) submitBtn.disabled = true;

    const q = this.questions[idx];
    if (progressText) progressText.innerText = `Question ${idx + 1} of ${this.questions.length}`;
    if (questionTitle) questionTitle.innerText = q.q;

    q.a.forEach((choice, choiceIdx) => {
      const card = document.createElement('div');
      card.className = 'quiz-option';
      card.innerHTML = `
        <span class="option-letter">${String.fromCharCode(65 + choiceIdx)}</span>
        <span class="option-text">${choice}</span>
      `;
      card.addEventListener('click', () => {
        optionsBox.querySelectorAll('.quiz-option').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedOpt = choiceIdx;
        if (submitBtn) submitBtn.disabled = false;
      });
      optionsBox.appendChild(card);
    });
  },

  submitAnswer() {
    const q = this.questions[this.activeIdx];
    const optionsBox = document.getElementById('quiz-options-box');
    const cards = optionsBox.querySelectorAll('.quiz-option');
    const submitBtn = document.getElementById('btn-quiz-submit');

    cards.forEach((card, idx) => {
      if (idx === q.correct) {
        card.classList.add('correct');
      } else if (idx === this.selectedOpt) {
        card.classList.add('incorrect');
      }
    });

    if (submitBtn) submitBtn.disabled = true;

    setTimeout(() => {
      this.activeIdx++;
      if (this.activeIdx < this.questions.length) {
        this.loadQuestion(this.activeIdx);
      } else {
        CommCoach.state.totalQuizzes++;
        CommCoach.State.save();
        if (CommCoach.Profile) CommCoach.Profile.updateUI();
        CommCoach.Navigation.navigate('screen-dashboard');
        this.activeIdx = 0;
      }
    }, 2000);
  }
};
