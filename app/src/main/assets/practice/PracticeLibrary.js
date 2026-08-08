// CCOS Scenario Practice Library Card Injector Module
CommCoach.PracticeLibrary = {
  init() {
    const list = document.getElementById('library-drill-list');
    if (list) {
      list.innerHTML = '';
      
      // Inject drill cards dynamically from globally registered drills
      CommCoach.drills.forEach(drill => {
        const item = document.createElement('div');
        item.className = 'action-card';
        item.style.marginBottom = '12px';
        item.innerHTML = `
          <div class="flex-row justify-between items-center">
            <span class="level-tag">${drill.tag}</span>
            <span class="level-tagline" style="color: var(--primary); font-weight: 500;">${drill.framework}</span>
          </div>
          <h3 class="card-heading pad-top-8">${drill.title}</h3>
          <p class="level-tagline">${drill.desc}</p>
        `;
        item.addEventListener('click', () => {
          if (CommCoach.SpeakStudio) {
            CommCoach.SpeakStudio.openChallenge({
              text: drill.desc,
              framework: drill.framework
            });
          }
        });
        list.appendChild(item);
      });
    }
  }
};
