import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/db/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Use the existing updateSession function which handles auth checks
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 