/**
 * 21st.dev Adapter — Community UI Components
 *
 * Browses community-made UI components on 21st.dev.
 * No API key needed.
 *
 * invoke({ query? })
 *   query: string — search term for components
 */

const BASE = "https://21st.dev";

async function invoke(params = {}) {
  const { query } = params;

  const url = query
    ? `${BASE}/community/components?q=${encodeURIComponent(query)}`
    : `${BASE}/community/components`;

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

    return { query, url, title, description, note: "Open URL to browse components" };
  } catch (err) {
    return { query, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "21st.dev Community UI Components",
    params: {
      query: "string — search term for components (optional)"
    },
    example: { query: "button" }
  };
}

module.exports = { invoke, describe };
