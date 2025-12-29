# Complete Setup Instructions

Follow these steps to ensure the app works perfectly:

## Step 1: Supabase Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for it to be ready

2. **Run the Complete Setup SQL**
   - Go to Supabase Dashboard → SQL Editor
   - Open `COMPLETE_SETUP.sql` from this project
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)
   - Verify you see "Setup Complete!" message

## Step 2: Configure Environment Variables

1. **Get your Supabase credentials:**
   - Go to Supabase Dashboard → Settings → API
   - Copy your **Project URL**
   - Copy your **anon/public key**

2. **Update `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## Step 3: Disable Email Confirmation (for testing)

1. Go to Supabase Dashboard → Authentication → Settings
2. Find **"Enable email confirmations"**
3. **Disable** it (toggle off)
4. Click **Save**

This allows users to sign up and immediately use the app without email verification.

## Step 4: Test the Application

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Test Sign Up:**
   - Go to http://localhost:3000
   - Click "Sign Up"
   - Enter name, email, and password
   - Should create account and redirect to dashboard

3. **Test Sign In:**
   - Sign out
   - Go to login page
   - Sign in with your credentials
   - Should redirect to dashboard

4. **Test Features:**
   - Click "Start Work" - should log the action
   - Click "Start Break" - should log break
   - Click "End Break" - should end break
   - Click "End Work" - should end work
   - Check Reports page - should show your data
   - Check Admin page (if you're admin) - should show all employees

## Step 5: Create Admin User (Optional)

To create an admin user:

1. Sign up as a regular employee
2. Go to Supabase Dashboard → Table Editor → `employees`
3. Find your user
4. Change `role` from `employee` to `admin`
5. Refresh the app - you should now see Admin Dashboard

Or run this SQL:
```sql
UPDATE employees 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## Troubleshooting

### "Database policy error"
- Run `COMPLETE_SETUP.sql` again
- Make sure all policies were created successfully

### "Email not confirmed"
- Disable email confirmation in Supabase settings (Step 3)

### "401 Unauthorized" or "403 Forbidden"
- Check that RLS policies are created
- Verify `is_admin()` function exists
- Check that INSERT policy for employees exists

### "Failed to create user"
- Check Supabase project is active
- Verify email is unique
- Check browser console for detailed errors

### Daily summaries not updating
- Check that trigger `attendance_logs_calculate_summary` exists
- Verify `calculate_daily_summary()` function exists
- Check Supabase logs for errors

## Verification Checklist

After setup, verify:

- [ ] All tables exist (employees, attendance_logs, daily_summary)
- [ ] RLS is enabled on all tables
- [ ] All policies are created (check pg_policies)
- [ ] `is_admin()` function exists
- [ ] Trigger exists for daily summary calculation
- [ ] Can sign up new users
- [ ] Can sign in existing users
- [ ] Can log attendance actions
- [ ] Daily summaries are generated automatically
- [ ] Reports page shows data
- [ ] Admin can see all employees (if admin user exists)

## Quick Test Script

Run this in Supabase SQL Editor to verify everything:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'attendance_logs', 'daily_summary');

-- Check policies
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('employees', 'attendance_logs', 'daily_summary')
ORDER BY tablename, cmd;

-- Check function
SELECT proname FROM pg_proc WHERE proname = 'is_admin';

-- Check trigger
SELECT tgname FROM pg_trigger WHERE tgname = 'attendance_logs_calculate_summary';
```

All should return results. If any are empty, run `COMPLETE_SETUP.sql` again.

