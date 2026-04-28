/**
 * React Bits Adapter — Animated UI Components
 *
 * Browses animated React components on reactbits.dev.
 * No API key needed.
 *
 * invoke({ query? })
 *   query: string — search term for components
 */

const BASE = "https://reactbits.dev";

async function invoke(params = {}) {
  const { query } = params;

  const url = query
    ? `${BASE}/?search=${encodeURIComponent(query)}`
    : BASE;

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

    return { query, url, title, description, note: "Open URL to browse animated React components" };
  } catch (err) {
    return { query, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "React Bits Animated Components",
    params: {
      query: "string — component search term (optional)"
    },
    example: { query: "text animation" }
  };
}

module.exports = { invoke, describe };
