'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageCircle,
  MessagesSquare,
  Music2,
  User,
  Shield,
  Search,
  Crown,
  Wrench,
  Code2,
  HeartHandshake,
  Flag,
  ClipboardList,
  Star,
  BookOpen,
  ClipboardCheck,
  Bot,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function BottomNav() {
  const path = usePathname();
  const { user, appUser, role, isAdmin, isStaffLike } = useAuth();

  if (!user || path === '/login' || path.startsWith('/auth')) return null;
  if (path.startsWith('/messages/') && path !== '/messages') return null;

  const items: { href: string; label: string; icon: typeof User }[] = [
    { href: '/', label: 'Promo', icon: MessageCircle },
    { href: '/users', label: 'Search', icon: Search },
    { href: '/messages', label: 'Chat', icon: MessagesSquare },
    { href: '/music', label: 'Music', icon: Music2 },
    { href: '/hosting', label: 'Bots', icon: Bot },
    { href: '/rules', label: 'Rules', icon: BookOpen },
    {
      href: appUser ? `/u/${appUser.id}` : '/profile',
      label: 'Profile',
      icon: User,
    },
  ];

  if (isStaffLike) {
    items.push({ href: '/panel/applications', label: 'Apply✓', icon: ClipboardCheck });
    items.push({ href: '/panel/reports', label: 'Reports', icon: Flag });
  }
  // Role panels: only the exact role sees its own panel outside.
  // Admin+ can open all of them from inside the Admin Panel.
  if (role === 'staff') items.push({ href: '/panel/staff', label: 'Staff', icon: ClipboardList });
  if (role === 'helper') items.push({ href: '/panel/helper', label: 'Helper', icon: HeartHandshake });
  if (role === 'developer') items.push({ href: '/panel/developer', label: 'Dev', icon: Code2 });
  if (role === 'moderator') items.push({ href: '/panel/moderator', label: 'Mod', icon: Wrench });
  if (isAdmin) items.push({ href: '/admin', label: 'Admin', icon: Shield });
  if (role === 'acting_owner')
    items.push({ href: '/panel/acting-owner', label: 'A.Owner', icon: Star });
  if (role === 'owner') items.push({ href: '/panel/owner', label: 'Owner', icon: Crown });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-discord-dark/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around overflow-x-auto px-0.5 py-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href + label}
              href={href}
              className={`flex min-w-[3rem] flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium ${
                active ? 'text-discord-blurple' : 'text-gray-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
