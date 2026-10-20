import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST required" }, 405);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "Sign in required" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply({ error: "Supabase function secrets are not configured" }, 500);
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: authError } = await auth.auth.getUser(token);
  if (authError || !userData.user) return reply({ error: "Invalid session" }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await req.json(), action = String(body.action || ""), provider = String(body.provider || "");
    if (action !== "status" && !["groq", "xai"].includes(provider)) return reply({ error: "Unsupported provider" }, 400);
    const userId = userData.user.id;
    if (action === "save") {
      const apiKey = String(body.apiKey || "").trim(), model = String(body.model || "").trim();
      if (apiKey.length < 8) return reply({ error: "Enter a valid API key" }, 400);
      const base = provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.x.ai/v1";
      const test = await fetch(base + "/models", { headers: { Authorization: "Bearer " + apiKey } });
      if (!test.ok) return reply({ error: "Provider rejected the key (HTTP " + test.status + ")" }, 400);
      const { error } = await admin.rpc("save_bot_provider_setting", { p_user_id: userId, p_provider: provider, p_api_key: apiKey, p_model: model || null });
      if (error) return reply({ error: "Secure storage failed: " + error.message }, 500);
      const data = await test.json();
      return reply({ connected: true, provider, model: model || null, models: Array.isArray(data.data) ? data.data.map((m: { id?: string }) => m.id).filter(Boolean).sort() : [] });
    }
    if (action === "status") {
      const { data, error } = await admin.rpc("list_bot_provider_settings", { p_user_id: userId });
      return error ? reply({ error: error.message }, 500) : reply({ settings: data || [] });
    }
    if (action === "models") {
      const { data: credential, error } = await admin.rpc("get_bot_provider_secret", { p_user_id: userId, p_provider: provider });
      if (error || !credential?.api_key) return reply({ error: "Connect this provider first" }, 404);
      const base = provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.x.ai/v1";
      const response = await fetch(base + "/models", { headers: { Authorization: "Bearer " + credential.api_key } });
      if (!response.ok) return reply({ error: "Model list request failed (HTTP " + response.status + ")" }, 502);
      const data = await response.json();
      return reply({ provider, selectedModel: credential.model, models: Array.isArray(data.data) ? data.data.map((m: { id?: string }) => m.id).filter(Boolean).sort() : [] });
    }
    if (action === "delete") {
      const { data, error } = await admin.rpc("delete_bot_provider_setting", { p_user_id: userId, p_provider: provider });
      return error ? reply({ error: error.message }, 500) : reply({ deleted: Boolean(data), provider });
    }
    return reply({ error: "Unknown action" }, 400);
  } catch { return reply({ error: "Invalid request" }, 400); }
});