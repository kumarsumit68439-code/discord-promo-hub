'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function SiteFooter() {
  const { appUser, isAdmin, user } = useAuth();
  if (!user) return null;

  const item = (href: string, label: string) => (
    <Link href={href} className="block text-sm text-gray-400 transition hover:text-white">
      {label}
    </Link>
  );

  const id = appUser?.id;

  return (
    <footer className="mt-12 border-t border-white/5 bg-discord-dark/50 pb-28 pt-10 sm:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Promotion
          </p>
          <div className="space-y-2">
            {item('/', 'Promo / Discord & Website ads')}
            {item('/music', 'YouTube Music player')}
            {item('/profile', 'Edit profile · Discord check')}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            User to user
          </p>
          <div className="space-y-2">
            {item('/users', 'Account search')}
            {id && item(`/u/${id}`, 'My account check page')}
            {id && item(`/u/${id}/followers`, 'Followers check')}
            {id && item(`/u/${id}/following`, 'Following check')}
            {item('/messages', 'Messages inbox')}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            More
          </p>
          <div className="space-y-2">
            {item('/users', 'Open any user → Follow / Message')}
            {isAdmin && item('/admin', 'Admin panel (ban / unban)')}
            <p className="text-xs text-gray-600">
              Search → user page = follow + following + message
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
