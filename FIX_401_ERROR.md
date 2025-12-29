# Fix for 401 Authentication Errors

## Problem
The 401 errors occur because Row Level Security (RLS) policies are blocking user signup. The `employees` table doesn't have an INSERT policy, so new users can't create their employee record.

## Solution

Run this SQL in your Supabase SQL Editor:

```sql
-- Allow users to insert their own employee record during signup
CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (auth.uid()::text = id::text);

-- Also allow users to update their own data (optional but recommended)
CREATE POLICY "Users can update their own data"
  ON employees FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);
```

## Steps to Fix

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Paste the SQL above
5. Click **Run**
6. Try signing up again

## Alternative: Update the Original Migration

If you haven't run the migration yet, the updated `001_initial_schema.sql` file now includes the INSERT policy. You can:
- Drop all existing policies and re-run the migration, OR
- Just run the fix SQL above

## Verify It Works

After running the SQL:
1. Try signing up a new user
2. Check that the user appears in the `employees` table
3. Try logging in with the new credentials

## Additional Notes

- The policy ensures users can only insert records where `id` matches their `auth.uid()`
- This is secure because the auth user ID is set by Supabase and can't be spoofed
- Users can only create their own employee record, not others

