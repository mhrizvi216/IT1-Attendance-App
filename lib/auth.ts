import { supabase } from './supabase'

export type UserRole = 'employee' | 'admin'

export interface Employee {
  id: string
  name: string
  email: string
  role: UserRole
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // Silently return null if not authenticated - don't log errors for unauthenticated users
      return null
    }

    // Use maybeSingle() instead of single() to avoid 406 error when record doesn't exist
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (employeeError) {
      // Only log non-auth errors (401/403 are expected when not logged in)
      if (employeeError.code !== 'PGRST301' && employeeError.code !== '42501') {
        console.error('Error fetching employee:', employeeError)
      }
      return null
    }

    // If employee record doesn't exist, try to create it from auth user metadata
    if (!employee && user) {
      console.log('Employee record not found, attempting to create from auth metadata')

      const userMetadata = user.user_metadata || {}
      const name = userMetadata.name || user.email?.split('@')[0] || 'User'
      const role = (userMetadata.role as UserRole) || 'employee'

      // Try to create the employee record
      const { error: createError } = await supabase
        .from('employees')
        .insert({
          id: user.id,
          name,
          email: user.email || '',
          role,
        })

      if (createError) {
        console.error('Failed to create employee record:', createError)
        // If it's a policy error, provide helpful message
        if (createError.code === '42501' || createError.message.includes('policy')) {
          console.error('RLS policy blocking employee creation. Please run COMPLETE_SETUP.sql')
        }
        return null
      }

      // Return the newly created employee record
      return {
        id: user.id,
        name,
        email: user.email || '',
        role,
      } as Employee
    }

    return employee as Employee | null
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

export async function signUp(email: string, password: string, name: string, role: UserRole = 'employee') {
  // Sign up the user with Supabase Auth
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
    throw new Error('Failed to create user. Please check if email confirmation is required in Supabase settings.')
  }

  // Try to insert employee record - RLS policy should allow this
  // If trigger exists, this might fail but trigger will create it
  let employeeError = null
  const { error: insertError } = await supabase
    .from('employees')
    .insert({
      id: authData.user.id,
      name,
      email,
      role,
    })

  employeeError = insertError

  // If insert fails due to RLS or other policy issues, check for trigger
  if (employeeError) {
    // Check if it's a 401/403 policy error (expected if RLS policy is missing)
    const isPolicyError =
      employeeError.code === '42501' ||
      employeeError.code === 'PGRST301' ||
      employeeError.message.includes('policy') ||
      employeeError.message.includes('permission denied') ||
      employeeError.message.includes('new row violates row-level security')

    if (isPolicyError) {
      // Check if employee record was created by trigger (with a small retry)
      let retries = 3
      while (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 200))
        const { data: existingEmployee } = await supabase
          .from('employees')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (existingEmployee) {
          break
        }
        retries--
      }
      // Check if employee record was created by trigger
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (existingEmployee) {
        // Trigger created it, update with correct data
        const { error: updateError } = await supabase
          .from('employees')
          .update({ name, email, role })
          .eq('id', authData.user.id)

        if (updateError) {
          console.warn('Could not update employee record:', updateError)
          // Continue anyway - record exists
        }
      } else {
        // No trigger, policy issue - provide helpful error
        throw new Error(
          'Unable to create employee record. This usually means the database security policy needs to be set up.\n\n' +
          'Please run one of these SQL scripts in your Supabase SQL Editor:\n' +
          '1. FIX_403_FINAL.sql (recommended)\n' +
          '2. QUICK_FIX.sql\n' +
          '3. COMPLETE_SETUP.sql\n\n' +
          'Or use ALTERNATIVE_SIGNUP_FIX.sql to enable automatic employee creation via trigger.'
        )
      }
    } else if (employeeError.code === '23505') {
      // Unique constraint - record already exists, update it
      const { error: updateError } = await supabase
        .from('employees')
        .update({ name, email, role })
        .eq('id', authData.user.id)

      if (updateError) {
        throw new Error('Failed to update employee record. Please contact support.')
      }
    } else {
      // Other error (not a policy error)
      // Only log non-policy errors
      if (employeeError.code !== 'PGRST301') {
        console.error('Employee insert error:', employeeError)
      }
      throw new Error(
        employeeError.message || 'Failed to create employee record. Please try again or contact support.'
      )
    }
  }

  return authData.user
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Sign in error:', error)

    // Provide helpful error messages
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password. Please check your credentials.')
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Please confirm your email address before signing in. Check your inbox for the confirmation link.')
    }
    if (error.message.includes('User not found')) {
      throw new Error('No account found with this email. Please sign up first.')
    }

    throw error
  }

  if (!data.user) {
    throw new Error('Sign in failed. Please try again.')
  }

  return data.user
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
