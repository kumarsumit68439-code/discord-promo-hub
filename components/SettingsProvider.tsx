'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import EffectCanvas from './EffectCanvas';
import {
  DEFAULT_SETTINGS,
  SiteSettings,
  applyCssToDom,
  buildCss,
  gtCode,
  sanitizeSettings,
} from '@/lib/siteSettings';

type Ctx = {
  settings: SiteSettings;
  saving: boolean;
  update: (patch: Partial<SiteSettings>) => Promise<void>;
  reset: () => Promise<void>;
};

const SettingsContext = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  saving: false,
  update: async () => {},
  reset: async () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

type GTWindow = Window & {
  googleTranslateElementInit?: () => void;
  google?: { translate: { TranslateElement: new (opts: Record<string, unknown>, id: string) => unknown } };
};

function loadLocal(): SiteSettings {
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem('hub-settings') || 'null'));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyAndStore(s: SiteSettings) {
  const css = buildCss(s);
  applyCssToDom(css);
  try {
    localStorage.setItem('hub-css', JSON.stringify(css));
    localStorage.setItem('hub-settings', JSON.stringify(s));
  } catch {
    /* storage blocked */
  }
}

function readTranslateTarget(): string {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  if (!m) return '';
  const parts = decodeURIComponent(m[1]).split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function writeTranslateCookie(lang: string) {
  const host = location.hostname;
  const expired = 'Thu, 01 Jan 1970 00:00:00 GMT';
  if (lang === 'auto') {
    document.cookie = `googtrans=; expires=${expired}; path=/`;
    document.cookie = `googtrans=; expires=${expired}; path=/; domain=${host}`;
    return;
  }
  const v = `/en/${gtCode(lang)}`;
  document.cookie = `googtrans=${v}; path=/`;
  document.cookie = `googtrans=${v}; path=/; domain=${host}`;
}

function patchDomForTranslate() {
  const w = window as Window & { __hubTrPatched?: boolean };
  if (w.__hubTrPatched) return;
  w.__hubTrPatched = true;
  const rc = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return rc.call(this, child) as T;
  };
  const ib = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) return node;
    return ib.call(this, node, ref) as T;
  };
}

function loadTranslateScript() {
  if (document.getElementById('hub-gt-script')) return;
  const w = window as GTWindow;
  w.googleTranslateElementInit = () => {
    if (w.google) {
      new w.google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'hub-gt'
      );
    }
  };
  const s = document.createElement('script');
  s.id = 'hub-gt-script';
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.body.appendChild(s);
}

function syncLanguage(lang: string) {
  const want = lang === 'auto' ? '' : gtCode(lang);
  const cur = readTranslateTarget();
  if (cur !== want) {
    if (sessionStorage.getItem('hub-lang-try') === want) return;
    sessionStorage.setItem('hub-lang-try', want);
    writeTranslateCookie(lang);
    location.reload();
    return;
  }
  sessionStorage.removeItem('hub-lang-try');
  if (want) {
    patchDomForTranslate();
    loadTranslateScript();
  }
}

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const local = loadLocal();
    setSettings(local);
    applyAndStore(local);
    syncLanguage(local.language);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_site_settings')
        .select('theme,animation,effect,language')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const s = sanitizeSettings(data);
        setSettings(s);
        applyAndStore(s);
        syncLanguage(s.language);
      } else {
        const local = loadLocal();
        if (JSON.stringify(local) !== JSON.stringify(DEFAULT_SETTINGS)) {
          await supabase.from('user_site_settings').upsert({ user_id: userId, ...local, updated_at: new Date().toISOString() });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(
    async (next: SiteSettings) => {
      applyAndStore(next);
      if (userId) {
        setSaving(true);
        await supabase.from('user_site_settings').upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
        setSaving(false);
      }
    },
    [userId]
  );

  const update = useCallback(
    async (patch: Partial<SiteSettings>) => {
      const next = sanitizeSettings({ ...settings, ...patch });
      const langChanged = next.language !== settings.language;
      setSettings(next);
      await persist(next);
      if (langChanged) {
        sessionStorage.removeItem('hub-lang-try');
        writeTranslateCookie(next.language);
        location.reload();
      }
    },
    [settings, persist]
  );

  const reset = useCallback(async () => {
    await update({ ...DEFAULT_SETTINGS });
  }, [update]);

  return (
    <SettingsContext.Provider value={{ settings, saving, update, reset }}>
      {children}
      <EffectCanvas effect={settings.effect} />
      <div id="hub-gt" className="notranslate" style={{ position: 'absolute', left: -9999, top: 0 }} />
    </SettingsContext.Provider>
  );
}
