-- FIX FOR 500 INTERNAL SERVER ERROR
-- Error occurs because the admin policy has a circular reference
-- The policy tries to query employees table to check admin role,
-- but that query is also subject to RLS, causing infinite recursion

-- Step 1: Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;

-- Step 2: Create a security definer function to check admin role
-- This function bypasses RLS to check if user is admin
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

-- Step 3: Recreate the admin policy using the function (avoids circular reference)
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  USING (is_admin(auth.uid()));

-- Step 4: Also fix the admin policies for other tables
DROP POLICY IF EXISTS "Admins can view all logs" ON attendance_logs;
CREATE POLICY "Admins can view all logs"
  ON attendance_logs FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all summaries" ON daily_summary;
CREATE POLICY "Admins can view all summaries"
  ON daily_summary FOR SELECT
  USING (is_admin(auth.uid()));

-- Verify the function was created
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_admin';

-- Verify policies were updated
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE policyname LIKE '%admin%'
ORDER BY tablename, policyname;

