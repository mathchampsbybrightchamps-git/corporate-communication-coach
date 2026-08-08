// CCOS Local Pricing PPP & LinkedIn Verification Paywall Module
CommCoach.SubscriptionPaywall = {
  init() {
    const backBtn = document.getElementById('btn-paywall-back');
    const verifyBtns = document.querySelectorAll('.btn-linkedin-verify');
    const upgradeBtn = document.getElementById('btn-paywall-upgrade');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        CommCoach.Navigation.goBack();
      });
    }

    verifyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (CommCoach.AndroidBridge) {
          CommCoach.AndroidBridge.verifyLinkedIn('onLinkedInVerifyComplete');
        }
      });
    });

    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        if (CommCoach.AndroidBridge) {
          CommCoach.AndroidBridge.launchPlayBilling('onPlayBillingComplete');
        }
      });
    });

    this.updatePricing();
  },

  updatePricing() {
    const priceLabel = document.getElementById('paywall-price-amount');
    if (!priceLabel) return;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const lang = navigator.language || "";
    
    let symbol = "$";
    let amount = 29;

    if (tz.includes("Kolkata") || lang.includes("IN") || lang.includes("hi")) {
      symbol = "₹";
      amount = 999;
    } else if (tz.includes("London") || lang.includes("GB")) {
      symbol = "£";
      amount = 24.99;
    } else if (tz.includes("Europe") || lang.includes("fr") || lang.includes("de") || lang.includes("es") || lang.includes("it")) {
      symbol = "€";
      amount = 27.99;
    } else if (tz.includes("Sydney") || tz.includes("Melbourne") || lang.includes("AU")) {
      symbol = "A$";
      amount = 39.99;
    } else if (tz.includes("Tokyo") || lang.includes("ja")) {
      symbol = "¥";
      amount = 3200;
    }

    priceLabel.innerText = `${symbol}${amount}`;
  }
};

// Global subscription verification endpoints
window.onLinkedInVerifyComplete = function(respStr) {
  try {
    const resp = JSON.parse(respStr);
    if (resp.status === 'pending') {
      const dialog = document.getElementById('linkedin-verification-dialog');
      if (dialog) dialog.showModal();
    }
  } catch (e) {
    console.error("LinkedIn OAuth parsed failed", e);
  }
};

window.onPlayBillingComplete = function(status) {
  if (status === 'success') {
    const profileBadge = document.getElementById('profile-level-badge');
    if (profileBadge) {
      profileBadge.innerText += " (Coach Pro)";
    }
    CommCoach.Navigation.navigate('screen-profile');
  } else {
    alert("Purchase cancelled.");
  }
};
