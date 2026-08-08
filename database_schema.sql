-- CCOS Supabase PostgreSQL Database Schema & User Management Modules (11.2.1 - 11.2.10)
-- Copy and run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/adpmukrybifwwyyiuxqe/sql/new

-- ============================================================================
-- 11.2.1 Master User Database (profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT 'User',
    designation TEXT DEFAULT 'Corporate Professional',
    department TEXT DEFAULT 'General Management',
    current_level TEXT DEFAULT 'L1',
    target_level TEXT DEFAULT 'L8',
    is_subscription_active BOOLEAN DEFAULT FALSE,
    streak INTEGER DEFAULT 0,
    total_drills INTEGER DEFAULT 0,
    total_quizzes INTEGER DEFAULT 0,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure new columns exist on pre-existing profiles tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Corporate Professional';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'General Management';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_subscription_active BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 11.2.9 Username Registry Collection
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usernames (
    username TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11.2.10 Daily Usage Counter Collection
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_usage (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    usage_date DATE DEFAULT CURRENT_DATE,
    drills_count INTEGER DEFAULT 0,
    quizzes_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, usage_date)
);

-- Core Activity Tables
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

-- ============================================================================
-- 11.2.2 Free Users Database (Derived View)
-- ============================================================================
CREATE OR REPLACE VIEW public.users_free AS
SELECT * FROM public.profiles
WHERE is_subscription_active = FALSE;

-- ============================================================================
-- 11.2.3 Paid Users Database (Derived View)
-- ============================================================================
CREATE OR REPLACE VIEW public.users_paid AS
SELECT * FROM public.profiles
WHERE is_subscription_active = TRUE;

-- ============================================================================
-- 11.2.4 Active Users Database (DAU & MAU Tracking View)
-- ============================================================================
CREATE OR REPLACE VIEW public.users_active AS
SELECT * FROM public.profiles
WHERE updated_at >= NOW() - INTERVAL '30 days';

-- ============================================================================
-- 11.2.5 Inactive Users Database (Churn Analysis View)
-- ============================================================================
CREATE OR REPLACE VIEW public.users_inactive AS
SELECT * FROM public.profiles
WHERE updated_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- 11.2.6 Level-Wise Users Database (Cohort View)
-- ============================================================================
CREATE OR REPLACE VIEW public.users_by_level AS
SELECT current_level, COUNT(*) AS user_count
FROM public.profiles
GROUP BY current_level;

-- ============================================================================
-- 11.2.7 Designation-Wise Users Database (B2B Targeting View)
-- ============================================================================
CREATE OR REPLACE VIEW public.users_by_designation AS
SELECT designation, COUNT(*) AS user_count
FROM public.profiles
GROUP BY designation;

-- ============================================================================
-- 11.2.8 Department-Wise Users Database (Analytics View)
-- ============================================================================
CREATE OR REPLACE VIEW public.users_by_department AS
SELECT department, COUNT(*) AS user_count
FROM public.profiles
GROUP BY department;

-- ============================================================================
-- Enable Row Level Security (RLS) & Grant Access Policies
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mom_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert/update access on profiles" ON public.profiles;
CREATE POLICY "Allow public read access on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update access on profiles" ON public.profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access on usernames" ON public.usernames;
DROP POLICY IF EXISTS "Allow public insert access on usernames" ON public.usernames;
CREATE POLICY "Allow public read access on usernames" ON public.usernames FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on usernames" ON public.usernames FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on daily_usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Allow public insert/update access on daily_usage" ON public.daily_usage;
CREATE POLICY "Allow public read access on daily_usage" ON public.daily_usage FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update access on daily_usage" ON public.daily_usage FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access on drill_logs" ON public.drill_logs;
DROP POLICY IF EXISTS "Allow public insert access on drill_logs" ON public.drill_logs;
CREATE POLICY "Allow public read access on drill_logs" ON public.drill_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on drill_logs" ON public.drill_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on mom_records" ON public.mom_records;
DROP POLICY IF EXISTS "Allow public insert access on mom_records" ON public.mom_records;
CREATE POLICY "Allow public read access on mom_records" ON public.mom_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on mom_records" ON public.mom_records FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(current_level);
CREATE INDEX IF NOT EXISTS idx_profiles_designation ON public.profiles(designation);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_drill_logs_user_id ON public.drill_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mom_records_user_id ON public.mom_records(user_id);
