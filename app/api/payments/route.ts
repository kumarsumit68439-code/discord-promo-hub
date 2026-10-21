import { NextResponse } from 'next/server';
import { getUser } from '@/lib/serverAuth';
import { getPlan, PLANS } from '@/lib/plans';
import { groqComplete, groqKey, parseJsonLoose } from '@/lib/groq';

export const dynamic = 'force-dynamic';

function looksFake(utr: string) {
  if (/^(\d)\1{11}$/.test(utr)) return true;
  if (utr === '123456789012' || utr === '012345678901' || utr === '987654321098') return true;
  if (/^(\d{2})\1{5}$/.test(utr) || /^(\d{3})\1{3}$/.test(utr) || /^(\d{4})\1{2}$/.test(utr) || /^(\d{6})\1$/.test(utr))
    return true;
  return false;
}

export async function GET(req: Request) {
  const a = await getUser(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  const { data: plan } = await a.db.rpc('get_plan_state', { p_user_id: a.user.id });
  const { data: payments } = await a.db
    .from('payments')
    .select('id,plan,amount,utr,status,ai_verdict,admin_note,created_at,decided_at')
    .eq('user_id', a.user.id)
    .order('created_at', { ascending: false })
    .limit(8);
  return NextResponse.json({ plan, payments: payments || [] });
}

export async function POST(req: Request) {
  const a = await getUser(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  let body: { utr?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const planDef = getPlan(body.plan) || PLANS[0];
  const utr = String(body.utr || '').replace(/\s+/g, '');
  if (!/^\d{12}$/.test(utr)) {
    return NextResponse.json(
      { error: 'Invalid UTR. UPI reference numbers are 12 digits.' },
      { status: 400 }
    );
  }
  if (looksFake(utr)) {
    return NextResponse.json(
      { error: 'This UTR looks invalid. Copy the real reference from your payment app.' },
      { status: 400 }
    );
  }

  const { count: pending } = await a.db
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', a.user.id)
    .eq('status', 'pending');
  if ((pending || 0) >= 3) {
    return NextResponse.json(
      { error: 'You already have 3 payments pending. Wait for admin approval.' },
      { status: 429 }
    );
  }

  const { data: dup } = await a.db
    .from('payments')
    .select('id')
    .eq('utr', utr)
    .neq('status', 'rejected')
    .maybeSingle();
  if (dup) return NextResponse.json({ error: 'This UTR was already submitted.' }, { status: 409 });

  let verdict = 'skipped';
  let reason = '';
  if (groqKey()) {
    const out = await groqComplete({
      json: true,
      maxTokens: 150,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You check Indian UPI UTR numbers for obvious fakes. A real UTR is exactly 12 digits. Mark invalid only for clear dummies. Reply ONLY JSON: {"valid":true|false,"risk":"low|medium|high","reason":"short English reason"}',
        },
        { role: 'user', content: utr },
      ],
    });
    if (out.ok) {
      const j = parseJsonLoose(out.text);
      if (j) {
        const valid = j.valid !== false;
        const risk = String(j.risk || 'low');
        reason = String(j.reason || '').slice(0, 200);
        if (!valid && risk === 'high') {
          return NextResponse.json(
            { error: 'UTR looks invalid' + (reason ? ' (' + reason + ')' : '') + '.' },
            { status: 400 }
          );
        }
        verdict = valid ? 'ok' : 'suspicious';
      } else verdict = 'unknown';
    } else verdict = 'unavailable';
  }

  const { data, error } = await a.db
    .from('payments')
    .insert({
      user_id: a.user.id,
      plan: planDef.id,
      amount: planDef.price,
      utr,
      ai_verdict: verdict,
      ai_reason: reason || null,
    })
    .select('id,status,created_at,plan,amount')
    .single();
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') return NextResponse.json({ error: 'This UTR was already submitted.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, payment: data, aiVerdict: verdict });
}
