'use client'

import { useMemo, memo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DailySummary } from '@/lib/attendance'

interface MonthlyChartsProps {
  summaries: DailySummary[]
}

function MonthlyCharts({ summaries }: MonthlyChartsProps) {
  const chartData = useMemo(() => summaries.map((summary) => ({
    date: new Date(summary.date).getDate(),
    workHours: (summary.total_work_minutes / 60).toFixed(1),
    breakMinutes: summary.total_break_minutes,
    status: summary.status_color,
  })), [summaries])

  const stats = useMemo(() => ({
    totalDays: summaries.length,
    totalHours: summaries.reduce((sum, s) => sum + s.total_work_minutes, 0) / 60,
    avgHours: summaries.length > 0
      ? summaries.reduce((sum, s) => sum + s.total_work_minutes, 0) / summaries.length / 60
      : 0,
    lateDays: summaries.filter((s) => s.is_late).length,
    underHoursDays: summaries.filter((s) => s.under_hours).length,
    greenDays: summaries.filter((s) => s.status_color === 'green').length,
    yellowDays: summaries.filter((s) => s.status_color === 'yellow').length,
    redDays: summaries.filter((s) => s.status_color === 'red').length,
  }), [summaries])

  return (
    <div className="space-y-6 mb-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">Total Days</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalDays}</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">Total Hours</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}h</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">Avg Hours/Day</div>
          <div className="text-2xl font-bold text-gray-900">{stats.avgHours.toFixed(1)}h</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">Late Days</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.lateDays}</div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.greenDays}</div>
            <div className="text-sm text-gray-700">Good Days</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.yellowDays}</div>
            <div className="text-sm text-gray-700">Borderline Days</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{stats.redDays}</div>
            <div className="text-sm text-gray-700">Issues Days</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Work Hours</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="workHours" stroke="#9333ea" strokeWidth={2} name="Hours" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Break Time Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="breakMinutes" fill="#f59e0b" name="Break (min)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default memo(MonthlyCharts)

