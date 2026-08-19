import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// Redirect unauthenticated visitors away from these. Real enforcement lives in
// RLS and the server guards in lib/auth/server.ts — this is UX, not security.
const PROTECTED_ROUTES = ['/dashboard', '/admin', '/checkout'];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user && PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Runs on everything except static assets, so the session is always refreshed.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|otf|woff2?)$).*)',
  ],
};
