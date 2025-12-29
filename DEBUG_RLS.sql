-- DEBUG SCRIPT: Check why RLS policies aren't working
-- Run this to diagnose the issue

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'employees';

-- 2. List all policies on employees table
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY cmd, policyname;

-- 3. Check current auth user (run this while logged in)
SELECT 
  auth.uid() as current_auth_uid,
  auth.uid()::text as current_auth_uid_text;

-- 4. Test the INSERT policy condition manually
-- Replace 'YOUR_USER_ID' with an actual UUID from auth.users
SELECT 
  'YOUR_USER_ID'::uuid = auth.uid() as uuid_match,
  'YOUR_USER_ID'::text = auth.uid()::text as text_match,
  auth.uid() IS NOT NULL as has_auth_uid;

-- 5. Check if there are any conflicting policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employees'
AND cmd = 'INSERT';

