-- ══════════════════════════════════════════════════════════
-- NIRMAAN — Full Database Schema
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ──────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  avatar_url    text,
  timezone      text default 'Asia/Kolkata',
  life_score    int  default 0,
  current_streak  int default 0,
  longest_streak  int default 0,
  created_at    timestamptz default now()
);

-- ─── API KEYS (for MCP auth) ───────────────────────────────
create table if not exists api_keys (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  key_hash     text not null,
  key_prefix   text not null,
  name         text not null,
  scopes       text[] default '{}',
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz default now()
);

-- ─── AI PROVIDER KEYS (BYOK encrypted) ────────────────────
create table if not exists ai_provider_keys (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  provider      text default 'openrouter',
  encrypted_key bytea,
  created_at    timestamptz default now(),
  unique(user_id, provider)
);

-- ─── LIFE AREAS ────────────────────────────────────────────
create table if not exists life_areas (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  name         text not null,
  icon         text default '⭐',
  color        text default '#34D399',
  target_score int  default 80
);

-- ─── GOALS ─────────────────────────────────────────────────
create table if not exists goals (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  life_area_id uuid references life_areas(id) on delete set null,
  title        text not null,
  description  text,
  target_date  date,
  status       text default 'active' check (status in ('active', 'on_hold', 'completed', 'archived')),
  priority     int  default 2
);

-- ─── TASKS ─────────────────────────────────────────────────
create table if not exists tasks (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references profiles(id) on delete cascade,
  goal_id          uuid references goals(id) on delete set null,
  parent_task_id   uuid references tasks(id) on delete cascade,
  title            text not null,
  description      text,
  due_date         timestamptz,
  priority         int  default 2 check (priority between 1 and 4),
  status           text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  recurrence_rule  text,
  created_at       timestamptz default now(),
  completed_at     timestamptz
);

-- ─── TODOS ─────────────────────────────────────────────────
create table if not exists todos (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  is_done    boolean default false,
  due_date   date,
  created_at timestamptz default now()
);

-- ─── JOURNAL ───────────────────────────────────────────────
create table if not exists journal_prompts (
  id       uuid primary key default uuid_generate_v4(),
  text     text not null,
  category text
);

create table if not exists journal_entries (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  title         text,
  content       text not null,
  mood          text check (mood in ('amazing','good','meh','bad','awful')),
  mood_score    int,
  entry_type    text default 'free' check (entry_type in ('free','prompted','voice')),
  prompt_id     uuid references journal_prompts(id),
  ai_reflection text,
  tags          text[] default '{}',
  created_at    timestamptz default now()
);

-- ─── COURSES / LESSONS ─────────────────────────────────────
create table if not exists courses (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  category    text,
  cover_image text,
  order_index int  default 0
);

create table if not exists modules (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references courses(id) on delete cascade,
  title       text not null,
  order_index int  default 0
);

create table if not exists lessons (
  id           uuid primary key default uuid_generate_v4(),
  module_id    uuid not null references modules(id) on delete cascade,
  title        text not null,
  content      text,
  content_type text default 'text' check (content_type in ('text','video','quiz','article')),
  resource_url text,
  order_index  int  default 0
);

create table if not exists lesson_progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  lesson_id    uuid not null references lessons(id) on delete cascade,
  status       text default 'in_progress' check (status in ('in_progress','completed')),
  completed_at timestamptz,
  unique(user_id, lesson_id)
);

create table if not exists content_items (
  id                uuid primary key default uuid_generate_v4(),
  title             text not null,
  body              text,
  type              text,
  tags              text[] default '{}',
  related_lesson_id uuid references lessons(id)
);

-- ─── AI CONVERSATIONS ──────────────────────────────────────
create table if not exists ai_conversations (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  model      text not null,
  created_at timestamptz default now()
);

create table if not exists ai_messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  created_at      timestamptz default now()
);

-- ─── DAILY PLANS ───────────────────────────────────────────
create table if not exists daily_plans (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references profiles(id) on delete cascade,
  date                 date not null,
  ai_generated_summary text,
  focus_area           text,
  unique(user_id, date)
);

-- ─── WATER LOGS ───────────────────────────────────────────
create table if not exists water_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  amount_ml  int not null,
  logged_at  timestamptz default now(),
  date       date default CURRENT_DATE
);

-- ─── STREAKS ───────────────────────────────────────────────
create table if not exists streaks (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references profiles(id) on delete cascade,
  type             text not null check (type in ('tasks','journal','lessons','overall')),
  current_count    int  default 0,
  longest_count    int  default 0,
  last_active_date date,
  unique(user_id, type)
);

-- ══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════

alter table profiles         disable row level security;
alter table api_keys         disable row level security;
alter table ai_provider_keys disable row level security;
alter table life_areas       disable row level security;
alter table goals             disable row level security;
alter table tasks             disable row level security;
alter table todos             disable row level security;
alter table journal_entries   disable row level security;
alter table ai_conversations  disable row level security;
alter table ai_messages       disable row level security;
alter table lesson_progress   disable row level security;
alter table daily_plans       disable row level security;
alter table streaks           disable row level security;
alter table courses         disable row level security;
alter table modules         disable row level security;
alter table lessons         disable row level security;

-- Public read for courses/lessons/content
create policy "Public can read courses"         on courses         for select using (true);
create policy "Public can read modules"         on modules         for select using (true);
create policy "Public can read lessons"         on lessons         for select using (true);
create policy "Public can read content_items"   on content_items   for select using (true);
create policy "Public can read journal_prompts" on journal_prompts for select using (true);

-- ══════════════════════════════════════════════════════════
-- SEED DATA — Default journal prompts
-- ══════════════════════════════════════════════════════════
insert into journal_prompts (text, category) values
  ('What are 3 things I learned today?', 'reflection'),
  ('What am I grateful for right now?', 'gratitude'),
  ('What would make tomorrow better?', 'planning'),
  ('What challenge am I avoiding and why?', 'growth'),
  ('Who inspired me today and why?', 'people'),
  ('What progress did I make on my goals?', 'goals'),
  ('What drained my energy today?', 'energy'),
  ('What am I most proud of this week?', 'wins'),
  ('What limiting belief am I ready to drop?', 'mindset'),
  ('How am I showing up for my future self?', 'identity')
on conflict do nothing;
