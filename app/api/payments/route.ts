import { NextResponse } from 'next/server';
import { getUser } from '@/lib/serverAuth';
import { PREMIUM_PRICE } from '@/lib/plans';
import { groqComplete, groqKey, parseJsonLoose } from '@/lib/groq';

export const dynamic = 'force-dynamic';

// Obvious dummy UTRs (000000000000, 111111111111, 123456789012 ...).
function looksFake(utr: string) {
  if (/^(\d)\1{11}$/.test(utr)) return true;
  if (utr === '123456789012' || utr === '012345678901' || utr === '987654321098') return true;
  if (/^(\d{2})\1{5}$/.test(utr) || /^(\d{3})\1{3}$/.test(utr) || /^(\d{4})\1{2}$/.test(utr) || /^(\d{6})\1$/.test(utr)) return true;
  return false;
}

// GET: my plan + my latest payments (the checkout page polls this).
export async function GET(req: Request) {
  const a = await getUser(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  const { data: plan } = await a.db.rpc('get_plan_state', { p_user_id: a.user.id });
  const { data: payments } = await a.db
    .from('payments')
    .select('id,plan,amount,utr,status,ai_verdict,admin_note,created_at,decided_at')
    .eq('user_id', a.user.id)
    .order('created_at', { ascending: false })
    .limit(5);
  return NextResponse.json({ plan, payments: payments || [] });
}

// POST: submit a UTR. AI scans it first, then it waits for admin approval.
export async function POST(req: Request) {
  const a = await getUser(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  let body: { utr?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const utr = String(body.utr || '').replace(/\s+/g, '');
  if (!/^\d{12}$/.test(utr)) {
    return NextResponse.json({ error: 'UTR galat hai. UPI UTR / Ref No. 12 digit ka hota hai (sirf numbers).' }, { status: 400 });
  }
  if (looksFake(utr)) {
    return NextResponse.json({ error: 'UTR galat lag raha hai. Payment app se asli UTR number copy karke daalein.' }, { status: 400 });
  }

  const { count: pending } = await a.db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', a.user.id).eq('status', 'pending');
  if ((pending || 0) >= 3) return NextResponse.json({ error: 'Aapke 3 payments pehle se pending hain. Admin approval ka wait karein.' }, { status: 429 });

  const { data: dup } = await a.db.from('payments').select('id').eq('utr', utr).neq('status', 'rejected').maybeSingle();
  if (dup) return NextResponse.json({ error: 'Ye UTR pehle hi submit ho chuka hai.' }, { status: 409 });

  // AI scan (Groq). It only checks the pattern; the real confirmation is the admin approval.
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
            'You check Indian UPI UTR (bank reference) numbers for obvious fakes. A real UTR is exactly 12 digits. Mark it invalid only if it is clearly a dummy: repeating digits, ascending/descending sequences, keyboard patterns. Reply ONLY with JSON: {"valid":true|false,"risk":"low|medium|high","reason":"short Hinglish reason"}',
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
          return NextResponse.json({ error: 'UTR galat lag raha hai' + (reason ? ' (' + reason + ')' : '') + '. Sahi UTR daalein.' }, { status: 400 });
        }
        verdict = valid ? 'ok' : 'suspicious';
      } else verdict = 'unknown';
    } else verdict = 'unavailable';
  }

  const { data, error } = await a.db
    .from('payments')
    .insert({ user_id: a.user.id, plan: 'premium', amount: PREMIUM_PRICE, utr, ai_verdict: verdict, ai_reason: reason || null })
    .select('id,status,created_at')
    .single();
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') return NextResponse.json({ error: 'Ye UTR pehle hi submit ho chuka hai.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, payment: data, aiVerdict: verdict });
}
