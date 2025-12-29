-- FIX FOR 403 ERROR ON ATTENDANCE_LOGS
-- This ensures RLS policies allow employees to view and insert their own logs
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Employees can view their own logs" ON attendance_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can insert their own logs" ON attendance_logs;

-- Step 2: Recreate SELECT policies
CREATE POLICY "Employees can view their own logs"
  ON attendance_logs FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Admins can view all logs"
  ON attendance_logs FOR SELECT
  USING (is_admin(auth.uid()));

-- Step 3: Recreate INSERT policy with better matching
CREATE POLICY "Employees can insert their own logs"
  ON attendance_logs FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      employee_id = auth.uid()
      OR
      employee_id::text = auth.uid()::text
    )
  );

-- Step 4: Verify policies were created
SELECT 
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'attendance_logs'
ORDER BY cmd, policyname;

-- Step 5: Test query (run this while logged in)
-- This should return your attendance logs
SELECT * FROM attendance_logs WHERE employee_id = auth.uid() LIMIT 5;

