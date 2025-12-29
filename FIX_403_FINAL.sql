-- FINAL FIX FOR 403 ERROR ON SIGNUP
-- This ensures the INSERT policy works correctly
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;

-- Step 2: Create a more permissive INSERT policy that definitely works
-- This uses both UUID and text comparison to ensure it matches
CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (
    -- Ensure user is authenticated
    auth.uid() IS NOT NULL
    AND (
      -- Direct UUID comparison
      id = auth.uid()
      OR
      -- Text comparison fallback
      id::text = auth.uid()::text
    )
  );

-- Step 3: Verify the policy was created
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'employees' 
AND cmd = 'INSERT';

-- Step 4: Test the policy condition (run this while logged in)
-- This will show if auth.uid() is working
SELECT 
  auth.uid() as current_user_id,
  auth.uid()::text as current_user_id_text,
  'Policy should allow insert if id matches auth.uid()' as note;

