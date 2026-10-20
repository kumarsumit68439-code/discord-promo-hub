# Discord Promo Hub

Free platform where Discord users can promote their Discord servers and websites.

## Features

- **Discord OAuth login** (Supabase Auth)
- Promote Discord servers (invite links)
- Promote websites
- Search & filter listings
- Delete your own listings
- Dark Discord-inspired UI

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide icons
- **Auth + DB**: Supabase (Discord OAuth + PostgreSQL)
- **Hosting**: Vercel

## Discord OAuth setup (required)

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. **New Application** → name it e.g. `Promo Hub`
3. Left menu → **OAuth2** → **General**
4. Copy **Client ID** and **Client Secret**
5. Under **Redirects**, add:
   ```
   https://idqalpeygygpznvcixei.supabase.co/auth/v1/callback
   ```
6. Save changes

### 2. Enable Discord in Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/idqalpeygygpznvcixei/auth/providers)
2. **Authentication** → **Providers** → **Discord**
3. Enable Discord
4. Paste Client ID + Client Secret
5. Save

### 3. Site URL & Redirects in Supabase

1. **Authentication** → **URL Configuration**
2. **Site URL**: `https://discord-promo-hub.vercel.app`
3. **Redirect URLs** add:
   - `https://discord-promo-hub.vercel.app/**`
   - `https://discord-promo-hub.vercel.app/auth/callback`
   - `http://localhost:3000/**` (for local dev)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://idqalpeygygpznvcixei.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Local Development

```bash
npm install
npm run dev
```

## License

MIT
