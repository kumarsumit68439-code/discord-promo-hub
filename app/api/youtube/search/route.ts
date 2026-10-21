import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * YouTube Data API v3 search — key from Vercel env only:
 *   YOUTUBE_API_KEY
 * (not from website / Supabase Vault)
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const max = Math.min(Math.max(Number(req.nextUrl.searchParams.get('max') || 12) || 12, 1), 25);

  if (!q) {
    return NextResponse.json({ error: 'Missing query q' }, { status: 400 });
  }

  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error:
          'YOUTUBE_API_KEY not configured. Add it in Vercel → Project → Settings → Environment Variables (Production + Preview), then Redeploy.',
      },
      { status: 503 }
    );
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(max));
    url.searchParams.set('q', q);
    url.searchParams.set('key', key);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        data?.error?.message ||
        (res.status === 403
          ? 'YouTube API key invalid or YouTube Data API v3 not enabled / quota exceeded'
          : 'YouTube search failed');
      return NextResponse.json({ error: msg }, { status: res.status >= 400 && res.status < 600 ? res.status : 502 });
    }

    const items = (data.items || []).map((it: {
      id?: { videoId?: string };
      snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } };
    }) => ({
      id: it.id?.videoId || '',
      title: it.snippet?.title || 'Untitled',
      channel: it.snippet?.channelTitle || '',
      thumbnail:
        it.snippet?.thumbnails?.medium?.url ||
        it.snippet?.thumbnails?.default?.url ||
        (it.id?.videoId ? `https://i.ytimg.com/vi/${it.id.videoId}/mqdefault.jpg` : ''),
    })).filter((v: { id: string }) => v.id);

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Search failed' },
      { status: 500 }
    );
  }
}
