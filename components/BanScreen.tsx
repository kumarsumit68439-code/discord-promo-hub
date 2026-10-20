'use client';

import { ShieldBan } from 'lucide-react';
import { banLabel } from '@/lib/admin';

type Props = {
  reason?: string | null;
  isPermanent?: boolean | null;
  banUntil?: string | null;
  onLogout: () => void;
  onTryOtherLogin: () => void;
};

export default function BanScreen({ reason, isPermanent, banUntil, onLogout, onTryOtherLogin }: Props) {
  const label = banLabel({
    is_permanent_ban: isPermanent,
    ban_until: banUntil,
  });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0b] px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 ring-2 ring-red-500/40">
        <ShieldBan className="h-10 w-10 text-red-400" />
      </div>
      <h1 className="mb-2 text-2xl font-extrabold text-white sm:text-3xl">Account Banned</h1>
      <p className="mb-1 text-lg font-semibold text-red-400">
        {isPermanent ? 'Banned permanently' : `Banned ${label}`}
      </p>
      {reason && <p className="mt-3 max-w-md text-sm text-gray-400">Reason: {reason}</p>}
      <p className="mt-6 max-w-sm text-sm text-gray-500">
        You cannot use Promo Hub while this ban is active. Try another account if you have one.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onTryOtherLogin}
          className="rounded-lg bg-discord-blurple px-6 py-3 text-sm font-semibold text-white hover:bg-[#4752c4]"
        >
          Login with another method
        </button>
        <button
          onClick={onLogout}
          className="rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/5"
        >
          Logout
        </button>
      </div>
    </div>
  );
}