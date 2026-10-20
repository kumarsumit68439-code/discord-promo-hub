export type SiteRole =
  | 'user'
  | 'staff'
  | 'helper'
  | 'developer'
  | 'moderator'
  | 'admin'
  | 'acting_owner'
  | 'owner';

export const ROLE_ORDER: SiteRole[] = [
  'user',
  'staff',
  'helper',
  'developer',
  'moderator',
  'admin',
  'acting_owner',
  'owner',
];

export const ROLE_LABEL: Record<SiteRole, string> = {
  user: 'User',
  staff: 'Staff',
  helper: 'Helper',
  developer: 'Developer',
  moderator: 'Moderator',
  admin: 'Admin',
  acting_owner: 'Acting Owner',
  owner: 'Owner',
};

export const ROLE_COLOR: Record<SiteRole, string> = {
  user: 'text-gray-400 bg-white/5',
  staff: 'text-sky-400 bg-sky-500/15',
  helper: 'text-emerald-400 bg-emerald-500/15',
  developer: 'text-cyan-400 bg-cyan-500/15',
  moderator: 'text-violet-400 bg-violet-500/15',
  admin: 'text-amber-400 bg-amber-500/15',
  acting_owner: 'text-orange-300 bg-orange-500/20',
  owner: 'text-yellow-300 bg-yellow-500/20',
};

export const ROLE_POWERS: Record<SiteRole, string[]> = {
  user: ['Browse promos', 'Follow / message', 'Report users'],
  staff: ['Scan users', 'View reports', 'Flag issues'],
  helper: ['Ban / unban / block', 'Assign staff role', 'View reports'],
  developer: ['Ban only', 'System status', 'View reports'],
  moderator: ['Ban / unban (temp)', 'View reports'],
  admin: ['Ban / unban / permanent', 'Assign roles (not owner)', 'View reports'],
  acting_owner: [
    'Same as Owner',
    'App lock',
    'Delete accounts',
    'All bans & roles',
  ],
  owner: [
    'Full site control',
    'App lock (users only — staff still in)',
    'Delete accounts',
    'Assign acting owner',
    'All panels',
  ],
};

export function roleRank(r: SiteRole | string | null | undefined): number {
  const i = ROLE_ORDER.indexOf((r as SiteRole) || 'user');
  return i < 0 ? 0 : i;
}

export function hasMinRole(userRole: string | null | undefined, min: SiteRole): boolean {
  // acting_owner ranks with owner for most powers
  const r = userRole === 'acting_owner' ? 'owner' : userRole;
  const m = min === 'acting_owner' ? 'owner' : min;
  if (userRole === 'acting_owner' && min === 'acting_owner') return true;
  if (userRole === 'owner' && min === 'acting_owner') return true;
  return roleRank(r) >= roleRank(m);
}

export function canAssignRoles(role: string | null | undefined): boolean {
  return ['owner', 'acting_owner', 'admin', 'helper'].includes(role || '');
}

export function canBan(role: string | null | undefined): boolean {
  return ['staff', 'helper', 'developer', 'moderator', 'admin', 'acting_owner', 'owner'].includes(
    role || ''
  );
}

export function canUnban(role: string | null | undefined): boolean {
  return ['helper', 'moderator', 'admin', 'acting_owner', 'owner'].includes(role || '');
}

export function canAppLock(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'acting_owner';
}

export function canViewReports(role: string | null | undefined): boolean {
  return ['staff', 'helper', 'developer', 'moderator', 'admin', 'acting_owner', 'owner'].includes(
    role || ''
  );
}

export function isStaffLike(role: string | null | undefined): boolean {
  return canViewReports(role);
}
