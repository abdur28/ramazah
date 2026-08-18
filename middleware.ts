import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'auth-token';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/orders', '/admin'];

/**
 * Lightweight middleware - only checks if auth cookie exists
 * Actual verification happens in Server Components/API routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route needs protection
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check if auth cookie exists
  const sessionCookie = request.cookies.get(COOKIE_NAME);

  if (!sessionCookie) {
    // No cookie - redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname); // Save intended destination
    return NextResponse.redirect(loginUrl);
  }

  // Cookie exists - let the request through
  // Actual verification will happen in the page/API route
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/orders/:path*',
    '/admin/:path*',
  ],
};