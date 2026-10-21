import { MessageCircle, LifeBuoy, Ticket, ShieldCheck, Clock3, Mic, ShieldAlert, Trophy, UserPlus, Ban, Sparkles, Users, Music2 } from 'lucide-react';

export const BOT_MODULES = [
  { id: 'welcome', title: 'Welcome Bot', icon: MessageCircle, detail: 'Welcome image + custom message when a member joins, optional auto role, goodbye message. (Free)' },
  { id: 'support', title: 'Support Bot', icon: LifeBuoy, detail: '/help command + auto answers from your FAQ in a support channel. (Free)' },
  { id: 'ticket', title: 'Ticket Bot', icon: Ticket, detail: 'Create ticket button, private channel, close embed (created by / closed by / time taken) + log.' },
  { id: 'security', title: 'Security Anti-Nuke Bot', icon: ShieldCheck, detail: 'Mass channel/role create-delete pe auto Kick/Ban. Log: User Punished + Action + Punishment Type.' },
  { id: 'tokenclaim', title: 'Token Claim / Open Ticket', icon: Ticket, detail: 'Claim ticket → staff issues token → user /claim-token se role. Only admin/owner/staff issue tokens.' },
  { id: 'moderation', title: 'Moderation Bot', icon: Clock3, detail: '/timeout /untimeout /kick /warn /purge + mod log.' },
  { id: 'voice', title: 'Voice Bot (VC + AI)', icon: Mic, detail: 'VC join/leave, mic mute/unmute, 24/7 AFK, timer from website, AI voice conversation.' },
  { id: 'protect', title: 'Server Protection (AI)', icon: ShieldAlert, detail: 'AI live scan: spam/invite, auto delete + timeout, log channel.' },
  { id: 'levels', title: 'Level-up Bot', icon: Trophy, detail: 'Chat + VC se XP, level-up message, top 10 leaderboard.' },
  { id: 'memberadd', title: 'Member Add Bot', icon: UserPlus, detail: '/invite-link aur /send-invite.' },
  { id: 'ban', title: 'Ban Bot', icon: Ban, detail: '/ban and /unban with moderation log.' },
  { id: 'ai', title: 'AI Chat Bot', icon: Sparkles, detail: 'AI channel replies. Needs AI provider key.' },
  { id: 'supporter', title: 'Supporter Bot', icon: Users, detail: '/supporter grant and revoke.' },
  { id: 'music', title: 'Music Bot (YouTube VC)', icon: Music2, detail: '/play /skip /stop /queue — YouTube in voice channel. (Premium)' },
  { id: 'invite', title: 'Invite Tracker', icon: Ticket, detail: '/invites and /invite-leaderboard.' },
] as const;
