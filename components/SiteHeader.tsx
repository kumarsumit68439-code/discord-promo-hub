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
  Search,
  MessagesSquare,
  Users,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

type Props = {
  onPromote?: () => void;
};

export default function SiteHeader({ onPromote }: Props) {
  const path = usePathname();
  const { appUser, isAdmin, loading, signInDiscord, signOut } = useAuth();

  const link = (href: string, label: string, icon: React.ReactNode) => {
    const active = path === href || (href !== '/' && path.startsWith(href));
    return (
      <Link
        href={href}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition ${
          active
            ? 'bg-discord-blurple/20 text-discord-blurple'
            : 'text-gray-400 hover:bg-discord-card hover:text-white'
        }`}
      >
        {icon}
        <span className="hidden md:inline">{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-discord-dark/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-discord-blurple">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
          </Link>
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {link('/', 'Promo', <MessageCircle className="h-4 w-4" />)}
            {link('/users', 'Users', <Users className="h-4 w-4" />)}
            {link('/messages', 'Chat', <MessagesSquare className="h-4 w-4" />)}
            {link('/music', 'Music', <Music2 className="h-4 w-4" />)}
            {link('/profile', 'Profile', <User className="h-4 w-4" />)}
            {isAdmin && link('/admin', 'Admin', <Shield className="h-4 w-4" />)}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/users"
            className="rounded-lg p-2 text-gray-400 hover:bg-discord-card hover:text-white md:hidden"
          >
            <Search className="h-4 w-4" />
          </Link>
          {!loading && (
            <>
              {appUser ? (
                <>
                  <Link
                    href={`/u/${appUser.id}`}
                    className="hidden items-center gap-2 rounded-lg bg-discord-card px-2 py-1.5 sm:flex"
                  >
                    {appUser.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={appUser.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-discord-blurple text-[10px] font-bold text-white">
                        {appUser.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="max-w-[90px] truncate text-xs text-gray-200">
                      {appUser.username}
                    </span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="rounded-lg p-2 text-gray-400 hover:bg-discord-card hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg border border-white/10 bg-discord-card px-3 py-1.5 text-xs font-medium text-white hover:bg-discord-hover"
                >
                  Login
                </Link>
              )}
            </>
          )}
          {onPromote && (
            <button
              onClick={onPromote}
              className="flex items-center gap-1 rounded-lg bg-discord-blurple px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#4752c4]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Promote</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}