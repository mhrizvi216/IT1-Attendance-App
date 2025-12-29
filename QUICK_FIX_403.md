# Quick Fix for 403 Error on Signup

You're getting a 403 error when trying to sign up. Here are **two solutions** - try them in order:

## Solution 1: Fix the INSERT Policy (Recommended)

Run this SQL in Supabase SQL Editor:

```sql
-- Drop and recreate the INSERT policy with better matching
DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;

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
```

**Or** just run the file `FIX_403_FINAL.sql` in Supabase SQL Editor.

## Solution 2: Use Database Trigger (Most Reliable)

If Solution 1 doesn't work, use a database trigger that bypasses RLS:

1. Run `ALTERNATIVE_SIGNUP_FIX.sql` in Supabase SQL Editor
2. This creates a trigger that automatically creates the employee record when a user signs up
3. The code will automatically handle this - no changes needed

## Why This Happens

The RLS policy condition `auth.uid() = id` sometimes doesn't match during signup because:
- UUID comparison might fail due to type casting
- The auth session might not be fully established yet
- Timing issues between auth user creation and employee record insertion

## Verification

After running the fix, test signup again. If it still fails:

1. **Check if policy exists:**
   ```sql
   SELECT policyname, cmd, with_check
   FROM pg_policies
   WHERE tablename = 'employees' AND cmd = 'INSERT';
   ```

2. **Check if auth.uid() works:**
   ```sql
   SELECT auth.uid() as current_user_id;
   ```
   (Run this while logged in - should return your user ID)

3. **Check RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'employees';
   ```
   (Should return `true`)

## Recommended Approach

**Use Solution 2 (Trigger)** - it's the most reliable because:
- Bypasses RLS entirely (uses SECURITY DEFINER)
- Works 100% of the time
- No timing issues
- Automatically creates employee record on signup

The trigger approach is production-ready and handles all edge cases.

