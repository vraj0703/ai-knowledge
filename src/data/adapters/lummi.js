/**
 * Lummi Adapter — Free AI Stock Photos
 *
 * Searches AI-generated stock images on lummi.ai.
 * No API key needed for search.
 *
 * invoke({ query })
 *   query: string (required) — image search query
 */

const BASE = "https://www.lummi.ai";

async function invoke(params = {}) {
  const { query } = params;
  if (!query) throw new Error("Missing required param: query");

  const url = `${BASE}/search?query=${encodeURIComponent(query)}`;

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

    const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
    const thumbnail = ogMatch ? ogMatch[1].trim() : null;

    return { query, url, title, description, thumbnail, note: "Open URL to browse AI stock images" };
  } catch (err) {
    return { query, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "Lummi — AI Stock Photo Search",
    params: {
      query: "string (required) — image search query"
    },
    example: { query: "nature landscape" }
  };
}

module.exports = { invoke, describe };
