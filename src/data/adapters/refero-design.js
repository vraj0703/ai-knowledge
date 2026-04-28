/**
 * Refero Adapter — UI/UX Design Inspiration
 *
 * Searches design inspiration on refero.design.
 * No API key needed.
 *
 * invoke({ query? })
 *   query: string — design pattern or app name to search
 */

const BASE = "https://refero.design";

async function invoke(params = {}) {
  const { query } = params;

  const url = query
    ? `${BASE}/search?q=${encodeURIComponent(query)}`
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

    return { query, url, title, description, note: "Open URL to browse design inspiration" };
  } catch (err) {
    return { query, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "Refero — Design Inspiration",
    params: {
      query: "string — design pattern or app name (optional)"
    },
    example: { query: "onboarding" }
  };
}

module.exports = { invoke, describe };
