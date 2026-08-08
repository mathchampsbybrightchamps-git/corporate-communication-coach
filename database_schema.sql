-- CCOS Supabase PostgreSQL Database Schema
-- Copy and run this script in your Supabase SQL Editor (https://app.supabase.com -> SQL Editor)

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT 'User',
    current_level TEXT DEFAULT 'L1',
    target_level TEXT DEFAULT 'L8',
    streak INTEGER DEFAULT 0,
    total_drills INTEGER DEFAULT 0,
    total_quizzes INTEGER DEFAULT 0,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Drill Logs Table
CREATE TABLE IF NOT EXISTS public.drill_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    scenario_tag TEXT DEFAULT 'General',
    transcript TEXT,
    reframed_text TEXT,
    wpm INTEGER DEFAULT 0,
    filler_count INTEGER DEFAULT 0,
    jargon_count INTEGER DEFAULT 0,
    tone TEXT DEFAULT 'Neutral',
    confidence_score INTEGER DEFAULT 0,
    clarity_score INTEGER DEFAULT 0,
    presence_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Minutes of Meeting (MOM) Records Table
CREATE TABLE IF NOT EXISTS public.mom_records (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    speakers_count INTEGER DEFAULT 1,
    executive_summary TEXT,
    key_points JSONB DEFAULT '[]'::jsonb,
    action_items JSONB DEFAULT '[]'::jsonb,
    decisions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Grant Access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mom_records ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write access for mobile client anon key
CREATE POLICY "Allow public read access on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update access on profiles" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Allow public read access on drill_logs" ON public.drill_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on drill_logs" ON public.drill_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on mom_records" ON public.mom_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on mom_records" ON public.mom_records FOR INSERT WITH CHECK (true);

-- Indexes for lightning fast queries at 100k scale
CREATE INDEX IF NOT EXISTS idx_drill_logs_user_id ON public.drill_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mom_records_user_id ON public.mom_records(user_id);
