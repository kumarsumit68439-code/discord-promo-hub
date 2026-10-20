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
} from 'lucide-react';
import { useAuth } from './AuthProvider';

type Props = {
  onPromote?: () => void;
};

export default function SiteHeader({ onPromote }: Props) {
  const path = usePathname();
  const { appUser, isAdmin, loading, signOut } = useAuth();

  const link = (href: string, label: string, icon: React.ReactNode) => {
    const active = path === href || (href !== '/' && path.startsWith(href));
    return (
      <Link
        href={href}
        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
          active
            ? 'bg-discord-blurple/20 text-discord-blurple'
            : 'text-gray-400 hover:bg-discord-card hover:text-white'
        }`}
      >
        {icon}
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-discord-dark/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-discord-blurple">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Promo Hub</span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:order-last">
            {!loading && (
              <>
                {appUser ? (
                  <>
                    <Link
                      href={`/u/${appUser.id}`}
                      className="flex items-center gap-1.5 rounded-lg bg-discord-card px-2 py-1.5"
                      title="My public profile"
                    >
                      {appUser.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={appUser.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-discord-blurple text-[10px] font-bold text-white">
                          {appUser.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="hidden max-w-[80px] truncate text-xs text-gray-200 sm:inline">
                        {appUser.username}
                      </span>
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="rounded-lg p-2 text-gray-400 hover:bg-discord-card hover:text-white"
                      title="Logout"
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
                Promote
              </button>
            )}
          </div>
        </div>

        {/* All pages always visible with labels */}
        <nav className="-mx-1 flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-thin">
          {link('/', 'Promo', <MessageCircle className="h-3.5 w-3.5" />)}
          {link('/users', 'Search', <Search className="h-3.5 w-3.5" />)}
          {link('/users', 'Users', <Users className="h-3.5 w-3.5" />)}
          {link('/messages', 'Messages', <MessagesSquare className="h-3.5 w-3.5" />)}
          {link('/music', 'Music', <Music2 className="h-3.5 w-3.5" />)}
          {link('/profile', 'Profile', <User className="h-3.5 w-3.5" />)}
          {appUser &&
            link(`/u/${appUser.id}`, 'My page', <User className="h-3.5 w-3.5" />)}
          {appUser &&
            link(`/u/${appUser.id}/followers`, 'Followers', <Users className="h-3.5 w-3.5" />)}
          {appUser &&
            link(`/u/${appUser.id}/following`, 'Following', <Users className="h-3.5 w-3.5" />)}
          {isAdmin && link('/admin', 'Admin', <Shield className="h-3.5 w-3.5" />)}
          {!appUser && link('/login', 'Login', <User className="h-3.5 w-3.5" />)}
        </nav>
      </div>
    </header>
  );
}