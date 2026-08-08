// Comm Coach — Authentication & Welcome Onboarding Slider Logic

let isSignUpMode = true;
let activeSlideIdx = 0;

window.addEventListener('DOMContentLoaded', () => {
  initWelcomeSlider();
  initAuthFlow();
  
  // Set initial slider visual state
  syncSlideState();
});

function initWelcomeSlider() {
  const nextBtn = document.getElementById('btn-welcome-next');
  const dots = document.querySelectorAll('#welcome-slider-dots .dot');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (activeSlideIdx < 3) {
        activeSlideIdx++;
        syncSlideState();
      } else {
        CommCoach.Navigation.navigate('screen-auth');
      }
    });
  }

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      activeSlideIdx = idx;
      syncSlideState();
    });
  });
}

function syncSlideState() {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('#welcome-slider-dots .dot');
  const nextBtn = document.getElementById('btn-welcome-next');

  if (slides.length === 0) return;

  slides.forEach((slide, idx) => {
    if (idx === activeSlideIdx) {
      slide.style.display = 'flex';
      slide.classList.add('active');
    } else {
      slide.style.display = 'none';
      slide.classList.remove('active');
    }
  });

  dots.forEach((dot, idx) => {
    if (idx === activeSlideIdx) {
      dot.style.backgroundColor = 'var(--primary)';
      dot.classList.add('active');
    } else {
      dot.style.backgroundColor = 'var(--border-color)';
      dot.classList.remove('active');
    }
  });

  const activeLang = (typeof CommCoach !== 'undefined' && CommCoach.state.currentLanguage) ? CommCoach.state.currentLanguage : 'en';
  const dict = (typeof translations !== 'undefined' && translations[activeLang]) ? translations[activeLang] : {};

  if (nextBtn) {
    if (activeSlideIdx === 3) {
      nextBtn.innerText = dict['btn_start'] || 'Get Started';
    } else {
      nextBtn.innerText = dict['btn_next_slide'] || 'Next';
    }
  }
}

function initAuthFlow() {
  const toggleBtn = document.getElementById('btn-auth-toggle');
  const primaryBtn = document.getElementById('btn-auth-primary');
  
  // Containers
  const loginUnifiedGroup = document.getElementById('group-login-unified');
  const signupPhoneGroup = document.getElementById('group-signup-phone');
  const emailSignupBtn = document.getElementById('btn-social-email');
  
  // Headers
  const mainHeading = document.getElementById('auth-main-heading');
  const flowTitle = document.getElementById('auth-flow-title');
  const flowSubtitle = document.getElementById('auth-flow-subtitle');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isSignUpMode = !isSignUpMode;
      toggleAuthMode();
    });
  }

  function toggleAuthMode() {
    const activeLang = (typeof CommCoach !== 'undefined' && CommCoach.state.currentLanguage) ? CommCoach.state.currentLanguage : 'en';
    const dict = (typeof translations !== 'undefined' && translations[activeLang]) ? translations[activeLang] : {};

    if (isSignUpMode) {
      // Signup Mode
      if (flowTitle) flowTitle.innerText = dict['auth_title'] || 'Create Account';
      if (mainHeading) mainHeading.innerText = dict['auth_heading'] || 'Join Comm Coach';
      if (flowSubtitle) flowSubtitle.innerText = dict['auth_subtitle'] || 'Start training your executive presence today.';
      if (primaryBtn) {
        primaryBtn.innerText = dict['btn_signup'] || 'Sign Up';
        primaryBtn.removeAttribute('data-i18n');
      }
      if (toggleBtn) toggleBtn.innerText = dict['auth_toggle_login'] || 'Already have an account? Log In';
      
      if (loginUnifiedGroup) loginUnifiedGroup.style.display = 'none';
      if (signupPhoneGroup) signupPhoneGroup.style.display = 'flex';
      if (emailSignupBtn) emailSignupBtn.style.display = 'flex';
    } else {
      // Login Mode
      if (flowTitle) flowTitle.innerText = dict['welcome_back_title'] || 'Welcome Back';
      if (mainHeading) mainHeading.innerText = dict['btn_login'] || 'Log In';
      if (flowSubtitle) flowSubtitle.innerText = dict['login_subtitle'] || 'Sign in to continue your training.';
      if (primaryBtn) {
        primaryBtn.innerText = dict['btn_login'] || 'Log In';
        primaryBtn.removeAttribute('data-i18n');
      }
      if (toggleBtn) toggleBtn.innerText = dict['auth_toggle_signup'] || "Don't have an account? Sign Up";
      
      if (loginUnifiedGroup) loginUnifiedGroup.style.display = 'flex';
      if (signupPhoneGroup) signupPhoneGroup.style.display = 'none';
      if (emailSignupBtn) emailSignupBtn.style.display = 'none';
    }
  }

  // Handle Primary CTA Click (Issue 1 Fix: Reference CommCoach namespace)
  if (primaryBtn) {
    primaryBtn.addEventListener('click', () => {
      CommCoach.state.displayName = 'User_' + Math.floor(Math.random() * 900 + 100);
      updateProfileUI();
      CommCoach.Navigation.navigate('screen-current-level');
    });
  }

  // Bind Social Triggers
  const socials = ['google', 'microsoft', 'facebook', 'linkedin'];
  socials.forEach(platform => {
    const btn = document.getElementById(`btn-social-${platform}`);
    if (btn) {
      btn.addEventListener('click', () => {
        CommCoach.state.displayName = platform.charAt(0).toUpperCase() + platform.slice(1) + ' User';
        updateProfileUI();
        CommCoach.Navigation.navigate('screen-current-level');
      });
    }
  });

  // Email Signup toggle trigger
  if (emailSignupBtn) {
    emailSignupBtn.addEventListener('click', () => {
      isSignUpMode = false;
      toggleAuthMode();
      const loginIdInput = document.getElementById('auth-login-id');
      if (loginIdInput) {
        loginIdInput.placeholder = "Enter email address";
        loginIdInput.focus();
      }
    });
  }
}

function updateProfileUI() {
  const nameEl = document.getElementById('profile-display-name');
  const initialsEl = document.getElementById('profile-avatar-initials');
  
  if (nameEl) nameEl.innerText = CommCoach.state.displayName;
  if (initialsEl && CommCoach.state.displayName) {
    initialsEl.innerText = CommCoach.state.displayName.substring(0, 2).toUpperCase();
  }

  // Update profile metrics card if mounted
  if (CommCoach.Profile) {
    CommCoach.Profile.updateUI();
  }
}
