// CCOS Supabase Database & Auth Integration Engine
CommCoach.Supabase = {
  client: null,
  isInitialized: false,

  init() {
    // Live Supabase parameters
    const url = window.SUPABASE_URL || 'https://adpmukrybifwwyyiuxqe.supabase.co';
    const anonKey = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcG11a3J5Ymlmd3d5eWl1eHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzM5NTEsImV4cCI6MjEwMTc0OTk1MX0.j9B4dylsWA6klfiUrfuoOXuRol-nRi4hn3RbFWUbN14';

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        this.client = window.supabase.createClient(url, anonKey);
        this.isInitialized = true;
        console.log("Supabase client initialized successfully");
      } catch (e) {
        console.warn("Supabase init error, running in fallback mode", e);
      }
    } else {
      console.warn("Supabase JS SDK not loaded, running in fallback mode");
    }
  },

  /**
   * 11.2.1 Sync user profile to Supabase PostgreSQL database
   */
  async syncProfile(stateData) {
    if (!this.isInitialized || !this.client) return;

    try {
      const userId = stateData.userId || 'user_' + (stateData.displayName || 'default').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const { data, error } = await this.client
        .from('profiles')
        .upsert({
          id: userId,
          display_name: stateData.displayName || 'User',
          designation: stateData.designation || 'Corporate Professional',
          department: stateData.department || 'General Management',
          current_level: stateData.currentLevel || 'L1',
          target_level: stateData.targetLevel || 'L8',
          is_subscription_active: stateData.isPaidUser || false,
          streak: stateData.streak || 0,
          total_drills: stateData.totalDrills || 0,
          total_quizzes: stateData.totalQuizzes || 0,
          language: stateData.currentLanguage || 'en',
          updated_at: new Date().toISOString()
        });

      if (error) console.warn("Supabase profile sync warning:", error.message);
      else console.log("Supabase profile synced:", userId);
    } catch (e) {
      console.warn("Supabase profile sync exception:", e);
    }
  },

  /**
   * 11.2.9 Username Registry - Check availability
   */
  async checkUsernameAvailability(username) {
    if (!this.isInitialized || !this.client || !username) return true;

    try {
      const { data, error } = await this.client
        .from('usernames')
        .select('username')
        .eq('username', username.toLowerCase().trim());

      if (error) return true;
      return (data.length === 0);
    } catch (e) {
      return true;
    }
  },

  /**
   * 11.2.9 Username Registry - Register handle
   */
  async registerUsername(username, userId) {
    if (!this.isInitialized || !this.client || !username) return;

    try {
      await this.client
        .from('usernames')
        .insert({
          username: username.toLowerCase().trim(),
          user_id: userId,
          created_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn("Username registration exception:", e);
    }
  },

  /**
   * 11.2.10 Daily Usage Counter - Increment drills/quizzes count
   */
  async incrementDailyUsage(userId, usageType = 'drill') {
    if (!this.isInitialized || !this.client) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const uId = userId || CommCoach.state.userId || 'user_default';

      const { data: existing } = await this.client
        .from('daily_usage')
        .select('*')
        .eq('user_id', uId)
        .eq('usage_date', today)
        .single();

      let drills = existing ? (existing.drills_count || 0) : 0;
      let quizzes = existing ? (existing.quizzes_count || 0) : 0;

      if (usageType === 'drill') drills++;
      else if (usageType === 'quiz') quizzes++;

      await this.client
        .from('daily_usage')
        .upsert({
          user_id: uId,
          usage_date: today,
          drills_count: drills,
          quizzes_count: quizzes,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, usage_date' });
    } catch (e) {
      console.warn("Daily usage increment exception:", e);
    }
  },

  /**
   * Insert speech drill log and AI reframed evaluation record
   */
  async saveDrillLog(logData) {
    if (!this.isInitialized || !this.client) return;

    try {
      const userId = CommCoach.state.userId || 'user_' + (CommCoach.state.displayName || 'default').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const { data, error } = await this.client
        .from('drill_logs')
        .insert({
          user_id: userId,
          scenario_tag: logData.scenarioTag || 'General',
          transcript: logData.transcript || '',
          reframed_text: logData.reframedText || '',
          wpm: logData.metrics ? logData.metrics.wpm : 0,
          filler_count: logData.metrics ? logData.metrics.fillers : 0,
          jargon_count: logData.metrics ? logData.metrics.jargon : 0,
          tone: logData.metrics ? logData.metrics.tone : 'Neutral',
          confidence_score: logData.metrics ? logData.metrics.confidence : 0,
          clarity_score: logData.metrics ? logData.metrics.clarity : 0,
          presence_score: logData.metrics ? logData.metrics.presence : 0,
          created_at: new Date().toISOString()
        });

      if (error) console.warn("Supabase drill log warning:", error.message);
      else console.log("Supabase drill log saved successfully");

      // Increment 11.2.10 Daily Usage Counter
      this.incrementDailyUsage(userId, 'drill');
    } catch (e) {
      console.warn("Supabase drill log exception:", e);
    }
  },

  /**
   * Insert multi-speaker meeting transcript and MOM summary record
   */
  async saveMOMRecord(momData) {
    if (!this.isInitialized || !this.client) return;

    try {
      const userId = CommCoach.state.userId || 'user_' + (CommCoach.state.displayName || 'default').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const { data, error } = await this.client
        .from('mom_records')
        .insert({
          user_id: userId,
          topic: momData.topic || 'Meeting Sync',
          speakers_count: momData.speakersCount || 1,
          executive_summary: momData.summary || '',
          key_points: momData.keyPoints || [],
          action_items: momData.actionItems || [],
          decisions: momData.decisions || [],
          created_at: new Date().toISOString()
        });

      if (error) console.warn("Supabase MOM record warning:", error.message);
      else console.log("Supabase MOM record saved successfully");
    } catch (e) {
      console.warn("Supabase MOM record exception:", e);
    }
  }
};
