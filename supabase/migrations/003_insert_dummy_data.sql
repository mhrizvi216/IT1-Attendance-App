-- DUMMY DATA SCRIPT
-- This script creates dummy employees and sample attendance data for testing
-- Run this in Supabase SQL Editor after setting up your database

-- First, disable RLS temporarily to insert data (or use service role key)
-- ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_summary DISABLE ROW LEVEL SECURITY;

-- Insert dummy employees
INSERT INTO employees (id, name, email, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'John Doe', 'john.doe@example.com', 'employee'),
  ('22222222-2222-2222-2222-222222222222', 'Jane Smith', 'jane.smith@example.com', 'employee'),
  ('33333333-3333-3333-3333-333333333333', 'Bob Johnson', 'bob.johnson@example.com', 'employee'),
  ('44444444-4444-4444-4444-444444444444', 'Alice Williams', 'alice.williams@example.com', 'admin'),
  ('55555555-5555-5555-5555-555555555555', 'Charlie Brown', 'charlie.brown@example.com', 'employee')
ON CONFLICT (id) DO NOTHING;

-- Insert attendance logs for today (John Doe)
-- Assuming today is the current date
DO $$
DECLARE
  today_date DATE := CURRENT_DATE;
  today_start TIMESTAMPTZ := today_date::timestamp + '08:00:00'::time;
  today_break_start TIMESTAMPTZ := today_date::timestamp + '12:00:00'::time;
  today_break_end TIMESTAMPTZ := today_date::timestamp + '12:30:00'::time;
  today_end TIMESTAMPTZ := today_date::timestamp + '17:00:00'::time;
  john_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- John's logs for today
  INSERT INTO attendance_logs (employee_id, action_type, timestamp) VALUES
    (john_id, 'start_work', today_start),
    (john_id, 'start_break', today_break_start),
    (john_id, 'end_break', today_break_end),
    (john_id, 'end_work', today_end)
  ON CONFLICT DO NOTHING;
END $$;

-- Insert attendance logs for yesterday (John Doe)
DO $$
DECLARE
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  yesterday_start TIMESTAMPTZ := yesterday_date::timestamp + '09:15:00'::time; -- Late
  yesterday_break_start TIMESTAMPTZ := yesterday_date::timestamp + '13:00:00'::time;
  yesterday_break_end TIMESTAMPTZ := yesterday_date::timestamp + '13:45:00'::time;
  yesterday_end TIMESTAMPTZ := yesterday_date::timestamp + '17:30:00'::time;
  john_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  INSERT INTO attendance_logs (employee_id, action_type, timestamp) VALUES
    (john_id, 'start_work', yesterday_start),
    (john_id, 'start_break', yesterday_break_start),
    (john_id, 'end_break', yesterday_break_end),
    (john_id, 'end_work', yesterday_end)
  ON CONFLICT DO NOTHING;
END $$;

-- Insert attendance logs for Jane (today)
DO $$
DECLARE
  today_date DATE := CURRENT_DATE;
  today_start TIMESTAMPTZ := today_date::timestamp + '08:30:00'::time;
  today_break_start TIMESTAMPTZ := today_date::timestamp + '12:15:00'::time;
  today_break_end TIMESTAMPTZ := today_date::timestamp + '12:45:00'::time;
  today_end TIMESTAMPTZ := today_date::timestamp + '16:45:00'::time; -- Under hours
  jane_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  INSERT INTO attendance_logs (employee_id, action_type, timestamp) VALUES
    (jane_id, 'start_work', today_start),
    (jane_id, 'start_break', today_break_start),
    (jane_id, 'end_break', today_break_end),
    (jane_id, 'end_work', today_end)
  ON CONFLICT DO NOTHING;
END $$;

-- Insert attendance logs for Bob (today - currently working)
DO $$
DECLARE
  today_date DATE := CURRENT_DATE;
  today_start TIMESTAMPTZ := today_date::timestamp + '08:00:00'::time;
  today_break_start TIMESTAMPTZ := today_date::timestamp + '12:00:00'::time;
  today_break_end TIMESTAMPTZ := today_date::timestamp + '12:30:00'::time;
  bob_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  INSERT INTO attendance_logs (employee_id, action_type, timestamp) VALUES
    (bob_id, 'start_work', today_start),
    (bob_id, 'start_break', today_break_start),
    (bob_id, 'end_break', today_break_end)
  -- Note: Bob hasn't ended work yet (still working)
  ON CONFLICT DO NOTHING;
END $$;

-- Insert attendance logs for last 7 days (John Doe) - for reports view
DO $$
DECLARE
  day_offset INTEGER;
  log_date DATE;
  start_time TIMESTAMPTZ;
  break_start TIMESTAMPTZ;
  break_end TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  john_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  FOR day_offset IN 0..6 LOOP
    log_date := CURRENT_DATE - (day_offset || ' days')::INTERVAL;
    start_time := log_date::timestamp + (CASE WHEN day_offset = 1 THEN '09:15:00' ELSE '08:00:00' END)::time;
    break_start := log_date::timestamp + '12:00:00'::time;
    break_end := log_date::timestamp + '12:30:00'::time;
    end_time := log_date::timestamp + '17:00:00'::time;
    
    INSERT INTO attendance_logs (employee_id, action_type, timestamp) VALUES
      (john_id, 'start_work', start_time),
      (john_id, 'start_break', break_start),
      (john_id, 'end_break', break_end),
      (john_id, 'end_work', end_time)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Re-enable RLS after inserting data
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;

-- Verify the data was inserted
SELECT 
  e.name,
  e.email,
  e.role,
  COUNT(al.id) as total_logs,
  MAX(al.timestamp) as last_activity
FROM employees e
LEFT JOIN attendance_logs al ON e.id = al.employee_id
GROUP BY e.id, e.name, e.email, e.role
ORDER BY e.name;

