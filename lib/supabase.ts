import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Fallback to empty strings to prevent build crashes, but warn the user.
// This allows the static build to proceed (Next.js prerendering) even if env vars are missing.
// The app will fail at runtime if not configured, which is expected.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'WARNING: Missing Supabase environment variables! \n' +
    'The app will not function correctly. \n' +
    'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}
const url = supabaseUrl || 'https://placeholder.supabase.co'
const key = supabaseAnonKey || 'placeholder-key'

// Singleton pattern for Supabase client
export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          name: string
          email: string
          role: 'employee' | 'admin'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role?: 'employee' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'employee' | 'admin'
        }
        Relationships: []
      }
      attendance_logs: {
        Row: {
          id: string
          employee_id: string
          action_type: 'start_work' | 'end_work' | 'start_break' | 'end_break'
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          action_type: 'start_work' | 'end_work' | 'start_break' | 'end_break'
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          action_type?: 'start_work' | 'end_work' | 'start_break' | 'end_break'
          timestamp?: string
        }
        Relationships: []
      }
      daily_summary: {
        Row: {
          id: string
          employee_id: string
          date: string
          total_work_minutes: number
          total_break_minutes: number
          is_late: boolean
          under_hours: boolean
          status_color: 'green' | 'yellow' | 'red'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          date: string
          total_work_minutes?: number
          total_break_minutes?: number
          is_late?: boolean
          under_hours?: boolean
          status_color?: 'green' | 'yellow' | 'red'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          total_work_minutes?: number
          total_break_minutes?: number
          is_late?: boolean
          under_hours?: boolean
          status_color?: 'green' | 'yellow' | 'red'
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

