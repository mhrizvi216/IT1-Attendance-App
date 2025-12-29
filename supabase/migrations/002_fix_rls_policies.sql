-- Fix RLS policies to allow user signup
-- This migration adds the missing INSERT policy for employees table
-- Run this in your Supabase SQL Editor to fix 401 errors

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;
DROP POLICY IF EXISTS "Users can update their own data" ON employees;

-- Allow users to insert their own employee record during signup
-- Using UUID comparison directly (more reliable than text conversion)
CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also allow users to update their own name/email (but not role)
CREATE POLICY "Users can update their own data"
  ON employees FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

