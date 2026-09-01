# 🚀 NIRMAAN OS — Personal Reconstruction & Productivity System
## Deep Architecture & Feature Documentation

---

## 📌 Executive Summary

**NIRMAAN OS** is an all-in-one, ultra-modern **Personal Reconstruction & Productivity Operating System** built using Next.js 15, TypeScript, Vanilla CSS design tokens (AMOLED Black, Golden, Red, Yellow, Cyan, White), Supabase PostgreSQL backend, and an integrated Android WebView/Capacitor Native Shell.

NIRMAAN combines **15 core productivity modules** with a **Full-CRUD AI Engine**, **Model Context Protocol (MCP) Integration**, a **30-Second Web Audio Synthesizer Alarm Engine with Snooze Controls**, a **Device Media Player Hub with Canvas Visualizers**, and **Automated PWA Push Notifications**.

---

## 🎨 Design System & Color Palette

NIRMAAN OS enforces a high-contrast, premium AMOLED color design system defined in `src/app/globals.css`:

| Color | Hex Token | Domain / Usage |
|---|---|---|
| **AMOLED Black** | `#0A0B0D` / `#121318` | App background, card surfaces, modal overlays |
| **Golden** | `#F59E0B` / `#D97706` / `#FBBF24` | Primary brand accent, high priority P2, achievement badges |
| **Cyan** | `#06B6D4` / `#0891B2` | Analytics, AI tool accents, P3 focus indicators |
| **Red** | `#EF4444` / `#DC2626` | Urgent P1 priority, habit flame streaks, stop alarm actions |
| **Yellow** | `#EAB308` | Health metrics, hydration targets, P4 priority tokens |
| **Pure White** | `#FFFFFF` | Primary headers, clean readable text, icon highlights |

---

## 📦 Detailed Module Deep Dive (15 Core Pages)

### 1. 📊 Dashboard (`/dashboard`)
- **Life Score Engine**: Real-time calculated Life Score (0–100) reflecting daily task completion, habit consistency, and health targets.
- **Quick OS Actions**: Instant 1-tap modal creation for Tasks, Todos, Water Intake, Journal Entries, and Reminders.
- **Daily Focus Summary**: Heatmap and streak counter displaying active focus hours and completed goals.

### 2. ✅ Tasks (`/tasks`)
- **Todoist-Style Feature Parity**:
  - Subtask hierarchies with completion tracking.
  - 4 Priority Levels: **P1 Urgent (Red)**, **P2 High (Gold)**, **P3 Medium (Cyan)**, **P4 Low (Yellow)**.
  - Due date pickers, recurrence schedules, and domain tagging.
- **Full CRUD Capabilities**: Create, edit inline, mark complete, soft delete, and bulk delete.

### 3. 📝 Daily Todos (`/todos`)
- Fast, lightweight daily task checklist with instant check-to-complete animations.
- Auto-sorting by priority and creation time.

### 4. 🔥 Habit Tracker (`/habits`)
- Streak counters with animated flame icons.
- Flexible frequency tracking (Daily, Weekdays, Weekly).
- Log completion history with completion rate percentage graphs.

### 5. 💧 Health & Wellness Hub (`/health`)
- **Water Tracker**: Daily target counter (e.g., 3000ml) with 250ml/500ml quick log buttons and progress circle.
- **Sleep & Energy Tracker**: Sleep duration logger and daily energy level indicators.
- **Step Counter**: Daily movement goal progress bar.

### 6. 🎵 Local Media Player & Audio Hub (`/player`)
- **Device Music Scanner**: Scan local audio files (`<input type="file" multiple accept="audio/*">`) directly from user's device storage.
- **Track Sorting**: Sort tracks by Title (A-Z), Artist, Duration, or Date Added.
- **Playback Modes**: **Shuffle**, **Loop One**, **Loop All**, **Linear**.
- **Live Canvas Audio Visualizer**: Real-time frequency bar animation rendered on HTML5 Canvas.
- **Global Mini-Player** (`GlobalMediaPlayer.tsx`): Sits fixed at the bottom of NIRMAAN OS so music continues playing seamlessly across all pages without interruption!

### 7. 📌 Notes (`/notes`)
- Rich text and markdown note taking interface.
- Tagging system, pinned notes section, and full-text search filter.

### 8. 🔔 Reminders & Alarm Engine (`/reminders`)
- **30-Second Alarm Engine** (`alarm-engine.ts`): Synthesizes high-frequency 30-second ringtones (*Chime*, *Pulse*, *Zen*) using Web Audio API or custom device music files.
- **Glassmorphic Pulsing Ring Screen** (`AlarmOverlay.tsx`): Appears when alarms fire.
- **Snooze Options**: 1-tap **+5 min**, **+10 min**, and **+15 min** snooze buttons.
- **Stop Alarm Action**: Silences audio and closes the modal overlay.

### 9. 📖 Journal (`/journal`)
- Daily mood rating (Ecstatic, Calm, Anxious, Tired, Focused).
- Reflection prompts and template picker.
- Chronological timeline history with full-text search.

### 10. 🎯 Vision & Goals (`/goals`)
- Long-term vision goals categorized by career, health, personal, and financial domains.
- Progress bar percentages calculated from completed sub-milestones.

### 11. 📈 Analytics & Insights (`/analytics`)
- Productivity bar charts, domain balance spider web charts, and completion trends.
- Weekly XP earned breakdown.

### 12. 🎓 Learning Hub (`/learn`)
- Self-study course and book reading tracker.
- Mastered topics list and practice problem trackers.

### 13. 🤖 AI Chat OS (`/ai`)
- Natural language task/todo generator: User inputs plain text (e.g., *"Remind me to study MySQL tomorrow at 5 PM"*), and AI extracts structured task details.
- Clean text formatting: Automatically strips raw Markdown symbols (`*`, `#`, `**`) from AI responses for clean UI output.
- Instant CRUD integration: Directly creates tasks, todos, and reminders from chat responses.

### 14. 🛡️ MCP Connect Hub (`/mcp`)
- Model Context Protocol integration for external tool registries.
- Supports full CRUD actions across all database tables (`delete_todo`, `delete_task`, `delete_goal`, `delete_journal_entry`, `delete_habit`, `delete_note`, `delete_reminder`, `full_data_reset`).

### 15. ⚙️ Settings (`/settings`)
- Theme preference toggles, notification permissions manager, background sync status, and data export/reset tools.

---

## 🔔 Push Notifications & Background Cron Dispatcher

1. **Auto-Prompt Permission Handler** (`src/lib/permissions-handler.ts`):
   - Automatically prompts users for Notification and Sound permissions on app load.
   - Features an interactive floating browser prompt banner (`BrowserPermissionBanner.tsx`) for browser clients.
2. **Background Cron Service** (`/api/cron/notifications`):
   - Runs automatically every 5 minutes (configured via `vercel.json` & Service Worker).
   - Scans Supabase for due reminders and P1 urgent tasks and dispatches WebPush payloads to subscribed devices.
3. **PWA Service Worker Auto-Update** (`public/sw.js`):
   - Automatically detects new code deployments, triggers `skipWaiting()`, and reloads clients cleanly.

---

## 📱 Android WebView & Native Build Architecture

NIRMAAN OS includes a complete native Android wrapper under `./android` using Capacitor:
- **Permissions Declared** in `AndroidManifest.xml`:
  - `INTERNET`, `ACCESS_NETWORK_STATE`
  - `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `WAKE_LOCK`, `VIBRATE`
  - `READ_MEDIA_AUDIO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`
  - `SYSTEM_ALERT_WINDOW`, `USE_FULL_SCREEN_INTENT`
- **Double-Tap Back Handler** (`back-button-handler.ts`):
  - Displays `"Press back again to exit NIRMAAN 📱"` toast when pressing back on the main dashboard to prevent accidental exits.
- **Compiled Output**:
  - `NIRMAAN-v2.0.0.apk` (4.1 MB) generated directly in project root.
