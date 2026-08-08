// Comm Coach — Permissions Manager Wrapper
const PermissionManager = {
  async requestMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return { status: 'granted' };
    } catch (err) {
      console.warn('Microphone permission request failed:', err);
      return { status: 'denied', error: err.name };
    }
  },

  async requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return { status: 'granted' };
    } catch (err) {
      console.warn('Camera permission request failed:', err);
      return { status: 'denied', error: err.name };
    }
  },

  async requestLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ status: 'unsupported' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            status: 'granted',
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          });
        },
        (err) => {
          console.warn('Location query blocked:', err);
          resolve({ status: 'denied', error: err.code });
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    });
  }
};
