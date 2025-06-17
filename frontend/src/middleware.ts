import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect routes that require authentication
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if user needs onboarding (for authenticated users accessing dashboard)
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    // Check if user has completed onboarding by looking for persona
    const { data: persona } = await supabase
      .from('personas')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // If no persona found, redirect to onboarding
    if (!persona) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    // Check if user has completed onboarding
    const { data: persona } = await supabase
      .from('user_personas')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Redirect to onboarding if not completed, otherwise to dashboard
    const redirectTo = persona ? '/dashboard' : '/onboarding';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Prevent skipping onboarding - if user is on onboarding page and has already completed it
  if (user && request.nextUrl.pathname === '/onboarding') {
    const { data: persona } = await supabase
      .from('user_personas')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // If persona already exists, redirect to dashboard
    if (persona) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
