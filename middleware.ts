// Middleware for basic route protection
// Authentication is handled client-side in each page component
// This middleware can be extended for additional server-side checks if needed

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // All authentication checks are done client-side in page components
  // This allows for better error handling and user experience
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

