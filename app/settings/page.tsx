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
  const langs = useMemo(() => LANGUAGES.filter(([c, n]) => n.toLowerCase().includes(s) || c.toLowerCase().includes(s)), [s]);

  const tile = (active: boolean) =>
    `relative rounded-xl border p-2.5 text-left text-xs transition ${
      active ? 'border-discord-blurple bg-discord-blurple/20 text-white' : 'border-white/10 bg-discord-card text-gray-300 hover:bg-discord-hover'
    }`;

  return (
    <div className="min-h-screen bg-discord-darker pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-xs text-gray-400">
              Aapki choice poori website pe lagti hai aur account ke sath save hoti hai{saving ? ' · saving…' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Sab settings default par reset karein?')) reset();
            }}
            className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-300 hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>

        <div className="mb-4 flex gap-1.5 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setQ('');
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                tab === id ? 'bg-discord-blurple text-white' : 'bg-discord-card text-gray-400'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
          />
        </div>

        {tab === 'theme' && (
          <section>
            <p className="mb-2 text-xs text-gray-500">{themes.length} themes</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {themes.map((t) => (
                <button key={t.id} type="button" onClick={() => update({ theme: t.id })} className={tile(settings.theme === t.id)}>
                  <span className="mb-2 flex h-8 overflow-hidden rounded-md border border-white/10">
                    {t.swatch.map((c, i) => (
                      <span key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  <span className="block truncate font-semibold">{t.name}</span>
                  {settings.theme === t.id && <Check className="absolute right-2 top-2 h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'animation' && (
          <section>
            <div key={settings.animation} className="hub-anim mb-4 rounded-xl border border-white/10 bg-discord-card p-4 text-sm text-white">
              Preview: yahi animation har page pe chalegi.
            </div>
            <p className="mb-2 text-xs text-gray-500">{anims.length} animations</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {anims.map((a) => (
                <button key={a.id} type="button" onClick={() => update({ animation: a.id })} className={tile(settings.animation === a.id)}>
                  <span className="block truncate font-semibold">{a.name}</span>
                  {settings.animation === a.id && <Check className="absolute right-2 top-2 h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'effect' && (
          <section>
            <p className="mb-2 text-xs text-gray-500">{effects.length} effects (poori screen pe chalte hain, touch block nahi karte)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {effects.map((e) => (
                <button key={e.id} type="button" onClick={() => update({ effect: e.id })} className={tile(settings.effect === e.id)}>
                  <span className="mb-2 flex gap-1">
                    {e.colors.slice(0, 5).map((c, i) => (
                      <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                    {e.colors.length === 0 && <span className="h-2.5 text-[10px] text-gray-500">off</span>}
                  </span>
                  <span className="block truncate font-semibold">{e.name}</span>
                  {settings.effect === e.id && <Check className="absolute right-2 top-2 h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'language' && (
          <section>
            <p className="mb-2 text-xs text-gray-500">
              {langs.length} languages · select karte hi page reload hoga aur poori website us language me dikhegi (Google Translate se machine translation).
            </p>
            <div translate="no" className="notranslate grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {langs.map(([code, name]) => (
                <button key={code} type="button" onClick={() => update({ language: code })} className={tile(settings.language === code)}>
                  <span className="block truncate font-semibold">{name}</span>
                  <span className="block text-[10px] text-gray-500">{code}</span>
                  {settings.language === code && <Check className="absolute right-2 top-2 h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
