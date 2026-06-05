-- =============================================
-- NexJob Supabase Schema Migrations
-- Run these in your Supabase SQL Editor
-- =============================================

-- 1. Add new columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS desired_title text,
  ADD COLUMN IF NOT EXISTS desired_location text,
  ADD COLUMN IF NOT EXISTS target_salary text,
  ADD COLUMN IF NOT EXISTS resume_summary text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS work_authorization text,
  ADD COLUMN IF NOT EXISTS autofill_engine text DEFAULT 'backend';

-- 2. Saved Jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id text NOT NULL,
  job_data jsonb,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own saved jobs"
  ON saved_jobs FOR ALL USING (auth.uid() = user_id);

-- 3. Applications tracker table
CREATE TABLE IF NOT EXISTS applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id text,
  job_data jsonb,
  status text DEFAULT 'applied' CHECK (status IN ('applied','screening','interview','offer','rejected')),
  engine_used text DEFAULT 'manual',
  applied_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(user_id, job_id)
);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own applications"
  ON applications FOR ALL USING (auth.uid() = user_id);

-- 4. Ensure jobs table has is_active column (if not exists)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 5. Profiles RLS (if not already set)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can manage their own profile"
  ON profiles FOR ALL USING (auth.uid() = id);

-- Done!
