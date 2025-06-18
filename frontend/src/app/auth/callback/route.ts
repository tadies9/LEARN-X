import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If no next parameter provided, check if user needs onboarding
      if (!next) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Check if user has completed onboarding
          const { data: persona } = await supabase
            .from('user_personas')
            .select('id')
            .eq('user_id', user.id)
            .single();

          next = persona ? '/dashboard' : '/onboarding';
        } else {
          next = '/dashboard';
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
