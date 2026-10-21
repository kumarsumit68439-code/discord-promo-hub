import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALLOWED_MODULES = [
  "welcome",
  "support",
  "ticket",
  "security",
  "tokenclaim",
  "moderation",
  "voice",
  "protect",
  "levels",
  "memberadd",
  "ban",
  "ai",
  "supporter",
  "invite",
  "music",
];
const FREE_MODULES = ["welcome", "support"];
const ID = /^\d{15,22}$/;
const cleanId = (v: unknown) => {
  const s = String(v ?? "").trim();
  return ID.test(s) ? s : "";
};
const cleanStr = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);

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

  async function getPlan() {
    try {
      const { data } = await admin.rpc("get_user_plan", { p_user_id: userId });
      if (data) return data;
    } catch { /* ignore */ }
    try {
      const { data: row } = await admin
        .from("profiles")
        .select("is_premium, premium_until")
        .eq("id", userId)
        .maybeSingle();
      const until = row?.premium_until ? new Date(row.premium_until) : null;
      const premium = Boolean(row?.is_premium) && (!until || until.getTime() > Date.now());
      return {
        premium,
        premium_until: row?.premium_until ?? null,
        free_started_at: null,
        free_expires_at: null,
        free_expired: false,
      };
    } catch {
      return { premium: false, premium_until: null, free_started_at: null, free_expires_at: null, free_expired: false };
    }
  }

  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "status") {
      const { data, error } = await admin.rpc("list_hosted_bots", { p_user_id: userId });
      if (error) return json({ error: error.message }, 500);
      const { data: tests } = await admin.rpc("list_test_welcome_state", { p_user_id: userId });
      const byId = new Map<string, Record<string, unknown>>(
        (tests || []).map((t: { id: string }) => [t.id, t as Record<string, unknown>]),
      );
      const bots = (data || []).map((b: { id: string }) => {
        const t = byId.get(b.id);
        return {
          ...b,
          test_requested_at: t?.test_requested_at ?? null,
          test_result: t?.test_result ?? null,
          test_done_at: t?.test_done_at ?? null,
        };
      });
      const plan = await getPlan();
      return json({ bots, plan });
    }

    if (action === "save") {
      const clientId = cleanId(body.clientId);
      if (!clientId) return json({ error: "Enter a valid Application / Client ID" }, 400);
      const botToken = String(body.botToken || "").trim();
      const modules = (Array.isArray(body.modules) ? body.modules : [])
        .map(String)
        .filter((m: string) => ALLOWED_MODULES.includes(m));
      if (modules.length === 0) {
        return json({
          error: "Select at least one module (Welcome, Support, Ticket, Security, Music, …)",
        }, 400);
      }

      const plan = await getPlan();
      if (!plan.premium) {
        const locked = modules.filter((m: string) => !FREE_MODULES.includes(m));
        if (locked.length > 0) {
          return json({
            error: "Ye modules Premium mein hain: " + locked.join(", ") + ". Free: Welcome + Support only. Plans se ₹20 Premium lo.",
          }, 403);
        }
      }

      const c = body.config || {};
      const config = {
        guildId: cleanId(c.guildId),
        welcomeChannelId: cleanId(c.welcomeChannelId),
        welcomeRoleId: cleanId(c.welcomeRoleId),
        welcomeTitle: cleanStr(c.welcomeTitle, 200),
        welcomeMessage: cleanStr(c.welcomeMessage, 2000),
        goodbyeMessage: cleanStr(c.goodbyeMessage, 1000),
        welcomeImage: c.welcomeImage !== false,
        modLogChannelId: cleanId(c.modLogChannelId),
        aiChannelId: cleanId(c.aiChannelId),
        supporterRoleId: cleanId(c.supporterRoleId),
        aiProvider: ["groq", "xai"].includes(String(c.aiProvider)) ? String(c.aiProvider) : "",
        supportChannelId: cleanId(c.supportChannelId),
        supportMessage: cleanStr(c.supportMessage, 2000),
        supportFaq: cleanStr(c.supportFaq, 4000),
        ticketChannelId: cleanId(c.ticketChannelId),
        ticketCategoryId: cleanId(c.ticketCategoryId),
        ticketSupportRoleId: cleanId(c.ticketSupportRoleId),
        ticketLogChannelId: cleanId(c.ticketLogChannelId),
        levelChannelId: cleanId(c.levelChannelId),
        protectLogChannelId: cleanId(c.protectLogChannelId),
        memberAddChannelId: cleanId(c.memberAddChannelId),
        inviteDmMessage: cleanStr(c.inviteDmMessage, 1000),
        voiceChannelId: cleanId(c.voiceChannelId),
        musicChannelId: cleanId(c.musicChannelId),
      };

      let botName: string | null = null;
      if (botToken) {
        const me = await fetch("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: "Bot " + botToken },
        });
        if (!me.ok) {
          return json({
            error: "Discord rejected this bot token (HTTP " + me.status + "). Reset token in Developer Portal.",
          }, 400);
        }
        const info = await me.json();
        if (String(info.id) !== clientId) {
          return json({ error: "This token belongs to a different application than the Client ID." }, 400);
        }
        botName = String(info.username || "");
      }

      const { data, error } = await admin.rpc("save_hosted_bot", {
        p_user_id: userId,
        p_client_id: clientId,
        p_bot_name: botName,
        p_token: botToken || null,
        p_modules: modules,
        p_config: config,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ saved: true, id: data?.id, botName });
    }

    if (action === "toggle") {
      const { data, error } = await admin.rpc("set_hosted_bot_enabled", {
        p_user_id: userId,
        p_id: String(body.id || ""),
        p_enabled: Boolean(body.enabled),
      });
      if (error) return json({ error: error.message }, 400);
      return json({ updated: Boolean(data) });
    }

    if (action === "delete") {
      const { data, error } = await admin.rpc("delete_hosted_bot", {
        p_user_id: userId,
        p_id: String(body.id || ""),
      });
      if (error) return json({ error: error.message }, 400);
      return json({ deleted: Boolean(data) });
    }

    if (action === "test_welcome") {
      const { data, error } = await admin.rpc("request_test_welcome", {
        p_user_id: userId,
        p_id: String(body.id || ""),
      });
      if (error) return json({ error: error.message }, 400);
      if (data === "not_found") return json({ error: "Bot not found" }, 404);
      if (data === "busy") return json({ error: "A test was just requested. Wait a few seconds." }, 429);
      return json({ queued: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
});
