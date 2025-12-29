'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { getAllEmployeesSummaries } from '@/lib/attendance'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

interface EmployeeSummary {
  id: string
  employee_id: string
  date: string
  total_work_minutes: number
  total_break_minutes: number
  is_late: boolean
  under_hours: boolean
  status_color: 'green' | 'yellow' | 'red'
  employees: {
    id: string
    name: string
    email: string
  }
}

export default function AdminPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [employees, setEmployees] = useState<any[]>([])
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([])
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [debouncedStartDate, setDebouncedStartDate] = useState(startDate)
  const [debouncedEndDate, setDebouncedEndDate] = useState(endDate)

  // Debounce date changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStartDate(startDate)
      setDebouncedEndDate(endDate)
    }, 500)

    return () => clearTimeout(timer)
  }, [startDate, endDate])

  const loadEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Failed to load employees:', error)
    }
  }, [])

  const loadSummaries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllEmployeesSummaries(debouncedStartDate, debouncedEndDate)
      setSummaries(data as any)
    } catch (error) {
      console.error('Failed to load summaries:', error)
    } finally {
      setLoading(false)
    }
  }, [debouncedStartDate, debouncedEndDate])

  useEffect(() => {
    if (user) {
      if (user.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      loadEmployees()
    } else if (!userLoading) {
      router.push('/login')
    }
  }, [user, userLoading, router, loadEmployees])

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadSummaries()
    }
  }, [user, debouncedStartDate, debouncedEndDate, loadSummaries])

  const formatTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }, [])

  const getEmployeeStats = useCallback((employeeId: string) => {
    const employeeSummaries = summaries.filter((s) => s.employee_id === employeeId)
    if (employeeSummaries.length === 0) return null

    const totalHours = employeeSummaries.reduce((sum, s) => sum + s.total_work_minutes, 0) / 60
    const totalBreaks = employeeSummaries.reduce((sum, s) => sum + s.total_break_minutes, 0)
    const lateCount = employeeSummaries.filter((s) => s.is_late).length
    const greenCount = employeeSummaries.filter((s) => s.status_color === 'green').length
    const yellowCount = employeeSummaries.filter((s) => s.status_color === 'yellow').length
    const redCount = employeeSummaries.filter((s) => s.status_color === 'red').length

    return {
      totalHours,
      totalBreaks,
      lateCount,
      greenCount,
      yellowCount,
      redCount,
      daysWorked: employeeSummaries.length,
    }
  }, [summaries])

  const filteredSummaries = useMemo(() => {
    return selectedEmployee
      ? summaries.filter((s) => s.employee_id === selectedEmployee)
      : summaries
  }, [summaries, selectedEmployee])

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

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Employee</label>
              <select
                value={selectedEmployee || ''}
                onChange={(e) => setSelectedEmployee(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Employee Statistics */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Employee Statistics</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Days Worked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Total Breaks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Late Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => {
                  const stats = getEmployeeStats(employee.id)
                  if (!stats) return null

                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-600">{employee.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats.daysWorked}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats.totalHours.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(stats.totalBreaks)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                        {stats.lateCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-sm text-gray-900">{stats.greenCount}</span>
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span className="text-sm text-gray-900">{stats.yellowCount}</span>
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-sm text-gray-900">{stats.redCount}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Reports */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Reports</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-700">Loading...</div>
          ) : filteredSummaries.length === 0 ? (
            <div className="text-center py-8 text-gray-700">No data available for the selected period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Work Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Break Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSummaries.map((summary) => (
                    <tr key={summary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(summary.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {summary.employees?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600">{summary.employees?.email || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(summary.total_work_minutes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(summary.total_break_minutes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-4 h-4 rounded-full ${summary.status_color === 'green'
                                ? 'bg-green-500'
                                : summary.status_color === 'yellow'
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                          ></div>
                          <span className="text-sm text-gray-900 capitalize font-medium">{summary.status_color}</span>
                          {summary.is_late && <span className="text-xs text-yellow-700 font-medium">Late</span>}
                          {summary.under_hours && <span className="text-xs text-red-700 font-medium">Under</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

