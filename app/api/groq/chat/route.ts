import { NextResponse } from 'next/server';
import { getUser } from '@/lib/serverAuth';
import { groqComplete, groqModels } from '@/lib/groq';

export const dynamic = 'force-dynamic';

const last = new Map<string, number>();

export async function POST(req: Request) {
  const a = await getUser(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  const now = Date.now();
  if (now - (last.get(a.user.id) || 0) < 1500) return NextResponse.json({ error: 'Thoda ruk kar try karein.' }, { status: 429 });
  last.set(a.user.id, now);

  let body: { model?: string; messages?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const messages = (body.messages || [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!messages.length) return NextResponse.json({ error: 'Message khali hai.' }, { status: 400 });

  const models = await groqModels();
  const model = String(body.model || '');
  if (!models.some((m) => m.id === model && m.kind === 'chat')) return NextResponse.json({ error: 'Ye model available nahi hai.' }, { status: 400 });

  const out = await groqComplete({ model, messages, maxTokens: 1024, temperature: 0.6 });
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status === 429 ? 429 : 502 });
  return NextResponse.json({ reply: out.text });
}
