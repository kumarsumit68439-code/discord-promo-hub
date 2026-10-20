'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageCircle,
  Music2,
  User,
  LogOut,
  Plus,
  Shield,
  MessagesSquare,
  Users,
  Search,
  UserCheck,
  Heart,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

type Props = {
  onPromote?: () => void;
};

export default function SiteHeader({ onPromote }: Props) {
  const path = usePathname();
  const { appUser, isAdmin, loading, signOut, user } = useAuth();

  if (!user) return null;

  const active = (href: string) =>
    href === '/'
      ? path === '/'
      : path === href || path.startsWith(href + '/');

  const item = (href: string, label: string, icon: React.ReactNode) => (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
        active(href)
          ? 'bg-discord-blurple text-white'
          : 'bg-discord-card/80 text-gray-300 hover:bg-discord-hover hover:text-white'
      }`}
    >
      {icon}
      {label}
    </Link>
  );

  const myId = appUser?.id;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-discord-dark/95 backdrop-blur-md">
      {/* Row 1: brand + account */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-discord-blurple">
            <MessageCircle className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Promo Hub</p>
            <p className="text-[10px] text-gray-500">Discord + Website ads</p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          {appUser && (
            <Link
              href={`/u/${appUser.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-discord-card px-2 py-1.5"
            >
              {appUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={appUser.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-discord-blurple text-[10px] font-bold text-white">
                  {appUser.username[0]?.toUpperCase()}
                </div>
              )}
              <span className="hidden max-w-[90px] truncate text-xs text-gray-200 sm:inline">
                {appUser.username}
              </span>
            </Link>
          )}
          <button
            onClick={() => signOut()}
            className="rounded-lg p-2 text-gray-400 hover:bg-discord-card hover:text-white"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
          {onPromote && (
            <button
              onClick={onPromote}
              className="flex items-center gap-1 rounded-lg bg-discord-blurple px-2.5 py-1.5 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Promote
            </button>
          )}
        </div>
      </div>

      {/* Row 2: ALL pages visible */}
      <div className="border-t border-white/5 bg-discord-darker/50">
        <div className="mx-auto max-w-6xl px-2 py-2">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Pages · Promo · Search · Profile · Follow · Messages · Admin
          </p>
          <nav className="flex gap-1.5 overflow-x-auto pb-1">
            {item('/', 'Promo', <MessageCircle className="h-3.5 w-3.5" />)}
            {item('/users', 'User Search', <Search className="h-3.5 w-3.5" />)}
            {item('/users', 'Users List', <Users className="h-3.5 w-3.5" />)}
            {myId &&
              item(`/u/${myId}`, 'My Account', <UserCheck className="h-3.5 w-3.5" />)}
            {myId &&
              item(`/u/${myId}/followers`, 'Followers', <Heart className="h-3.5 w-3.5" />)}
            {myId &&
              item(`/u/${myId}/following`, 'Following', <Users className="h-3.5 w-3.5" />)}
            {item('/messages', 'Messages', <MessagesSquare className="h-3.5 w-3.5" />)}
            {item('/music', 'Music', <Music2 className="h-3.5 w-3.5" />)}
            {item('/profile', 'Edit Profile', <User className="h-3.5 w-3.5" />)}
            {isAdmin && item('/admin', 'Admin Panel', <Shield className="h-3.5 w-3.5" />)}
          </nav>
        </div>
      </div>
    </header>
  );
}
