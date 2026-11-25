// OpenRouter reverse proxy as a Cloudflare Worker.
// Drop-in replacement for the Caddy version: same paths, no server required.

const UPSTREAM = "https://openrouter.ai";

// Headers that must not be forwarded across a proxy hop.
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

// Forward client headers, minus hop-by-hop and anything that leaks the
// browser/edge identity upstream.
function forwardHeaders(headers) {
  const out = new Headers();
  for (const [key, value] of headers) {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k)) continue;
    if (k === "host") continue;
    if (k === "x-forwarded-for" || k === "x-real-ip") continue;
    if (k.startsWith("cf-")) continue;
    out.set(key, value);
  }
  return out;
}

// Same, for the response going back to the client.
function responseHeaders(headers) {
  const out = new Headers();
  for (const [key, value] of headers) {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k)) continue;
    if (k.startsWith("cf-")) continue;
    out.set(key, value);
  }
  return out;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return new Response("ok", { status: 200 });
    }

    const target = new URL(url.pathname + url.search, UPSTREAM);

    const init = {
      method: request.method,
      headers: forwardHeaders(request.headers),
      redirect: "manual",
    };
    // GET/HEAD must not carry a body.
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const upstream = await fetch(target, init);

    // Pass the body through untouched so SSE chunks stream unbuffered.
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders(upstream.headers),
    });
  },
};
