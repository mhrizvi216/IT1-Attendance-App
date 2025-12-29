# Troubleshooting 401 Errors

## The Problem
You're getting `401 (Unauthorized)` when trying to sign up. This happens because Row Level Security (RLS) is blocking the INSERT into the `employees` table.

## The Solution (3 Steps)

### Step 1: Run the SQL Fix

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open the file `QUICK_FIX.sql` from this project
4. Copy ALL the SQL code
5. Paste it into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 2: Disable Email Confirmation (for testing)

If you're still getting errors, Supabase might require email confirmation:

1. In Supabase Dashboard, go to **Authentication** → **Settings**
2. Find **"Enable email confirmations"**
3. **Disable** it (toggle off)
4. Click **Save**

### Step 3: Verify It Works

1. Clear your browser cache/cookies for localhost:3000
2. Try signing up again
3. Check the browser console - you should see no 401 errors

## Why This Happens

When a user signs up:
1. ✅ Supabase creates the auth user (this works)
2. ❌ App tries to insert into `employees` table (this fails without the policy)
3. The RLS policy ensures users can only create their own employee record

## Alternative: Check Your Policies

If the fix doesn't work, verify your policies exist:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'employees';
```

You should see a policy named `"Users can insert their own employee record"` with `cmd = 'INSERT'`.

## Still Having Issues?

1. **Check Supabase Logs**: Dashboard → Logs → API Logs
2. **Verify RLS is enabled**: The policies only work if RLS is enabled
3. **Check your .env.local**: Make sure Supabase URL and key are correct
4. **Try a different browser**: Sometimes cached auth tokens cause issues

## Common Error Messages

- `401 Unauthorized` → Missing RLS INSERT policy (run QUICK_FIX.sql)
- `Email not confirmed` → Disable email confirmation in Supabase settings
- `Policy violation` → RLS policy exists but has wrong condition
- `User already exists` → Try logging in instead of signing up

