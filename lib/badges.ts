/** Staff-grantable badges shown on profiles */
export const BADGE_OPTIONS = [
  { id: 'verified', emoji: '✅', label: 'Verified' },
  { id: 'staff', emoji: '🛡️', label: 'Staff' },
  { id: 'helper', emoji: '🤝', label: 'Helper' },
  { id: 'dev', emoji: '⚡', label: 'Developer' },
  { id: 'mod', emoji: '⚜️', label: 'Moderator' },
  { id: 'admin', emoji: '👑', label: 'Admin' },
  { id: 'owner', emoji: '👑', label: 'Owner' },
  { id: 'acting', emoji: '⭐', label: 'Acting Owner' },
  { id: 'og', emoji: '🔥', label: 'OG' },
  { id: 'trusted', emoji: '💫', label: 'Trusted' },
  { id: 'supporter', emoji: '❤️', label: 'Supporter' },
  { id: 'creator', emoji: '🎨', label: 'Creator' },
  { id: 'music', emoji: '🎵', label: 'Music' },
  { id: 'promo', emoji: '📢', label: 'Promo King' },
  { id: 'safe', emoji: '🍀', label: 'Safe User' },
  { id: 'vip', emoji: '💎', label: 'VIP' },
] as const;

export type BadgeId = (typeof BADGE_OPTIONS)[number]['id'];

export function badgeEmoji(id: string): string {
  return BADGE_OPTIONS.find((b) => b.id === id)?.emoji || '🏷️';
}

export function badgeLabel(id: string): string {
  return BADGE_OPTIONS.find((b) => b.id === id)?.label || id;
}
