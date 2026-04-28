/**
 * Short.io Adapter — Branded URL Shortener
 *
 * Branded short links with click analytics, 1000 links free.
 * Docs: https://developers.short.io/reference
 * Auth: SHORT_IO_API_KEY
 *
 * invoke({ url, domain? }) — shorten a URL
 * invoke({ action: "list" }) — list recent short links
 */

const API_BASE = "https://api.short.io";

function getKey() {
  const key = process.env.SHORT_IO_API_KEY;
  if (!key) throw new Error("SHORT_IO_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  if (params.action === "list") return listLinks();

  const { url, domain = "link.raj-sadan.local" } = params;
  if (!url) throw new Error("Missing required param: url");

  const res = await fetch(`${API_BASE}/links`, {
    method: "POST",
    headers: {
      "Authorization": getKey(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ originalURL: url, domain })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Short.io API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    original: url,
    short: data.shortURL,
    id: data.idString
  };
}

async function listLinks() {
  const res = await fetch(`${API_BASE}/api/links?domain_id=0&limit=10`, {
    headers: { "Authorization": getKey() }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Short.io API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const links = (data.links || data || []).slice(0, 10);
  return {
    count: links.length,
    links: links.map(l => ({
      short: l.shortURL,
      original: l.originalURL,
      id: l.idString,
      clicks: l.clicks || 0
    }))
  };
}

function describe() {
  return {
    name: "Short.io — Branded URL Shortener",
    params: {
      url: "string (required) — URL to shorten",
      domain: "string (optional) — custom domain",
      action: '"list" — list recent short links'
    },
    example: { url: "https://example.com/very-long-article-url" }
  };
}

module.exports = { invoke, describe };
