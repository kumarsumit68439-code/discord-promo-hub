// Server-only Groq helpers. GROQ_API_KEY lives in the Vercel environment variables.
export const GROQ_BASE = 'https://api.groq.com/openai/v1';

export type GroqModel = { id: string; owned_by?: string; context_window?: number; kind: 'chat' | 'audio' | 'safety' };

export function groqKey() {
  return process.env.GROQ_API_KEY || '';
}

export function kindOf(id: string): GroqModel['kind'] {
  if (/whisper|tts|orpheus|playai/i.test(id)) return 'audio';
  if (/guard|safeguard/i.test(id)) return 'safety';
  return 'chat';
}

// Live list from Groq (all models your key can use; Groq's free tier covers them with rate limits).
export async function groqModels(): Promise<GroqModel[]> {
  const key = groqKey();
  if (!key) return [];
  const r = await fetch(GROQ_BASE + '/models', { headers: { Authorization: 'Bearer ' + key }, next: { revalidate: 300 } });
  if (!r.ok) return [];
  const j = (await r.json()) as { data?: Array<{ id: string; owned_by?: string; context_window?: number; active?: boolean }> };
  return (j.data || [])
    .filter((m) => m.active !== false)
    .map((m) => ({ id: m.id, owned_by: m.owned_by, context_window: m.context_window, kind: kindOf(m.id) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function pickChatModel(models: GroqModel[]): string {
  const chat = models.filter((m) => m.kind === 'chat').map((m) => m.id);
  const env = process.env.GROQ_MODEL;
  if (env && (chat.length === 0 || chat.includes(env))) return env;
  for (const c of ['llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant']) if (chat.includes(c)) return c;
  return chat[0] || 'llama-3.3-70b-versatile';
}

export async function groqComplete(opts: {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  const key = groqKey();
  if (!key) return { ok: false, status: 500, error: 'GROQ_API_KEY Vercel environment variables mein set nahi hai.' };
  const model = opts.model || pickChatModel(await groqModels());
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 600,
    temperature: opts.temperature ?? 0.3,
  };
  if (opts.json) body.response_format = { type: 'json_object' };
  let r = await fetch(GROQ_BASE + '/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok && r.status === 400 && opts.json) {
    delete body.response_format; // some models have no JSON mode
    r = await fetch(GROQ_BASE + '/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  if (!r.ok) return { ok: false, status: r.status, error: 'Groq error HTTP ' + r.status };
  const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return { ok: true, text: j.choices?.[0]?.message?.content || '' };
}

export function parseJsonLoose(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}
