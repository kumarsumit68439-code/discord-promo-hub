'use client';

import { useEffect, useState } from 'react';
import { supabase, Listing } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/components/AuthProvider';
import {
  MessageCircle,
  Globe,
  ExternalLink,
  Search,
  Filter,
  X,
  Server,
  Link2,
  Trash2,
} from 'lucide-react';

export default function Home() {
  const { user, appUser, signInDiscord } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
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
    } else {
      alert(error.message);
    }
  }

  async function deleteListing(id: string) {
    if (!confirm('Delete this listing?')) return;
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (!error) setListings((prev) => prev.filter((l) => l.id !== id));
    else alert(error.message);
  }

  const filtered = listings.filter((l) => {
    const matchType = filter === 'all' || l.type === filter;
    const matchSearch =
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      (l.description || '').toLowerCase().includes(search.toLowerCase()) ||
      l.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader onPromote={openPromote} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-extrabold text-white sm:text-4xl">
            Promote Your <span className="text-discord-blurple">Discord Server</span> & Website
          </h2>
          <p className="mx-auto max-w-xl text-gray-400">
            All listings are public — anyone can view available Discord servers & websites.
            Login to publish, chat, and follow.
          </p>
        </section>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search public listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-discord-blurple"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'discord', 'website'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === f
                    ? 'bg-discord-blurple text-white'
                    : 'bg-discord-card text-gray-400 hover:bg-discord-hover hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f === 'discord' ? 'Discord' : 'Website'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-discord-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
            <Filter className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">No public listings yet — be the first!</p>
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
                className="group relative flex flex-col rounded-xl border border-white/5 bg-discord-card p-5 transition hover:border-discord-blurple/40 hover:bg-discord-hover"
              >
                {user && listing.user_id === user.id && (
                  <button
                    onClick={() => deleteListing(listing.id)}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-600 opacity-0 hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 flex-col"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
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
                    <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-discord-blurple" />
                  </div>
                  <h3 className="mb-1 font-semibold text-white group-hover:text-discord-blurple">
                    {listing.title}
                  </h3>
                  {listing.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-gray-400">{listing.description}</p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        listing.type === 'discord'
                          ? 'bg-discord-blurple/15 text-discord-blurple'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      {listing.type === 'discord' ? 'Discord' : 'Website'}
                    </span>
                  </div>
                  {listing.discord_username && (
                    <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
                      {listing.discord_avatar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={listing.discord_avatar} alt="" className="h-5 w-5 rounded-full" />
                      )}
                      <span className="text-xs text-gray-500">{listing.discord_username}</span>
                    </div>
                  )}
                </a>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-discord-dark p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Publish promo (public)</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            {success ? (
              <p className="py-8 text-center text-discord-green">Live for everyone!</p>
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
                  className="w-full rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white outline-none"
                />
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    required
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://discord.gg/... or website"
                    className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none"
                  />
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Description"
                  className="w-full rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-discord-blurple py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish for everyone'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
