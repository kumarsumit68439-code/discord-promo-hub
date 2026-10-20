'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, KeyRound, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react';

type Provider = 'groq' | 'xai';
type Setting = { provider: Provider; model: string | null; connected: boolean; updated_at?: string };
const labels: Record<Provider, string> = { groq: 'Groq (including available free-tier models)', xai: 'xAI Grok' };
// Current general chat models listed with Free Plan limits in Groq's official docs.
// Access and limits can change; the signed-in account's live model list remains authoritative.
const GROQ_FREE_CHAT_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
] as const;
const GROQ_FREE_TASK_MODELS = [
  { id: 'openai/gpt-oss-safeguard-20b', task: 'Safety / moderation' },
  { id: 'meta-llama/llama-prompt-guard-2-22m', task: 'Prompt safety classifier' },
  { id: 'meta-llama/llama-prompt-guard-2-86m', task: 'Prompt safety classifier' },
  { id: 'whisper-large-v3', task: 'Audio transcription' },
  { id: 'whisper-large-v3-turbo', task: 'Audio transcription' },
  { id: 'canopylabs/orpheus-v1-english', task: 'Text-to-speech' },
  { id: 'canopylabs/orpheus-arabic-saudi', task: 'Text-to-speech' },
] as const;

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
  const freeGroqModels = provider === 'groq' ? [...GROQ_FREE_CHAT_MODELS] : [];
  const otherLiveModels = models.filter((item) => !freeGroqModels.includes(item as typeof freeGroqModels[number]));
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
            {provider === 'groq' && <optgroup label="Groq Free Plan — general chat">
              {freeGroqModels.map((item) => <option key={item} value={item}>{item}</option>)}
            </optgroup>}
            {provider === 'groq' && <optgroup label="Groq Free Plan — task-specific (not general chat)">
              {GROQ_FREE_TASK_MODELS.map((item) => <option key={item.id} value={item.id} disabled>{item.id} — {item.task}</option>)}
            </optgroup>}
            {otherLiveModels.length > 0 && <optgroup label="Other models returned by live API">
              {otherLiveModels.map((item) => <option key={item} value={item}>{item}</option>)}
            </optgroup>}
          </select>
          <p className="mt-2 text-xs text-gray-500">Free-plan chat models are included; connect and refresh to fetch every model your API key can access.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button disabled={busy || apiKey.trim().length < 8} onClick={() => void save()} className="rounded-xl bg-discord-blurple px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Please wait…' : 'Test & Save Key'}</button>
          <button disabled={busy || !connected} onClick={() => void loadModels()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-200 disabled:opacity-40"><RefreshCw className="h-4 w-4" /> Refresh models</button>
          {connected && <button disabled={busy} onClick={() => void disconnect()} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 px-3 py-3 text-sm text-rose-200 disabled:opacity-40"><Trash2 className="h-4 w-4" /> Disconnect</button>}
        </div>
      </div>
      {message && <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</p>}
      {error && <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      <p className="mt-4 text-xs leading-5 text-gray-500">Groq's published Free Plan lists GPT OSS 120B, GPT OSS 20B and Qwen 3.8 27B for general chat. Free task-specific models (moderation, audio transcription and text-to-speech) are also listed but disabled here because they are not general chat models. Other live models may be paid or preview-only. Your account's plan and rate limits apply. <a className="underline text-gray-300" href="https://console.groq.com/docs/rate-limits" target="_blank" rel="noreferrer">Official rate limits</a> · <a className="underline text-gray-300" href="https://console.groq.com/docs/models" target="_blank" rel="noreferrer">Official model catalog</a>.</p>
    </section>
  );
}
