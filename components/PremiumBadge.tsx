'use client';

import { Crown } from 'lucide-react';
import { isPremiumActive } from '@/lib/supabase';

type Props = {
  is_premium?: boolean | null;
  premium_until?: string | null;
  size?: 'sm' | 'md';
  showUntil?: boolean;
  className?: string;
};

/** Gold PREMIUM badge — visible to all users on profiles / search. */
export default function PremiumBadge({
  is_premium,
  premium_until,
  size = 'sm',
  showUntil = false,
  className = '',
}: Props) {
  if (!isPremiumActive({ is_premium, premium_until })) return null;

  const until =
    showUntil && premium_until
      ? new Date(premium_until).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null;

  if (size === 'md') {
    return (
      <span
        className={
          'inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-orange-500/25 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.15)] ' +
          className
        }
        title={until ? `Premium until ${until}` : 'Premium member'}
      >
        <Crown className="h-3.5 w-3.5 text-amber-300" />
        Premium
        {until ? <span className="font-normal normal-case text-amber-200/70">· till {until}</span> : null}
      </span>
    );
  }

  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 ' +
        className
      }
      title={until ? `Premium until ${until}` : 'Premium'}
    >
      <Crown className="h-3 w-3" />
      Premium
    </span>
  );
}
