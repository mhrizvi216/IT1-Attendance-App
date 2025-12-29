'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { useUser } from '@/lib/user-context'
import { memo } from 'react'
import { Search, Bell, LogOut, Zap } from 'lucide-react'
import DateTimeDisplay from './DateTimeDisplay'

function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <Link
              href={user?.role === 'admin' ? '/admin' : '/dashboard'}
              className="flex items-center space-x-2 text-xl font-bold text-purple-600 hover:text-purple-700 transition-colors"
            >
              <Zap className="w-6 h-6 text-purple-600" fill="currentColor" />
              <span>ATTENDED</span>
            </Link>

            {/* Navigation Links */}
            {user && (
              <div className="hidden md:flex items-center space-x-1">
                <Link
                  href="/dashboard"
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${pathname === '/dashboard'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50'
                    }`}
                >
                  Dashboard
                </Link>
                {user.role === 'admin' && (
                  <>
                    <Link
                      href="/admin"
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${pathname === '/admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50'
                        }`}
                    >
                      Manage Attendance
                    </Link>
                    <Link
                      href="/admin"
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${pathname === '/admin' // Note: Both verify same path? Keeping as requested
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50'
                        }`}
                    >
                      Student's List
                    </Link>
                  </>
                )}
                {user.role !== 'admin' && (
                  <Link
                    href="/reports"
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${pathname === '/reports'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50'
                      }`}
                  >
                    Reports
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            <DateTimeDisplay />
            {user ? (
              <>
                <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-gray-50 rounded-full transition-colors">
                  <Search className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-gray-50 rounded-full transition-colors relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-600">{user.email}</div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="hidden md:flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="md:hidden p-2 text-gray-600 hover:text-purple-600 hover:bg-gray-50 rounded-full transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default memo(Navbar)
