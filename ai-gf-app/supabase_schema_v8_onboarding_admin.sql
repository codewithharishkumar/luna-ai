-- =====================================================
-- Phase 8: Onboarding Flow + Admin Analytics Migration
-- =====================================================

-- 1. User Onboarding Table
-- Stores each user's chosen companion, relationship goal, and interests
CREATE TABLE IF NOT EXISTS public.user_onboarding (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    companion_choice TEXT NOT NULL DEFAULT 'Luna',  -- 'Luna' | 'Aiko' | 'Nova' | 'Mia'
    relationship_goal TEXT NOT NULL DEFAULT 'Friendship', -- 'Romantic' | 'Supportive' | 'Friendship'
    interests TEXT[] DEFAULT '{}',  -- ['Gaming', 'Anime', 'Fitness', 'Music', 'Travel', 'Books', 'Movies', 'Art']
    onboarding_complete BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON public.user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_complete ON public.user_onboarding(onboarding_complete);

-- RLS for user_onboarding
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own onboarding" ON public.user_onboarding;
DROP POLICY IF EXISTS "Users can insert own onboarding" ON public.user_onboarding;
DROP POLICY IF EXISTS "Users can update own onboarding" ON public.user_onboarding;
CREATE POLICY "Users can view own onboarding" ON public.user_onboarding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding" ON public.user_onboarding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding" ON public.user_onboarding FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 2. Feedback Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL DEFAULT 'general', 
        -- 'general' | 'bug' | 'feature_request' | 'conversation_quality' | 'billing'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    message TEXT,
    companion_name TEXT,    -- Which companion the feedback is about (optional)
    is_reviewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewed ON public.feedback(is_reviewed);

-- RLS for feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "Users can submit feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 3. Add goal_type column to relationships table
-- This tracks the user's relationship goal per companion
-- =====================================================
ALTER TABLE public.relationships 
ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'Friendship';
    -- 'Romantic' | 'Supportive' | 'Friendship'

-- =====================================================
-- 4. Admin Analytics View (No RLS — accessed via service_role only)
-- =====================================================
CREATE OR REPLACE VIEW admin_analytics AS
SELECT
    -- User counts
    (SELECT COUNT(*) FROM auth.users) AS total_users,
    (SELECT COUNT(DISTINCT user_id) FROM public.chats 
     WHERE created_at > NOW() - INTERVAL '1 day') AS dau,
    (SELECT COUNT(DISTINCT user_id) FROM public.chats 
     WHERE created_at > NOW() - INTERVAL '7 days') AS wau,
    
    -- Trial conversion
    (SELECT COUNT(*) FROM public.subscriptions 
     WHERE plan_tier != 'free') AS paying_subscribers,
    (SELECT COUNT(*) FROM public.subscriptions 
     WHERE plan_tier = 'basic') AS basic_subscribers,
    (SELECT COUNT(*) FROM public.subscriptions 
     WHERE plan_tier = 'premium') AS premium_subscribers,
    (SELECT COUNT(*) FROM public.subscriptions 
     WHERE plan_tier = 'free') AS free_trial_users,

    -- Revenue approximation (MRR in paise / 100 = INR)
    -- Basic Weekly: 99 INR, Basic Monthly: 299 INR, Premium Weekly: 199 INR, Premium Monthly: 599 INR
    -- Using monthly equivalent: Basic ≈ 299, Premium ≈ 599
    (
        (SELECT COUNT(*) FROM public.subscriptions WHERE plan_tier = 'basic' AND status = 'active') * 299 +
        (SELECT COUNT(*) FROM public.subscriptions WHERE plan_tier = 'premium' AND status = 'active') * 599
    ) AS estimated_mrr_inr,

    -- Messages today
    (SELECT COUNT(*) FROM public.chats 
     WHERE created_at > NOW() - INTERVAL '1 day' 
     AND role = 'user') AS messages_today,

    -- Feedback insights
    (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.feedback) AS avg_feedback_rating,
    (SELECT COUNT(*) FROM public.feedback WHERE is_reviewed = FALSE) AS unreviewed_feedback_count,

    -- Onboarding funnel
    (SELECT COUNT(*) FROM public.user_onboarding WHERE onboarding_complete = TRUE) AS onboarding_completed_count,

    -- Last updated
    NOW() AS last_updated;

-- =====================================================
-- 5. Feedback type breakdown view
-- =====================================================
CREATE OR REPLACE VIEW feedback_type_breakdown AS
SELECT
    feedback_type,
    COUNT(*) AS count,
    ROUND(AVG(rating)::numeric, 2) AS avg_rating,
    COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM public.feedback), 0) AS percentage
FROM public.feedback
GROUP BY feedback_type
ORDER BY count DESC;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
/*
DROP VIEW IF EXISTS feedback_type_breakdown;
DROP VIEW IF EXISTS admin_analytics;
ALTER TABLE public.relationships DROP COLUMN IF EXISTS goal_type;
DROP TABLE IF EXISTS public.feedback;
DROP TABLE IF EXISTS public.user_onboarding;
*/
