/**
 * Textures.com Adapter — 3D Textures Library
 *
 * Searches 3D textures on textures.com.
 * No API key needed for browsing.
 *
 * invoke({ query })
 *   query: string (required) — texture search term
 */

const BASE = "https://www.textures.com";

async function invoke(params = {}) {
  const { query } = params;
  if (!query) throw new Error("Missing required param: query");

  const url = `${BASE}/search?q=${encodeURIComponent(query)}`;

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

    const countMatch = html.match(/(\d[\d,]*)\s+(?:textures?|results?)/i);
    const resultCount = countMatch ? countMatch[1] : null;

    return { query, url, title, resultCount, note: "Open URL to browse and download textures" };
  } catch (err) {
    return { query, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "Textures.com — 3D Texture Search",
    params: {
      query: "string (required) — texture search term"
    },
    example: { query: "stone wall" }
  };
}

module.exports = { invoke, describe };
