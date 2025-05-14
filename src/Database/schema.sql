-- Enhanced JobMatch Database Schema
-- This extends the existing schema with additional tables and fields for matching

-- Add structured fields to job_posts table
ALTER TABLE public.job_posts
ADD COLUMN IF NOT EXISTS required_experience TEXT,
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS employment_type TEXT,
ADD COLUMN IF NOT EXISTS required_skills JSONB, -- Structured skills
ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS application_deadline DATE,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS benefits JSONB; -- Array of benefits

-- Add structured fields to resumes table
ALTER TABLE public.resumes
ADD COLUMN IF NOT EXISTS skills JSONB, -- Structured skills (technical, languages, soft)
ADD COLUMN IF NOT EXISTS yearsOfExperience TEXT,
ADD COLUMN IF NOT EXISTS preferredLocation TEXT,
ADD COLUMN IF NOT EXISTS salaryExpectation TEXT,
ADD COLUMN IF NOT EXISTS jobType TEXT,
ADD COLUMN IF NOT EXISTS availableFrom DATE,
ADD COLUMN IF NOT EXISTS willingToRelocate BOOLEAN DEFAULT FALSE;

-- Create rankings table with detailed scoring
CREATE TABLE IF NOT EXISTS public.rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL, -- 0-100 match score
    details JSONB, -- Detailed breakdown of scoring components
    status TEXT DEFAULT 'pending', -- pending, applied, reviewed, shortlisted, interview, hired, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

-- Create applications table to track job applications (if it doesn't exist already)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, reviewed, interview, hired, rejected
    cover_letter TEXT,
    feedback TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
    -- For rankings table
    BEGIN
        DROP POLICY IF EXISTS "Employers can view rankings for their jobs" ON public.rankings;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, continue
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can view their own rankings" ON public.rankings;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, continue
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "System can create rankings" ON public.rankings;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, continue
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "System can update rankings" ON public.rankings;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, continue
    END;
    
    -- For applications table
    BEGIN
        DROP POLICY IF EXISTS "Employers can view applications for their jobs" ON public.applications;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, continue
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, continue
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can create their own applications" ON public.applications;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, continue
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Employers can update application status" ON public.applications;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, continue
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;
    EXCEPTION WHEN OTHERS THEN
        -- Policy doesn't exist, continue
    END;
END $$;

-- Create new policies
-- RLS policies for rankings table
CREATE POLICY "Employers can view rankings for their jobs" 
ON public.rankings FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.job_posts 
    WHERE job_posts.id = rankings.job_id 
    AND job_posts.posted_by = auth.uid()
  )
);

CREATE POLICY "Users can view their own rankings" 
ON public.rankings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create rankings" 
ON public.rankings FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update rankings" 
ON public.rankings FOR UPDATE 
USING (true);

-- RLS policies for applications table
CREATE POLICY "Employers can view applications for their jobs" 
ON public.applications FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.job_posts 
    WHERE job_posts.id = applications.job_id 
    AND job_posts.posted_by = auth.uid()
  )
);

CREATE POLICY "Users can view their own applications" 
ON public.applications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications" 
ON public.applications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employers can update application status" 
ON public.applications FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.job_posts 
    WHERE job_posts.id = applications.job_id 
    AND job_posts.posted_by = auth.uid()
  )
);

CREATE POLICY "Users can update their own applications" 
ON public.applications FOR UPDATE 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_posts_posted_by ON public.job_posts(posted_by);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_rankings_job_id ON public.rankings(job_id);
CREATE INDEX IF NOT EXISTS idx_rankings_user_id ON public.rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_rankings_score ON public.rankings(score);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);