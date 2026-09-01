export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          timezone: string
          life_score: number
          current_streak: number
          longest_streak: number
          created_at: string
          phone: string | null
          password_hash: string | null
        }
        Insert: {
          id?: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          life_score?: number
          current_streak?: number
          longest_streak?: number
          created_at?: string
          phone?: string | null
          password_hash?: string | null
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          life_score?: number
          current_streak?: number
          longest_streak?: number
          created_at?: string
          phone?: string | null
          password_hash?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          parent_task_id: string | null
          title: string
          description: string | null
          due_date: string | null
          due_time: string | null
          priority: number
          status: string
          recurrence_rule: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          parent_task_id?: string | null
          title: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          priority?: number
          status?: string
          recurrence_rule?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }
      todos: {
        Row: {
          id: string
          user_id: string
          title: string
          is_done: boolean
          due_date: string | null
          due_time: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          is_done?: boolean
          due_date?: string | null
          due_time?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['todos']['Insert']>
      }
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string | null
          color: string | null
          frequency: string
          target_count: number
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string | null
          color?: string | null
          frequency?: string
          target_count?: number
          archived?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['habits']['Insert']>
      }
      habit_logs: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          logged_at: string
          count: number
          note: string | null
        }
        Insert: {
          id?: string
          habit_id: string
          user_id: string
          logged_at?: string
          count?: number
          note?: string | null
        }
        Update: Partial<Database['public']['Tables']['habit_logs']['Insert']>
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string | null
          content: string
          is_pinned: boolean
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          content: string
          is_pinned?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['notes']['Insert']>
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          message?: string | null
          remind_at: string
          repeat_rule?: string | null
          recurrence_rule?: string | null
          is_recurring?: boolean
          is_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message?: string | null
          remind_at: string
          repeat_rule?: string | null
          recurrence_rule?: string | null
          is_recurring?: boolean
          is_sent?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>
      }
      goals: {
        Row: {
          id: string
          user_id: string
          life_area_id: string | null
          title: string
          description: string | null
          target_date: string | null
          status: string
          priority: number
        }
        Insert: {
          id?: string
          user_id: string
          life_area_id?: string | null
          title: string
          description?: string | null
          target_date?: string | null
          status?: string
          priority?: number
        }
        Update: Partial<Database['public']['Tables']['goals']['Insert']>
      }
      life_areas: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          color: string
          target_score: number
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon: string
          color: string
          target_score?: number
        }
        Update: Partial<Database['public']['Tables']['life_areas']['Insert']>
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          title: string | null
          content: string
          mood: string | null
          mood_score: number | null
          entry_type: string
          prompt_id: string | null
          ai_reflection: string | null
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          content: string
          mood?: string | null
          mood_score?: number | null
          entry_type?: string
          prompt_id?: string | null
          ai_reflection?: string | null
          tags?: string[]
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['journal_entries']['Insert']>
      }
      ai_conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          model: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          model: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['ai_conversations']['Insert']>
      }
      ai_messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['ai_messages']['Insert']>
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string
          cover_image: string | null
          order_index: number
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category: string
          cover_image?: string | null
          order_index?: number
        }
        Update: Partial<Database['public']['Tables']['courses']['Insert']>
      }
      lessons: {
        Row: {
          id: string
          module_id: string
          title: string
          content: string | null
          content_type: string
          resource_url: string | null
          order_index: number
        }
        Insert: {
          id?: string
          module_id: string
          title: string
          content?: string | null
          content_type?: string
          resource_url?: string | null
          order_index?: number
        }
        Update: Partial<Database['public']['Tables']['lessons']['Insert']>
      }
      lesson_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          status: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          status?: string
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['lesson_progress']['Insert']>
      }
      streaks: {
        Row: {
          id: string
          user_id: string
          type: string
          current_count: number
          longest_count: number
          last_active_date: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          current_count?: number
          longest_count?: number
          last_active_date: string
        }
        Update: Partial<Database['public']['Tables']['streaks']['Insert']>
      }
      daily_plans: {
        Row: {
          id: string
          user_id: string
          date: string
          ai_generated_summary: string | null
          focus_area: string | null
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          ai_generated_summary?: string | null
          focus_area?: string | null
        }
        Update: Partial<Database['public']['Tables']['daily_plans']['Insert']>
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          key_hash: string
          key_prefix: string
          name: string
          scopes: string[]
          last_used_at: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          key_hash: string
          key_prefix: string
          name: string
          scopes?: string[]
          last_used_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['api_keys']['Insert']>
      }
      water_logs: {
        Row: {
          id: string
          user_id: string
          amount_ml: number
          logged_at: string
          date: string
        }
        Insert: {
          id?: string
          user_id: string
          amount_ml: number
          logged_at?: string
          date?: string
        }
        Update: Partial<Database['public']['Tables']['water_logs']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Todo = Database['public']['Tables']['todos']['Row']
export type Habit = Database['public']['Tables']['habits']['Row']
export type HabitLog = Database['public']['Tables']['habit_logs']['Row']
export type Note = Database['public']['Tables']['notes']['Row']
export type Reminder = Database['public']['Tables']['reminders']['Row']
export type Goal = Database['public']['Tables']['goals']['Row']
export type LifeArea = Database['public']['Tables']['life_areas']['Row']
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
export type AIConversation = Database['public']['Tables']['ai_conversations']['Row']
export type AIMessage = Database['public']['Tables']['ai_messages']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type Lesson = Database['public']['Tables']['lessons']['Row']
export type LessonProgress = Database['public']['Tables']['lesson_progress']['Row']
export type Streak = Database['public']['Tables']['streaks']['Row']
export type DailyPlan = Database['public']['Tables']['daily_plans']['Row']
export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type WaterLog = Database['public']['Tables']['water_logs']['Row']
