import { NextResponse, type NextRequest } from 'next/server';

import { updateSupabaseSession } from '@/lib/supabase/middleware';

const CALLBACK_PATH = '/auth/callback';
const LOGIN_PATH = '/login';

// Next.js 16+: "proxy" replaces "middleware".
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);

  const { pathname } = request.nextUrl;

  // Always allow OAuth callback endpoint (it needs to run unauthenticated).
  if (pathname === CALLBACK_PATH) return response;

  // If authenticated, prevent visiting /login.
  if (user && pathname === LOGIN_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Allow /login for unauthenticated users.
  if (!user && pathname === LOGIN_PATH) return response;

  // If not authenticated, force login for any other page
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all pages except Next internals and common static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};


