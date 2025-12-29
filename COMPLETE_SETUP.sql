-- COMPLETE SETUP SCRIPT FOR ATTENDANCE MANAGEMENT SYSTEM
-- Run this entire script in Supabase SQL Editor to ensure everything works
-- This fixes all RLS policies and ensures the app is fully functional

-- ============================================
-- STEP 1: Ensure all tables exist (from migration)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create employees table if not exists
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attendance_logs table if not exists
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('start_work', 'end_work', 'start_break', 'end_break')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily_summary table if not exists
CREATE TABLE IF NOT EXISTS daily_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_work_minutes INTEGER DEFAULT 0,
  total_break_minutes INTEGER DEFAULT 0,
  is_late BOOLEAN DEFAULT false,
  under_hours BOOLEAN DEFAULT false,
  status_color TEXT DEFAULT 'green' CHECK (status_color IN ('green', 'yellow', 'red')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ============================================
-- STEP 2: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_id ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_timestamp ON attendance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_daily_summary_employee_id ON daily_summary(employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_summary(date);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- ============================================
-- STEP 3: Create helper function for admin check (avoids circular RLS)
-- ============================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE id = user_id
    AND role = 'admin'
  );
END;
$$;

-- ============================================
-- STEP 4: Enable Row Level Security
-- ============================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Drop all existing policies (clean slate)
-- ============================================

-- Drop employees policies
DROP POLICY IF EXISTS "Employees can view their own data" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;
DROP POLICY IF EXISTS "Users can update their own data" ON employees;

-- Drop attendance_logs policies
DROP POLICY IF EXISTS "Employees can view their own logs" ON attendance_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can insert their own logs" ON attendance_logs;

-- Drop daily_summary policies
DROP POLICY IF EXISTS "Employees can view their own summary" ON daily_summary;
DROP POLICY IF EXISTS "Admins can view all summaries" ON daily_summary;

-- ============================================
-- STEP 6: Create RLS Policies for employees
-- ============================================

-- Employees can view their own data
CREATE POLICY "Employees can view their own data"
  ON employees FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all employees
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  USING (is_admin(auth.uid()));

-- Users can insert their own employee record (for signup)
-- Using both UUID and text comparison to ensure it works
CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      id = auth.uid()
      OR
      id::text = auth.uid()::text
    )
  );

-- Users can update their own data (name, email)
CREATE POLICY "Users can update their own data"
  ON employees FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 7: Create RLS Policies for attendance_logs
-- ============================================

-- Employees can view their own logs
CREATE POLICY "Employees can view their own logs"
  ON attendance_logs FOR SELECT
  USING (auth.uid() = employee_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all logs"
  ON attendance_logs FOR SELECT
  USING (is_admin(auth.uid()));

-- Employees can insert their own logs
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

-- ============================================
-- STEP 8: Create RLS Policies for daily_summary
-- ============================================

-- Employees can view their own summary
CREATE POLICY "Employees can view their own summary"
  ON daily_summary FOR SELECT
  USING (auth.uid() = employee_id);

-- Admins can view all summaries
CREATE POLICY "Admins can view all summaries"
  ON daily_summary FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================
-- STEP 9: Create daily summary calculation function
-- ============================================

CREATE OR REPLACE FUNCTION calculate_daily_summary(p_employee_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_work TIMESTAMPTZ;
  v_end_work TIMESTAMPTZ;
  v_total_work_minutes INTEGER := 0;
  v_total_break_minutes INTEGER := 0;
  v_is_late BOOLEAN := false;
  v_under_hours BOOLEAN := false;
  v_status_color TEXT := 'green';
  v_work_minutes INTEGER;
BEGIN
  -- Get start_work and end_work for the day
  SELECT MIN(timestamp) INTO v_start_work
  FROM attendance_logs
  WHERE employee_id = p_employee_id
    AND action_type = 'start_work'
    AND DATE(timestamp AT TIME ZONE 'UTC') = p_date;

  SELECT MAX(timestamp) INTO v_end_work
  FROM attendance_logs
  WHERE employee_id = p_employee_id
    AND action_type = 'end_work'
    AND DATE(timestamp AT TIME ZONE 'UTC') = p_date;

  -- Check if late (clock-in after 9:00 AM)
  IF v_start_work IS NOT NULL THEN
    IF EXTRACT(HOUR FROM v_start_work AT TIME ZONE 'UTC') >= 9 THEN
      v_is_late := true;
    END IF;
  END IF;

  -- Calculate break minutes
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_break.timestamp - start_break.timestamp)) / 60)::INTEGER, 0)
  INTO v_total_break_minutes
  FROM attendance_logs start_break
  JOIN attendance_logs end_break ON start_break.employee_id = end_break.employee_id
    AND end_break.action_type = 'end_break'
    AND end_break.timestamp > start_break.timestamp
    AND DATE(start_break.timestamp AT TIME ZONE 'UTC') = p_date
    AND DATE(end_break.timestamp AT TIME ZONE 'UTC') = p_date
  WHERE start_break.employee_id = p_employee_id
    AND start_break.action_type = 'start_break'
    AND NOT EXISTS (
      SELECT 1 FROM attendance_logs
      WHERE employee_id = start_break.employee_id
        AND action_type = 'end_break'
        AND timestamp > start_break.timestamp
        AND timestamp < end_break.timestamp
    )
    AND NOT EXISTS (
      SELECT 1 FROM attendance_logs
      WHERE employee_id = start_break.employee_id
        AND action_type = 'start_break'
        AND timestamp > start_break.timestamp
        AND timestamp < end_break.timestamp
    );

  -- Calculate total work minutes
  IF v_start_work IS NOT NULL AND v_end_work IS NOT NULL THEN
    v_work_minutes := EXTRACT(EPOCH FROM (v_end_work - v_start_work)) / 60;
    v_total_work_minutes := GREATEST(0, v_work_minutes - v_total_break_minutes);
  ELSIF v_start_work IS NOT NULL THEN
    -- Work started but not ended, calculate until now
    v_work_minutes := EXTRACT(EPOCH FROM (NOW() - v_start_work)) / 60;
    v_total_work_minutes := GREATEST(0, v_work_minutes - v_total_break_minutes);
  END IF;

  -- Check if under hours (less than 8 hours = 480 minutes)
  IF v_total_work_minutes < 480 THEN
    v_under_hours := true;
  END IF;

  -- Determine status color
  IF v_under_hours OR v_total_break_minutes > 60 THEN
    v_status_color := 'red';
  ELSIF v_is_late OR v_total_break_minutes > 30 THEN
    v_status_color := 'yellow';
  ELSE
    v_status_color := 'green';
  END IF;

  -- Insert or update daily summary
  INSERT INTO daily_summary (
    employee_id,
    date,
    total_work_minutes,
    total_break_minutes,
    is_late,
    under_hours,
    status_color,
    updated_at
  )
  VALUES (
    p_employee_id,
    p_date,
    v_total_work_minutes,
    v_total_break_minutes,
    v_is_late,
    v_under_hours,
    v_status_color,
    NOW()
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    total_work_minutes = EXCLUDED.total_work_minutes,
    total_break_minutes = EXCLUDED.total_break_minutes,
    is_late = EXCLUDED.is_late,
    under_hours = EXCLUDED.under_hours,
    status_color = EXCLUDED.status_color,
    updated_at = NOW();
END;
$$;

-- ============================================
-- STEP 10: Create trigger for automatic daily summary calculation
-- ============================================

-- Trigger function
CREATE OR REPLACE FUNCTION trigger_calculate_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_daily_summary(NEW.employee_id, DATE(NEW.timestamp AT TIME ZONE 'UTC'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS attendance_logs_calculate_summary ON attendance_logs;

-- Create trigger
CREATE TRIGGER attendance_logs_calculate_summary
AFTER INSERT OR UPDATE ON attendance_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_daily_summary();

-- ============================================
-- STEP 11: Verify setup
-- ============================================

-- Check tables
SELECT 'Tables created' as status, COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('employees', 'attendance_logs', 'daily_summary');

-- Check policies
SELECT 'Policies created' as status, COUNT(*) as count
FROM pg_policies
WHERE tablename IN ('employees', 'attendance_logs', 'daily_summary');

-- Check function
SELECT 'Function created' as status, COUNT(*) as count
FROM pg_proc
WHERE proname = 'is_admin';

-- Check trigger
SELECT 'Trigger created' as status, COUNT(*) as count
FROM pg_trigger
WHERE tgname = 'attendance_logs_calculate_summary';

-- ============================================
-- STEP 12: Summary
-- ============================================

SELECT 
  'Setup Complete!' as message,
  'All tables, policies, functions, and triggers are ready' as status;

