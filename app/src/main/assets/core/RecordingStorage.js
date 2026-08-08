// CCOS Local Recording Storage Module
// Saves all drill transcripts and AI analysis to device storage
// Path: Documents/CommunicationCoach/[YYYY-MM_MonthName]/[DD-MonthName-YYYY]/
CommCoach.RecordingStorage = {

  /**
   * Save a drill recording transcript and metadata
   * @param {string} transcript - Raw user transcript
   * @param {number} durationSec - Recording duration in seconds
   * @param {string} scenarioTag - Scenario identifier (e.g. "SelfIntro", "ClientPitch")
   */
  saveDrillTranscript(transcript, durationSec, scenarioTag) {
    const now = new Date();
    const timeStr = this.formatTime(now);
    const dateStr = this.formatDate(now);
    const tag = (scenarioTag || 'General').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Drill_${tag}_${timeStr}.txt`;

    const content = [
      '=== CCOS Drill Recording ===',
      `Date: ${dateStr}`,
      `Time: ${now.toLocaleTimeString()}`,
      `Duration: ${durationSec}s`,
      `Level: ${CommCoach.state.currentLevel || 'Not Set'}`,
      `Target Level: ${CommCoach.state.targetLevel || 'Not Set'}`,
      `Scenario: ${scenarioTag || 'General Practice'}`,
      `Language: ${CommCoach.state.currentLanguage || 'en'}`,
      '',
      '--- USER TRANSCRIPT ---',
      transcript || '(No speech detected)',
      '',
      `Word Count: ${(transcript || '').split(/\s+/).filter(w => w.length > 0).length}`,
      `WPM: ${this.calculateWPM(transcript, durationSec)}`,
      '========================='
    ].join('\n');

    this.writeFile(fileName, content);
  },

  /**
   * Save the AI reframed analysis alongside the original
   * @param {string} originalTranscript - Raw user transcript
   * @param {string} reframedText - AI expert reframed version
   * @param {string} coachSummary - AI coach summary
   * @param {object} metrics - { wpm, fillers, jargon, tone, confidence, clarity, persuasion, presence }
   * @param {string} scenarioTag - Scenario identifier
   */
  saveAIAnalysis(originalTranscript, reframedText, coachSummary, metrics, scenarioTag) {
    const now = new Date();
    const timeStr = this.formatTime(now);
    const dateStr = this.formatDate(now);
    const tag = (scenarioTag || 'General').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Analysis_${tag}_${timeStr}.txt`;

    const content = [
      '=== CCOS AI Deep Analysis ===',
      `Date: ${dateStr}`,
      `Time: ${now.toLocaleTimeString()}`,
      `Level: ${CommCoach.state.currentLevel || 'Not Set'}`,
      `Scenario: ${scenarioTag || 'General Practice'}`,
      '',
      '--- METRICS ---',
      `Pacing: ${metrics.wpm || 0} WPM`,
      `Filler Words: ${metrics.fillers || 0}`,
      `Jargon Detected: ${metrics.jargon || 'Clean'}`,
      `Tone: ${metrics.tone || 'Neutral'}`,
      `Confidence: ${metrics.confidence || 0}%`,
      `Clarity: ${metrics.clarity || 0}%`,
      `Persuasion: ${metrics.persuasion || 0}%`,
      `Executive Presence: ${metrics.presence || 0}%`,
      '',
      '--- ORIGINAL RESPONSE ---',
      originalTranscript || '(No speech detected)',
      '',
      '--- EXPERT REFRAMED VERSION ---',
      reframedText || '(Reframing not available)',
      '',
      '--- COACH SUMMARY ---',
      coachSummary || '(Summary not available)',
      '=============================='
    ].join('\n');

    this.writeFile(fileName, content);
  },

  /**
   * Save quiz results
   * @param {number} score - Correct answers
   * @param {number} total - Total questions
   * @param {Array} details - Array of {question, userAnswer, correctAnswer, isCorrect}
   */
  saveQuizResult(score, total, details) {
    const now = new Date();
    const timeStr = this.formatTime(now);
    const dateStr = this.formatDate(now);
    const fileName = `Quiz_${timeStr}.txt`;

    const lines = [
      '=== CCOS Daily Quiz Result ===',
      `Date: ${dateStr}`,
      `Time: ${now.toLocaleTimeString()}`,
      `Score: ${score}/${total}`,
      `Level: ${CommCoach.state.currentLevel || 'Not Set'}`,
      ''
    ];

    if (details && details.length > 0) {
      details.forEach((d, idx) => {
        lines.push(`Q${idx + 1}: ${d.question}`);
        lines.push(`  Your Answer: ${d.userAnswer}`);
        lines.push(`  Correct: ${d.correctAnswer}`);
        lines.push(`  Result: ${d.isCorrect ? 'CORRECT' : 'INCORRECT'}`);
        lines.push('');
      });
    }

    lines.push('==============================');
    this.writeFile(fileName, lines.join('\n'));
  },

  // Core file writer via native bridge
  writeFile(fileName, content) {
    if (window.AndroidBridge && typeof window.AndroidBridge.saveToFile === 'function') {
      try {
        const result = window.AndroidBridge.saveToFile(fileName, content);
        if (result && !result.startsWith('ERROR')) {
          console.log('Recording saved:', result);
        } else {
          console.warn('File save returned error:', result);
        }
      } catch (e) {
        console.error('Native file save failed:', e);
        // Fallback: save to localStorage
        this.fallbackSave(fileName, content);
      }
    } else {
      // No native bridge available, use localStorage fallback
      this.fallbackSave(fileName, content);
    }
  },

  // localStorage fallback when native bridge is unavailable
  fallbackSave(fileName, content) {
    try {
      const key = `ccos_recording_${fileName}`;
      localStorage.setItem(key, content);
      console.log('Recording saved to localStorage:', key);
    } catch (e) {
      console.error('localStorage save failed:', e);
    }
  },

  // Utility: format time as HHMM
  formatTime(date) {
    return date.getHours().toString().padStart(2, '0') +
           date.getMinutes().toString().padStart(2, '0');
  },

  // Utility: format date as DD-Month-YYYY
  formatDate(date) {
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    return `${date.getDate().toString().padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
  },

  // Utility: calculate words per minute
  calculateWPM(transcript, seconds) {
    if (!transcript || seconds <= 0) return 0;
    const wordCount = transcript.split(/\s+/).filter(w => w.length > 0).length;
    return Math.round(wordCount * (60 / seconds));
  }
};
