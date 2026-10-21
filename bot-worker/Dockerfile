# Persistent Discord Gateway worker — runs 24/7 on Railway / VPS
# Node 22 has native WebSocket, which @supabase/supabase-js realtime requires.
# Rebuild: 2026-10-21 control panels + bot_commands poller
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fontconfig \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
# Railway sets PORT; worker does not need HTTP but keep process alive
EXPOSE 8080

CMD ["node", "src/index.js"]
