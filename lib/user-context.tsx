'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getCurrentUser } from './auth'
import type { Employee } from './auth'

interface UserContextType {
  user: Employee | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only auto-load user if we're not on auth pages
    // This prevents unnecessary API calls on login/signup pages
    const isAuthPage = typeof window !== 'undefined' && 
      (window.location.pathname === '/login' || window.location.pathname === '/signup')
    
    if (!isAuthPage) {
      refreshUser()
    } else {
      setLoading(false)
    }
  }, [])

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    // Return a safe default instead of throwing, for pages that might not need auth
    return { user: null, loading: false, refreshUser: async () => {} }
  }
  return context
}

