'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { getMonthlySummary } from '@/lib/attendance'
import Navbar from '@/components/Navbar'
import CalendarView from '@/components/CalendarView'
import MonthlyCharts from '@/components/MonthlyCharts'
import type { DailySummary } from '@/lib/attendance'

export default function ReportsPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)

  const loadReports = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await getMonthlySummary(user.id, selectedYear, selectedMonth)
      setSummaries(data || [])
    } catch (error) {
      console.error('Failed to load reports:', error)
      setSummaries([])
    } finally {
      setLoading(false)
    }
  }, [user, selectedYear, selectedMonth])

  useEffect(() => {
    if (user) {
      loadReports()
    } else if (!userLoading) {
      router.push('/login')
    }
  }, [user, userLoading, loadReports, router])

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Monthly Reports</h1>
          <div className="flex items-center space-x-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(selectedYear, month - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-xl shadow-md">
            <div className="text-xl text-gray-700">Loading reports...</div>
          </div>
        ) : summaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl shadow-md">
            <div className="text-xl text-gray-700 mb-2">No reports available</div>
            <div className="text-sm text-gray-600">Start logging your attendance to see reports here</div>
          </div>
        ) : (
          <>
            <MonthlyCharts summaries={summaries} />
            <CalendarView summaries={summaries} year={selectedYear} month={selectedMonth} />
          </>
        )}
      </div>
    </div>
  )
}

