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
  Filter,
  X,
  Server,
  Bot,
  Link2,
  Trash2,
  Users,
  MessagesSquare,
  Music2,
  User,
  UserCircle2,
  Crown,
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
    // Premium users get high promotion: their listings are shown first with a badge.
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

  const quick = [
    { href: '/users', label: 'Search users', icon: Users, desc: 'Find & check accounts' },
    { href: '/messages', label: 'Messages', icon: MessagesSquare, desc: 'Realtime chat' },
    { href: '/music', label: 'Music', icon: Music2, desc: 'YouTube player' },
    { href: '/profile', label: 'Profile', icon: User, desc: 'Edit & Discord check' },
    { href: '/hosting', label: 'Bot Hosting', icon: Bot, desc: 'Ticket, voice, protection, level, welcome & more bots' },
    { href: '/pricing', label: 'Plans', icon: Crown, desc: 'Free ya Premium ₹20: high promotion' },
  ];

  return (
    <div className="min-h-screen bg-discord-darker pb-20 sm:pb-8">
      <SiteHeader onPromote={openPromote} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-extrabold text-white sm:text-4xl">
            Promote Your <span className="text-discord-blurple">Discord Server</span> & Website
          </h2>
          <p className="mx-auto max-w-xl text-gray-400">
            Public promos · har card pe link + publisher profile check
          </p>
        </section>

        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quick.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="rounded-xl border border-white/5 bg-discord-card p-4 transition hover:border-discord-blurple/40 hover:bg-discord-hover"
            >
              <q.icon className="mb-2 h-5 w-5 text-discord-blurple" />
              <p className="text-sm font-semibold text-white">{q.label}</p>
              <p className="text-xs text-gray-500">{q.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search public listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-discord-blurple"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'discord', 'website'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  filter === f ? 'bg-discord-blurple text-white' : 'bg-discord-card text-gray-400'
                }`}
              >
                {f === 'all' ? 'All' : f === 'discord' ? 'Discord' : 'Website'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-discord-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
            <Filter className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">No public listings yet</p>
            <button
              onClick={openPromote}
              className="mt-4 rounded-lg bg-discord-blurple px-5 py-2 text-sm font-semibold text-white"
            >
              {user ? 'Publish' : 'Login to publish'}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((listing) => (
              <div
                key={listing.id}
                className={`relative flex flex-col rounded-xl border bg-discord-card p-5 hover:border-discord-blurple/40 ${
                  isPremium(listing) ? 'border-amber-300/40 shadow-[0_0_24px_rgba(251,191,36,0.08)]' : 'border-white/5'
                }`}
              >
                {isPremium(listing) && (
                  <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-black">
                    <Star className="h-3 w-3" /> PREMIUM
                  </span>
                )}
                {user && listing.user_id === user.id && (
                  <button
                    type="button"
                    onClick={() => deleteListing(listing.id)}
                    className="absolute right-3 top-3 z-10 text-gray-600 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                {/* Type icon + title */}
                <div className="mb-3 flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                      listing.type === 'discord'
                        ? 'bg-discord-blurple/20 text-discord-blurple'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {listing.type === 'discord' ? (
                      <Server className="h-5 w-5" />
                    ) : (
                      <Globe className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white">{listing.title}</h3>
                    <p className="text-[11px] capitalize text-gray-500">{listing.type} promo</p>
                  </div>
                </div>

                {listing.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-gray-400">{listing.description}</p>
                )}

                {/* Publisher row */}
                {(listing.discord_username || listing.user_id) && (
                  <div className="mb-3 flex items-center gap-2 border-t border-white/5 pt-3">
                    {listing.discord_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.discord_avatar}
                        alt=""
                        className="h-7 w-7 rounded-full"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-discord-blurple text-[10px] font-bold text-white">
                        {(listing.discord_username || '?')[0]}
                      </div>
                    )}
                    <span className="truncate text-xs text-gray-400">
                      {listing.discord_username || 'Publisher'}
                    </span>
                  </div>
                )}

                {/* Action buttons: Open link + Profile check */}
                <div className="mt-auto flex gap-2 pt-1">
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold text-white ${
                      listing.type === 'discord'
                        ? 'bg-discord-blurple hover:bg-[#4752c4]'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {listing.type === 'discord' ? (
                      <>
                        <Server className="h-3.5 w-3.5" /> Open Discord
                      </>
                    ) : (
                      <>
                        <Globe className="h-3.5 w-3.5" /> Open Website
                      </>
                    )}
                    <ExternalLink className="h-3 w-3 opacity-80" />
                  </a>

                  {listing.user_id ? (
                    <Link
                      href={`/u/${listing.user_id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                    >
                      <UserCircle2 className="h-3.5 w-3.5" /> Profile check
                    </Link>
                  ) : (
                    <span className="flex flex-1 items-center justify-center rounded-lg border border-white/5 py-2.5 text-xs text-gray-600">
                      No profile
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />

      {showForm && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-discord-dark p-6">
            <div className="mb-4 flex justify-between">
              <h3 className="font-bold text-white">Publish (public)</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            {success ? (
              <p className="py-8 text-center text-discord-green">Live! Card pe link + profile check</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'discord' })}
                    className={`rounded-lg border py-2 text-sm ${
                      form.type === 'discord'
                        ? 'border-discord-blurple text-discord-blurple'
                        : 'border-white/10 text-gray-400'
                    }`}
                  >
                    Discord
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'website' })}
                    className={`rounded-lg border py-2 text-sm ${
                      form.type === 'website'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-white/10 text-gray-400'
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
                  className="w-full rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white"
                />
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    required
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder={
                      form.type === 'discord'
                        ? 'https://discord.gg/...'
                        : 'https://yoursite.com'
                    }
                    className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white"
                  />
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Description"
                  className="w-full rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-discord-blurple py-3 text-sm font-semibold text-white"
                >
                  {submitting ? '...' : 'Publish'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
