'use client';

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { useSettings } from '@/components/SettingsProvider';
import { THEMES, ANIMATIONS, EFFECTS, LANGUAGES } from '@/lib/siteSettings';
import { Palette, Wand2, Sparkles, Languages, RotateCcw, Check, Search } from 'lucide-react';

type Tab = 'theme' | 'animation' | 'effect' | 'language';

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'theme', label: 'Themes', icon: Palette },
  { id: 'animation', label: 'Animations', icon: Wand2 },
  { id: 'effect', label: 'Effects', icon: Sparkles },
  { id: 'language', label: 'Language', icon: Languages },
];

export default function SettingsPage() {
  const { settings, update, reset, saving } = useSettings();
  const [tab, setTab] = useState<Tab>('theme');
  const [q, setQ] = useState('');

  const s = q.trim().toLowerCase();
  const themes = useMemo(() => THEMES.filter((t) => t.name.toLowerCase().includes(s)), [s]);
  const anims = useMemo(() => ANIMATIONS.filter((a) => a.name.toLowerCase().includes(s)), [s]);
  const effects = useMemo(() => EFFECTS.filter((e) => e.name.toLowerCase().includes(s)), [s]);
  const langs = useMemo(
    () => LANGUAGES.filter(([c, n]) => n.toLowerCase().includes(s) || c.toLowerCase().includes(s)),
    [s]
  );

  const tile = (active: boolean) =>
    `relative rounded-lg border p-2.5 text-left text-[12px] transition ${
      active
        ? 'border-[#5865f2] bg-[#5865f2]/15 text-white'
        : 'border-white/[0.06] bg-[#2b2d31] text-[#b5bac1] hover:bg-[#35373c]'
    }`;

  return (
    <div className="min-h-screen bg-[#17181c] pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">Settings</h1>
            <p className="mt-0.5 text-[12px] text-[#6d6f78]">
              Theme, motion, and language apply across the site
              {saving ? ' · saving…' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all settings to defaults?')) reset();
            }}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-[#b5bac1] hover:bg-white/[0.06]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>

        <div className="mb-4 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setQ('');
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium ${
                tab === id ? 'bg-[#5865f2] text-white' : 'bg-[#2b2d31] text-[#949ba4]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6d6f78]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-white/[0.06] bg-[#1e1f22] py-2 pl-8 pr-3 text-[13px] text-white outline-none placeholder:text-[#6d6f78] focus:border-[#5865f2]/40"
          />
        </div>

        {tab === 'theme' && (
          <section>
            <p className="mb-2 text-[11px] text-[#6d6f78]">{themes.length} themes</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {themes.map((t) => (
                <button key={t.id} type="button" onClick={() => update({ theme: t.id })} className={tile(settings.theme === t.id)}>
                  <span className="mb-2 flex h-7 overflow-hidden rounded">
                    {t.swatch.map((c, i) => (
                      <span key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  <span className="block truncate font-medium">{t.name}</span>
                  {settings.theme === t.id && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'animation' && (
          <section>
            <div key={settings.animation} className="hub-anim mb-3 rounded-lg border border-white/[0.06] bg-[#2b2d31] p-3 text-[13px] text-[#dbdee1]">
              Preview — this motion runs on page content.
            </div>
            <p className="mb-2 text-[11px] text-[#6d6f78]">{anims.length} animations</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {anims.map((a) => (
                <button key={a.id} type="button" onClick={() => update({ animation: a.id })} className={tile(settings.animation === a.id)}>
                  <span className="block truncate font-medium">{a.name}</span>
                  {settings.animation === a.id && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'effect' && (
          <section>
            <p className="mb-2 text-[11px] text-[#6d6f78]">{effects.length} ambient effects</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {effects.map((e) => (
                <button key={e.id} type="button" onClick={() => update({ effect: e.id })} className={tile(settings.effect === e.id)}>
                  <span className="mb-2 flex gap-1">
                    {e.colors.slice(0, 5).map((c, i) => (
                      <span key={i} className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                    {e.colors.length === 0 && <span className="text-[10px] text-[#6d6f78]">off</span>}
                  </span>
                  <span className="block truncate font-medium">{e.name}</span>
                  {settings.effect === e.id && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'language' && (
          <section>
            <p className="mb-2 text-[11px] leading-relaxed text-[#6d6f78]">
              Default is <strong className="text-[#b5bac1]">English</strong>. Pick another language to translate the whole site (Google Translate). Change applies after a short reload.
            </p>
            <div translate="no" className="notranslate grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {langs.map(([code, name]) => (
                <button key={code} type="button" onClick={() => update({ language: code })} className={tile(settings.language === code)}>
                  <span className="block truncate font-medium">{name}</span>
                  <span className="block text-[10px] text-[#6d6f78]">{code === 'auto' ? 'default' : code}</span>
                  {settings.language === code && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
