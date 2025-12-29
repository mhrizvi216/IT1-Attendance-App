import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables!\n\n' +
    'Please create a .env.local file with:\n' +
    'NEXT_PUBLIC_SUPABASE_URL=your_supabase_url\n' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n' +
    'Get these from: Supabase Dashboard → Settings → API'
  )
}

// Singleton pattern for Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

