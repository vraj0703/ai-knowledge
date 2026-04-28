/**
 * ZapSplat Adapter — Sound Effects Library
 *
 * Searches free sound effects on zapsplat.com.
 * No API key needed for search.
 *
 * invoke({ query })
 *   query: string (required) — sound effect search query
 */

const BASE = "https://www.zapsplat.com";

async function invoke(params = {}) {
  const { query } = params;
  if (!query) throw new Error("Missing required param: query");

  const url = `${BASE}/sound-effect-category/search?q=${encodeURIComponent(query)}`;

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

    const countMatch = html.match(/(\d[\d,]*)\s+(?:sounds?|results?|effects?)/i);
    const resultCount = countMatch ? countMatch[1] : null;

    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : null;

    return { query, url, title, resultCount, description, note: "Open URL to preview and download sound effects" };
  } catch (err) {
    return { query, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "ZapSplat — Sound Effects Search",
    params: {
      query: "string (required) — sound effect search query"
    },
    example: { query: "whoosh" }
  };
}

module.exports = { invoke, describe };
