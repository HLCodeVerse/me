-- Helpo UI/UX Redesign — Additive Schema Migrations
-- Run these in Supabase SQL Editor (Dashboard > SQL Editor)
-- These are all additive-only migrations — no existing data is affected.

-- Migration 1: Add bio and total_tasks_completed to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS total_tasks_completed integer DEFAULT 0;

-- Migration 2: Add streak_count to habits (persisted for performance)
ALTER TABLE public.habits 
  ADD COLUMN IF NOT EXISTS streak_count integer DEFAULT 0;

-- Migration 3: Add progress percentage to goals
ALTER TABLE public.goals 
  ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0 
    CHECK (progress >= 0 AND progress <= 100);

-- Migration 4: Add current_score to life_areas
ALTER TABLE public.life_areas 
  ADD COLUMN IF NOT EXISTS current_score integer DEFAULT 0;

-- Migration 5: Add plan_items JSONB to daily_plans (for AI-generated schedule)
ALTER TABLE public.daily_plans 
  ADD COLUMN IF NOT EXISTS plan_items jsonb DEFAULT '[]'::jsonb;

-- Verify all columns were added
SELECT 
  'profiles' as tbl, column_name, data_type FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name IN ('bio', 'total_tasks_completed')
UNION ALL
SELECT 'habits', column_name, data_type FROM information_schema.columns 
  WHERE table_name = 'habits' AND column_name = 'streak_count'
UNION ALL
SELECT 'goals', column_name, data_type FROM information_schema.columns 
  WHERE table_name = 'goals' AND column_name = 'progress'
UNION ALL
SELECT 'life_areas', column_name, data_type FROM information_schema.columns 
  WHERE table_name = 'life_areas' AND column_name = 'current_score'
UNION ALL
SELECT 'daily_plans', column_name, data_type FROM information_schema.columns 
  WHERE table_name = 'daily_plans' AND column_name = 'plan_items';
