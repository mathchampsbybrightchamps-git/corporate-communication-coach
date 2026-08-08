// CCOS Multi-Speaker Meeting Recorder & AI MOM Generator Module
CommCoach.MeetingRecorder = {
  isRecording: false,
  timer: null,
  seconds: 0,
  recognition: null,
  speakers: [
    { id: 'spk_1', name: 'Me (Host)' },
    { id: 'spk_2', name: 'Speaker 2' }
  ],
  activeSpeakerId: 'spk_1',
  transcriptLines: [],
  meetingTopic: 'Sprint Alignment Sync',
  lastMOM: null,

  init() {
    const backBtn = document.getElementById('btn-meeting-back');
    const addSpeakerBtn = document.getElementById('btn-add-speaker');
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

    if (addSpeakerBtn) {
      addSpeakerBtn.addEventListener('click', () => this.addSpeakerFromInput());
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => this.startRecording());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopRecording());
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportMOMFile());
    }

    if (newBtn) {
      newBtn.addEventListener('click', () => this.resetMeeting());
    }

    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal && !event.results[i]._processed) {
            event.results[i]._processed = true;
            const text = event.results[i][0].transcript.trim();
            if (text) {
              const activeSpk = this.speakers.find(s => s.id === this.activeSpeakerId) || { name: 'Speaker' };
              this.transcriptLines.push({
                speakerId: this.activeSpeakerId,
                speakerName: activeSpk.name,
                text: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              });
              this.renderLiveTranscript();
            }
          }
        }
      };

      this.recognition.onerror = (e) => {
        console.warn("Meeting recognition error", e);
      };
    }

    this.renderSpeakerChips();
  },

  addSpeakerFromInput() {
    const input = document.getElementById('input-speaker-name');
    if (!input || !input.value.trim()) return;

    const name = input.value.trim();
    const newId = `spk_${this.speakers.length + 1}`;
    this.speakers.push({ id: newId, name: name });
    input.value = '';

    this.renderSpeakerChips();
  },

  renderSpeakerChips() {
    const container = document.getElementById('meeting-speakers-chips');
    const countLabel = document.getElementById('speaker-count-label');
    const switcher = document.getElementById('meeting-speaker-switcher');

    if (countLabel) {
      countLabel.innerText = `Speakers Identified: ${this.speakers.length}`;
    }

    if (container) {
      container.innerHTML = '';
      this.speakers.forEach(spk => {
        const chip = document.createElement('span');
        chip.className = `chip ${spk.id === this.activeSpeakerId ? 'active' : ''}`;
        chip.innerText = spk.name;
        chip.addEventListener('click', () => {
          this.activeSpeakerId = spk.id;
          this.renderSpeakerChips();
        });
        container.appendChild(chip);
      });
    }

    if (switcher) {
      switcher.innerHTML = '';
      this.speakers.forEach(spk => {
        const btn = document.createElement('button');
        btn.className = `chip ${spk.id === this.activeSpeakerId ? 'active' : ''}`;
        btn.style.fontSize = '11px';
        btn.innerText = spk.name;
        btn.addEventListener('click', () => {
          this.activeSpeakerId = spk.id;
          this.renderSpeakerChips();
        });
        switcher.appendChild(btn);
      });
    }
  },

  startRecording() {
    const titleInput = document.getElementById('input-meeting-title');
    if (titleInput && titleInput.value.trim()) {
      this.meetingTopic = titleInput.value.trim();
    } else {
      this.meetingTopic = 'Corporate Strategy Sync';
    }

    this.isRecording = true;
    this.seconds = 0;
    this.transcriptLines = [];

    // UI Container Switches
    document.getElementById('container-meeting-setup').style.display = 'none';
    document.getElementById('container-meeting-active').style.display = 'block';
    document.getElementById('container-meeting-mom').style.display = 'none';

    document.getElementById('btn-meeting-start').style.display = 'none';
    document.getElementById('btn-meeting-stop').style.display = 'block';
    document.getElementById('group-mom-actions').style.display = 'none';

    const topicLabel = document.getElementById('active-meeting-topic');
    if (topicLabel) topicLabel.innerText = this.meetingTopic;

    if (this.recognition) {
      try { this.recognition.start(); } catch (e) { console.warn(e); }
    }

    this.timer = setInterval(() => {
      this.seconds++;
      let mins = Math.floor(this.seconds / 60).toString().padStart(2, '0');
      let secs = (this.seconds % 60).toString().padStart(2, '0');
      const timerEl = document.getElementById('meeting-timer');
      if (timerEl) timerEl.innerText = `${mins}:${secs}`;
    }, 1000);

    this.renderLiveTranscript();
  },

  stopRecording() {
    this.isRecording = false;
    clearInterval(this.timer);

    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) { console.warn(e); }
    }

    document.getElementById('container-meeting-active').style.display = 'none';
    document.getElementById('container-meeting-mom').style.display = 'block';

    document.getElementById('btn-meeting-stop').style.display = 'none';
    document.getElementById('group-mom-actions').style.display = 'flex';

    this.generateMOM();
  },

  renderLiveTranscript() {
    const container = document.getElementById('meeting-live-transcript');
    if (!container) return;

    if (this.transcriptLines.length === 0) {
      container.innerHTML = `<p class="font-12 text-muted text-center" style="font-style: italic;">Listening to speech turns...</p>`;
      return;
    }

    container.innerHTML = '';
    this.transcriptLines.forEach(line => {
      const bubble = document.createElement('div');
      bubble.style.borderLeft = '3px solid var(--primary)';
      bubble.style.paddingLeft = '8px';
      bubble.innerHTML = `
        <div class="flex-row justify-between items-center">
          <span class="font-12 font-700" style="color: var(--primary);">${line.speakerName}</span>
          <span class="font-11 text-muted">${line.timestamp}</span>
        </div>
        <p class="font-13 text-main" style="margin-top: 2px;">${line.text}</p>
      `;
      container.appendChild(bubble);
    });

    container.scrollTop = container.scrollHeight;
  },

  generateMOM() {
    const dateLabel = document.getElementById('mom-generated-date');
    if (dateLabel) dateLabel.innerText = `Generated on: ${new Date().toLocaleString()}`;

    // Compile diarized transcript string
    const diarizedText = this.transcriptLines.map(l => `[${l.timestamp}] ${l.speakerName}: ${l.text}`).join('\n');

    if (diarizedText.length < 10) {
      this.renderMOMDisplay({
        summary: "Short meeting session recorded. Insufficient discussion volume for full MOM breakdown.",
        keyPoints: ["Meeting opened with quick alignment."],
        actionItems: ["User to schedule follow-up session if required."],
        decisions: ["No major policy decisions recorded."]
      });
      return;
    }

    // Call Gemini AI via native bridge to build MOM
    const prompt = `Analyze this corporate meeting transcript involving ${this.speakers.length} speakers and generate strict structured JSON without code fences or markdown:
{"summary":"[3-sentence executive summary]","keyPoints":["[point 1]","[point 2]"],"actionItems":["[Action 1 with assignee]","[Action 2]"],"decisions":["[Decision 1]"]}

Meeting Topic: "${this.meetingTopic}"
Transcript:
${diarizedText}`;

    if (window.AndroidBridge && typeof window.AndroidBridge.getAICoaching === 'function') {
      try {
        window.AndroidBridge.getAICoaching(prompt, 'onMOMGeneratedComplete');
      } catch (e) {
        this.fallbackMOM(diarizedText);
      }
    } else {
      this.fallbackMOM(diarizedText);
    }
  },

  fallbackMOM(diarizedText) {
    const momData = {
      summary: `The team convened to align on "${this.meetingTopic}". Discussion spanned key operational milestones across ${this.speakers.length} identified speakers.`,
      keyPoints: this.transcriptLines.slice(0, 4).map(l => `${l.speakerName} highlighted: "${l.text}"`),
      actionItems: this.speakers.map(s => `${s.name}: Follow up on project deliverables discussed during meeting`),
      decisions: [`Approved roadmap progression for ${this.meetingTopic}`]
    };
    this.renderMOMDisplay(momData);
  },

  renderMOMDisplay(momData) {
    this.lastMOM = momData;

    const summaryEl = document.getElementById('mom-summary');
    const keyPointsEl = document.getElementById('mom-key-points');
    const actionsEl = document.getElementById('mom-action-items');
    const decisionsEl = document.getElementById('mom-decisions');

    if (summaryEl) summaryEl.innerText = momData.summary;

    if (keyPointsEl) {
      keyPointsEl.innerHTML = `<ul style="padding-left: 18px;">${(momData.keyPoints || []).map(p => `<li>${p}</li>`).join('')}</ul>`;
    }

    if (actionsEl) {
      actionsEl.innerHTML = `<ul style="padding-left: 18px;">${(momData.actionItems || []).map(a => `<li>${a}</li>`).join('')}</ul>`;
    }

    if (decisionsEl) {
      decisionsEl.innerHTML = `<ul style="padding-left: 18px;">${(momData.decisions || []).map(d => `<li>${d}</li>`).join('')}</ul>`;
    }

    // Automatically save MOM text file to local storage
    this.saveMOMToStorage();
  },

  saveMOMToStorage() {
    if (!this.lastMOM) return;

    const topicClean = this.meetingTopic.replace(/[^a-zA-Z0-9]/g, '_');
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    const fileName = `MOM_${topicClean}_${timeStr}.txt`;

    const diarizedText = this.transcriptLines.map(l => `[${l.timestamp}] ${l.speakerName}: ${l.text}`).join('\n');

    const content = [
      '=== CCOS MINUTES OF MEETING (MOM) ===',
      `Meeting Topic: ${this.meetingTopic}`,
      `Date & Time: ${now.toLocaleString()}`,
      `Duration: ${this.seconds}s`,
      `Speakers Identified (${this.speakers.length}): ${this.speakers.map(s => s.name).join(', ')}`,
      '',
      '--- EXECUTIVE SUMMARY ---',
      this.lastMOM.summary,
      '',
      '--- KEY DISCUSSION POINTS ---',
      (this.lastMOM.keyPoints || []).map(k => `- ${k}`).join('\n'),
      '',
      '--- ACTION ITEMS & DELIVERABLES ---',
      (this.lastMOM.actionItems || []).map(a => `- ${a}`).join('\n'),
      '',
      '--- DECISIONS MADE ---',
      (this.lastMOM.decisions || []).map(d => `- ${d}`).join('\n'),
      '',
      '--- FULL DIARIZED TRANSCRIPT ---',
      diarizedText || '(No transcript recorded)',
      '===================================='
    ].join('\n');

    if (CommCoach.RecordingStorage) {
      CommCoach.RecordingStorage.writeFile(fileName, content);
    }

    // Sync MOM record to Supabase PostgreSQL database
    if (CommCoach.Supabase) {
      CommCoach.Supabase.saveMOMRecord({
        topic: this.meetingTopic,
        speakersCount: this.speakers.length,
        summary: this.lastMOM.summary,
        keyPoints: this.lastMOM.keyPoints,
        actionItems: this.lastMOM.actionItems,
        decisions: this.lastMOM.decisions
      });
    }
  },

  exportMOMFile() {
    this.saveMOMToStorage();
    if (CommCoach.Nudges) {
      CommCoach.Nudges.showNudge("MOM Exported", `Saved MOM file under Documents/CommunicationCoach/`);
    }
  },

  resetMeeting() {
    this.transcriptLines = [];
    this.seconds = 0;
    this.activeSpeakerId = 'spk_1';

    document.getElementById('container-meeting-setup').style.display = 'block';
    document.getElementById('container-meeting-active').style.display = 'none';
    document.getElementById('container-meeting-mom').style.display = 'none';

    document.getElementById('btn-meeting-start').style.display = 'block';
    document.getElementById('btn-meeting-stop').style.display = 'none';
    document.getElementById('group-mom-actions').style.display = 'none';

    this.renderSpeakerChips();
  }
};

// Global AI hook for MOM generation
window.onMOMGeneratedComplete = function(respStr) {
  try {
    let parsed;
    try {
      const apiResp = JSON.parse(respStr);
      if (apiResp.candidates && apiResp.candidates[0] && apiResp.candidates[0].content) {
        const rawText = apiResp.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        parsed = JSON.parse(cleanJson);
      } else {
        parsed = JSON.parse(respStr);
      }
    } catch (innerErr) {
      const cleanJson = respStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    if (parsed.summary) {
      CommCoach.MeetingRecorder.renderMOMDisplay(parsed);
    } else {
      const text = this.transcriptLines ? this.transcriptLines.map(l => l.text).join(' ') : '';
      CommCoach.MeetingRecorder.fallbackMOM(text);
    }
  } catch (e) {
    console.error("MOM generation parse error", e);
    const text = CommCoach.MeetingRecorder.transcriptLines.map(l => l.text).join(' ');
    CommCoach.MeetingRecorder.fallbackMOM(text);
  }
};
