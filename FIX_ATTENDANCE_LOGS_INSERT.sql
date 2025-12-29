-- FIX FOR 403 ERROR ON INSERTING ATTENDANCE LOGS
-- The INSERT policy isn't matching correctly
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing INSERT policy
DROP POLICY IF EXISTS "Employees can insert their own logs" ON attendance_logs;

-- Step 2: Create a more reliable INSERT policy
-- Using both UUID and text comparison to ensure it works
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

-- Step 3: Verify the policy was created
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'attendance_logs' 
AND cmd = 'INSERT';

-- Step 4: Test the policy condition (run this while logged in)
SELECT 
  auth.uid() as current_user_id,
  'Policy should allow insert if employee_id matches auth.uid()' as note;

