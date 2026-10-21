import { NextResponse } from 'next/server';
import { serviceDb } from '@/lib/serverAuth';
import { groqComplete, groqKey } from '@/lib/groq';

export const dynamic = 'force-dynamic';

const aiCache = new Map<string, { at: number; sig: string; text: string }>();

// Public live leaderboard for one level bot: GET /api/leaderboard?bot=<uuid>
export async function GET(req: Request) {
  const bot = new URL(req.url).searchParams.get('bot') || '';
  if (!/^[0-9a-f-]{36}$/i.test(bot)) return NextResponse.json({ error: 'bot id chahiye' }, { status: 400 });
  const db = serviceDb();
  if (!db) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY set nahi hai.' }, { status: 500 });

  const { data: b } = await db.from('hosted_bots').select('id,bot_name,modules').eq('id', bot).maybeSingle();
  if (!b || !(b.modules || []).includes('levels')) return NextResponse.json({ error: 'Is bot par Level module on nahi hai.' }, { status: 404 });

  const { data: rows } = await db
    .from('bot_levels')
    .select('user_id,username,avatar,xp,level,messages,voice_seconds')
    .eq('bot_id', bot)
    .order('xp', { ascending: false })
    .limit(10);
  const { count } = await db.from('bot_levels').select('user_id', { count: 'exact', head: true }).eq('bot_id', bot);
  const top = rows || [];

  // AI commentary on the top 10 (cached 60s so it stays cheap).
  let ai = '';
  if (groqKey() && top.length) {
    const sig = top.map((r) => r.user_id + ':' + r.level).join(',');
    const c = aiCache.get(bot);
    if (c && Date.now() - c.at < 60000 && c.sig === sig) ai = c.text;
    else {
      const out = await groqComplete({
        maxTokens: 160,
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'Tum ek Discord server ke leaderboard commentator ho. Top members ke baare mein 2 chhote Hinglish sentences likho (hype, emojis ok). Sirf commentary likho.' },
          { role: 'user', content: JSON.stringify(top.slice(0, 10).map((r, i) => ({ rank: i + 1, name: r.username, level: r.level, xp: r.xp }))) },
        ],
      });
      if (out.ok) {
        ai = out.text.trim();
        aiCache.set(bot, { at: Date.now(), sig, text: ai });
      } else if (c) ai = c.text;
    }
  }
  return NextResponse.json({ bot: { name: b.bot_name }, rows: top, tracked: count || 0, ai });
}
