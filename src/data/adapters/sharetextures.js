/**
 * Share Textures Adapter — Free CC0 Textures
 *
 * Searches free CC0 textures on sharetextures.com.
 * No API key needed.
 *
 * invoke({ query?, category? })
 *   query: string — texture search term
 *   category: string — texture category (e.g. "wood", "brick", "metal", "fabric")
 */

const BASE = "https://www.sharetextures.com";

async function invoke(params = {}) {
  const { query, category } = params;
  if (!query && !category) throw new Error("Missing required param: query or category");

  let url;
  if (query) {
    url = `${BASE}/search?q=${encodeURIComponent(query)}`;
  } else {
    url = `${BASE}/category/${encodeURIComponent(category)}`;
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { query, category, url, status: `error-${res.status}` };
    }

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : null;

    return { query, category, url, title, description, note: "Open URL to browse and download CC0 textures" };
  } catch (err) {
    return { query, category, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "Share Textures — Free CC0 Textures",
    params: {
      query: "string — texture search term",
      category: "string — texture category (wood, brick, metal, fabric, etc.)"
    },
    example: { query: "wood" }
  };
}

module.exports = { invoke, describe };
