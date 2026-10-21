import { NextResponse } from 'next/server';
import { getUser } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const VOICE = ['join', 'leave', 'mute', 'unmute', 'timer', 'ai_on', 'ai_off'];
const MUSIC = ['music_play', 'music_skip', 'music_pause', 'music_resume', 'music_stop'];
const OTHER = ['announce', 'test_welcome'];

export async function POST(req: Request) {
  const a = await getUser(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });

  let body: {
    botId?: string;
    action?: string;
    channelId?: string;
    minutes?: number | string;
    url?: string;
    title?: string;
    query?: string;
    text?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const botId = String(body.botId || '');
  const action = String(body.action || '');
  if (!/^[0-9a-f-]{36}$/i.test(botId)) {
    return NextResponse.json({ error: 'Invalid bot' }, { status: 400 });
  }

  const { data: bot } = await a.db
    .from('hosted_bots')
    .select('id, modules, config, enabled, status')
    .eq('id', botId)
    .eq('user_id', a.user.id)
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
  if (!bot.enabled) return NextResponse.json({ error: 'Bot is disabled. Turn it on first.' }, { status: 400 });

  const mods: string[] = bot.modules || [];

  if (action === 'test_welcome') {
    if (!mods.includes('welcome')) {
      return NextResponse.json({ error: 'Welcome module not enabled' }, { status: 400 });
    }
    const { data, error } = await a.db.rpc('request_test_welcome', {
      p_user_id: a.user.id,
      p_id: botId,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (data === 'not_found') return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    if (data === 'busy') return NextResponse.json({ error: 'Wait a few seconds' }, { status: 429 });
    return NextResponse.json({ queued: true, kind: 'test_welcome' });
  }

  if (VOICE.includes(action)) {
    if (!mods.includes('voice')) {
      return NextResponse.json({ error: 'Voice module not enabled' }, { status: 400 });
    }
    let channelId: string | null = null;
    if (action === 'join') {
      channelId = String(body.channelId || (bot.config as { voiceChannelId?: string })?.voiceChannelId || '').trim();
      if (!/^\d{15,22}$/.test(channelId)) {
        return NextResponse.json({ error: 'Valid voice channel ID required' }, { status: 400 });
      }
    }
    let minutes: number | null = null;
    if (action === 'join' || action === 'timer') {
      const n = Number(body.minutes);
      if (body.minutes !== undefined && body.minutes !== '' && body.minutes !== null) {
        if (!Number.isFinite(n) || n < 0 || n > 1440) {
          return NextResponse.json({ error: 'Timer 0–1440 minutes' }, { status: 400 });
        }
        minutes = Math.floor(n);
      }
    }
    const { data, error } = await a.db
      .from('voice_commands')
      .insert({
        bot_id: botId,
        user_id: a.user.id,
        action,
        channel_id: channelId,
        minutes,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ queued: true, id: data.id, kind: 'voice' });
  }

  if (MUSIC.includes(action) || OTHER.includes(action)) {
    if (MUSIC.includes(action) && !mods.includes('music')) {
      return NextResponse.json({ error: 'Music module not enabled' }, { status: 400 });
    }
    const channelId =
      String(body.channelId || (bot.config as { musicChannelId?: string })?.musicChannelId || '').trim() || null;
    const payload: Record<string, unknown> = {};
    if (body.url) payload.url = String(body.url).slice(0, 500);
    if (body.title) payload.title = String(body.title).slice(0, 200);
    if (body.query) payload.query = String(body.query).slice(0, 200);
    if (body.text) payload.text = String(body.text).slice(0, 1800);

    if (action === 'music_play' && !payload.url && !payload.query) {
      return NextResponse.json({ error: 'Song URL or query required' }, { status: 400 });
    }

    const { data, error } = await a.db
      .from('bot_commands')
      .insert({
        bot_id: botId,
        user_id: a.user.id,
        action,
        channel_id: channelId,
        payload,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ queued: true, id: data.id, kind: 'bot' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET(req: Request) {
  const a = await getUser(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const botId = url.searchParams.get('botId');
  if (id) {
    const { data: v } = await a.db.from('voice_commands').select('*').eq('id', id).maybeSingle();
    if (v) return NextResponse.json({ command: v });
    const { data: b } = await a.db.from('bot_commands').select('*').eq('id', id).maybeSingle();
    return NextResponse.json({ command: b });
  }
  if (botId) {
    const { data } = await a.db
      .from('hosted_bots')
      .select('voice_state, status, last_error')
      .eq('id', botId)
      .eq('user_id', a.user.id)
      .maybeSingle();
    return NextResponse.json({ bot: data });
  }
  return NextResponse.json({ error: 'id or botId required' }, { status: 400 });
}
