# Discord Promo Hub — persistent bot worker

This is a real Discord Gateway worker, separate from the Next.js website. It supports welcome/goodbye messages, optional auto-role, slash-command timeout/untimeout/ban/unban, supporter role management, basic invite attribution/leaderboard, and optional OpenAI-compatible AI chat.

## Run locally

Requires Node.js 20+.

1. Copy `.env.example` to `.env` and set values privately.
2. Create a Discord application and bot in the Discord Developer Portal. Keep the bot token secret.
3. Install the bot in your test server with only required permissions: View Channels, Send Messages, Embed Links, Read Message History, Moderate Members, Ban Members, Manage Roles (only if using role features). Do not grant Administrator by default.
4. In the Developer Portal, enable **Server Members Intent** for welcome/member role features and **Message Content Intent** for prefix/mention AI chat. Invite tracking also requires Manage Server / Manage Guild access for fetching invites.
5. Run:

```sh
cd bot-worker
npm install
npm start
```

## Environment variables

See `.env.example`. Keep all tokens and API keys in the persistent host's secret settings, not in GitHub or browser code. For OpenRouter, set `AI_BASE_URL=https://openrouter.ai/api/v1`, your chosen `AI_MODEL`, and `AI_API_KEY`. AI is disabled unless both key and model are set.

## Hosting 24/7

Deploy the `bot-worker` directory as a long-running Node.js worker/service on a provider that supports persistent processes and WebSocket connections. Set its environment variables there and enable automatic restart. A Next.js/Vercel serverless deployment alone does not keep this process alive. The website dashboard does not yet provision workers or securely store per-user bot secrets.

## Commands

- `/ping`
- `/timeout member minutes reason`, `/untimeout member reason`
- `/ban member reason`, `/unban user_id reason`
- `/supporter grant member`, `/supporter revoke member` (configure `SUPPORTER_ROLE_ID`)
- `/invites`, `/invite-leaderboard`

## Important limitations

Invite counts are in-memory in this first worker version and reset on restart; invite attribution can be unavailable for vanity links, single-use races, or when Discord denies invite fetch access. For durable analytics, connect a database and persist invite snapshots/counts. This worker is a shared-feature bot process, not a secure multi-tenant token vault or a general-purpose container hosting platform. Test moderation commands in a private server first.
