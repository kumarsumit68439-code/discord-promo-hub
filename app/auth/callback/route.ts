import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key);

    // Exchange happens client-side usually; redirect to home with hash handled by client
    // For PKCE flow with route handler we'd need cookies — fallback to client page
  }

  // Client-side exchange page is more reliable with supabase-js browser client
  return NextResponse.redirect(`${origin}/auth/callback/client?next=${encodeURIComponent(next)}`);
}
