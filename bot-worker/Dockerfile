# Persistent Discord Gateway worker — runs 24/7 on Railway / VPS / Back4App
# Node 22 has native WebSocket, which @supabase/supabase-js realtime requires.
# ffmpeg is needed to play direct MP3 / radio stream URLs in voice channels.
# Rebuild: 2026-10-23 direct audio URL support
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fontconfig \
    fonts-dejavu-core \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
# Railway / Back4App set PORT; a small health server keeps the container alive
EXPOSE 8080

CMD ["node", "src/index.js"]
