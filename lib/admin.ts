/** Bootstrap owners (always owner even before role column sync) */
export const OWNER_EMAILS = ['sumitjilowa34@gmail.com', 'sumitk5730125@gmail.com'];
export const OWNER_DISCORD_ID = '1487343086198853785';

/** These accounts can NEVER be banned by anyone */
export const PROTECTED_EMAILS = ['sumitjilowa34@gmail.com'];
export const PROTECTED_DISCORD_IDS = ['1487343086198853785'];

export const ADMIN_EMAIL = 'sumitjilowa34@gmail.com';
export const ADMIN_DISCORD_ID = OWNER_DISCORD_ID;

export function isOwnerBootstrap(opts: {
  email?: string | null;
  discordId?: string | null;
}): boolean {
  const email = (opts.email || '').toLowerCase().trim();
  const discordId = (opts.discordId || '').trim();
  return OWNER_EMAILS.includes(email) || discordId === OWNER_DISCORD_ID;
}

export function isProtectedAccount(opts: {
  email?: string | null;
  discordId?: string | null;
}): boolean {
  const email = (opts.email || '').toLowerCase().trim();
  const discordId = (opts.discordId || '').trim();
  return PROTECTED_EMAILS.includes(email) || PROTECTED_DISCORD_IDS.includes(discordId);
}

/** @deprecated use role from profile; kept for bootstrap */
export function isAdminUser(opts: {
  email?: string | null;
  discordId?: string | null;
}): boolean {
  return isOwnerBootstrap(opts);
}

export type BanDuration = '1h' | '2h' | '24h' | 'permanent';

export function banUntilFromDuration(d: BanDuration): {
  ban_until: string | null;
  is_permanent_ban: boolean;
} {
  if (d === 'permanent') return { ban_until: null, is_permanent_ban: true };
  const ms = d === '1h' ? 3600_000 : d === '2h' ? 7200_000 : 24 * 3600_000;
  return {
    ban_until: new Date(Date.now() + ms).toISOString(),
    is_permanent_ban: false,
  };
}

export function isCurrentlyBanned(p: {
  is_banned?: boolean | null;
  is_permanent_ban?: boolean | null;
  ban_until?: string | null;
}): boolean {
  if (!p.is_banned) return false;
  if (p.is_permanent_ban) return true;
  if (!p.ban_until) return true;
  return new Date(p.ban_until).getTime() > Date.now();
}
