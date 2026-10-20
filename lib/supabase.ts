import { createClient } from '@supabase/supabase-js';
import type { SiteRole } from './roles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export type Listing = {
  id: string;
  title: string;
  description: string | null;
  type: 'discord' | 'website';
  url: string;
  image_url: string | null;
  tags: string[];
  created_at: string;
  is_active: boolean;
  user_id: string | null;
  discord_username: string | null;
  discord_avatar: string | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  discord_id: string | null;
  discord_username: string | null;
  avatar_url: string | null;
  email: string | null;
  role?: SiteRole | string | null;
  badges?: string[] | null;
  is_verified?: boolean | null;
  is_banned: boolean | null;
  is_permanent_ban: boolean | null;
  ban_until: string | null;
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AppUser = {
  id: string;
  email?: string;
  username: string;
  avatarUrl: string | null;
  fullName: string | null;
  discordId: string | null;
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
};

export function getDiscordProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ provider: string; id: string; identity_data?: Record<string, unknown> }>;
}): AppUser {
  const meta = user.user_metadata || {};
  const discordIdentity = user.identities?.find((i) => i.provider === 'discord');
  const identityData = discordIdentity?.identity_data || {};

  const username =
    (meta.custom_claims as { global_name?: string })?.global_name ||
    (meta.full_name as string) ||
    (meta.name as string) ||
    (meta.preferred_username as string) ||
    (identityData.full_name as string) ||
    (identityData.name as string) ||
    user.email?.split('@')[0] ||
    'User';

  const avatarUrl =
    (meta.avatar_url as string) ||
    (meta.picture as string) ||
    (identityData.avatar_url as string) ||
    null;

  const discordId =
    (meta.provider_id as string) ||
    discordIdentity?.id ||
    (identityData.sub as string) ||
    (identityData.provider_id as string) ||
    null;

  return {
    id: user.id,
    email: user.email,
    username,
    avatarUrl,
    fullName: (meta.full_name as string) || null,
    discordId,
  };
}

export async function ensureProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ provider: string; id: string; identity_data?: Record<string, unknown> }>;
}) {
  const au = getDiscordProfile(user);
  const { data: existing } = await supabase
    .from('profiles')
    .select('display_name, bio, role')
    .eq('id', user.id)
    .maybeSingle();

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      display_name: existing?.display_name || au.username,
      bio: existing?.bio ?? null,
      discord_username: au.username,
      avatar_url: au.avatarUrl,
      discord_id: au.discordId,
      email: user.email || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) console.error('ensureProfile', error.message);
}
