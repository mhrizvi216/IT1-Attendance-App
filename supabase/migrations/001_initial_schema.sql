-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('start_work', 'end_work', 'start_break', 'end_break')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily_summary table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_id ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_timestamp ON attendance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_daily_summary_employee_id ON daily_summary(employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_summary(date);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- Function to calculate daily summary
CREATE OR REPLACE FUNCTION calculate_daily_summary(p_employee_id UUID, p_date DATE)
RETURNS void AS $$
DECLARE
  v_start_work TIMESTAMPTZ;
  v_end_work TIMESTAMPTZ;
  v_total_work_minutes INTEGER := 0;
  v_total_break_minutes INTEGER := 0;
  v_is_late BOOLEAN := false;
  v_under_hours BOOLEAN := false;
  v_status_color TEXT := 'green';
  v_break_start TIMESTAMPTZ;
  v_break_end TIMESTAMPTZ;
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
$$ LANGUAGE plpgsql;

-- Trigger function to recalculate daily summary when attendance logs change
CREATE OR REPLACE FUNCTION trigger_calculate_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_daily_summary(NEW.employee_id, DATE(NEW.timestamp AT TIME ZONE 'UTC'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER attendance_logs_calculate_summary
AFTER INSERT OR UPDATE ON attendance_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_daily_summary();

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Employees can view their own data"
  ON employees FOR SELECT
  USING (auth.uid()::text = id::text);

-- Create security definer function to check admin role (avoids circular RLS reference)
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

CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (auth.uid()::text = id::text);

-- RLS Policies for attendance_logs
CREATE POLICY "Employees can view their own logs"
  ON attendance_logs FOR SELECT
  USING (auth.uid()::text = employee_id::text);

CREATE POLICY "Admins can view all logs"
  ON attendance_logs FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Employees can insert their own logs"
  ON attendance_logs FOR INSERT
  WITH CHECK (auth.uid()::text = employee_id::text);

-- RLS Policies for daily_summary
CREATE POLICY "Employees can view their own summary"
  ON daily_summary FOR SELECT
  USING (auth.uid()::text = employee_id::text);

CREATE POLICY "Admins can view all summaries"
  ON daily_summary FOR SELECT
  USING (is_admin(auth.uid()));

