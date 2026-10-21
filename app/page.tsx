'use client';

import { useEffect, useState } from 'react';
import { supabase, Listing } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useAuth } from '@/components/AuthProvider';
import {
  Globe,
  ExternalLink,
  Search,
  X,
  Server,
  Link2,
  Trash2,
  UserCircle2,
  Star,
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { user, appUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [premiumIds, setPremiumIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'discord' | 'website'>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'discord' as 'discord' | 'website',
    url: '',
    tags: '',
  });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (!error && data) setListings(data);
    const { data: prem } = await supabase.rpc('premium_user_ids');
    setPremiumIds(new Set(((prem || []) as Array<{ user_id: string }>).map((r) => r.user_id)));
    setLoading(false);
  }

  function openPromote() {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !appUser) {
      window.location.href = '/login';
      return;
    }
    if (!form.title.trim() || !form.url.trim()) return;
    setSubmitting(true);
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const { error } = await supabase.from('listings').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      url: form.url.trim(),
      tags,
      user_id: user.id,
      discord_username: appUser.username,
      discord_avatar: appUser.avatarUrl,
    });
    setSubmitting(false);
    if (!error) {
      setSuccess(true);
      setForm({ title: '', description: '', type: 'discord', url: '', tags: '' });
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
        fetchListings();
      }, 1200);
    } else alert(error.message);
  }

  async function deleteListing(id: string) {
    if (!confirm('Delete this listing?')) return;
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (!error) setListings((prev) => prev.filter((l) => l.id !== id));
    else alert(error.message);
  }

  const isPremium = (l: Listing) => Boolean(l.user_id && premiumIds.has(l.user_id));

  const filtered = listings
    .filter((l) => {
      const matchType = filter === 'all' || l.type === filter;
      const matchSearch =
        !search ||
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        (l.description || '').toLowerCase().includes(search.toLowerCase()) ||
        l.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      return matchType && matchSearch;
    })
    .sort((a, b) => Number(isPremium(b)) - Number(isPremium(a)));

  return (
    <div className="min-h-screen bg-[#17181c] pb-20 sm:pb-8">
      <SiteHeader onPromote={openPromote} />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Listings</h1>
            <p className="text-[12px] text-[#6d6f78]">Public Discord & website promos</p>
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6d6f78]" />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-white/[0.06] bg-[#1e1f22] py-2 pl-8 pr-3 text-[13px] text-white outline-none placeholder:text-[#6d6f78] focus:border-[#5865f2]/50"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'discord', 'website'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium ${
                    filter === f
                      ? 'bg-[#5865f2] text-white'
                      : 'bg-[#2b2d31] text-[#b5bac1] hover:bg-[#35373c]'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'discord' ? 'Discord' : 'Sites'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-[#2b2d31]/80" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 py-14 text-center">
            <p className="text-[14px] text-[#949ba4]">Abhi koi listing nahi</p>
            <button
              onClick={openPromote}
              className="mt-3 rounded-md bg-[#5865f2] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4752c4]"
            >
              {user ? 'Pehli post daalo' : 'Login karke post karo'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((listing) => (
              <div
                key={listing.id}
                className={`relative flex gap-3 rounded-lg border bg-[#2b2d31] p-3.5 transition hover:border-white/10 ${
                  isPremium(listing)
                    ? 'border-amber-400/25'
                    : 'border-white/[0.04]'
                }`}
              >
                {isPremium(listing) && (
                  <span className="absolute -top-2 left-3 inline-flex items-center gap-0.5 rounded bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold text-black">
                    <Star className="h-2.5 w-2.5" /> boost
                  </span>
                )}
                {user && listing.user_id === user.id && (
                  <button
                    type="button"
                    onClick={() => deleteListing(listing.id)}
                    className="absolute right-2 top-2 text-[#6d6f78] hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                    listing.type === 'discord'
                      ? 'bg-[#5865f2]/15 text-[#949cf7]'
                      : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {listing.type === 'discord' ? (
                    <Server className="h-5 w-5" />
                  ) : (
                    <Globe className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3 className="text-[14px] font-medium text-white">{listing.title}</h3>
                    <span className="text-[11px] capitalize text-[#6d6f78]">{listing.type}</span>
                  </div>
                  {listing.description && (
                    <p className="mt-0.5 line-clamp-2 text-[13px] text-[#949ba4]">{listing.description}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {(listing.discord_username || listing.user_id) && (
                      <div className="flex items-center gap-1.5">
                        {listing.discord_avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={listing.discord_avatar} alt="" className="h-5 w-5 rounded-full" />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5865f2] text-[9px] font-bold text-white">
                            {(listing.discord_username || '?')[0]}
                          </div>
                        )}
                        <span className="text-[12px] text-[#6d6f78]">
                          {listing.discord_username || 'user'}
                        </span>
                      </div>
                    )}

                    <div className="ml-auto flex gap-1.5">
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-white ${
                          listing.type === 'discord'
                            ? 'bg-[#5865f2] hover:bg-[#4752c4]'
                            : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                      >
                        {listing.type === 'discord' ? 'Join' : 'Open'}
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                      {listing.user_id ? (
                        <Link
                          href={`/u/${listing.user_id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-[#dbdee1] hover:bg-white/[0.06]"
                        >
                          <UserCircle2 className="h-3.5 w-3.5" /> Profile
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />

      {showForm && user && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-xl border border-white/10 bg-[#1e1f22] p-5 sm:rounded-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-white">New post</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-[#949ba4] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {success ? (
              <p className="py-8 text-center text-[14px] text-[#23a55a]">Posted.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'discord' })}
                    className={`rounded-md border py-2 text-[13px] ${
                      form.type === 'discord'
                        ? 'border-[#5865f2] bg-[#5865f2]/10 text-[#949cf7]'
                        : 'border-white/10 text-[#949ba4]'
                    }`}
                  >
                    Discord
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'website' })}
                    className={`rounded-md border py-2 text-[13px] ${
                      form.type === 'website'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/10 text-[#949ba4]'
                    }`}
                  >
                    Website
                  </button>
                </div>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Title"
                  className="w-full rounded-md border border-white/10 bg-[#2b2d31] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#5865f2]/50"
                />
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6d6f78]" />
                  <input
                    required
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder={
                      form.type === 'discord' ? 'https://discord.gg/…' : 'https://…'
                    }
                    className="w-full rounded-md border border-white/10 bg-[#2b2d31] py-2.5 pl-9 pr-3 text-[13px] text-white outline-none focus:border-[#5865f2]/50"
                  />
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Short description (optional)"
                  className="w-full rounded-md border border-white/10 bg-[#2b2d31] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#5865f2]/50"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-[#5865f2] py-2.5 text-[13px] font-medium text-white hover:bg-[#4752c4] disabled:opacity-60"
                >
                  {submitting ? '…' : 'Post'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
