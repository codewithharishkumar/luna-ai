-- Phase 3 Emotion Engine V3 - SQL Migration

-- 1. Expand the existing relationships table to hold emotional stats
ALTER TABLE public.relationships 
ADD COLUMN IF NOT EXISTS emotional_energy INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS jealousy INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comfort INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS excitement INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS stress_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_emotion_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Range check constraints to prevent values from straying outside 0-100 boundaries
ALTER TABLE public.relationships 
ADD CONSTRAINT check_emotional_energy CHECK (emotional_energy >= 0 AND emotional_energy <= 100),
ADD CONSTRAINT check_jealousy CHECK (jealousy >= 0 AND jealousy <= 100),
ADD CONSTRAINT check_comfort CHECK (comfort >= 0 AND comfort <= 100),
ADD CONSTRAINT check_excitement CHECK (excitement >= 0 AND excitement <= 100),
ADD CONSTRAINT check_stress_level CHECK (stress_level >= 0 AND stress_level <= 100);

-- 3. Create emotion_events table to track milestones
CREATE TABLE IF NOT EXISTS public.emotion_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    character TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'first_compliment', 'first_argument', 'user_confessed_love', 'user_ignored_companion'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emotion_events_user_character ON public.emotion_events(user_id, character);
CREATE INDEX IF NOT EXISTS idx_emotion_events_type ON public.emotion_events(event_type);

-- Enable RLS and setup policies
ALTER TABLE public.emotion_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own emotion events" ON public.emotion_events;
CREATE POLICY "Users can view own emotion events" ON public.emotion_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert emotion events" ON public.emotion_events FOR INSERT WITH CHECK (auth.uid() = user_id);
