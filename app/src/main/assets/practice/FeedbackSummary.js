// CCOS Deep Speech Analysis & Expert Reframing Module
CommCoach.FeedbackSummary = {
  lastTranscript: "",
  lastReframed: "",
  lastMetrics: {},
  lastScenarioTag: "General",

  init() {
    const backBtn = document.getElementById('btn-feedback-back');
    const replayBtn = document.getElementById('btn-feedback-tts-replay');
    const completeBtn = document.getElementById('btn-feedback-complete');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        CommCoach.Navigation.goBack();
      });
    }

    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-dashboard');
      });
    }

    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        if (this.lastReframed) {
          const utterance = new SpeechSynthesisUtterance(this.lastReframed);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        }
      });
    }
  },

  showAnalysis(transcript, seconds, scenarioTag) {
    this.lastTranscript = transcript.trim();
    this.lastScenarioTag = scenarioTag || 'General';
    const wordCount = this.lastTranscript.split(/\s+/).filter(w => w.length > 0).length;
    const duration = seconds > 0 ? seconds : 30;
    const wpm = wordCount > 0 ? Math.round(wordCount * (60 / duration)) : 0;

    // Filler word detection
    const fillerMatches = this.lastTranscript.match(/\b(basically|uhm|uh|um|like|actually|you know|so yeah|kind of|sort of|I mean|right)\b/gi) || [];
    const fillerCount = fillerMatches.length;

    // Jargon detection
    const jargonTerms = ['synergy', 'bandwidth', 'circle back', 'touch base', 'low-hanging fruit', 'boil the ocean', 'leverage', 'pivot', 'deep dive', 'move the needle'];
    const foundJargon = jargonTerms.filter(j => this.lastTranscript.toLowerCase().includes(j));

    // Defensiveness detection
    const defensivePatterns = /\b(it's not my fault|I was told to|they made me|I had no choice|but actually|that's not fair)\b/gi;
    const defensiveMatches = this.lastTranscript.match(defensivePatterns) || [];

    // Tone classification
    const confidentWords = /\b(clearly|specifically|precisely|absolutely|confirmed|delivered|achieved|led|built|drove)\b/gi;
    const hedgingWords = /\b(maybe|perhaps|I think|I guess|sort of|kind of|hopefully|might|could be|not sure)\b/gi;
    const confidentCount = (this.lastTranscript.match(confidentWords) || []).length;
    const hedgingCount = (this.lastTranscript.match(hedgingWords) || []).length;

    // Calculate tone scores (0-100)
    const confidenceScore = Math.min(100, Math.max(15, 50 + (confidentCount * 12) - (hedgingCount * 15) - (fillerCount * 5)));
    const clarityScore = Math.min(100, Math.max(15, 70 - (fillerCount * 8) - (foundJargon.length * 10) + (wordCount > 20 ? 10 : 0)));
    const persuasionScore = Math.min(100, Math.max(15, 45 + (confidentCount * 10) - (defensiveMatches.length * 20) - (hedgingCount * 8)));
    const presenceScore = Math.min(100, Math.max(15, Math.round((confidenceScore + clarityScore + persuasionScore) / 3)));

    let toneLabel = 'Neutral';
    if (presenceScore >= 75) toneLabel = 'Commanding';
    else if (presenceScore >= 55) toneLabel = 'Professional';
    else if (presenceScore >= 35) toneLabel = 'Hesitant';
    else toneLabel = 'Uncertain';

    this.lastMetrics = {
      wpm,
      fillers: fillerCount,
      jargon: foundJargon.length > 0 ? `${foundJargon.length} Found` : 'Clean',
      tone: toneLabel,
      confidence: confidenceScore,
      clarity: clarityScore,
      persuasion: persuasionScore,
      presence: presenceScore
    };

    // Populate quick metrics
    const pacingEl = document.getElementById('feedback-val-pacing');
    const fillersEl = document.getElementById('feedback-val-fillers');
    const jargonEl = document.getElementById('feedback-val-jargon');
    const toneEl = document.getElementById('feedback-val-tone');

    if (pacingEl) pacingEl.innerText = `${wpm} WPM`;
    if (fillersEl) fillersEl.innerText = `${fillerCount} Fillers`;
    if (jargonEl) jargonEl.innerText = foundJargon.length > 0 ? `${foundJargon.length} Found` : 'Clean';
    if (toneEl) toneEl.innerText = toneLabel;

    // Populate original transcript
    const originalEl = document.getElementById('feedback-original-transcript');
    if (originalEl) originalEl.innerText = this.lastTranscript || 'No speech detected. Try recording again.';

    // Populate tone bars with animated fill
    setTimeout(() => {
      this.setToneBar('tone-confidence', 'tone-confidence-val', confidenceScore);
      this.setToneBar('tone-clarity', 'tone-clarity-val', clarityScore);
      this.setToneBar('tone-persuasion', 'tone-persuasion-val', persuasionScore);
      this.setToneBar('tone-presence', 'tone-presence-val', presenceScore);
    }, 300);

    // Build issues list
    this.buildIssuesList(fillerMatches, foundJargon, defensiveMatches, hedgingCount, wpm);

    // Build key points
    this.buildKeyPoints(wordCount, wpm, fillerCount, confidentCount, hedgingCount);

    // Build why-it-matters
    this.buildWhyItMatters(presenceScore, fillerCount, foundJargon.length, hedgingCount);

    // Navigate to feedback screen
    CommCoach.Navigation.navigate('screen-feedback');

    // Request AI reframing via the native bridge
    this.requestAIReframe(this.lastTranscript);
  },

  setToneBar(barId, valId, score) {
    const bar = document.getElementById(barId);
    const val = document.getElementById(valId);
    if (bar) bar.style.width = `${score}%`;
    if (val) val.innerText = `${score}%`;
  },

  buildIssuesList(fillers, jargon, defensive, hedging, wpm) {
    const container = document.getElementById('feedback-issues-list');
    if (!container) return;
    container.innerHTML = '';

    const issues = [];

    if (fillers.length > 0) {
      const unique = [...new Set(fillers.map(f => f.toLowerCase()))];
      issues.push({ label: `Filler words: ${unique.join(', ')}`, type: 'tag-error' });
    }
    if (jargon.length > 0) {
      issues.push({ label: `Corporate jargon: ${jargon.join(', ')}`, type: 'tag-warning' });
    }
    if (defensive.length > 0) {
      issues.push({ label: 'Defensive language detected', type: 'tag-error' });
    }
    if (hedging > 2) {
      issues.push({ label: 'Excessive hedging reduces authority', type: 'tag-warning' });
    }
    if (wpm > 170) {
      issues.push({ label: 'Speaking too fast (aim for 120-150 WPM)', type: 'tag-warning' });
    }
    if (wpm > 0 && wpm < 90) {
      issues.push({ label: 'Speaking too slowly (aim for 120-150 WPM)', type: 'tag-warning' });
    }
    if (issues.length === 0) {
      issues.push({ label: 'No major issues detected', type: 'tag-success' });
    }

    issues.forEach(issue => {
      const tag = document.createElement('span');
      tag.className = `feedback-tag ${issue.type}`;
      tag.innerText = issue.label;
      container.appendChild(tag);
    });
  },

  buildKeyPoints(wordCount, wpm, fillers, confident, hedging) {
    const container = document.getElementById('feedback-keypoints-list');
    if (!container) return;
    container.innerHTML = '';

    const points = [];
    points.push(`Total words spoken: ${wordCount} at ${wpm} WPM`);
    if (fillers > 0) points.push(`${fillers} filler word${fillers > 1 ? 's' : ''} detected -- these undermine credibility in executive settings`);
    if (confident > 0) points.push(`${confident} confident action verb${confident > 1 ? 's' : ''} used -- this signals ownership and decisiveness`);
    if (hedging > 0) points.push(`${hedging} hedging phrase${hedging > 1 ? 's' : ''} found -- replace with direct assertions`);
    if (fillers === 0 && hedging === 0) points.push('Clean delivery with no fillers or hedging -- executive-grade communication');

    points.forEach(p => {
      const li = document.createElement('li');
      li.innerText = p;
      container.appendChild(li);
    });
  },

  buildWhyItMatters(presenceScore, fillers, jargonCount, hedging) {
    const el = document.getElementById('feedback-why-matters');
    if (!el) return;

    let text = '';
    if (presenceScore >= 70) {
      text = 'Your delivery projects executive presence and boardroom readiness. Senior stakeholders will perceive you as prepared and authoritative. Continue refining pacing and structure to maintain this trajectory.';
    } else if (presenceScore >= 45) {
      text = 'Your communication shows solid professional foundations but has areas that limit perceived authority. ';
      if (fillers > 3) text += 'Excessive filler words suggest uncertainty to listeners, even when your content is sound. ';
      if (jargonCount > 0) text += 'Corporate jargon makes your message less accessible and direct. ';
      if (hedging > 2) text += 'Hedging phrases dilute your conviction. Replace "I think we should" with "We should" to sound more decisive. ';
      text += 'Addressing these patterns will significantly elevate how senior leadership perceives your readiness.';
    } else {
      text = 'Your communication patterns currently signal hesitation and lack of preparedness to senior stakeholders. ';
      text += 'In promotion reviews and board settings, delivery carries equal weight to content. ';
      text += 'Focus daily drills on the STAR and PREP frameworks, practice eliminating filler words, and record yourself to build awareness of these patterns.';
    }

    el.innerText = text;
  },

  requestAIReframe(transcript) {
    if (!transcript || transcript.length < 5) {
      const reframedEl = document.getElementById('feedback-reframed-transcript');
      const summaryEl = document.getElementById('feedback-coach-summary');
      if (reframedEl) reframedEl.innerText = 'Insufficient speech input for reframing. Record at least 10 seconds.';
      if (summaryEl) summaryEl.innerText = 'Record a longer drill to receive expert coaching feedback.';
      return;
    }

    const level = CommCoach.state.currentLevel || 'Manager';
    const prompt = `You are an elite executive communication coach. Analyze this corporate speech transcript and respond in EXACTLY this JSON format (no markdown, no code fences):
{"reframed":"[Rewrite the entire response as a communication expert would deliver it at ${level} level. Keep the same core message but make it concise, confident, structured using STAR/PREP framework, remove all filler words, remove jargon, use action verbs, and project executive presence]","summary":"[3-4 sentence expert coaching summary explaining what was done well, what needs improvement, and one specific actionable tip]"}

Original transcript: "${transcript}"`;

    if (window.AndroidBridge && typeof window.AndroidBridge.getAICoaching === 'function') {
      try {
        window.AndroidBridge.getAICoaching(prompt, 'onDeepAnalysisComplete');
      } catch (e) {
        this.handleFallbackReframe(transcript);
      }
    } else {
      this.handleFallbackReframe(transcript);
    }
  },

  handleFallbackReframe(transcript) {
    // Local fallback when AI bridge is unavailable
    let cleaned = transcript
      .replace(/\b(basically|uhm|uh|um|like|actually|you know|so yeah|kind of|sort of|I mean|right)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Replace jargon
    const jargonMap = {
      'synergy': 'collaboration',
      'bandwidth': 'capacity',
      'circle back': 'revisit later',
      'touch base': 'connect',
      'low-hanging fruit': 'immediate wins',
      'leverage': 'use',
      'pivot': 'adjust direction',
      'deep dive': 'thorough review',
      'move the needle': 'drive measurable impact'
    };

    Object.keys(jargonMap).forEach(term => {
      const regex = new RegExp('\\b' + term + '\\b', 'gi');
      cleaned = cleaned.replace(regex, jargonMap[term]);
    });

    // Replace hedging with direct assertions
    cleaned = cleaned
      .replace(/\bI think we should\b/gi, 'We should')
      .replace(/\bmaybe we could\b/gi, 'We will')
      .replace(/\bI guess\b/gi, 'Based on the data,')
      .replace(/\bhopefully\b/gi, 'We expect to')
      .replace(/\bnot sure but\b/gi, '');

    this.lastReframed = cleaned;

    const reframedEl = document.getElementById('feedback-reframed-transcript');
    const summaryEl = document.getElementById('feedback-coach-summary');

    if (reframedEl) reframedEl.innerText = cleaned;
    const fallbackSummary = 'Local analysis applied: filler words removed, corporate jargon replaced with direct language, and hedging phrases converted to assertive statements. For deeper AI-powered coaching, ensure the Gemini API bridge is connected.';
    if (summaryEl) summaryEl.innerText = fallbackSummary;

    // Save AI analysis file locally
    if (CommCoach.RecordingStorage) {
      CommCoach.RecordingStorage.saveAIAnalysis(
        this.lastTranscript,
        cleaned,
        fallbackSummary,
        this.lastMetrics,
        this.lastScenarioTag
      );
    }
  }
};

// Global AI response handler for deep analysis
window.onDeepAnalysisComplete = function(respStr) {
  try {
    let parsed;
    // Try parsing the raw Gemini API response envelope first
    try {
      const apiResp = JSON.parse(respStr);
      if (apiResp.candidates && apiResp.candidates[0] && apiResp.candidates[0].content) {
        const rawText = apiResp.candidates[0].content.parts[0].text;
        // Strip markdown code fences if present
        const cleanJson = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        parsed = JSON.parse(cleanJson);
      } else {
        parsed = JSON.parse(respStr);
      }
    } catch (innerErr) {
      // Try direct parse as fallback
      const cleanJson = respStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    if (parsed.reframed) {
      CommCoach.FeedbackSummary.lastReframed = parsed.reframed;
      const reframedEl = document.getElementById('feedback-reframed-transcript');
      if (reframedEl) reframedEl.innerText = parsed.reframed;
    }

    if (parsed.summary) {
      const summaryEl = document.getElementById('feedback-coach-summary');
      if (summaryEl) summaryEl.innerText = parsed.summary;
    }

    // Save AI analysis file locally
    if (CommCoach.RecordingStorage) {
      CommCoach.RecordingStorage.saveAIAnalysis(
        CommCoach.FeedbackSummary.lastTranscript,
        parsed.reframed || CommCoach.FeedbackSummary.lastReframed,
        parsed.summary || '',
        CommCoach.FeedbackSummary.lastMetrics,
        CommCoach.FeedbackSummary.lastScenarioTag
      );
    }
  } catch (e) {
    console.error("Deep analysis parse failed, running local fallback", e);
    CommCoach.FeedbackSummary.handleFallbackReframe(CommCoach.FeedbackSummary.lastTranscript);
  }
};
