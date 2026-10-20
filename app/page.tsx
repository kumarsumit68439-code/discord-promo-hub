'use client';

import { useEffect, useState } from 'react';
import { supabase, Listing } from '@/lib/supabase';
import { MessageCircle, Globe, Plus, ExternalLink, Search, Filter, X, Server, Link2 } from 'lucide-react';

export default function Home() {
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

    if (!error && data) {
      setListings(data);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      alert('Error submitting. Please try again.');
    }
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
    <div className="min-h-screen bg-discord-darker">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-discord-dark/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-discord-blurple">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Promo Hub</h1>
              <p className="text-xs text-gray-400">Discord & Website Ads</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-discord-blurple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752c4]"
          >
            <Plus className="h-4 w-4" />
            Promote
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <section className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-extrabold text-white sm:text-4xl">
            Promote Your{' '}
            <span className="text-discord-blurple">Discord Server</span> & Website
          </h2>
          <p className="mx-auto max-w-xl text-gray-400">
            Free platform for Discord users to advertise their servers and websites.
            Grow your community today!
          </p>
        </section>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
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

        {/* Listings Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-discord-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-discord-card/50 py-16 text-center">
            <Filter className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">No listings found. Be the first to promote!</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 rounded-lg bg-discord-blurple px-5 py-2 text-sm font-semibold text-white hover:bg-[#4752c4]"
            >
              Add Listing
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((listing) => (
              <a
                key={listing.id}
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-xl border border-white/5 bg-discord-card p-5 transition hover:border-discord-blurple/40 hover:bg-discord-hover"
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
                  <ExternalLink className="h-4 w-4 text-gray-600 transition group-hover:text-discord-blurple" />
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
                  {listing.tags?.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/5 py-8 text-center text-sm text-gray-500">
        <p>Discord Promo Hub — Free promotion for everyone</p>
      </footer>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-discord-dark p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Promote Something</h3>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-discord-green/20">
                  <MessageCircle className="h-7 w-7 text-discord-green" />
                </div>
                <p className="text-lg font-semibold text-white">Submitted!</p>
                <p className="text-sm text-gray-400">Your listing is now live.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'discord' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition ${
                      form.type === 'discord'
                        ? 'border-discord-blurple bg-discord-blurple/15 text-discord-blurple'
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <Server className="h-4 w-4" />
                    Discord Server
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'website' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition ${
                      form.type === 'website'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </button>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Title *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={form.type === 'discord' ? 'My Awesome Server' : 'My Cool Website'}
                    className="w-full rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-discord-blurple"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    {form.type === 'discord' ? 'Invite Link *' : 'Website URL *'}
                  </label>
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
                          : 'https://example.com'
                      }
                      className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none focus:border-discord-blurple"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Tell people what your server/website is about..."
                    className="w-full resize-none rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-discord-blurple"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Tags (comma separated)
                  </label>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="gaming, community, fun"
                    className="w-full rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-discord-blurple"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-discord-blurple py-3 text-sm font-semibold text-white transition hover:bg-[#4752c4] disabled:opacity-50"
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