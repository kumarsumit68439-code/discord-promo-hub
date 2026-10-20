import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export type AppUser = {
  id: string;
  email?: string;
  username: string;
  avatarUrl: string | null;
  fullName: string | null;
};

/** Extract Discord profile from Supabase user metadata */
export function getDiscordProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): AppUser {
  const meta = user.user_metadata || {};
  const username =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (meta.preferred_username as string) ||
    (meta.custom_claims as { global_name?: string })?.global_name ||
    user.email?.split('@')[0] ||
    'Discord User';

  const avatarUrl =
    (meta.avatar_url as string) ||
    (meta.picture as string) ||
    null;

  return {
    id: user.id,
    email: user.email,
    username,
    avatarUrl,
    fullName: (meta.full_name as string) || null,
  };
}