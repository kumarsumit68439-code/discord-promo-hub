export type SiteRole = 'user' | 'helper' | 'developer' | 'moderator' | 'admin' | 'owner';

export const ROLE_ORDER: SiteRole[] = [
  'user',
  'helper',
  'developer',
  'moderator',
  'admin',
  'owner',
];

export const ROLE_LABEL: Record<SiteRole, string> = {
  user: 'User',
  helper: 'Helper',
  developer: 'Developer',
  moderator: 'Moderator',
  admin: 'Admin',
  owner: 'Owner',
};

export const ROLE_COLOR: Record<SiteRole, string> = {
  user: 'text-gray-400 bg-white/5',
  helper: 'text-emerald-400 bg-emerald-500/15',
  developer: 'text-cyan-400 bg-cyan-500/15',
  moderator: 'text-violet-400 bg-violet-500/15',
  admin: 'text-amber-400 bg-amber-500/15',
  owner: 'text-yellow-300 bg-yellow-500/20',
};

export function roleRank(r: SiteRole | string | null | undefined): number {
  const i = ROLE_ORDER.indexOf((r as SiteRole) || 'user');
  return i < 0 ? 0 : i;
}

export function hasMinRole(
  userRole: string | null | undefined,
  min: SiteRole
): boolean {
  return roleRank(userRole) >= roleRank(min);
}

/** Panels visible for this role */
export function panelsForRole(role: string | null | undefined): SiteRole[] {
  const r = (role as SiteRole) || 'user';
  const out: SiteRole[] = [];
  if (hasMinRole(r, 'helper')) out.push('helper');
  if (hasMinRole(r, 'developer')) out.push('developer');
  if (hasMinRole(r, 'moderator')) out.push('moderator');
  if (hasMinRole(r, 'admin')) out.push('admin');
  if (hasMinRole(r, 'owner')) out.push('owner');
  return out;
}

export const PANEL_PATH: Record<Exclude<SiteRole, 'user'>, string> = {
  helper: '/panel/helper',
  developer: '/panel/developer',
  moderator: '/panel/moderator',
  admin: '/admin',
  owner: '/panel/owner',
};
