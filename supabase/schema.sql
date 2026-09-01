-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  timezone text DEFAULT 'Asia/Kolkata'::text,
  life_score integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  phone text,
  password_hash text,
  bio text,
  total_tasks_completed integer DEFAULT 0,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  name text NOT NULL,
  scopes ARRAY DEFAULT '{}'::text[],
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.ai_provider_keys (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  provider text DEFAULT 'openrouter'::text,
  encrypted_key bytea,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_provider_keys_pkey PRIMARY KEY (id),
  CONSTRAINT ai_provider_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.life_areas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text DEFAULT '⭐'::text,
  color text DEFAULT '#34D399'::text,
  target_score integer DEFAULT 80,
  CONSTRAINT life_areas_pkey PRIMARY KEY (id),
  CONSTRAINT life_areas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  life_area_id uuid,
  title text NOT NULL,
  description text,
  target_date date,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'on_hold'::text, 'completed'::text, 'archived'::text])),
  priority integer DEFAULT 2,
  CONSTRAINT goals_pkey PRIMARY KEY (id),
  CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT goals_life_area_id_fkey FOREIGN KEY (life_area_id) REFERENCES public.life_areas(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  goal_id uuid,
  parent_task_id uuid,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  priority integer DEFAULT 2 CHECK (priority >= 1 AND priority <= 4),
  status text DEFAULT 'todo'::text CHECK (status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text])),
  recurrence_rule text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT tasks_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id),
  CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.todos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  is_done boolean DEFAULT false,
  due_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT todos_pkey PRIMARY KEY (id),
  CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.journal_prompts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  text text NOT NULL,
  category text,
  CONSTRAINT journal_prompts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.journal_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text,
  content text NOT NULL,
  mood text CHECK (mood = ANY (ARRAY['amazing'::text, 'good'::text, 'meh'::text, 'bad'::text, 'awful'::text])),
  mood_score integer,
  entry_type text DEFAULT 'free'::text CHECK (entry_type = ANY (ARRAY['free'::text, 'prompted'::text, 'voice'::text])),
  prompt_id uuid,
  ai_reflection text,
  tags ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT journal_entries_pkey PRIMARY KEY (id),
  CONSTRAINT journal_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT journal_entries_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.journal_prompts(id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  category text,
  cover_image text,
  order_index integer DEFAULT 0,
  CONSTRAINT courses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.modules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  order_index integer DEFAULT 0,
  CONSTRAINT modules_pkey PRIMARY KEY (id),
  CONSTRAINT modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.lessons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  module_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  content_type text DEFAULT 'text'::text CHECK (content_type = ANY (ARRAY['text'::text, 'video'::text, 'quiz'::text, 'article'::text])),
  resource_url text,
  order_index integer DEFAULT 0,
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id)
);
CREATE TABLE public.lesson_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  status text DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text])),
  completed_at timestamp with time zone,
  CONSTRAINT lesson_progress_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
);
CREATE TABLE public.content_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  body text,
  type text,
  tags ARRAY DEFAULT '{}'::text[],
  related_lesson_id uuid,
  CONSTRAINT content_items_pkey PRIMARY KEY (id),
  CONSTRAINT content_items_related_lesson_id_fkey FOREIGN KEY (related_lesson_id) REFERENCES public.lessons(id)
);
CREATE TABLE public.ai_conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  model text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.ai_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id)
);
CREATE TABLE public.daily_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  ai_generated_summary text,
  focus_area text,
  CONSTRAINT daily_plans_pkey PRIMARY KEY (id),
  CONSTRAINT daily_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.streaks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['tasks'::text, 'journal'::text, 'lessons'::text, 'overall'::text])),
  current_count integer DEFAULT 0,
  longest_count integer DEFAULT 0,
  last_active_date date,
  CONSTRAINT streaks_pkey PRIMARY KEY (id),
  CONSTRAINT streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.mcp_oauth_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  redirect_uri text,
  scope text DEFAULT 'mcp:read mcp:write'::text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:10:00'::interval),
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  code_challenge text,
  code_challenge_method text DEFAULT 'S256'::text,
  CONSTRAINT mcp_oauth_codes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mcp_oauth_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  access_token text NOT NULL UNIQUE,
  refresh_token text UNIQUE,
  user_id uuid NOT NULL,
  client_id text,
  scope text DEFAULT 'mcp:read mcp:write'::text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '365 days'::interval),
  revoked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mcp_oauth_tokens_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mcp_oauth_clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  client_secret text NOT NULL,
  client_name text,
  redirect_uris ARRAY,
  grant_types ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mcp_oauth_clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reminders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  remind_at timestamp with time zone NOT NULL,
  repeat_rule text,
  is_sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reminders_pkey PRIMARY KEY (id),
  CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notes_pkey PRIMARY KEY (id),
  CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.habits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text DEFAULT '⭐'::text,
  color text DEFAULT '#34D399'::text,
  frequency text DEFAULT 'daily'::text,
  target_count integer DEFAULT 1,
  archived boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT habits_pkey PRIMARY KEY (id),
  CONSTRAINT habits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.habit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  habit_id uuid NOT NULL,
  user_id uuid NOT NULL,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  count integer DEFAULT 1,
  note text,
  CONSTRAINT habit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT habit_logs_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES public.habits(id),
  CONSTRAINT habit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);