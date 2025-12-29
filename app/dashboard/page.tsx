'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { getTodayLogs, getCurrentStatus, logAction, getDailySummary } from '@/lib/attendance'
import Navbar from '@/components/Navbar'
import type { AttendanceLog, DailySummary } from '@/lib/attendance'
import { Clock, Coffee, LogOut, Play, Filter, Calendar, BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [status, setStatus] = useState({ 
    isWorking: false, 
    isOnBreak: false, 
    lastAction: null as string | null,
    startWorkTime: null as string | null
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!user) {
      if (!userLoading) {
        router.push('/login')
      }
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      const [todayLogs, currentStatus, dailySummary] = await Promise.all([
        getTodayLogs(user.id),
        getCurrentStatus(user.id),
        getDailySummary(user.id, today),
      ])

      setLogs(todayLogs)
      setStatus(currentStatus)
      setSummary(dailySummary)
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, userLoading, router])

  useEffect(() => {
    if (user) {
      loadData()
      const interval = setInterval(loadData, 60000)
      return () => clearInterval(interval)
    }
  }, [user, loadData])

  const handleAction = useCallback(async (actionType: 'start_work' | 'end_work' | 'start_break' | 'end_break') => {
    if (!user) return

    setActionLoading(true)
    setError('')

    try {
      await logAction(user.id, actionType)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to log action')
    } finally {
      setActionLoading(false)
    }
  }, [user, loadData])

  const formatTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }, [])

  // Check if Start Work should be disabled (locked for 3 hours or if on break)
  const isStartWorkLocked = useMemo(() => {
    if (status.isOnBreak) return true // Locked when on break
    if (!status.startWorkTime) return false // Not locked if never started
    
    const startTime = new Date(status.startWorkTime).getTime()
    const currentTime = new Date().getTime()
    const threeHoursInMs = 3 * 60 * 60 * 1000
    const timeElapsed = currentTime - startTime
    
    // Locked if less than 3 hours have passed since start_work
    return timeElapsed < threeHoursInMs
  }, [status.isOnBreak, status.startWorkTime])

  const workHours = summary ? summary.total_work_minutes : 0
  const breakMinutes = summary ? summary.total_break_minutes : 0
  const presentPercentage = workHours > 0 ? Math.min(100, (workHours / 480) * 100) : 0

  if (userLoading || (loading && !user)) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)' }}>
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl text-gray-700">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Hello {user?.name || 'User'}
            </h1>
            <p className="text-lg text-gray-600">We hope you're having a great day.</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <button className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700">
              <Filter className="w-5 h-5" />
              <span className="text-sm font-medium">All Classes</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-700">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium">Last 30 Days</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Work Hours */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Total Work Hours</h3>
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {workHours > 0 ? Math.floor(workHours / 60) : 0}
            </div>
            <div className="text-sm text-gray-500">hours today</div>
          </div>

          {/* Present Today */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Present Today</h3>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-green-500 border-t-transparent"></div>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {status.isWorking ? 'Yes' : 'No'}
            </div>
            <div className="text-sm text-green-600 font-medium">{presentPercentage.toFixed(0)}%</div>
          </div>

          {/* Break Time */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Break Time</h3>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-red-500 border-t-transparent"></div>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {breakMinutes}
            </div>
            <div className="text-sm text-gray-500">minutes</div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Status</h3>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-yellow-500 border-t-transparent"></div>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {summary?.is_late ? 'Late' : summary?.under_hours ? 'Under' : 'Good'}
            </div>
            <div className="text-sm text-gray-500">attendance</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleAction('start_work')}
              disabled={actionLoading || status.isWorking || isStartWorkLocked}
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              title={isStartWorkLocked ? 'Start Work is locked for 3 hours after activation' : ''}
            >
              <Play className="w-8 h-8 mb-2" />
              <span className="font-semibold">Start Work</span>
              {isStartWorkLocked && status.startWorkTime && (
                <span className="text-xs mt-1 opacity-75">Locked</span>
              )}
            </button>
            <button
              onClick={() => handleAction('start_break')}
              disabled={actionLoading || !status.isWorking || status.isOnBreak}
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <Coffee className="w-8 h-8 mb-2" />
              <span className="font-semibold">Start Break</span>
            </button>
            <button
              onClick={() => handleAction('end_break')}
              disabled={actionLoading || !status.isOnBreak}
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <Coffee className="w-8 h-8 mb-2" />
              <span className="font-semibold">End Break</span>
            </button>
            <button
              onClick={() => handleAction('end_work')}
              disabled={actionLoading || !status.isWorking || status.isOnBreak}
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <LogOut className="w-8 h-8 mb-2" />
              <span className="font-semibold">End Work</span>
            </button>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Today's Activity</h2>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No activity logged today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      log.action_type === 'start_work' ? 'bg-green-500' :
                      log.action_type === 'end_work' ? 'bg-red-500' :
                      log.action_type === 'start_break' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}></div>
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900 capitalize">
                      {log.action_type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-gray-600 font-medium">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
