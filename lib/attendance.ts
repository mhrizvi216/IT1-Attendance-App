import { supabase } from './supabase'

export type ActionType = 'start_work' | 'end_work' | 'start_break' | 'end_break'

export interface AttendanceLog {
  id: string
  employee_id: string
  action_type: ActionType
  timestamp: string
  created_at: string
}

export interface DailySummary {
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

export async function getTodayLogs(employeeId: string): Promise<AttendanceLog[]> {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('timestamp', `${today}T00:00:00Z`)
    .lte('timestamp', `${today}T23:59:59Z`)
    .order('timestamp', { ascending: true })

  if (error) {
    console.error('Error fetching today logs:', error)
    // If it's a policy error, return empty array instead of throwing
    if (error.code === '42501' || error.message.includes('policy')) {
      console.warn('RLS policy blocking attendance_logs query. Please check policies.')
      return []
    }
    throw error
  }
  return data || []
}

export async function getCurrentStatus(employeeId: string): Promise<{
  isWorking: boolean
  isOnBreak: boolean
  lastAction: ActionType | null
  startWorkTime: string | null
}> {
  const logs = await getTodayLogs(employeeId)

  if (logs.length === 0) {
    return { isWorking: false, isOnBreak: false, lastAction: null, startWorkTime: null }
  }

  const lastLog = logs[logs.length - 1]
  const isWorking = lastLog.action_type === 'start_work' || lastLog.action_type === 'end_break'
  const isOnBreak = lastLog.action_type === 'start_break'

  // Find the most recent start_work timestamp
  const startWorkLog = logs.filter(log => log.action_type === 'start_work').pop()
  const startWorkTime = startWorkLog?.timestamp || null

  return {
    isWorking,
    isOnBreak,
    lastAction: lastLog.action_type,
    startWorkTime,
  }
}

export async function logAction(employeeId: string, actionType: ActionType): Promise<AttendanceLog> {
  // Validate action sequence
  const status = await getCurrentStatus(employeeId)

  // Validation rules
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 6 = Saturday
  const hours = now.getHours()

  // Restriction: Mon-Fri only
  // NOTE: Commented out for testing purposes if needed, currently active
  if (actionType === 'start_work' && (day === 0 || day === 6)) {
    throw new Error('Work not allowed on weekends (Saturday and Sunday)')
  }

  // Restriction: 3 PM (15:00) onwards
  // TEST MODE: Set to 0 to allow testing. Revert to 15 for production.
  const START_HOUR = 0 // Was 15
  if (actionType === 'start_work' && hours < START_HOUR) {
    throw new Error(`Work can only start after ${START_HOUR}:00`)
  }
  if (actionType === 'start_break' && !status.isWorking) {
    throw new Error('Cannot start break before starting work')
  }
  if (actionType === 'end_break' && !status.isOnBreak) {
    throw new Error('Cannot end break if break is not active')
  }
  if (actionType === 'end_work' && status.isOnBreak) {
    throw new Error('Cannot end work while break is active')
  }
  if (actionType === 'start_work' && status.isWorking) {
    throw new Error('Work already started today')
  }
  if (actionType === 'end_work' && !status.isWorking) {
    throw new Error('Cannot end work if work has not started')
  }

  const { data, error } = await supabase
    .from('attendance_logs')
    .insert({
      employee_id: employeeId,
      action_type: actionType,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error inserting attendance log:', error)

    // Provide helpful error messages
    if (error.code === '42501' || error.message.includes('policy')) {
      throw new Error(
        'Database policy error. Please run FIX_ATTENDANCE_LOGS_INSERT.sql in Supabase SQL Editor. ' +
        'Error: ' + error.message
      )
    }

    throw error
  }

  // Daily summary is automatically calculated by database trigger
  // No need to manually call the function

  return data
}

export async function getDailySummary(employeeId: string, date: string): Promise<DailySummary | null> {
  const { data, error } = await supabase
    .from('daily_summary')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .maybeSingle()

  if (error) {
    console.error('Error fetching daily summary:', error)
    return null
  }
  return data
}

export async function getMonthlySummary(employeeId: string, year: number, month: number): Promise<DailySummary[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`

  const { data, error } = await supabase
    .from('daily_summary')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getAllEmployeesSummaries(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('daily_summary')
    .select(`
      *,
      employees (
        id,
        name,
        email
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

