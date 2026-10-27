# Persistent Discord Gateway worker — runs 24/7 on Railway / VPS / Back4App
# Node 22 has native WebSocket, which @supabase/supabase-js realtime requires.
# ffmpeg: direct MP3 / radio streams + transcoding. yt-dlp: YouTube audio.
# Rebuild: 2026-10-27 davey native + real bot.runtime.js
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fontconfig \
    fonts-dejavu-core \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Standalone yt-dlp binary
RUN curl -fsSL -o /usr/local/bin/yt-dlp \
      https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && yt-dlp --version

WORKDIR /app

COPY package.json package-lock.json* ./
# Ensure optional native bindings for DAVE (@snazzah/davey) install correctly
RUN npm install --omit=dev \
  && node -e "try{require('@snazzah/davey');console.log('davey ok')}catch(e){console.error('davey load failed',e.message);process.exit(1)}"

COPY src ./

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/index.js"]
