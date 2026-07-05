-- Phase 1 Monetization SQL Migration

-- 1. Create subscriptions table if not exists with all required fields
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    plan_tier TEXT DEFAULT 'free', -- 'free', 'premium', 'ultra'
    status TEXT DEFAULT 'active', -- 'active', 'canceled', 'past_due'
    trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 days'),
    trial_message_count INTEGER DEFAULT 0,
    trial_voice_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist in case the table already existed
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 days');
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_message_count INTEGER DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_voice_seconds INTEGER DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Enable RLS and setup policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- 2. Create RPCs for atomic increments to prevent concurrency race conditions

CREATE OR REPLACE FUNCTION increment_trial_messages(p_user_id UUID, amount INT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.subscriptions
  SET trial_message_count = COALESCE(trial_message_count, 0) + amount
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_trial_voice(p_user_id UUID, amount INT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.subscriptions
  SET trial_voice_seconds = COALESCE(trial_voice_seconds, 0) + amount
  WHERE user_id = p_user_id;
END;
$$;
