-- FIX FOR 406 NOT ACCEPTABLE ERROR
-- This error usually means the query format is not accepted
-- Run this to ensure RLS policies allow SELECT queries

-- Check current policies
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY cmd, policyname;

-- Ensure SELECT policies exist and are correct
-- Drop and recreate if needed

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Employees can view their own data" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;

-- Recreate SELECT policies
CREATE POLICY "Employees can view their own data"
  ON employees FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  USING (is_admin(auth.uid()));

-- Verify policies were created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'employees' AND cmd = 'SELECT';

-- Test query (run this while logged in)
-- This should return your employee record
SELECT * FROM employees WHERE id = auth.uid();

