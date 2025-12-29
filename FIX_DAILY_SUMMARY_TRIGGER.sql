-- FIX FOR 403 ERROR ON DAILY_SUMMARY (Trigger Issue)
-- The trigger that creates daily_summary is being blocked by RLS
-- This makes the function SECURITY DEFINER so it bypasses RLS
-- Run this in Supabase SQL Editor

-- Step 1: Recreate calculate_daily_summary function with SECURITY DEFINER
-- This allows the function to bypass RLS when inserting/updating daily_summary
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
  -- This will bypass RLS because function is SECURITY DEFINER
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

-- Step 2: Verify the function was updated
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'calculate_daily_summary';

-- Should return: is_security_definer = true

-- Step 3: Test the function (optional)
-- SELECT calculate_daily_summary('your-user-id'::uuid, CURRENT_DATE);

