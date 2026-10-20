'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function SiteFooter() {
  const { appUser, isAdmin } = useAuth();

  const item = (href: string, label: string) => (
    <Link href={href} className="text-sm text-gray-400 transition hover:text-white">
      {label}
    </Link>
  );

  return (
    <footer className="mt-12 border-t border-white/5 bg-discord-dark/50 pb-24 pt-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Promote</p>
          <div className="flex flex-col gap-2">
            {item('/', 'Public listings')}
            {item('/login', 'Login / Sign up')}
            {item('/music', 'YouTube music')}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">People</p>
          <div className="flex flex-col gap-2">
            {item('/users', 'Search users')}
            {appUser ? item(`/u/${appUser.id}`, 'My public profile') : item('/login', 'My profile (login)')}
            {appUser
              ? item(`/u/${appUser.id}/followers`, 'My followers')
              : item('/login', 'Followers (login)')}
            {appUser
              ? item(`/u/${appUser.id}/following`, 'My following')
              : item('/login', 'Following (login)')}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Social</p>
          <div className="flex flex-col gap-2">
            {item('/messages', 'Messages / Chat')}
            {item('/profile', 'Account & Discord check')}
            {item('/users', 'Follow other users')}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">More</p>
          <div className="flex flex-col gap-2">
            {item('/music', 'Music player')}
            {isAdmin && item('/admin', 'Admin panel')}
            <p className="text-xs text-gray-600">All promos are public for everyone</p>
          </div>
        </div>
      </div>
      <p className="mt-10 text-center text-xs text-gray-600">Discord Promo Hub</p>
    </footer>
  );
}