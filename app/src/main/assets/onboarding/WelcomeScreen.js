// CCOS Welcome Onboarding Carousel Slides Module
CommCoach.WelcomeScreen = {
  activeSlideIdx: 0,
  
  init() {
    const nextBtn = document.getElementById('btn-welcome-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.activeSlideIdx < 3) {
          this.activeSlideIdx++;
          this.showSlide(this.activeSlideIdx);
        } else {
          // Proceed to sign up/login screen after intro carousel completes
          CommCoach.Navigation.navigate('screen-auth');
        }
      });
    }

    // Connect slider dots click bounds
    const dots = document.querySelectorAll('#welcome-slider-dots .dot');
    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        this.activeSlideIdx = idx;
        this.showSlide(idx);
      });
    });

    this.showSlide(0);
  },

  showSlide(idx) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('#welcome-slider-dots .dot');

    slides.forEach((slide, sIdx) => {
      if (sIdx === idx) {
        slide.style.display = 'flex';
        slide.classList.add('active');
      } else {
        slide.style.display = 'none';
        slide.classList.remove('active');
      }
    });

    dots.forEach((dot, dIdx) => {
      if (dIdx === idx) {
        dot.classList.add('active');
        dot.style.backgroundColor = 'var(--primary)';
      } else {
        dot.classList.remove('active');
        dot.style.backgroundColor = 'var(--border-color)';
      }
    });

    // Update CTA button label on final onboarding slide
    const nextBtn = document.getElementById('btn-welcome-next');
    if (nextBtn) {
      const dict = translations[CommCoach.state.currentLanguage] || translations['en'];
      if (idx === 3) {
        nextBtn.innerText = dict['btn_start'] || "Get Started";
      } else {
        nextBtn.innerText = dict['btn_next_slide'] || "Next";
      }
    }
  }
};
