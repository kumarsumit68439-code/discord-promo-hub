import { NextResponse } from 'next/server';
import { getUser } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const ACTIONS = ['join', 'leave', 'mute', 'unmute', 'timer', 'ai_on', 'ai_off'];

// POST { botId, action, channelId?, minutes? } -> queued for the 24/7 worker.
export async function POST(req: Request) {
  const a = await getUser(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  let body: { botId?: string; action?: string; channelId?: string; minutes?: number | string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const botId = String(body.botId || '');
  const action = String(body.action || '');
  if (!/^[0-9a-f-]{36}$/i.test(botId) || !ACTIONS.includes(action)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { data: bot } = await a.db.from('hosted_bots').select('id,modules').eq('id', botId).eq('user_id', a.user.id).maybeSingle();
  if (!bot) return NextResponse.json({ error: 'Bot nahi mila.' }, { status: 404 });
  if (!(bot.modules || []).includes('voice')) return NextResponse.json({ error: 'Is bot par Voice module on nahi hai.' }, { status: 400 });
  const { data: plan } = await a.db.rpc('get_plan_state', { p_user_id: a.user.id });
  if (!plan?.premium) return NextResponse.json({ error: 'Voice bot Premium plan mein hai.' }, { status: 402 });

  let channelId: string | null = null;
  if (action === 'join') {
    channelId = String(body.channelId || '').trim();
    if (!/^\d{15,22}$/.test(channelId)) return NextResponse.json({ error: 'Valid Voice Channel ID daalein.' }, { status: 400 });
  }
  let minutes: number | null = null;
  if (action === 'join' || action === 'timer') {
    const n = Number(body.minutes);
    if (body.minutes !== undefined && body.minutes !== '' && body.minutes !== null) {
      if (!Number.isFinite(n) || n < 0 || n > 1440) return NextResponse.json({ error: 'Timer 0 se 1440 minute ke beech hona chahiye (0 = hamesha AFK).' }, { status: 400 });
      minutes = Math.floor(n);
    }
  }

  const { count } = await a.db.from('voice_commands').select('id', { count: 'exact', head: true }).eq('bot_id', botId).eq('status', 'pending');
  if ((count || 0) >= 5) return NextResponse.json({ error: 'Bahut commands pending hain, thoda ruk kar try karein.' }, { status: 429 });

  const { data, error } = await a.db
    .from('voice_commands')
    .insert({ bot_id: botId, user_id: a.user.id, action, channel_id: channelId, minutes })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ queued: true, id: data.id });
}

// GET ?botId=&id= -> result of one queued command.
export async function GET(req: Request) {
  const a = await getUser(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  const sp = new URL(req.url).searchParams;
  const botId = sp.get('botId') || '';
  const id = sp.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(botId) || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { data } = await a.db
    .from('voice_commands')
    .select('id,action,status,result')
    .eq('id', id)
    .eq('bot_id', botId)
    .eq('user_id', a.user.id)
    .maybeSingle();
  return NextResponse.json({ command: data || null });
}
