/**
 * Class Central Adapter — Course Search
 *
 * Searches for online courses on classcentral.com.
 * No API key needed.
 *
 * invoke({ query })
 *   query: string (required) — course search query
 */

const BASE = "https://www.classcentral.com";

async function invoke(params = {}) {
  const { query } = params;
  if (!query) throw new Error("Missing required param: query");

  const searchUrl = `${BASE}/search?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { query, url: searchUrl, status: `error-${res.status}` };
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Try to count results from meta or heading
    const countMatch = html.match(/(\d[\d,]*)\s+(?:courses?|results?)/i);
    const resultCount = countMatch ? countMatch[1] : null;

    return {
      query,
      url: searchUrl,
      title,
      resultCount,
      note: "Open the URL to browse full course listings"
    };
  } catch (err) {
    return {
      query,
      url: searchUrl,
      status: "fetch-failed",
      error: err.message,
      note: "URL is still valid for manual browsing"
    };
  }
}

function describe() {
  return {
    name: "Class Central Course Search",
    params: {
      query: "string (required) — course search query"
    },
    example: { query: "flutter development" }
  };
}

module.exports = { invoke, describe };
