-- ALTERNATIVE FIX: Use a more permissive policy during signup
-- Only use this if the standard fix doesn't work
-- WARNING: This is less secure but will work for development

-- Drop existing policy
DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;

-- More permissive policy that allows insert if auth.uid() matches OR if id matches auth.uid()
-- This handles edge cases where UUID comparison might fail
CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (
    -- Allow if the id matches the authenticated user's ID
    (auth.uid() IS NOT NULL AND id = auth.uid())
    OR
    -- Fallback: allow if text representation matches
    (auth.uid() IS NOT NULL AND auth.uid()::text = id::text)
  );

-- If still not working, you can temporarily disable RLS for testing:
-- ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
-- (Remember to re-enable it: ALTER TABLE employees ENABLE ROW LEVEL SECURITY;)

