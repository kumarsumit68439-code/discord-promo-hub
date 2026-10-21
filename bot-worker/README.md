# Discord Promo Hub — 24/7 bot worker

Persistent Discord Gateway worker (WebSocket). Runs every bot users save from the website `/hosting` page (tokens from Supabase Vault).

## Architecture

| Layer | Host | Role |
|-------|------|------|
| Website + API | **Vercel** | Next.js, dashboard, Edge Functions |
| Bot worker | **Railway** (or VPS) | Long-running Node process + Discord Gateway |
| DB + secrets | **Supabase** | Postgres, Vault tokens, status heartbeats |

Vercel alone cannot keep a Discord bot online. This worker must run on Railway (or similar) with WebSocket support.

## Railway deploy

1. Create project → deploy from GitHub `kumarsumit68439-code/discord-promo-hub`
2. **Root Directory:** `bot-worker`
3. **Builder:** Dockerfile (uses `bot-worker/Dockerfile`)
4. Variables:
   - `SUPABASE_URL` = `https://nimduknedcjsmimaszvu.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = from Supabase Dashboard → Settings → API → `service_role` (secret)
5. Restart policy: **Always**
6. Disable sleep / serverless mode

After deploy, open site → **Bots** tab → save a bot token. Worker syncs every 30s and sets status to `online`.

## Local

```sh
cd bot-worker
cp .env.example .env   # fill SUPABASE_* or DISCORD_BOT_TOKEN
npm install
npm start
```

## Commands (when modules enabled)

`/ping` · `/timeout` · `/untimeout` · `/ban` · `/unban` · `/supporter` · `/invites` · `/invite-leaderboard`

## Intents (Discord Developer Portal)

Enable **Server Members Intent** and **Message Content Intent** if using welcome/AI modules.
