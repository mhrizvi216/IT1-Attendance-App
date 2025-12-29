'use client'

import { useMemo, useCallback, memo } from 'react'
import type { DailySummary } from '@/lib/attendance'

interface CalendarViewProps {
  summaries: DailySummary[]
  year: number
  month: number
}

function CalendarView({ summaries, year, month }: CalendarViewProps) {
  const firstDay = useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month])
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month])
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])

  const summariesMap = useMemo(() => {
    const map = new Map<string, DailySummary>()
    summaries.forEach((s) => map.set(s.date, s))
    return map
  }, [summaries])

  const getSummaryForDay = useCallback((day: number): DailySummary | undefined => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return summariesMap.get(dateStr)
  }, [year, month, summariesMap])

  const formatTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }, [])

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Calendar View</h2>
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-semibold text-gray-700 py-2">
            {day}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square"></div>
        ))}
        {days.map((day) => {
          const summary = getSummaryForDay(day)
          const isToday =
            day === new Date().getDate() &&
            month === new Date().getMonth() + 1 &&
            year === new Date().getFullYear()

          return (
            <div
              key={day}
              className={`aspect-square border-2 rounded-lg p-2 ${
                isToday ? 'border-purple-500' : 'border-gray-200'
              } ${
                summary
                  ? summary.status_color === 'green'
                    ? 'bg-green-50'
                    : summary.status_color === 'yellow'
                    ? 'bg-yellow-50'
                    : 'bg-red-50'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex flex-col h-full">
                <div className="text-sm font-semibold text-gray-900 mb-1">{day}</div>
                {summary && (
                  <div className="flex-1 flex flex-col justify-between text-xs">
                    <div
                      className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                        summary.status_color === 'green'
                          ? 'bg-green-500'
                          : summary.status_color === 'yellow'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    ></div>
                    <div className="text-gray-700 font-medium">{formatTime(summary.total_work_minutes)}</div>
                    {summary.is_late && <div className="text-yellow-700 font-medium">Late</div>}
                    {summary.under_hours && <div className="text-red-700 font-medium">Under</div>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-700">Good</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
          <span className="text-sm text-gray-700">Borderline</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className="text-sm text-gray-700">Issues</span>
        </div>
      </div>
    </div>
  )
}

export default memo(CalendarView)

