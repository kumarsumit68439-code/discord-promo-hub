import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { isOwnerBootstrap } from '@/lib/admin';

// Server-only helpers for API routes. Needs SUPABASE_SERVICE_ROLE_KEY in the Vercel environment.
export function serviceDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type AuthResult =
  | { ok: true; db: SupabaseClient; user: User }
  | { ok: false; error: string; status: number };

export async function getUser(req: Request): Promise<AuthResult> {
  const db = serviceDb();
  if (!db) return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY Vercel environment variables mein set nahi hai.', status: 500 };
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, error: 'Pehle login karein.', status: 401 };
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return { ok: false, error: 'Session invalid hai, dobara login karein.', status: 401 };
  return { ok: true, db, user: data.user };
}

export async function getAdmin(req: Request): Promise<AuthResult> {
  const a = await getUser(req);
  if (!a.ok) return a;
  const { data: profile } = await a.db.from('profiles').select('role,email,discord_id').eq('id', a.user.id).maybeSingle();
  const roleOk = ['admin', 'acting_owner', 'owner'].includes(String(profile?.role || ''));
  const bootstrap = isOwnerBootstrap({ email: a.user.email || profile?.email, discordId: profile?.discord_id });
  if (!roleOk && !bootstrap) return { ok: false, error: 'Sirf admin ye kar sakta hai.', status: 403 };
  return a;
}
