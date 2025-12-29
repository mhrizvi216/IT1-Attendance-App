# Fix for 401 Error During Signup

## The Problem

You're seeing this error when trying to sign up:
```
POST https://your-project.supabase.co/rest/v1/employees 401 (Unauthorized)
```

This happens because **Row Level Security (RLS)** is blocking the INSERT into the `employees` table.

## The Solution

You need to create an RLS policy that allows users to insert their own employee record during signup.

### Quick Fix (Recommended)

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste this SQL:

```sql
-- Allow users to insert their own employee record during signup
DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;

CREATE POLICY "Users can insert their own employee record"
  ON employees FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (auth.uid()::text = id::text OR auth.uid() = id)
  );
```

4. Click **Run**
5. Try signing up again

### Alternative: Use the Project's Fix File

The project includes a `QUICK_FIX.sql` file with the complete fix:

1. Open `QUICK_FIX.sql` in this project
2. Copy all the SQL code
3. Paste it into Supabase SQL Editor
4. Run it

## Why This Happens

When a user signs up:
1. ✅ Supabase creates the auth user (works fine)
2. ❌ App tries to insert into `employees` table (blocked by RLS)
3. Without the INSERT policy, RLS blocks the operation → 401 error

## Verification

After running the SQL, verify the policy exists:

```sql
SELECT policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'employees' AND cmd = 'INSERT';
```

You should see a policy named `"Users can insert their own employee record"`.

## What the Code Does

The app now:
- ✅ Detects 401/403 policy errors gracefully
- ✅ Shows helpful error messages if policy is missing
- ✅ Tries to work around missing policies (checks for triggers)
- ✅ Provides clear instructions on what to do

## Still Getting 401?

If you still see 401 errors after running the SQL:

1. **Check RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'employees';
   ```
   Should return `true`

2. **Check auth.uid() works:**
   ```sql
   SELECT auth.uid() as current_user_id;
   ```
   (Run this while logged in - should return your user ID)

3. **Try the alternative trigger approach:**
   - Run `ALTERNATIVE_SIGNUP_FIX.sql` instead
   - This uses a database trigger that bypasses RLS

## Note About Console Errors

You may still see the 401 error in the browser console - this is the network request being logged before our code can handle it. The app will:
- Catch the error
- Show a helpful message to the user
- Guide you to fix the RLS policy

The console error is **expected** until you run the SQL fix. Once the policy is in place, signup will work smoothly! 🎉

