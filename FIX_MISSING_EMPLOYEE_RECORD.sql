-- FIX FOR MISSING EMPLOYEE RECORDS
-- If users signed up but employee records weren't created, this will fix it
-- Run this in Supabase SQL Editor

-- Step 1: Create a function to sync auth users with employee records
CREATE OR REPLACE FUNCTION sync_missing_employees()
RETURNS TABLE(
  user_id UUID,
  user_email TEXT,
  created BOOLEAN
) AS $$
DECLARE
  auth_user RECORD;
  employee_exists BOOLEAN;
  user_email TEXT;
  user_name TEXT;
  user_role TEXT;
BEGIN
  -- Loop through all auth users
  FOR auth_user IN 
    SELECT 
      au.id,
      au.email as user_email,
      au.raw_user_meta_data
    FROM auth.users au
  LOOP
    -- Extract values to avoid ambiguity
    user_email := auth_user.user_email;
    user_name := COALESCE(auth_user.raw_user_meta_data->>'name', SPLIT_PART(user_email, '@', 1), 'User');
    user_role := COALESCE((auth_user.raw_user_meta_data->>'role')::text, 'employee');
    
    -- Check if employee record exists
    SELECT EXISTS(SELECT 1 FROM employees WHERE id = auth_user.id) INTO employee_exists;
    
    -- If employee record doesn't exist, create it
    IF NOT employee_exists THEN
      INSERT INTO employees (id, email, name, role)
      VALUES (
        auth_user.id,
        user_email,
        user_name,
        user_role
      )
      ON CONFLICT (id) DO NOTHING;
      
      RETURN QUERY SELECT auth_user.id, user_email, true;
    ELSE
      RETURN QUERY SELECT auth_user.id, user_email, false;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Run the function to create missing employee records
-- This will create employee records for all auth users that don't have one
SELECT * FROM sync_missing_employees();

-- Step 3: Verify all users have employee records
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  e.id as employee_id,
  e.name as employee_name,
  CASE 
    WHEN e.id IS NULL THEN 'MISSING'
    ELSE 'EXISTS'
  END as status
FROM auth.users au
LEFT JOIN employees e ON au.id = e.id
ORDER BY au.email;

-- Step 4: Clean up the function (optional)
-- DROP FUNCTION IF EXISTS sync_missing_employees();

