import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALLOWED_MODULES = ["welcome", "moderation", "ban", "ai", "supporter", "invite"];
const ID = /^\d{15,22}$/;
const cleanId = (v: unknown) => { const s = String(v ?? "").trim(); return ID.test(s) ? s : ""; };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in required" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Supabase function secrets are not configured" }, 500);

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);
  const userId = authData.user.id;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "status") {
      const { data, error } = await admin.rpc("list_hosted_bots", { p_user_id: userId });
      if (error) return json({ error: error.message }, 500);
      // Merge the "Send test welcome" state. If that lookup fails the bots still load without it.
      const { data: tests } = await admin.rpc("list_test_welcome_state", { p_user_id: userId });
      const byId = new Map<string, Record<string, unknown>>((tests || []).map((t: { id: string }) => [t.id, t as Record<string, unknown>]));
      const bots = (data || []).map((b: { id: string }) => {
        const t = byId.get(b.id);
        return { ...b, test_requested_at: t?.test_requested_at ?? null, test_result: t?.test_result ?? null, test_done_at: t?.test_done_at ?? null };
      });
      return json({ bots });
    }

    if (action === "save") {
      const clientId = cleanId(body.clientId);
      if (!clientId) return json({ error: "Enter a valid Application / Client ID" }, 400);
      const botToken = String(body.botToken || "").trim();
      const modules = (Array.isArray(body.modules) ? body.modules : []).map(String).filter((m: string) => ALLOWED_MODULES.includes(m));
      if (modules.length === 0) return json({ error: "Select at least one module" }, 400);
      const c = body.config || {};
      const config = {
        guildId: cleanId(c.guildId), welcomeChannelId: cleanId(c.welcomeChannelId), welcomeRoleId: cleanId(c.welcomeRoleId),
        modLogChannelId: cleanId(c.modLogChannelId), aiChannelId: cleanId(c.aiChannelId), supporterRoleId: cleanId(c.supporterRoleId),
        aiProvider: ["groq", "xai"].includes(String(c.aiProvider)) ? String(c.aiProvider) : "",
        welcomeImage: c.welcomeImage !== false,
      };
      let botName: string | null = null;
      if (botToken) {
        // Verify the token really belongs to this application before storing it.
        const me = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: "Bot " + botToken } });
        if (!me.ok) return json({ error: "Discord rejected this bot token (HTTP " + me.status + "). Reset the token in the Developer Portal and try again." }, 400);
        const info = await me.json();
        if (String(info.id) !== clientId) return json({ error: "This token belongs to a different application than the Client ID you entered." }, 400);
        botName = String(info.username || "");
      }
      const { data, error } = await admin.rpc("save_hosted_bot", {
        p_user_id: userId, p_client_id: clientId, p_bot_name: botName, p_token: botToken || null, p_modules: modules, p_config: config,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ saved: true, id: data?.id, botName });
    }

    if (action === "toggle") {
      const { data, error } = await admin.rpc("set_hosted_bot_enabled", { p_user_id: userId, p_id: String(body.id || ""), p_enabled: Boolean(body.enabled) });
      if (error) return json({ error: error.message }, 400);
      return json({ updated: Boolean(data) });
    }

    if (action === "delete") {
      const { data, error } = await admin.rpc("delete_hosted_bot", { p_user_id: userId, p_id: String(body.id || "") });
      if (error) return json({ error: error.message }, 400);
      return json({ deleted: Boolean(data) });
    }

    if (action === "test_welcome") {
      // Queues one test welcome message; the always-on worker posts it within a few seconds.
      const { data, error } = await admin.rpc("request_test_welcome", { p_user_id: userId, p_id: String(body.id || "") });
      if (error) return json({ error: error.message }, 400);
      if (data === "not_found") return json({ error: "Bot not found" }, 404);
      if (data === "busy") return json({ error: "A test was just requested. Wait a few seconds and try again." }, 429);
      return json({ queued: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
});
