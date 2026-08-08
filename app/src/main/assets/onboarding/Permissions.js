// CCOS Hardware Clearances Onboarding Module
CommCoach.Permissions = {
  init() {
    const grantBtn = document.getElementById('btn-permissions-grant');
    const skipBtn = document.getElementById('btn-permissions-skip');

    if (grantBtn) {
      grantBtn.addEventListener('click', async () => {
        // Trigger runtime callbacks
        if (typeof PermissionManager !== 'undefined') {
          try {
            await PermissionManager.requestMicrophone();
            await PermissionManager.requestLocation();
          } catch (e) {
            console.warn(e);
          }
        }
        CommCoach.Navigation.navigate('screen-dashboard');
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-dashboard');
      });
    }
  }
};
