'use client';

import Link from 'next/link';
import { LogOut, Plus } from 'lucide-react';
import { useAuth } from './AuthProvider';

type Props = {
  onPromote?: () => void;
};

export default function SiteHeader({ onPromote }: Props) {
  const { appUser, loading, signOut, user } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#1e1f22]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865f2] text-[13px] font-bold text-white">
            P
          </div>
          <span className="text-[15px] font-semibold text-white">Promo Hub</span>
        </Link>

        <div className="flex items-center gap-1">
          {appUser && (
            <Link
              href={`/u/${appUser.id}`}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-white/[0.04]"
            >
              {appUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={appUser.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5865f2] text-[11px] font-semibold text-white">
                  {appUser.username[0]?.toUpperCase()}
                </div>
              )}
              <span className="hidden max-w-[100px] truncate text-[13px] text-[#b5bac1] sm:inline">
                {appUser.username}
              </span>
            </Link>
          )}
          {!loading && (
            <button
              onClick={() => signOut()}
              className="rounded-md p-2 text-[#b5bac1] hover:bg-white/[0.04] hover:text-white"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
          {onPromote && (
            <button
              onClick={onPromote}
              className="ml-0.5 flex items-center gap-1 rounded-md bg-[#5865f2] px-2.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#4752c4]"
            >
              <Plus className="h-3.5 w-3.5" />
              Post
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
