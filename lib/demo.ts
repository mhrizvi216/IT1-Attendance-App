// Demo mode - bypasses authentication
// This creates a mock user for demonstration purposes
// Change this to a real user ID from your database if you want to use dummy data

// Default demo user (no database required)
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000'

// Use this if you've run the dummy data script (John Doe)
// export const DEMO_USER_ID = '11111111-1111-1111-1111-111111111111'

export const demoUser = {
  id: DEMO_USER_ID,
  name: 'Demo User',
  email: 'demo@example.com',
  role: 'employee' as const,
}

