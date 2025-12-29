# Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create account at [supabase.com](https://supabase.com)
   - Create a new project
   - Go to SQL Editor
   - Run the migration: `supabase/migrations/001_initial_schema.sql`
   - Copy your project URL and anon key from Settings > API

3. **Configure environment:**
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials

4. **Run the app:**
   ```bash
   npm run dev
   ```

## Creating Your First Admin User

After running the migration, you need to create an admin user. Here are two methods:

### Method 1: Via Supabase Dashboard (Recommended)

1. Sign up a regular user through the app (at `/signup`)
2. Go to Supabase Dashboard > Table Editor > `employees`
3. Find your user and change the `role` field from `employee` to `admin`

### Method 2: Via SQL

```sql
-- First, sign up through the app, then run:
UPDATE employees 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## Database Functions

The migration includes:
- `calculate_daily_summary()` - Calculates daily statistics
- Trigger `attendance_logs_calculate_summary` - Automatically updates summaries when logs change

## Row Level Security

RLS is enabled on all tables:
- Employees can only see their own data
- Admins can see all data
- Policies are enforced at the database level

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "Failed to create user"
- Check that the email is unique
- Verify Supabase project is active
- Check browser console for detailed errors

### Daily summaries not updating
- The trigger should run automatically
- You can manually trigger: `SELECT calculate_daily_summary('employee-id', '2024-01-01');`
- Check Supabase logs for trigger errors

