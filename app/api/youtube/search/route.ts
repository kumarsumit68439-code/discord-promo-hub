import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const maxResults = Math.min(Number(req.nextUrl.searchParams.get('max') || 12), 25);

  if (!q) {
    return NextResponse.json({ error: 'Missing query q' }, { status: 400 });
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'YOUTUBE_API_KEY not configured on server' },
      { status: 503 }
    );
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('q', q);
  url.searchParams.set('key', key);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'YouTube API error' },
        { status: res.status }
      );
    }

    const items = (data.items || []).map(
      (item: {
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails: { medium?: { url: string }; default?: { url: string } };
          publishedAt: string;
        };
      }) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url ||
          '',
        publishedAt: item.snippet.publishedAt,
      })
    );

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Search failed' },
      { status: 500 }
    );
  }
}