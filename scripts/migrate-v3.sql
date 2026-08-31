-- NIRMAAN v3 Migration — Run this in Supabase SQL Editor
-- https://app.supabase.com → SQL Editor

-- ─── REMINDERS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT,
  remind_at   TIMESTAMPTZ NOT NULL,
  repeat_rule TEXT DEFAULT NULL,   -- null | 'daily' | 'weekly' | 'monthly'
  is_sent     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;

-- ─── NOTES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT,
  content    TEXT NOT NULL,
  is_pinned  BOOLEAN DEFAULT false,
  tags       TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;

-- ─── HABITS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  icon         TEXT DEFAULT '⭐',
  color        TEXT DEFAULT '#34D399',
  frequency    TEXT DEFAULT 'daily',   -- daily | weekdays | weekly
  target_count INT  DEFAULT 1,
  archived     BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;

-- ─── HABIT LOGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id  UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  count     INT  DEFAULT 1,
  note      TEXT,
  UNIQUE(habit_id, logged_at)
);
ALTER TABLE habit_logs DISABLE ROW LEVEL SECURITY;

-- ─── PUSH SUBSCRIPTIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;

-- ─── Add total_tasks_completed to profiles if missing ──────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_tasks_completed INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
