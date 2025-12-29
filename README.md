# Attendance Management System

A comprehensive attendance tracking and reporting system built with Next.js, React, TypeScript, and Supabase.

## Features

- **Authentication**: Email/password authentication with role-based access (Employee/Admin)
- **Time Tracking**: Clock in/out, break tracking with validation
- **Daily Summaries**: Automatic calculation of work hours, break time, lateness, and status
- **Monthly Reports**: Calendar view, charts, and performance indicators
- **Admin Dashboard**: View all employees, filter by date range, comprehensive statistics

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Charts**: Recharts

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Tables

1. **employees**: User accounts with roles
2. **attendance_logs**: All clock in/out and break actions
3. **daily_summary**: Calculated daily statistics per employee

### Automatic Calculations

The database automatically calculates daily summaries via triggers:
- Total work minutes (clock in to clock out minus breaks)
- Total break minutes
- Lateness detection (clock in after 9:00 AM)
- Under hours detection (< 8 hours)
- Status color (green/yellow/red)

## Usage

### For Employees

1. Sign up or log in
2. Use the dashboard to:
   - Start Work
   - Start Break
   - End Break
   - End Work
3. View your monthly reports with charts and calendar

### For Admins

1. Log in with an admin account
2. View all employees and their statistics
3. Filter reports by date range and employee
4. Monitor performance indicators

## Creating an Admin Account

To create an admin account, you can either:

1. Update the role directly in Supabase:
   ```sql
   UPDATE employees SET role = 'admin' WHERE email = 'admin@example.com';
   ```

2. Or modify the signup function to allow admin creation (not recommended for production)

## Project Structure

```
├── app/
│   ├── admin/          # Admin dashboard
│   ├── dashboard/      # Employee dashboard
│   ├── reports/        # Monthly reports
│   ├── login/          # Login page
│   └── signup/         # Signup page
├── components/         # Reusable components
├── lib/                # Utility functions
│   ├── auth.ts         # Authentication helpers
│   ├── attendance.ts   # Attendance logic
│   └── supabase.ts     # Supabase client
└── supabase/
    └── migrations/     # Database migrations
```

## Security

- Row Level Security (RLS) enabled on all tables
- Employees can only view their own data
- Admins can view all data
- Server-side validation for all actions

## License

MIT

