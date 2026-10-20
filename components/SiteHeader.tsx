'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Music2, User, LogOut, Plus } from 'lucide-react';
import type { AppUser } from '@/lib/supabase';

type Props = {
  profile: AppUser | null;
  authLoading?: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onPromote?: () => void;
};

export default function SiteHeader({ profile, authLoading, onLogin, onLogout, onPromote }: Props) {
  const path = usePathname();

  const link = (href: string, label: string, icon: React.ReactNode) => {
    const active = path === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition ${
          active
            ? 'bg-discord-blurple/20 text-discord-blurple'
            : 'text-gray-400 hover:bg-discord-card hover:text-white'
        }`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-discord-dark/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-discord-blurple">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-white leading-tight">Promo Hub</p>
              <p className="text-[10px] text-gray-400">Discord & Music</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {link('/', 'Promo', <MessageCircle className="h-4 w-4" />)}
            {link('/music', 'Music', <Music2 className="h-4 w-4" />)}
            {link('/profile', 'Profile', <User className="h-4 w-4" />)}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {!authLoading && (
            <>
              {profile ? (
                <>
                  <Link
                    href="/profile"
                    className="hidden items-center gap-2 rounded-lg bg-discord-card px-2 py-1.5 sm:flex"
                  >
                    {profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-discord-blurple text-[10px] font-bold text-white">
                        {profile.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="max-w-[100px] truncate text-xs text-gray-200">
                      {profile.username}
                    </span>
                  </Link>
                  <button
                    onClick={onLogout}
                    className="rounded-lg p-2 text-gray-400 hover:bg-discord-card hover:text-white"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={onLogin}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-discord-card px-3 py-1.5 text-xs font-medium text-white hover:bg-discord-hover"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-discord-blurple" />
                  Login
                </button>
              )}
            </>
          )}
          {onPromote && (
            <button
              onClick={onPromote}
              className="flex items-center gap-1 rounded-lg bg-discord-blurple px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4752c4]"
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