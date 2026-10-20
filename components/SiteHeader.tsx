'use client';

import Link from 'next/link';
import { MessageCircle, LogOut, Plus } from 'lucide-react';
import { useAuth } from './AuthProvider';

type Props = {
  onPromote?: () => void;
};

export default function SiteHeader({ onPromote }: Props) {
  const { appUser, loading, signOut, user } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-discord-dark/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5">
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
          {!loading && (
            <button
              onClick={() => signOut()}
              className="rounded-lg p-2 text-gray-400 hover:bg-discord-card hover:text-white"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
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
    </header>
  );
}
