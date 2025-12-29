-- SIMPLE FIX FOR MISSING EMPLOYEE RECORDS
-- This is a simpler approach that doesn't use a function
-- Run this in Supabase SQL Editor

-- Step 1: Create employee records for all auth users that don't have one
INSERT INTO employees (id, email, name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'name',
    SPLIT_PART(au.email, '@', 1),
    'User'
  ) as name,
  COALESCE(
    (au.raw_user_meta_data->>'role')::text,
    'employee'
  ) as role
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM employees e WHERE e.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Verify all users now have employee records
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  e.id as employee_id,
  e.name as employee_name,
  e.role as employee_role,
  CASE 
    WHEN e.id IS NULL THEN 'MISSING - Run fix again'
    ELSE 'EXISTS ✓'
  END as status
FROM auth.users au
LEFT JOIN employees e ON au.id = e.id
ORDER BY au.email;

-- Step 3: Count how many were created
SELECT 
  COUNT(*) as total_auth_users,
  COUNT(e.id) as total_employees,
  COUNT(*) - COUNT(e.id) as missing_records
FROM auth.users au
LEFT JOIN employees e ON au.id = e.id;

