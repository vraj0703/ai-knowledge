/**
 * APIVault Adapter — Public API Directory
 *
 * Searches 1000+ public APIs on apivault.dev.
 * No API key needed for search.
 *
 * invoke({ query })
 *   query: string (required) — API search query
 */

const BASE = "https://apivault.dev";

async function invoke(params = {}) {
  const { query } = params;
  if (!query) throw new Error("Missing required param: query");

  const url = `${BASE}/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { query, url, status: `error-${res.status}` };
    }

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : null;

    return { query, url, title, description, note: "Open URL to browse public APIs — meta-tool for discovering new capabilities" };
  } catch (err) {
    return { query, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "APIVault — Public API Directory",
    params: {
      query: "string (required) — API search query"
    },
    example: { query: "weather" }
  };
}

module.exports = { invoke, describe };
