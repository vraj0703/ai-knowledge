/**
 * Toools.design Adapter — Design Tool Finder
 *
 * Searches design tools on toools.design.
 * No API key needed.
 *
 * invoke({ query? })
 *   query: string — search term for design tools
 */

const BASE = "https://www.toools.design";

async function invoke(params = {}) {
  const { query } = params;

  const url = query
    ? `${BASE}/finder?search=${encodeURIComponent(query)}`
    : `${BASE}/finder`;

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

    return { query, url, title, description, note: "Open URL to browse design tools" };
  } catch (err) {
    return { query, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "Toools.design — Design Tool Finder",
    params: {
      query: "string — design tool search term (optional)"
    },
    example: { query: "color palette" }
  };
}

module.exports = { invoke, describe };
