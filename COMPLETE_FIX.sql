-- COMPLETE FIX FOR SIGNUP ISSUES
-- This fixes both 403 Forbidden and 500 errors
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- PART 1: Fix the circular reference in admin policies
-- ============================================

-- Create security definer function to check admin role (avoids circular RLS reference)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE id = user_id
    AND role = 'admin'
  );
END;
$$;

-- Fix admin policies to use the function
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all logs" ON attendance_logs;
CREATE POLICY "Admins can view all logs"
  ON attendance_logs FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all summaries" ON daily_summary;
CREATE POLICY "Admins can view all summaries"
  ON daily_summary FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================
-- PART 2: Fix the INSERT policy for employees
-- ============================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;

-- Create a more reliable INSERT policy
-- This allows users to insert their own record during signup
CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (
    -- Ensure user is authenticated
    auth.uid() IS NOT NULL
    -- Allow if the id being inserted matches the authenticated user's id
    AND id = auth.uid()
  );

-- ============================================
-- PART 3: Add UPDATE policy (optional but recommended)
-- ============================================

DROP POLICY IF EXISTS "Users can update their own data" ON employees;
CREATE POLICY "Users can update their own data"
  ON employees FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PART 4: Verify everything is set up correctly
-- ============================================

-- Check all policies on employees table
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY cmd, policyname;

-- Test the is_admin function (replace with your user ID if needed)
-- SELECT is_admin(auth.uid()) as am_i_admin;

-- ============================================
-- PART 5: Alternative approach - Auto-create employee on auth signup
-- ============================================
-- Uncomment this section if the INSERT policy still doesn't work
-- This creates a trigger that automatically creates employee record on signup

/*
-- Function to auto-create employee record when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employees (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'employee'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to call the function on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
*/

