# Persistent Discord Gateway worker — runs 24/7 on Railway / VPS / Back4App
# Node 22 has native WebSocket, which @supabase/supabase-js realtime requires.
# ffmpeg: direct MP3 / radio streams + transcoding. yt-dlp: YouTube audio.
# Rebuild: 2026-10-28 TMPDIR for yt-dlp
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
RUN npm install --omit=dev \
  && (node -e "try{require('@snazzah/davey');console.log('davey ok')}catch(e){console.warn('davey soft-fail',e.message)}" || true)

# MUST be ./src so CMD node src/index.js resolves /app/src/index.js
COPY src ./src

# Sanity check — fail build early if entrypoint missing
RUN test -f /app/src/index.js && test -f /app/src/hosted.js && ls -la /app/src

ENV NODE_ENV=production
ENV TMPDIR=/tmp
ENV TEMP=/tmp
ENV TMP=/tmp
ENV HOME=/tmp
EXPOSE 8080

CMD ["node", "src/index.js"]
