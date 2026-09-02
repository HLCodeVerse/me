-- Migration: Unify Tasks, Todos, and Habits into public.tasks with category and per-date completions

-- 1. Add new columns to public.tasks if they do not exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'todo'::text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time TEXT DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'one-time'::text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_dates JSONB DEFAULT '{}'::jsonb;

-- 2. Add performance indexes on user_id + category & user_id + due_date
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON public.tasks(user_id, category);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON public.tasks(user_id, due_date);

-- 3. Optionally migrate existing todos into tasks if public.todos table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'todos') THEN
    INSERT INTO public.tasks (user_id, title, status, due_date, category, created_at, completed_at)
    SELECT
      user_id,
      title,
      CASE WHEN is_done THEN 'done' ELSE 'todo' END as status,
      due_date::timestamp with time zone,
      'todo' as category,
      created_at,
      CASE WHEN is_done THEN created_at ELSE NULL END as completed_at
    FROM public.todos
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
