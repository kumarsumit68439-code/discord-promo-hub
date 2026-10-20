'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { Flag } from 'lucide-react';

export default function ReportButton({ targetId }: { targetId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('Spam / abuse');
  const [details, setDetails] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user || user.id === targetId) return null;

  async function submit() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user!.id,
      reported_id: targetId,
      reason,
      details: details || null,
    });
    setMsg(error ? error.message : 'Report submitted — staff will review');
    setBusy(false);
    if (!error) {
      setOpen(false);
      setDetails('');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-red-400"
      >
        <Flag className="h-3.5 w-3.5" /> Report
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-discord-card p-3">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-discord-darker px-2 py-2 text-sm text-white"
          >
            <option>Spam / abuse</option>
            <option>Harassment</option>
            <option>Scam / fraud</option>
            <option>Inappropriate content</option>
            <option>Other</option>
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Details (optional)"
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-discord-darker px-2 py-2 text-sm text-white"
          />
          <button
            disabled={busy}
            onClick={submit}
            className="w-full rounded-lg bg-red-500/20 py-2 text-sm font-semibold text-red-400"
          >
            Submit report
          </button>
          {msg && <p className="text-xs text-gray-400">{msg}</p>}
        </div>
      )}
    </div>
  );
}
