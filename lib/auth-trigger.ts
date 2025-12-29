// Alternative auth.ts that works with database trigger
// If you use the trigger approach, you can simplify signup like this:

import { supabase } from './supabase'

export type UserRole = 'employee' | 'admin'

export interface Employee {
  id: string
  name: string
  email: string
  role: UserRole
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', user.id)
    .single()

  return employee as Employee | null
}

export async function signUp(email: string, password: string, name: string, role: UserRole = 'employee') {
  // Sign up the user - the trigger will automatically create the employee record
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name,
        role: role,
      }
    }
  })

  if (authError) {
    console.error('Auth error:', authError)
    throw authError
  }
  
  if (!authData.user) {
    throw new Error('Failed to create user. Please check if email confirmation is required.')
  }

  // Wait a moment for the trigger to create the employee record
  await new Promise(resolve => setTimeout(resolve, 500))

  // Update the employee record with the name and role (trigger creates it with defaults)
  const { error: updateError } = await supabase
    .from('employees')
    .update({ name, role })
    .eq('id', authData.user.id)

  if (updateError) {
    console.warn('Could not update employee record:', updateError)
    // This is not critical - the record was created by the trigger
  }

  return authData.user
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

