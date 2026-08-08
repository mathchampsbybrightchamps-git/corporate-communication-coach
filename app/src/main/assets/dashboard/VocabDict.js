// CCOS Corporate Vocabulary Dictionary Module
CommCoach.VocabDict = {
  vocabList: [
    { word: "Articulate", def: "Express ideas clearly and coherently.", example: "She was able to articulate the technical migration risks during the boardroom pitch." },
    { word: "Consolidate", def: "Combine multiple items into a single, unified whole.", example: "We need to consolidate our cloud metrics into one central dashboard." },
    { word: "Mitigate", def: "Make something less severe, serious, or painful.", example: "We prepared budget overrides to mitigate launch delay risks." },
    { word: "Spearhead", def: "Lead a campaign, project, or course of action.", example: "He will spearhead the integration of standard Firestore REST clients." },
    { word: "Quantify", def: "Express or measure the quantity of.", example: "Please quantify our Q3 ARR project output changes." },
    { word: "Formulate", def: "Create or prepare methodically.", example: "The VP will formulate our security remediation checklist terms." },
    { word: "Synthesize", def: "Combine elements to produce a structured output.", example: "We must synthesize raw user transcripts into actionable diagnostic metrics." }
  ],

  init() {
    const backBtn = document.getElementById('btn-vocab-back');
    const searchInput = document.getElementById('input-vocab-search');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        CommCoach.Navigation.goBack();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderWords(e.target.value);
      });
    }

    this.renderWords("");
  },

  renderWords(query) {
    const list = document.getElementById('vocab-words-list');
    if (!list) return;

    list.innerHTML = '';
    const filtered = this.vocabList.filter(item => 
      item.word.toLowerCase().includes(query.toLowerCase()) ||
      item.def.toLowerCase().includes(query.toLowerCase())
    );

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'action-card';
      card.style.marginBottom = '12px';
      card.innerHTML = `
        <h3 class="card-heading" style="color: var(--success);">${item.word}</h3>
        <div class="pad-vertical-8 border-bottom">
          <span class="text-muted font-12">Definition</span>
          <p class="font-14 text-main" style="margin-top: 4px;">${item.def}</p>
        </div>
        <div class="pad-vertical-8">
          <span class="text-muted font-12">Example Application</span>
          <p class="font-13 text-muted" style="margin-top: 4px; font-style: italic;">"${item.example}"</p>
        </div>
      `;
      list.appendChild(card);
    });
  }
};
