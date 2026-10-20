# Bot Hosting configuration and AI providers

The website can collect provider credentials in its settings UI, but **never put provider API keys or Discord bot tokens in public client-side code, localStorage, or a GitHub commit**. Browser-only credentials can be read by visitors and abused. Use an authenticated server-side API and encrypted database/secret store; environment variables are not the only secure option, but some trusted server-side secret storage is required.

## AI providers

- Groq OpenAI-compatible API base URL: `https://api.groq.com/openai/v1`
- Groq model discovery endpoint: `GET https://api.groq.com/openai/v1/models` with `Authorization: Bearer <user key>`
- xAI/Grok API base URL: `https://api.x.ai/v1`
- xAI model list should be loaded from the provider's current model endpoint/docs, not a hardcoded list advertised as “all free”. xAI API models are generally usage-priced; do not label them free unless the provider explicitly indicates free access for that account/model.

## Proposed settings UX

1. Add a provider selector (Groq / xAI Grok).
2. Let the signed-in user enter an API key into a password field and test the connection server-side.
3. Fetch and display the current available models from the provider's model-list endpoint, marking availability/limits based on provider response/docs.
4. Never send keys to browser logs, analytics, URL query strings, or return them from API responses. Store only server-side with encryption and per-user access control; support disconnect/delete.
5. Discord OAuth Client ID is public and can be used to build an install URL. OAuth Client Secret is confidential and must only be exchanged on a server-side callback; it must never be embedded in frontend JavaScript. Bot tokens are also confidential and should only be submitted to a protected server endpoint over HTTPS, never committed to GitHub.

## Current implementation status

The bot worker source is in `bot-worker/src/index.js`. It needs a persistent Node.js host. The dashboard currently creates a Discord bot invite URL; it does not yet implement OAuth callback/session handling, encrypted credential storage, per-user provider settings, or dynamic provider model discovery. Do not claim those are live until implemented and tested.
