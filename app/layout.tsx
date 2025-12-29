import type { Metadata } from 'next'
import './globals.css'
import { UserProvider } from '@/lib/user-context'

export const metadata: Metadata = {
  title: 'Attendance Management System',
  description: 'Employee attendance tracking and reporting system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  )
}

