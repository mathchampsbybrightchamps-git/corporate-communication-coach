// CCOS Push Notification Nudge System
CommCoach.Nudges = {
  nudgeInterval: null,
  nudgesPool: [
    { title: "Streak at Risk", msg: "Practice today to maintain your 7-day streak." },
    { title: "Logical Frameworks", msg: "Master STAR structure models to stand out in meetings." },
    { title: "Ready to Level Up?", msg: "Complete 3 more daily drills to reach VP level criteria." },
    { title: "Filler Word Alert", msg: "Focus on clean pauses in your next verbal drill exercise." },
    { title: "Jargon Radar Check", msg: "Avoid saying 'synergy' or 'circle back' in discussions today." }
  ],

  init() {
    const closeBtn = document.getElementById('btn-nudge-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const toast = document.getElementById('in-app-nudge-toast');
        if (toast) toast.style.display = 'none';
      });
    }

    // Schedule a recurring check every 90 seconds to trigger subtle nudges
    clearInterval(this.nudgeInterval);
    this.nudgeInterval = setInterval(() => {
      this.triggerRandomNudge();
    }, 90000);
  },

  triggerRandomNudge() {
    const idx = Math.floor(Math.random() * this.nudgesPool.length);
    const nudge = this.nudgesPool[idx];
    this.showNudge(nudge.title, nudge.msg);
  },

  showNudge(title, msg) {
    // 1. Trigger in-app sliding toast banner
    const toast = document.getElementById('in-app-nudge-toast');
    const toastTitle = document.getElementById('nudge-toast-title');
    const toastMsg = document.getElementById('nudge-toast-msg');

    if (toast && toastTitle && toastMsg) {
      toastTitle.innerText = title;
      toastMsg.innerText = msg;
      toast.style.display = 'block';

      // Automatically fade out after 6 seconds
      setTimeout(() => {
        toast.style.display = 'none';
      }, 6000);
    }

    // 2. Trigger native Android system notification channel notification
    if (window.AndroidBridge && typeof window.AndroidBridge.showLocalNotification === 'function') {
      try {
        window.AndroidBridge.showLocalNotification(title, msg);
      } catch (e) {
        console.warn("Native push notification channel request failed", e);
      }
    }
  }
};
