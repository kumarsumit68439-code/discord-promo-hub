import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/serverAuth';
import { PREMIUM_DAYS } from '@/lib/plans';

export const dynamic = 'force-dynamic';

// GET ?status=pending|approved|rejected|all
export async function GET(req: Request) {
  const a = await getAdmin(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  const status = new URL(req.url).searchParams.get('status') || 'pending';
  let q = a.db.from('payments').select('*').order('created_at', { ascending: false }).limit(100);
  if (['pending', 'approved', 'rejected'].includes(status)) q = q.eq('status', status);
  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = Array.from(new Set((rows || []).map((r) => r.user_id as string)));
  const { data: profs } = ids.length
    ? await a.db.from('profiles').select('id,display_name,discord_username,avatar_url').in('id', ids)
    : { data: [] as Array<{ id: string; display_name: string | null; discord_username: string | null; avatar_url: string | null }> };
  const byId = new Map((profs || []).map((p) => [p.id, p]));
  const payments = (rows || []).map((r) => ({ ...r, profile: byId.get(r.user_id) || null }));
  return NextResponse.json({ payments });
}

// POST { id, decision: 'approve' | 'reject', note? }
export async function POST(req: Request) {
  const a = await getAdmin(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  let body: { id?: string; decision?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const id = String(body.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid payment id' }, { status: 400 });

  if (body.decision === 'approve') {
    const { error } = await a.db.rpc('approve_payment', { p_payment_id: id, p_admin: a.user.id, p_days: PREMIUM_DAYS });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (body.decision === 'reject') {
    const { data, error } = await a.db
      .from('payments')
      .update({ status: 'rejected', admin_note: String(body.note || '').slice(0, 300) || null, decided_at: new Date().toISOString(), decided_by: a.user.id })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data?.length) return NextResponse.json({ error: 'Payment pending nahi hai.' }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown decision' }, { status: 400 });
}
