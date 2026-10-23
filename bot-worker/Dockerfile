# Persistent Discord Gateway worker — runs 24/7 on Railway / VPS / Back4App
# Node 22 has native WebSocket, which @supabase/supabase-js realtime requires.
# ffmpeg: direct MP3 / radio streams + transcoding. yt-dlp: YouTube audio (needs a JS runtime = node).
# Rebuild: 2026-10-23 yt-dlp for YouTube
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fontconfig \
    fonts-dejavu-core \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Standalone yt-dlp binary (bundles its own Python + EJS solver scripts)
RUN curl -fsSL -o /usr/local/bin/yt-dlp \
      https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && yt-dlp --version

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
# Railway / Back4App set PORT; a small health server keeps the container alive
EXPOSE 8080

CMD ["node", "src/index.js"]
