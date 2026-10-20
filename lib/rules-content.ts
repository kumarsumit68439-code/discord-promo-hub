/** Website rules, privacy, safety — used on /rules and apply quiz */

export const SITE_RULES = [
  'Be respectful — no harassment, hate speech, or threats.',
  'No spam, scams, or fake Discord invites / phishing links.',
  'Do not share private data of others (doxxing is banned).',
  'Promo listings must be honest — no malware or illegal content.',
  'One person, one main account — ban evasion is not allowed.',
  'Staff decisions on bans/reports should be respected; appeal via Reports.',
  'NSFW or extreme content is not allowed on this platform.',
  'Protect your account — never share passwords or Discord tokens.',
];

export const PRIVACY_POINTS = [
  'We store your profile (name, email, Discord ID if linked) for login and social features.',
  'Messages are private between users; staff only access reports, not private chats by default.',
  'We do not sell your personal data to third parties.',
  'You may request account deletion via Owner/Admin support.',
  'YouTube API is used only for music search when you use the Music page.',
  'Authentication is handled by Supabase (encrypted sessions).',
];

export const SAFETY_POINTS = [
  'Report suspicious users from their profile page.',
  'Never click unknown Discord invite links from strangers without checking.',
  'Staff and moderators review reports to keep the community safe.',
  'Protected owner accounts cannot be banned by other staff.',
  'App Lock may be used by Owner during emergencies (normal users blocked, staff stay in).',
];

/** 3 questions based on rules — answers reviewed by staff */
export const APPLY_QUESTIONS = [
  {
    id: 'q1',
    question:
      'A user posts a Discord invite that asks others to “verify” by entering their password on an external site. What should you do?',
    hint: 'Think about phishing and reports.',
  },
  {
    id: 'q2',
    question:
      'Someone asks you (as staff) to ban a protected owner account because of a personal argument. What is the correct action?',
    hint: 'Protected accounts and abuse of power.',
  },
  {
    id: 'q3',
    question:
      'Why is privacy important on Promo Hub, and what must you never share about other users?',
    hint: 'Doxxing and personal data.',
  },
] as const;

export const APPLYABLE_ROLES = [
  'staff',
  'helper',
  'developer',
  'moderator',
  'admin',
  'acting_owner',
] as const;

export type ApplyRole = (typeof APPLYABLE_ROLES)[number];
