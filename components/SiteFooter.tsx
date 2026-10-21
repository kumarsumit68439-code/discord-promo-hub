'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function SiteFooter() {
  const { appUser, isAdmin, user } = useAuth();
  if (!user) return null;

  const link = (href: string, label: string) => (
    <Link href={href} className="text-[13px] text-[#949ba4] hover:text-[#dbdee1]">
      {label}
    </Link>
  );

  const id = appUser?.id;

  return (
    <footer className="mt-16 border-t border-white/[0.05] pb-28 pt-8 sm:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:justify-between">
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-[#dbdee1]">Promo Hub</p>
          <p className="max-w-xs text-[12px] leading-relaxed text-[#6d6f78]">
            Servers, websites, bots — jo promote karna hai, yahan daal do.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {link('/', 'Home')}
          {link('/users', 'People')}
          {link('/messages', 'Chat')}
          {link('/hosting', 'Bots')}
          {link('/music', 'Music')}
          {link('/rules', 'Rules')}
          {id && link(`/u/${id}`, 'Profile')}
          {isAdmin && link('/admin', 'Admin')}
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-6xl px-4 text-[11px] text-[#4e5058]">
        Built for Discord communities · not affiliated with Discord Inc.
      </p>
    </footer>
  );
}
