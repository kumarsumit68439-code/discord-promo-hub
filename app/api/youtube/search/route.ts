import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * YouTube Data API v3 search — key from Vercel env only:
 *   YOUTUBE_API_KEY
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
          'YOUTUBE_API_KEY not configured. Vercel → Project → Settings → Environment Variables → add YOUTUBE_API_KEY (Production + Preview) → Redeploy.',
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
      const raw = String(data?.error?.message || '');
      let msg = raw || 'YouTube search failed';

      if (/blocked|V3DataSearchService|not been used|disabled|ACCESS_TOKEN|API key not valid/i.test(raw)) {
        msg =
          'YouTube Search API blocked on this key. Google Cloud → enable YouTube Data API v3, key API restrictions = YouTube Data API v3 (or Don\'t restrict), Application restrictions = None, then save key + Vercel redeploy.';
      } else if (res.status === 403) {
        msg = raw || 'YouTube API 403: key invalid, API not enabled, or quota exceeded.';
      }

      return NextResponse.json(
        { error: msg },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    const items = (data.items || [])
      .map(
        (it: {
          id?: { videoId?: string };
          snippet?: {
            title?: string;
            channelTitle?: string;
            thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
          };
        }) => ({
          id: it.id?.videoId || '',
          title: it.snippet?.title || 'Untitled',
          channel: it.snippet?.channelTitle || '',
          thumbnail:
            it.snippet?.thumbnails?.medium?.url ||
            it.snippet?.thumbnails?.default?.url ||
            (it.id?.videoId ? `https://i.ytimg.com/vi/${it.id.videoId}/mqdefault.jpg` : ''),
        })
      )
      .filter((v: { id: string }) => v.id);

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Search failed' },
      { status: 500 }
    );
  }
}
