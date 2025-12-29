-- QUICK FIX FOR 403 FORBIDDEN ERRORS
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- This fixes the "new row violates row-level security policy" error

-- Step 1: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;
DROP POLICY IF EXISTS "Users can update their own data" ON employees;

-- Step 2: Create INSERT policy with proper UUID comparison
-- Using text conversion to ensure proper matching
CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (auth.uid()::text = id::text OR auth.uid() = id)
  );

-- Step 3: Create UPDATE policy (optional but recommended)
CREATE POLICY "Users can update their own data"
  ON employees FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND (auth.uid()::text = id::text OR auth.uid() = id)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (auth.uid()::text = id::text OR auth.uid() = id)
  );

-- Step 4: Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'employees'
ORDER BY policyname;

-- Step 5: Test the policy (optional - this will show if auth.uid() is working)
-- SELECT auth.uid() as current_user_id;

