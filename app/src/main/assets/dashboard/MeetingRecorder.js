// CCOS Multi-Speaker Meeting Recorder & Multilingual AI MOM Generator
//
// Audio is captured natively (AudioRecord -> WAV) and sent to Gemini in rolling chunks.
// The model performs speaker diarization, per-utterance language identification, verbatim
// transcription in the original script, and English translation. The web layer keeps a
// canonical speaker roster so labels stay stable across chunk boundaries.
//
// The Web Speech API is deliberately NOT used here: it returns text only (no waveform, so
// no diarization possible), accepts a single fixed language tag, and would contend with
// AudioRecord for the microphone.
CommCoach.MeetingRecorder = {
  isRecording: false,
  timer: null,
  seconds: 0,
  chunkSeconds: 20,

  // Wall-clock start. The elapsed time is derived from this rather than counted, because
  // setInterval is throttled while the screen is off and would drift badly.
  startedAt: 0,

  // Recording runs in a foreground service that outlives this WebView, so the transcript
  // is mirrored to localStorage and restored if Android recreates the activity.
  STORAGE_KEY: 'ccos_active_meeting',

  // Canonical labels exactly as the model emits them ("Speaker 1"), plus client-side
  // display names. Labels are never renamed, so the model's continuity is preserved.
  speakerLabels: [],
  speakerNames: {},

  transcriptLines: [],
  meetingTopic: 'Sprint Alignment Sync',
  languageHint: '',
  lastMOM: null,
  pendingChunks: 0,

  init() {
    const backBtn = document.getElementById('btn-meeting-back');
    const startBtn = document.getElementById('btn-meeting-start');
    const stopBtn = document.getElementById('btn-meeting-stop');
    const exportBtn = document.getElementById('btn-mom-export');
    const newBtn = document.getElementById('btn-meeting-new');
    const cardAction = document.getElementById('action-meeting-recorder');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.isRecording) this.stopRecording();
        CommCoach.Navigation.goBack();
      });
    }

    if (cardAction) {
      cardAction.addEventListener('click', () => {
        CommCoach.Navigation.navigate('screen-meeting-recorder');
      });
    }

    if (startBtn) startBtn.addEventListener('click', () => this.startRecording());
    if (stopBtn) stopBtn.addEventListener('click', () => this.stopRecording());
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportMOMFile());
    if (newBtn) newBtn.addEventListener('click', () => this.resetMeeting());

    this.renderSpeakers();
    this.restoreIfCapturing();
  },

  // ---------------------------------------------------------------- recording lifecycle

  startRecording() {
    const bridge = window.AndroidBridge;
    if (!bridge || typeof bridge.startMeetingCapture !== 'function') {
      this.setStatus('Native audio capture unavailable. Run this inside the Android app.', true);
      return;
    }

    const titleInput = document.getElementById('input-meeting-title');
    if (titleInput && titleInput.value.trim()) {
      this.meetingTopic = titleInput.value.trim();
    }

    const hintInput = document.getElementById('input-meeting-langhint');
    this.languageHint = hintInput ? hintInput.value.trim() : '';

    this.isRecording = true;
    this.seconds = 0;
    this.startedAt = Date.now();
    this.transcriptLines = [];
    this.speakerLabels = [];
    this.speakerNames = {};
    this.pendingChunks = 0;

    document.getElementById('container-meeting-setup').style.display = 'none';
    document.getElementById('container-meeting-active').style.display = 'block';
    document.getElementById('container-meeting-mom').style.display = 'none';

    document.getElementById('btn-meeting-start').style.display = 'none';
    document.getElementById('btn-meeting-stop').style.display = 'block';
    document.getElementById('group-mom-actions').style.display = 'none';

    const topicLabel = document.getElementById('active-meeting-topic');
    if (topicLabel) topicLabel.innerText = this.meetingTopic;

    this.startTimer();
    this.pushContext();
    this.renderSpeakers();
    this.renderLiveTranscript();
    this.setStatus(`Listening - first transcript in about ${this.chunkSeconds}s. ` +
                   `Recording continues if you lock the screen.`);

    try {
      bridge.startMeetingCapture(this.chunkSeconds, 'onMeetingChunkComplete');
      this.persist();
    } catch (e) {
      console.error('startMeetingCapture failed', e);
      this.setStatus('Could not start recording: ' + (e.message || e), true);
      this.isRecording = false;
    }
  },

  startTimer() {
    clearInterval(this.timer);
    const tick = () => {
      this.seconds = Math.floor((Date.now() - this.startedAt) / 1000);
      const mins = Math.floor(this.seconds / 60);
      const secs = this.seconds % 60;
      const timerEl = document.getElementById('meeting-timer');
      if (timerEl) {
        timerEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    };
    tick();
    this.timer = setInterval(tick, 1000);
  },

  // ---------------------------------------------------------------- crash/lock resilience

  persist() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        topic: this.meetingTopic,
        languageHint: this.languageHint,
        startedAt: this.startedAt,
        speakerLabels: this.speakerLabels,
        speakerNames: this.speakerNames,
        transcriptLines: this.transcriptLines
      }));
    } catch (e) {
      console.warn('Could not persist meeting state', e);
    }
  },

  clearPersisted() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      /* nothing useful to do */
    }
  },

  /**
   * If the service is still recording after the WebView was recreated (screen lock,
   * low-memory kill), rebuild the UI from the mirrored state and keep going.
   */
  restoreIfCapturing() {
    const bridge = window.AndroidBridge;
    if (!bridge || typeof bridge.isMeetingCaptureRunning !== 'function') return;

    let stillRunning = false;
    try {
      stillRunning = bridge.isMeetingCaptureRunning();
    } catch (e) {
      return;
    }
    if (!stillRunning) {
      this.clearPersisted();
      return;
    }

    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null');
    } catch (e) {
      saved = null;
    }
    if (!saved) return;

    this.meetingTopic = saved.topic || this.meetingTopic;
    this.languageHint = saved.languageHint || '';
    this.startedAt = saved.startedAt || Date.now();
    this.speakerLabels = saved.speakerLabels || [];
    this.speakerNames = saved.speakerNames || {};
    this.transcriptLines = saved.transcriptLines || [];
    this.isRecording = true;

    document.getElementById('container-meeting-setup').style.display = 'none';
    document.getElementById('container-meeting-active').style.display = 'block';
    document.getElementById('container-meeting-mom').style.display = 'none';
    document.getElementById('btn-meeting-start').style.display = 'none';
    document.getElementById('btn-meeting-stop').style.display = 'block';
    document.getElementById('group-mom-actions').style.display = 'none';

    const topicLabel = document.getElementById('active-meeting-topic');
    if (topicLabel) topicLabel.innerText = this.meetingTopic;

    this.startTimer();
    this.renderSpeakers();
    this.renderLiveTranscript();
    this.setStatus('Reconnected to the meeting still recording in the background.');

    CommCoach.Navigation.navigate('screen-meeting-recorder');
  },

  stopRecording() {
    this.isRecording = false;
    clearInterval(this.timer);
    this.clearPersisted();

    const bridge = window.AndroidBridge;
    if (bridge && typeof bridge.stopMeetingCapture === 'function') {
      try {
        bridge.stopMeetingCapture();
      } catch (e) {
        console.warn('stopMeetingCapture failed', e);
      }
    }

    document.getElementById('container-meeting-active').style.display = 'none';
    document.getElementById('container-meeting-mom').style.display = 'block';
    document.getElementById('btn-meeting-stop').style.display = 'none';
    document.getElementById('group-mom-actions').style.display = 'flex';

    // The final partial chunk is still in flight; give it a moment to land so its
    // content makes it into the minutes.
    if (this.pendingChunks > 0) {
      this.setMOMPlaceholder('Finishing the last few seconds of audio...');
      setTimeout(() => this.generateMOM(), 6000);
    } else {
      this.generateMOM();
    }
  },

  /** Sends the canonical roster and language hint to the native layer. */
  pushContext() {
    const bridge = window.AndroidBridge;
    if (!bridge || typeof bridge.updateMeetingContext !== 'function') return;

    try {
      bridge.updateMeetingContext(JSON.stringify({
        speakers: this.speakerLabels,
        languageHint: this.languageHint
      }));
    } catch (e) {
      console.warn('updateMeetingContext failed', e);
    }
  },

  // ---------------------------------------------------------------- chunk results

  handleChunkResult(respStr) {
    if (this.pendingChunks > 0) this.pendingChunks--;

    let envelope;
    try {
      envelope = JSON.parse(respStr);
    } catch (e) {
      this.setStatus('Unreadable transcription response.', true);
      return;
    }

    if (envelope && envelope.error) {
      this.setStatus(envelope.error.message || 'Transcription failed.', true);
      return;
    }

    let parsed = envelope;
    if (envelope && envelope.candidates && envelope.candidates[0] &&
        envelope.candidates[0].content && envelope.candidates[0].content.parts) {
      const rawText = envelope.candidates[0].content.parts[0].text || '';
      const cleanJson = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        console.warn('Chunk JSON parse failed', cleanJson);
        return;
      }
    }

    const segments = (parsed && parsed.segments) || [];
    if (segments.length === 0) return; // silence or noise only

    let discoveredNew = false;

    segments.forEach(seg => {
      const label = (seg.speaker || 'Speaker 1').trim();
      if (this.speakerLabels.indexOf(label) === -1) {
        this.speakerLabels.push(label);
        discoveredNew = true;
      }

      this.transcriptLines.push({
        speaker: label,
        language: (seg.language || 'Unknown').trim(),
        original: (seg.original || '').trim(),
        english: (seg.english || '').trim(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        })
      });
    });

    if (discoveredNew) {
      this.pushContext(); // keep native roster in sync for the next chunk
      this.renderSpeakers();
    }

    this.renderLiveTranscript();
    this.persist(); // survive an activity recreation while the screen is locked
    if (this.isRecording) this.setStatus('Listening...');
  },

  // ---------------------------------------------------------------- rendering

  renderSpeakers() {
    const label = document.getElementById('speaker-count-label');
    const switcher = document.getElementById('meeting-speaker-switcher');

    if (label) label.innerText = `Speakers detected: ${this.speakerLabels.length}`;
    if (!switcher) return;

    switcher.innerHTML = '';

    if (this.speakerLabels.length === 0) {
      const hint = document.createElement('span');
      hint.className = 'font-11 text-muted';
      hint.innerText = 'No voices identified yet.';
      switcher.appendChild(hint);
      return;
    }

    this.speakerLabels.forEach(canonical => {
      const chip = document.createElement('button');
      chip.className = 'chip active';
      chip.style.fontSize = '12px';
      chip.innerText = this.displayNameFor(canonical);
      chip.title = 'Tap to rename';
      chip.addEventListener('click', () => this.beginRename(canonical, chip));
      switcher.appendChild(chip);
    });
  },

  displayNameFor(canonical) {
    return this.speakerNames[canonical] || canonical;
  },

  /**
   * Inline rename editor. Avoids window.prompt(), which a custom WebChromeClient
   * suppresses unless onJsPrompt is explicitly implemented.
   */
  beginRename(canonical, chipEl) {
    const input = document.createElement('input');
    input.className = 'form-input';
    input.style.fontSize = '12px';
    input.style.padding = '4px 8px';
    input.style.width = '150px';
    input.value = this.displayNameFor(canonical);
    input.placeholder = canonical;

    const commit = () => {
      const value = input.value.trim();
      if (value && value !== canonical) this.speakerNames[canonical] = value;
      else delete this.speakerNames[canonical];
      this.renderSpeakers();
      this.renderLiveTranscript();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    });
    input.addEventListener('blur', commit);

    chipEl.replaceWith(input);
    input.focus();
    input.select();
  },

  renderLiveTranscript() {
    const container = document.getElementById('meeting-live-transcript');
    if (!container) return;

    if (this.transcriptLines.length === 0) {
      container.innerHTML =
        `<p class="font-12 text-muted text-center" style="font-style: italic;">Listening for speech...</p>`;
      return;
    }

    container.innerHTML = '';

    this.transcriptLines.forEach(line => {
      const bubble = document.createElement('div');
      bubble.style.borderLeft = '3px solid var(--primary)';
      bubble.style.paddingLeft = '8px';

      const header = document.createElement('div');
      header.className = 'flex-row justify-between items-center';

      const who = document.createElement('span');
      who.className = 'font-12 font-700';
      who.style.color = 'var(--primary)';
      who.innerText = this.displayNameFor(line.speaker);

      const meta = document.createElement('span');
      meta.className = 'font-11 text-muted';
      meta.innerText = line.timestamp;

      header.appendChild(who);
      header.appendChild(meta);
      bubble.appendChild(header);

      // Language tag
      const langTag = document.createElement('span');
      langTag.className = 'level-tag';
      langTag.style.fontSize = '10px';
      langTag.style.marginTop = '2px';
      langTag.style.display = 'inline-block';
      langTag.innerText = line.language;
      bubble.appendChild(langTag);

      // Verbatim original, only when it differs from the English rendering
      if (line.original && line.original !== line.english) {
        const orig = document.createElement('p');
        orig.className = 'font-13 text-main';
        orig.style.marginTop = '4px';
        orig.innerText = line.original;
        bubble.appendChild(orig);
      }

      if (line.english) {
        const eng = document.createElement('p');
        eng.className = 'font-12 text-muted';
        eng.style.marginTop = '2px';
        eng.style.fontStyle = 'italic';
        eng.innerText = line.english;
        bubble.appendChild(eng);
      }

      container.appendChild(bubble);
    });

    container.scrollTop = container.scrollHeight;
  },

  setStatus(message, isError) {
    const el = document.getElementById('active-speaker-status');
    if (!el) return;
    el.innerText = message;
    el.style.color = isError ? 'var(--error)' : 'var(--text-muted)';
  },

  setMOMPlaceholder(text) {
    const summaryEl = document.getElementById('mom-summary');
    if (summaryEl) summaryEl.innerText = text;
  },

  // ---------------------------------------------------------------- MOM generation

  /** Diarized, English-normalised transcript used for minutes and export. */
  buildEnglishTranscript() {
    return this.transcriptLines
      .map(l => `[${l.timestamp}] ${this.displayNameFor(l.speaker)} (${l.language}): ${l.english || l.original}`)
      .join('\n');
  },

  generateMOM() {
    const dateLabel = document.getElementById('mom-generated-date');
    if (dateLabel) dateLabel.innerText = `Generated on: ${new Date().toLocaleString()}`;

    const fullTranscript = this.buildEnglishTranscript();

    if (fullTranscript.length < 10) {
      this.renderMOMDisplay({
        summary: 'No intelligible speech was captured, so there is nothing to summarise.',
        keyPoints: [],
        actionItems: [],
        decisions: []
      });
      return;
    }

    let transcriptToProcess = fullTranscript;
    if (fullTranscript.length > 12000) {
      transcriptToProcess = '[Summarised Meeting Chunks]\n' +
        this.chunkTranscript(fullTranscript, 6000).join('\n---\n');
    }

    const roster = this.speakerLabels.map(l => this.displayNameFor(l)).join(', ') || 'Unknown';

    const prompt = `You are a corporate Minutes of Meeting (MOM) generator.
The transcript below has already been diarized and translated into English.

Identify distinct discussion points, decisions made, and explicit action items assigned to
specific speakers with target deadlines. Attribute action items to the speaker names shown.

Respond in strict JSON with no code fences:
{
  "summary":"[3-sentence high-level executive summary]",
  "keyPoints":["[Key point 1]","[Key point 2]"],
  "actionItems":["[Action Item 1 (Owner: Speaker Name, Deadline: Date)]"],
  "decisions":["[Decision 1]"]
}

Meeting Topic: "${this.meetingTopic}"
Participants: ${roster}
Transcript:
${transcriptToProcess}`;

    if (window.AndroidBridge && typeof window.AndroidBridge.getAICoaching === 'function') {
      this.setMOMPlaceholder('Generating minutes...');
      try {
        window.AndroidBridge.getAICoaching(prompt, 'onMOMGeneratedComplete');
      } catch (e) {
        this.fallbackMOM();
      }
    } else {
      this.fallbackMOM();
    }
  },

  chunkTranscript(text, chunkSize) {
    const lines = text.split('\n');
    const chunks = [];
    let currentChunk = [];
    let currentLen = 0;

    lines.forEach(line => {
      if (currentLen + line.length > chunkSize) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [line];
        currentLen = line.length;
      } else {
        currentChunk.push(line);
        currentLen += line.length;
      }
    });

    if (currentChunk.length > 0) chunks.push(currentChunk.join('\n'));
    return chunks;
  },

  /**
   * Used when the AI summary cannot be produced. Reports the transcript that was actually
   * captured rather than inventing plausible-sounding minutes.
   */
  fallbackMOM() {
    const speakers = this.speakerLabels.map(l => this.displayNameFor(l)).join(', ') || 'none identified';
    const languages = [...new Set(this.transcriptLines.map(l => l.language))].join(', ') || 'unknown';

    this.renderMOMDisplay({
      summary: `AI summary unavailable for "${this.meetingTopic}". ` +
               `${this.transcriptLines.length} utterances were captured from ${speakers}. ` +
               `Languages detected: ${languages}. The full transcript is preserved in the export.`,
      keyPoints: [],
      actionItems: [],
      decisions: []
    });
  },

  renderMOMDisplay(mom) {
    this.lastMOM = mom;

    const summaryEl = document.getElementById('mom-summary');
    const pointsList = document.getElementById('mom-key-points');
    const actionsList = document.getElementById('mom-action-items');
    const decisionsList = document.getElementById('mom-decisions');

    if (summaryEl) summaryEl.innerText = mom.summary || '';

    const fill = (el, items, emptyText) => {
      if (!el) return;
      el.innerHTML = '';
      const list = items || [];
      if (list.length === 0) {
        const p = document.createElement('p');
        p.className = 'font-12 text-muted';
        p.style.fontStyle = 'italic';
        p.innerText = emptyText;
        el.appendChild(p);
        return;
      }
      list.forEach(text => {
        const li = document.createElement('li');
        li.innerText = text;
        el.appendChild(li);
      });
    };

    fill(pointsList, mom.keyPoints, 'None recorded.');
    fill(actionsList, mom.actionItems, 'No action items were assigned.');
    fill(decisionsList, mom.decisions, 'No decisions were recorded.');

    if (CommCoach.Supabase) {
      CommCoach.Supabase.saveMOMRecord({
        topic: this.meetingTopic,
        speakersCount: this.speakerLabels.length,
        summary: mom.summary,
        keyPoints: mom.keyPoints,
        actionItems: mom.actionItems,
        decisions: mom.decisions
      });
    }
  },

  // ---------------------------------------------------------------- export

  exportMOMFile() {
    if (!this.lastMOM) return;

    const bilingual = this.transcriptLines
      .map(l => `[${l.timestamp}] ${this.displayNameFor(l.speaker)} (${l.language})\n` +
                `   Original: ${l.original || '-'}\n` +
                `   English : ${l.english || '-'}`)
      .join('\n\n');

    const content = `==================================================
MINUTES OF MEETING (MOM)
Topic: ${this.meetingTopic}
Date: ${new Date().toLocaleString()}
Duration: ${Math.floor(this.seconds / 60)}m ${this.seconds % 60}s
Speakers detected: ${this.speakerLabels.map(l => this.displayNameFor(l)).join(', ') || 'none'}
==================================================

EXECUTIVE SUMMARY:
${this.lastMOM.summary}

KEY DISCUSSION POINTS:
${(this.lastMOM.keyPoints || []).map(p => `- ${p}`).join('\n') || '- none recorded'}

ACTION ITEMS:
${(this.lastMOM.actionItems || []).map(a => `- [ ] ${a}`).join('\n') || '- none assigned'}

DECISIONS MADE:
${(this.lastMOM.decisions || []).map(d => `- ${d}`).join('\n') || '- none recorded'}

==================================================
FULL BILINGUAL TRANSCRIPT
==================================================

${bilingual || '(no speech captured)'}
`;

    const fileName = `MOM_${this.meetingTopic.replace(/[^a-z0-9]/gi, '_')}.txt`;

    if (window.AndroidBridge && typeof window.AndroidBridge.saveToFile === 'function') {
      try {
        const path = window.AndroidBridge.saveToFile(fileName, content);
        if (CommCoach.Nudges) {
          CommCoach.Nudges.showNudge('MOM Exported', `Saved to ${path}`);
        }
        return;
      } catch (e) {
        console.warn('Native saveToFile failed, falling back to download', e);
      }
    }

    this.downloadBlob(fileName, content);
  },

  downloadBlob(fileName, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },

  resetMeeting() {
    this.seconds = 0;
    this.startedAt = 0;
    this.clearPersisted();
    this.transcriptLines = [];
    this.speakerLabels = [];
    this.speakerNames = {};
    this.lastMOM = null;
    this.pendingChunks = 0;

    document.getElementById('container-meeting-setup').style.display = 'block';
    document.getElementById('container-meeting-active').style.display = 'none';
    document.getElementById('container-meeting-mom').style.display = 'none';

    document.getElementById('btn-meeting-start').style.display = 'block';
    document.getElementById('btn-meeting-stop').style.display = 'none';
    document.getElementById('group-mom-actions').style.display = 'none';

    this.renderSpeakers();
  }
};

// Native bridge delivers each transcribed audio chunk here.
window.onMeetingChunkComplete = function (respStr) {
  if (CommCoach.MeetingRecorder) {
    CommCoach.MeetingRecorder.handleChunkResult(respStr);
  }
};

// Native bridge delivers the generated minutes here.
window.onMOMGeneratedComplete = function (respStr) {
  const recorder = CommCoach.MeetingRecorder;
  if (!recorder) return;

  try {
    let envelope = JSON.parse(respStr);

    if (envelope && envelope.error) {
      console.warn('MOM generation error', envelope.error.message);
      recorder.fallbackMOM();
      return;
    }

    let parsed = envelope;
    if (envelope && envelope.candidates && envelope.candidates[0] &&
        envelope.candidates[0].content && envelope.candidates[0].content.parts) {
      const rawText = envelope.candidates[0].content.parts[0].text || '';
      const cleanJson = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    recorder.renderMOMDisplay(parsed);
  } catch (e) {
    console.error('MOM parse error', e);
    recorder.fallbackMOM();
  }
};
