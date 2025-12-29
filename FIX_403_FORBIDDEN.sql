-- FIX FOR 403 FORBIDDEN ERROR
-- Error: "new row violates row-level security policy for table 'employees'"
-- 
-- This happens when the RLS policy exists but the condition doesn't match.
-- Run this SQL to fix it.

-- Method 1: Drop and recreate with text comparison (most reliable)
DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;

CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (auth.uid()::text = id::text);

-- Verify it was created
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'employees' AND cmd = 'INSERT';

-- If the above doesn't work, try Method 2 below:

