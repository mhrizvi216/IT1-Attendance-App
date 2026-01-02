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

export async function getLastLog(employeeId: string): Promise<AttendanceLog | null> {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching last log:', error)
    return null
  }
  return data
}

export async function getCurrentStatus(employeeId: string): Promise<{
  isWorking: boolean
  isOnBreak: boolean
  lastAction: ActionType | null
  startWorkTime: string | null
}> {
  // Logic updated for Night Shift:
  // Instead of just checking today's logs, we look at the very last action recorded.
  // If the last action was 'start_work', they are working, even if it was yesterday (e.g. 8 PM).

  const lastLog = await getLastLog(employeeId)

  if (!lastLog) {
    return { isWorking: false, isOnBreak: false, lastAction: null, startWorkTime: null }
  }

  const isWorking = lastLog.action_type === 'start_work' || lastLog.action_type === 'end_break'
  const isOnBreak = lastLog.action_type === 'start_break'

  // To find start time, we need to look backwards from the last log until we find the start_work
  // This might be expensive if we scan too far, but typically it's within 24h.
  // For UI display, we'll try to find the start_work associated with this session.
  let startWorkTime = null
  if (isWorking || isOnBreak) {
    // Determine the relevant start_work. 
    // If we are working, the session started recently.
    // Query logs from last 24 hours to find the 'start_work'
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentLogs } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('timestamp', yesterday)
      .order('timestamp', { ascending: false })

    // Find the first 'start_work' when looking backwards
    const startLog = recentLogs?.find(l => l.action_type === 'start_work')
    startWorkTime = startLog?.timestamp || lastLog.timestamp // Fallback to last log if not found
  }

  return {
    isWorking,
    isOnBreak,
    lastAction: lastLog.action_type,
    startWorkTime,
  }
}

async function calculateAndSaveShiftSummary(employeeId: string, currentLog: AttendanceLog) {
  // This function is called after 'end_work' to calculate hours and save to daily_summary.
  // Pivot date is the date of the START_WORK log, not necessarily today.

  // 1. Find the start_work for this shift
  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .lte('timestamp', currentLog.timestamp)
    .order('timestamp', { ascending: false })
    .limit(20) // Assume shift isn't longer than 20 actions

  if (!logs) return

  // Scan backwards
  let startWorkLog: AttendanceLog | null = null
  const shiftLogs: AttendanceLog[] = []

  for (const log of logs) {
    shiftLogs.unshift(log) // Add to start to maintain chronological order later
    if (log.action_type === 'start_work') {
      startWorkLog = log
      break
    }
    // Safety break: if we hit a previous end_work, we missed the start or data is corrupt
    if (log.action_type === 'end_work' && log.id !== currentLog.id) {
      break
    }
  }

  if (!startWorkLog) {
    console.error('Could not find start_work for summary calculation')
    return
  }

  // Calculate minutes
  let totalWorkMinutes = 0
  let totalBreakMinutes = 0

  const startTime = new Date(startWorkLog.timestamp)
  const endTime = new Date(currentLog.timestamp)

  // Simple calculation: Total Duration - Break Durations
  const totalDurationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)

  // Calculate breaks
  let breakStart: number | null = null
  for (const log of shiftLogs) {
    if (log.action_type === 'start_break') {
      breakStart = new Date(log.timestamp).getTime()
    } else if (log.action_type === 'end_break' && breakStart) {
      totalBreakMinutes += (new Date(log.timestamp).getTime() - breakStart) / (1000 * 60)
      breakStart = null
    }
  }

  totalWorkMinutes = Math.max(0, Math.round(totalDurationMinutes - totalBreakMinutes))
  totalBreakMinutes = Math.round(totalBreakMinutes)

  // Status checks
  // Late check: 3 PM is 15:00.
  const isLate = false // Disable hardcoded late check for now due to complexity

  const pivotDate = startWorkLog.timestamp.split('T')[0] // 'YYYY-MM-DD' of the start day

  // Upsert
  const { error } = await supabase
    .from('daily_summary')
    .upsert({
      employee_id: employeeId,
      date: pivotDate,
      total_work_minutes: totalWorkMinutes,
      total_break_minutes: totalBreakMinutes,
      is_late: isLate,
      under_hours: totalWorkMinutes < 480,
      status_color: totalWorkMinutes < 480 ? 'red' : 'green',
      updated_at: new Date().toISOString()
    }, { onConflict: 'employee_id,date' })

  if (error) {
    console.error('Error updating daily summary:', error)
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
  const START_HOUR = 15 // Reverted to 15 (3 PM)
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
    throw new Error('Work already started. Current session active.')
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

  // Daily summary calculation in Application Logic (Night Shift Support)
  // We trigger this only on 'end_work'. 
  if (actionType === 'end_work' && data) {
    await calculateAndSaveShiftSummary(employeeId, data)
  }

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
      employees!inner (
        id,
        name,
        email,
        role
      )
    `)
    .neq('employees.role', 'admin')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}
