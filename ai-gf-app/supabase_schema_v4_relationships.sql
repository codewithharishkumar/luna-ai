-- Phase 2: Relationship Engine V3 - SQL Migration

-- 1. Expand the existing relationships table
ALTER TABLE public.relationships 
ADD COLUMN IF NOT EXISTS trust INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attachment INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS closeness INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS romance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty INTEGER DEFAULT 0,
-- The original 'affection' column already exists in the system based on Phase 1 references.

-- 2. Add Analytics and Bonding Hooks
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS total_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS highest_stage_achieved TEXT DEFAULT 'Stranger',
ADD COLUMN IF NOT EXISTS bond_strength FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS shared_history_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure values stay within 0-100 limits at the DB level for safety
ALTER TABLE public.relationships 
ADD CONSTRAINT check_trust CHECK (trust >= 0 AND trust <= 100),
ADD CONSTRAINT check_attachment CHECK (attachment >= 0 AND attachment <= 100),
ADD CONSTRAINT check_closeness CHECK (closeness >= 0 AND closeness <= 100),
ADD CONSTRAINT check_romance CHECK (romance >= 0 AND romance <= 100),
ADD CONSTRAINT check_loyalty CHECK (loyalty >= 0 AND loyalty <= 100);

-- Note: We do NOT add a constraint on affection yet because legacy affection might be > 100 until backfill runs.

-- 3. Create relationship_milestones table for future immersive events
CREATE TABLE IF NOT EXISTS public.relationship_milestones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    character TEXT NOT NULL,
    milestone_type TEXT NOT NULL, 
    description TEXT,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_user_character ON public.relationship_milestones(user_id, character);
CREATE INDEX IF NOT EXISTS idx_milestones_type ON public.relationship_milestones(milestone_type);

ALTER TABLE public.relationship_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own milestones" ON public.relationship_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert milestones" ON public.relationship_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Create Analytics View for Relationships
CREATE OR REPLACE VIEW relationship_analytics AS
SELECT
  character,
  COUNT(*) as total_relationships,
  ROUND(AVG(trust)::numeric, 1) as avg_trust,
  ROUND(AVG(affection)::numeric, 1) as avg_affection,
  ROUND(AVG(attachment)::numeric, 1) as avg_attachment,
  ROUND(AVG(closeness)::numeric, 1) as avg_closeness,
  ROUND(AVG(romance)::numeric, 1) as avg_romance,
  ROUND(AVG(loyalty)::numeric, 1) as avg_loyalty,
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400)::numeric, 1) as avg_relationship_age_days,
  ROUND(AVG(total_messages)::numeric, 1) as avg_total_messages
FROM public.relationships
GROUP BY character;

/*
===================================================================
ROLLBACK SCRIPT:

DROP VIEW IF EXISTS relationship_analytics;
DROP TABLE IF EXISTS public.relationship_milestones;

ALTER TABLE public.relationships 
DROP CONSTRAINT IF EXISTS check_trust,
DROP CONSTRAINT IF EXISTS check_attachment,
DROP CONSTRAINT IF EXISTS check_closeness,
DROP CONSTRAINT IF EXISTS check_romance,
DROP CONSTRAINT IF EXISTS check_loyalty;

ALTER TABLE public.relationships 
DROP COLUMN IF EXISTS trust,
DROP COLUMN IF EXISTS attachment,
DROP COLUMN IF EXISTS closeness,
DROP COLUMN IF EXISTS romance,
DROP COLUMN IF EXISTS loyalty,
DROP COLUMN IF EXISTS last_interaction_at,
DROP COLUMN IF EXISTS total_messages,
DROP COLUMN IF EXISTS highest_stage_achieved,
DROP COLUMN IF EXISTS bond_strength,
DROP COLUMN IF EXISTS shared_history_score,
DROP COLUMN IF EXISTS created_at;
===================================================================
*/
