export type YTVideo = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt?: string;
};

export function parseYouTubeId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1).split('/')[0] || null;
    }
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') {
        return parts[1] || null;
      }
    }
  } catch {
    // plain id?
    if (/^[\w-]{11}$/.test(input.trim())) return input.trim();
  }
  return null;
}