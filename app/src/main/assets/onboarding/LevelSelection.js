// CCOS Level Selection Module
CommCoach.LevelSelection = {
  init() {
    const currentList = document.getElementById('current-level-list');
    const targetList = document.getElementById('target-level-list');

    if (currentList) {
      currentList.innerHTML = '';
      CommCoach.levels.forEach(level => {
        const card = document.createElement('div');
        card.className = `level-card ${CommCoach.state.currentLevel === level.id ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="level-title-row">
            <span class="level-card-title">${level.name}</span>
            <span class="level-tag">${level.id}</span>
          </div>
          <p class="level-tagline">${level.desc}</p>
        `;
        card.addEventListener('click', () => {
          currentList.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          CommCoach.state.currentLevel = level.id;
          CommCoach.State.save();
        });
        currentList.appendChild(card);
      });
    }

    if (targetList) {
      targetList.innerHTML = '';
      CommCoach.levels.forEach(level => {
        const card = document.createElement('div');
        card.className = `level-card ${CommCoach.state.targetLevel === level.id ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="level-title-row">
            <span class="level-card-title">${level.name}</span>
            <span class="level-tag">${level.id}</span>
          </div>
          <p class="level-tagline">${level.desc}</p>
        `;
        card.addEventListener('click', () => {
          targetList.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          CommCoach.state.targetLevel = level.id;
          CommCoach.State.save();
        });
        targetList.appendChild(card);
      });
    }

    // Connect button clicks navigation routes
    const currentBtn = document.getElementById('btn-current-level-next');
    if (currentBtn) {
      currentBtn.addEventListener('click', () => {
        if (CommCoach.state.currentLevel) {
          CommCoach.Navigation.navigate('screen-target-level');
        }
      });
    }

    const targetBtn = document.getElementById('btn-target-level-next');
    if (targetBtn) {
      targetBtn.addEventListener('click', () => {
        if (CommCoach.state.targetLevel) {
          CommCoach.Navigation.navigate('screen-permissions');
        }
      });
    }
  }
};
