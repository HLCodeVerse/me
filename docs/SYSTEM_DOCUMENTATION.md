# 🚀 NIRMAAN OS — Personal Reconstruction & Productivity System
## Deep Architecture, SQL Schema & Feature Documentation

---

## 📌 Executive Summary

**NIRMAAN OS** is an all-in-one, ultra-modern **Personal Reconstruction & Productivity Operating System** built using Next.js 15, TypeScript, Vanilla CSS design tokens (AMOLED Black, Golden, Red, Yellow, Cyan, White), Supabase PostgreSQL backend, and an integrated Android WebView/Capacitor Native Shell.

NIRMAAN combines **15 core productivity modules** with a **Full-CRUD AI Engine**, **Model Context Protocol (MCP) Integration**, a **30-Second Web Audio Synthesizer Alarm Engine with Snooze Controls**, a **Device Media Player Hub with Canvas Visualizers**, and **Automated PWA Push Notifications**.

---

## 🎨 Design System & Color Spec Mapping

NIRMAAN OS enforces a high-contrast, premium AMOLED color design system defined in `src/app/globals.css`:

| Color Name | Hex Token | Priority / Domain Mapping | Module UI Usage |
|---|---|---|---|
| **AMOLED Black** | `#0A0B0D` / `#121318` | System Surface | Background canvas, card backdrops, dark modal overlays |
| **Golden Amber** | `#F59E0B` / `#D97706` | P2 High Priority, Brand Accent | Primary action buttons, Reminders, Life Score badge, Tasks P2 |
| **Cyan Spark** | `#06B6D4` / `#0891B2` | P3 Medium Priority, Intelligence | AI Chat OS, MCP Hub, Todos, Notes tags, Audio visualizers |
| **Flame Red** | `#EF4444` / `#DC2626` | P1 Urgent Priority, Habit Streaks | Habits flame icons, Urgent P1 tasks, Stop Alarm buttons |
| **Electric Yellow** | `#EAB308` | P4 Low Priority, Health & Learning | Water tracker targets, Sleep duration, Goals, Practice courses |
| **Pure White** | `#FFFFFF` | Primary Contrast | Page title headers, clean body copy, high-contrast icons |

---

## 🗄️ Database Architecture & SQL Schema Tables

The NIRMAAN OS PostgreSQL backend relies on **20 structured database tables** in Supabase:

### 1. `public.profiles`
User identity metadata, Life Score (0–100), streak statistics, and XP calculations.
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  timezone text DEFAULT 'Asia/Kolkata',
  life_score integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  total_tasks_completed integer DEFAULT 0,
  bio text,
  created_at timestamp with time zone DEFAULT now()
);
```

### 2. `public.tasks`
Todoist-style tasks with subtask tree hierarchy, 4 priority levels, due dates, and recurrence rules.
```sql
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  goal_id uuid REFERENCES public.goals(id),
  parent_task_id uuid REFERENCES public.tasks(id),
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  priority integer DEFAULT 2 CHECK (priority >= 1 AND priority <= 4),
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  recurrence_rule text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
```

### 3. `public.todos`
Lightweight daily checklist items with fast check-to-complete actions.
```sql
CREATE TABLE public.todos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  title text NOT NULL,
  is_done boolean DEFAULT false,
  due_date date,
  created_at timestamp with time zone DEFAULT now()
);
```

### 4. `public.habits` & `public.habit_logs`
Daily habit trackers with flame streak counters and completion logs.
```sql
CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  name text NOT NULL,
  icon text DEFAULT '⭐',
  color text DEFAULT '#F59E0B',
  frequency text DEFAULT 'daily',
  target_count integer DEFAULT 1,
  archived boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.habit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id uuid REFERENCES public.habits(id) NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  logged_at date DEFAULT CURRENT_DATE NOT NULL,
  count integer DEFAULT 1,
  note text
);
```

### 5. `public.reminders`
Scheduled notification reminders linked with the 30-second Web Audio Synthesizer Alarm Engine.
```sql
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  title text NOT NULL,
  message text,
  remind_at timestamp with time zone NOT NULL,
  repeat_rule text,
  is_sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
```

### 6. `public.notes`
Markdown notes with pinning, tagging, and full-text search index.
```sql
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  title text,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### 7. `public.journal_entries` & `public.journal_prompts`
Mood scores (1–5), daily reflection entries, prompt templates, and AI reflection summaries.
```sql
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  title text,
  content text NOT NULL,
  mood text CHECK (mood IN ('amazing', 'good', 'meh', 'bad', 'awful')),
  mood_score integer,
  entry_type text DEFAULT 'free',
  prompt_id uuid REFERENCES public.journal_prompts(id),
  ai_reflection text,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);
```

### 8. `public.goals` & `public.life_areas`
Long-term vision goals linked to life areas (Career, Health, Wealth, Mindset) with sub-milestones.
```sql
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  life_area_id uuid REFERENCES public.life_areas(id),
  title text NOT NULL,
  description text,
  target_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  priority integer DEFAULT 2
);
```

### 9. `public.ai_conversations` & `public.ai_messages`
AI Chat OS session logs, model parameters, and role-based messages (`user`, `assistant`, `system`).
```sql
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  title text NOT NULL,
  model text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES public.ai_conversations(id) NOT NULL,
  role text CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
```

### 10. `public.push_subscriptions`
WebPush subscription credentials for device background alert dispatching.
```sql
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  endpoint text UNIQUE NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);
```

### 11. `public.mcp_oauth_tokens` & `public.mcp_oauth_codes`
Model Context Protocol (MCP) OAuth2 access tokens and authorization codes for AI tool execution.
```sql
CREATE TABLE public.mcp_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text UNIQUE NOT NULL,
  refresh_token text UNIQUE,
  user_id uuid NOT NULL,
  client_id text,
  scope text DEFAULT 'mcp:read mcp:write',
  expires_at timestamp with time zone DEFAULT (now() + '365 days'::interval),
  revoked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
```

---

## 📦 Module Deep Dive (15 Core Pages)

### 1. 📊 Dashboard (`/dashboard`)
- **Life Score Engine**: Real-time calculated Life Score (0–100) reflecting daily task completion, habit consistency, and health targets.
- **Quick OS Actions**: Instant 1-tap modal creation for Tasks, Todos, Water Intake, Journal Entries, and Reminders.

### 2. ✅ Tasks (`/tasks`)
- **Todoist-Style Feature Parity**: Subtask trees, 4 priority levels (P1-P4), due date pickers, recurrence rules, and full CRUD.

### 3. 📝 Daily Todos (`/todos`)
- Fast lightweight daily checklist items with instant check-to-complete animations.

### 4. 🔥 Habit Tracker (`/habits`)
- Flame streak counters, daily/weekly frequency rules, log completion graphs.

### 5. 💧 Health & Wellness Hub (`/health`)
- 3000ml water logger with 250ml/500ml quick log buttons, sleep duration logger, step goal bar.

### 6. 🎵 Local Media Player Hub (`/player`)
- Local device file scanner, playlist manager, sorting (Title/Artist/Duration), loop/shuffle modes, live canvas visualizer, global floating mini-player.

### 7. 📌 Notes (`/notes`)
- Rich text and markdown note taking interface with tagging, pinned notes, and full-text search filter.

### 8. 🔔 Reminders & Alarm Engine (`/reminders`)
- 30-second Web Audio ringtone synthesizer (*Chime*, *Pulse*, *Zen*), glassmorphic ring screen overlay, snooze controls (+5m, +10m, +15m).

### 9. 📖 Journal (`/journal`)
- Daily mood rating, reflection prompts, timeline history.

### 10. 🎯 Vision & Goals (`/goals`)
- Long-term vision goals categorized by life areas with sub-milestone completion percentages.

### 11. 📈 Analytics & Insights (`/analytics`)
- Productivity bar charts, domain balance spider web charts, weekly XP breakdown.

### 12. 🎓 Learning Hub (`/learn`)
- Self-study course and book reading tracker with practice problem trackers.

### 13. 🤖 AI Chat OS (`/ai`)
- Natural language task generator, markdown clean text formatting, Thinking animation, Action Execution animation, Typewriter typing response.

### 14. 🛡️ MCP Connect Hub (`/mcp`)
- Model Context Protocol tool registries, full CRUD actions across all database tables.

### 15. ⚙️ Settings (`/settings`)
- Theme preference toggles, notification permissions manager, background sync status, data export/reset tools.

---

## 📱 Android Native WebView & APK Build

- **Native Android Shell** (`android/`):
  - Declares all device permissions (`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `WAKE_LOCK`, `READ_MEDIA_AUDIO`, `SYSTEM_ALERT_WINDOW`, `VIBRATE`).
  - Implements double-tap back handler (`"Press back again to exit NIRMAAN 📱"`).
- **Compiled Output**:
  - `NIRMAAN-v2.0.0.apk` (4.1 MB) in project root.
