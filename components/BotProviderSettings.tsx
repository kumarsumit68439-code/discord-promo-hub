'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, KeyRound, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react';

type Provider = 'groq' | 'xai';
type Setting = { provider: Provider; model: string | null; connected: boolean; updated_at?: string };
const labels: Record<Provider, string> = { groq: 'Groq (including available free-tier models)', xai: 'xAI Grok' };

export default function BotProviderSettings() {
  const [provider, setProvider] = useState<Provider>('groq');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const call = useCallback(async (body: Record<string, string>) => {
    const { data, error: invokeError } = await supabase.functions.invoke('bot-provider-settings', { body });
    if (invokeError) throw new Error(invokeError.message || 'Could not reach settings service');
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const data = await call({ action: 'status' });
      setSettings(data.settings || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load provider status');
    }
  }, [call]);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);

  async function save() {
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await call({ action: 'save', provider, apiKey, model });
      setModels(data.models || []);
      setApiKey('');
      setMessage(`Connected to ${provider === 'groq' ? 'Groq' : 'xAI'} and securely saved your key.`);
      await refreshStatus();
    } catch (e) { setError(e instanceof Error ? e.message : 'Connection failed'); }
    finally { setBusy(false); }
  }

  async function loadModels() {
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await call({ action: 'models', provider });
      setModels(data.models || []);
      if (data.selectedModel) setModel(data.selectedModel);
      setMessage(`Loaded ${(data.models || []).length} models returned by the provider.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load models'); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    setBusy(true); setError(''); setMessage('');
    try {
      await call({ action: 'delete', provider });
      setSettings((old) => old.filter((item) => item.provider !== provider));
      setModels([]); setModel('');
      setMessage('Provider credential deleted from secure storage.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not disconnect'); }
    finally { setBusy(false); }
  }

  const connected = settings.find((item) => item.provider === provider);
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-white"><KeyRound className="h-5 w-5 text-cyan-200" /> AI Provider Connections</h2>
          <p className="mt-1 text-sm text-gray-400">API keys are saved in Supabase Vault, not browser storage or GitHub.</p>
        </div>
        <span className={'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ' + (connected ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/5 text-gray-400')}>
          {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-gray-300">Provider</label>
          <select value={provider} onChange={(e) => { setProvider(e.target.value as Provider); setModels([]); setModel(''); setError(''); setMessage(''); }} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white">
            <option value="groq">Groq API</option><option value="xai">xAI Grok API</option>
          </select>
          <p className="mt-2 text-xs text-gray-500">{labels[provider]}</p>
        </div>
        <div>
          <label className="mb-2 block text-sm text-gray-300">API key</label>
          <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={connected ? 'Saved securely — enter to rotate key' : 'Paste provider API key'} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white placeholder:text-gray-600" />
        </div>
        <div>
          <label className="mb-2 block text-sm text-gray-300">Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white">
            <option value="">Choose model (optional)</option>
            {models.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <p className="mt-2 text-xs text-gray-500">List is fetched live from the provider using your key.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button disabled={busy || apiKey.trim().length < 8} onClick={() => void save()} className="rounded-xl bg-discord-blurple px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Please wait…' : 'Test & Save Key'}</button>
          <button disabled={busy || !connected} onClick={() => void loadModels()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-200 disabled:opacity-40"><RefreshCw className="h-4 w-4" /> Refresh models</button>
          {connected && <button disabled={busy} onClick={() => void disconnect()} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 px-3 py-3 text-sm text-rose-200 disabled:opacity-40"><Trash2 className="h-4 w-4" /> Disconnect</button>}
        </div>
      </div>
      {message && <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</p>}
      {error && <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      <p className="mt-4 text-xs leading-5 text-gray-500">Only models returned for your API key are shown. Provider access and free-tier limits depend on your account; this does not imply every model is free. Sign in before saving credentials.</p>
    </section>
  );
}
