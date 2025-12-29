-- SIMPLE FIX FOR 403 FORBIDDEN ON SIGNUP
-- This is the most reliable fix - run this in Supabase SQL Editor

-- Step 1: Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;

-- Step 2: Create a new INSERT policy with explicit UUID comparison
-- Using both UUID and text comparison to ensure it works
CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
      -- Try UUID comparison first
      id = auth.uid()
      OR
      -- Fallback to text comparison
      id::text = auth.uid()::text
    )
  );

-- Step 3: Verify the policy was created
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'employees' AND cmd = 'INSERT';

-- Step 4: Test if auth.uid() is working (run this while logged in)
-- SELECT auth.uid() as current_user_id;

