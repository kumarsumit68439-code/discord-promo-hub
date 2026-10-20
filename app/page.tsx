'use client';

import { useEffect, useState } from 'react';
import { supabase, Listing, AppUser, getDiscordProfile } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
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
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'discord' | 'website'>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'discord' as 'discord' | 'website',
    url: '',
    tags: '',
  });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setProfile(session?.user ? getDiscordProfile(session.user) : null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProfile(session?.user ? getDiscordProfile(session.user) : null);
      setAuthLoading(false);
    });

    fetchListings();
    return () => subscription.unsubscribe();
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

  async function signInWithDiscord() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'identify email',
      },
    });
    if (error) alert(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setShowForm(false);
  }

  function openPromote() {
    if (!user) {
      signInWithDiscord();
      return;
    }
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) {
      signInWithDiscord();
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
      discord_username: profile.username,
      discord_avatar: profile.avatarUrl,
    });

    setSubmitting(false);
    if (!error) {
      setSuccess(true);
      setForm({ title: '', description: '', type: 'discord', url: '', tags: '' });
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
        fetchListings();
      }, 1500);
    } else {
      alert(error.message || 'Error submitting.');
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
      <SiteHeader
        profile={profile}
        authLoading={authLoading}
        onLogin={signInWithDiscord}
        onLogout={signOut}
        onPromote={openPromote}
      />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-extrabold text-white sm:text-4xl">
            Promote Your <span className="text-discord-blurple">Discord Server</span> & Website
          </h2>
          <p className="mx-auto max-w-xl text-gray-400">
            Free promo hub · Discord login · YouTube music player · editable profile
          </p>
        </section>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search listings..."
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
          <div className="rounded-xl border border-dashed border-white/10 bg-discord-card/50 py-16 text-center">
            <Filter className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">No listings found.</p>
            <button
              onClick={openPromote}
              className="mt-4 rounded-lg bg-discord-blurple px-5 py-2 text-sm font-semibold text-white hover:bg-[#4752c4]"
            >
              {user ? 'Add Listing' : 'Login to Promote'}
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
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-600 opacity-0 transition hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
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
                    {listing.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-gray-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {listing.discord_username && (
                    <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
                      {listing.discord_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={listing.discord_avatar} alt="" className="h-5 w-5 rounded-full" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-discord-blurple/40" />
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
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-discord-dark p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Promote Something</h3>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            {profile && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-discord-card px-3 py-2">
                {profile.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                )}
                <span className="text-sm text-gray-300">Posting as {profile.username}</span>
              </div>
            )}
            {success ? (
              <div className="py-10 text-center">
                <MessageCircle className="mx-auto mb-3 h-10 w-10 text-discord-green" />
                <p className="font-semibold text-white">Submitted!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'discord' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium ${
                      form.type === 'discord'
                        ? 'border-discord-blurple bg-discord-blurple/15 text-discord-blurple'
                        : 'border-white/10 text-gray-400'
                    }`}
                  >
                    <Server className="h-4 w-4" /> Discord
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'website' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium ${
                      form.type === 'website'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-white/10 text-gray-400'
                    }`}
                  >
                    <Globe className="h-4 w-4" /> Website
                  </button>
                </div>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Title"
                  className="w-full rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white outline-none focus:border-discord-blurple"
                />
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    required
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder={form.type === 'discord' ? 'https://discord.gg/...' : 'https://...'}
                    className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
                  />
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Description"
                  className="w-full resize-none rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white outline-none focus:border-discord-blurple"
                />
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="tags, comma, separated"
                  className="w-full rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white outline-none focus:border-discord-blurple"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-discord-blurple py-3 text-sm font-semibold text-white hover:bg-[#4752c4] disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Publish Listing'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
