# openrouter-proxy

A tiny, dependency-free reverse proxy for [OpenRouter](https://openrouter.ai) that runs on **Cloudflare Workers**. No server, no container, no maintenance — deploy in about a minute and use it from anywhere.

Built for the common case where `openrouter.ai` is unreachable from your network but Cloudflare is not.

```
your client ──▶ https://<your-worker>/api/v1/... ──▶ https://openrouter.ai/api/v1/...
```

## Features

- **Transparent passthrough** — method, path, query string, request body and headers are forwarded as-is.
- **No secrets stored** — the client's own `Authorization` header is passed straight through. The proxy never sees or keeps an API key.
- **Streaming-friendly** — responses (including SSE chat completions) are piped through unbuffered, so tokens arrive as they are generated.
- **Clean headers** — hop-by-hop headers, `Host`, `X-Forwarded-For`, `X-Real-IP` and `CF-*` are stripped in both directions.
- **Health check** — `GET /healthz` returns `200 ok`.
- **Free to run** — fits comfortably in the Workers free plan (100,000 requests/day).

## Deploy

Requirements: Node.js 20+ and a Cloudflare account (the free plan is enough).

```bash
npm install
npx wrangler login     # one-time browser authorization
npm run deploy
```

Wrangler prints the URL of your proxy:

```
https://openrouter-proxy.<your-subdomain>.workers.dev
```

### Deploy from the dashboard

No local tooling needed: in the Cloudflare dashboard go to **Workers & Pages → Create → Worker**, paste the contents of `src/index.js`, and deploy.

### Custom domain

`*.workers.dev` is not reachable from some networks (mainland China in particular). To use your own domain, add a custom domain to the Worker in the dashboard, or uncomment the `routes` block in `wrangler.toml` and redeploy:

```toml
routes = [
  { pattern = "proxy.example.com", custom_domain = true }
]
```

## Usage

Point any OpenRouter-compatible client at your Worker instead of `openrouter.ai`. Keep your own API key in the client — never in the proxy.

```bash
curl https://<your-worker>/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'
```

With the OpenAI SDK:

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://<your-worker>/api/v1",
    api_key="sk-or-...",
)

print(client.chat.completions.create(
    model="openai/gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
).choices[0].message.content)
```

For OpenCode, add a provider in `~/.config/opencode/opencode.json`:

```jsonc
{
  "providers": {
    "openrouter": {
      "settings": {
        "baseURL": "https://<your-worker>/api/v1",
        "apiKey": "{env:OPENROUTER_API_KEY}"
      }
    }
  }
}
```

## Local development

```bash
npm install
npm run dev
```

Wrangler serves the Worker locally and reloads on change.

## How it works

The entire proxy is [`src/index.js`](src/index.js):

1. `/healthz` is answered directly.
2. Everything else is rebuilt against `https://openrouter.ai`, keeping the path, query and body.
3. Request headers are filtered, then sent upstream.
4. The upstream response body is returned as a stream, with response headers filtered.

Hop-by-hop headers and client identity headers are removed so the request looks like it came from the proxy itself, not from your machine.

## Security and abuse

This proxy is an **open relay**: anyone who knows its URL can send their own OpenRouter requests through it. That is fine for a personal deployment, because every caller still needs a valid OpenRouter API key. It does mean the Worker's bandwidth and free-tier quota are shared.

If you want to restrict access, add a shared-secret check before forwarding, for example:

```js
const secret = request.headers.get("x-proxy-secret");
if (secret !== env.PROXY_SECRET) {
  return new Response("forbidden", { status: 403 });
}
```

and set it with `npx wrangler secret put PROXY_SECRET`. Note that this adds friction to every client and is not enabled by default.

The Worker does not log requests or responses.

## Limits

- Workers free plan: 100,000 requests/day, 10 ms CPU per request. A passthrough proxy uses very little CPU.
- Cloudflare Workers cannot reach non-standard ports; OpenRouter's HTTPS endpoint is unaffected.

## License

[MIT](LICENSE). Not affiliated with OpenRouter.
