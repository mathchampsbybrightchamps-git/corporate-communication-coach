// CCOS My Account Settings Module
CommCoach.MyAccount = {
  init() {
    const backBtn = document.getElementById('btn-account-back');
    const nameInput = document.getElementById('input-account-name');
    const resetBtn = document.getElementById('btn-account-reset-pwd');
    const deleteBtn = document.getElementById('btn-account-delete');
    const logoutBtn = document.getElementById('btn-account-logout');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        CommCoach.Navigation.goBack();
      });
    }

    if (nameInput) {
      nameInput.value = CommCoach.state.displayName || "John Doe";
      nameInput.addEventListener('input', (e) => {
        CommCoach.state.displayName = e.target.value;
        CommCoach.State.save();
        if (CommCoach.Profile) CommCoach.Profile.updateUI();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (CommCoach.Nudges) {
          CommCoach.Nudges.showNudge("Account Action", "Password reset instructions sent to your email.");
        }
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        const confirmDelete = confirm("Warning: This action will permanently erase your CCOS account and history records. Proceed?");
        if (confirmDelete) {
          localStorage.clear();
          location.reload(); // Hard reboots app state
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        location.reload();
      });
    }
  }
};
