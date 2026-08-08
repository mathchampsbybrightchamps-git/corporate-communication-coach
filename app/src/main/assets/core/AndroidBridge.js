// CCOS Native Interface API Bridge Standardizer
CommCoach.AndroidBridge = {
  // Helper dispatches mapping JS promises cleanly to Native Interface threads
  callAI(prompt, jsCallbackMethod) {
    if (window.AndroidBridge && typeof window.AndroidBridge.getAICoaching === 'function') {
      window.AndroidBridge.getAICoaching(prompt, jsCallbackMethod);
    } else {
      console.warn("Android native bridge missing, triggering mock fallback");
      setTimeout(() => {
        const mockResult = JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: "Mock AI Speech feedback summary: Ensure you speak clearly and map concepts with STAR logic."
              }]
            }
          }]
        });
        window[jsCallbackMethod](mockResult);
      }, 1000);
    }
  },

  verifyLinkedIn(jsCallbackMethod) {
    if (window.AndroidBridge && typeof window.AndroidBridge.verifyLinkedIn === 'function') {
      window.AndroidBridge.verifyLinkedIn(jsCallbackMethod);
    } else {
      setTimeout(() => {
        window[jsCallbackMethod](JSON.stringify({ status: 'pending', message: 'Submitted.' }));
      }, 1000);
    }
  },

  launchPlayBilling(jsCallbackMethod) {
    if (window.AndroidBridge && typeof window.AndroidBridge.launchPlayBilling === 'function') {
      window.AndroidBridge.launchPlayBilling(jsCallbackMethod);
    } else {
      setTimeout(() => {
        window[jsCallbackMethod]('success');
      }, 1000);
    }
  }
};
