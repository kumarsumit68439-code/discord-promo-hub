import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The YouTube API key lives in Supabase Vault. This route forwards the search to the
// `youtube-search` Supabase Edge Function, which reads the key server-side.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const max = Math.min(Number(req.nextUrl.searchParams.get('max') || 12), 25);

  if (!q) {
    return NextResponse.json({ error: 'Missing query q' }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anon) {
    return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  }

  try {
    const res = await fetch(base + '/functions/v1/youtube-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: 'Bearer ' + anon },
      body: JSON.stringify({ action: 'search', q, max }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({ error: 'Invalid response from search service' }));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Search failed' },
      { status: 500 }
    );
  }
}
