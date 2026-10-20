'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageCircle,
  Users,
  MessagesSquare,
  Music2,
  User,
  Shield,
  Search,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function BottomNav() {
  const path = usePathname();
  const { user, appUser, isAdmin } = useAuth();

  if (!user || path === '/login' || path.startsWith('/auth')) return null;
  if (path.startsWith('/messages/') && path !== '/messages') return null;

  const items = [
    { href: '/', label: 'Promo', icon: MessageCircle },
    { href: '/users', label: 'Search', icon: Search },
    { href: '/messages', label: 'Chat', icon: MessagesSquare },
    { href: '/music', label: 'Music', icon: Music2 },
    {
      href: appUser ? `/u/${appUser.id}` : '/profile',
      label: 'Profile',
      icon: User,
    },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-discord-dark/95 backdrop-blur-md sm:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-0.5 py-1.5 overflow-x-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/'
              ? path === '/'
              : path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href + label}
              href={href}
              className={`flex min-w-[3.2rem] flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium ${
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
