/**
 * Material Design Icons Adapter — Icon Search
 *
 * Searches Material Design icons on materialdesignicons.com.
 * No API key needed.
 *
 * invoke({ query })
 *   query: string (required) — icon search query
 */

const BASE = "https://materialdesignicons.com";

async function invoke(params = {}) {
  const { query } = params;
  if (!query) throw new Error("Missing required param: query");

  const url = `${BASE}/icon/${encodeURIComponent(query)}`;
  const searchUrl = `${BASE}/?search=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(BASE, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { query, url: searchUrl, status: `error-${res.status}` };
    }

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : null;

    return {
      query,
      url: searchUrl,
      title,
      description,
      mdiClass: `mdi-${query.toLowerCase().replace(/\s+/g, "-")}`,
      note: "Open URL to search and browse icons"
    };
  } catch (err) {
    return { query, url: searchUrl, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "Material Design Icons Search",
    params: {
      query: "string (required) — icon name or search term"
    },
    example: { query: "home" }
  };
}

module.exports = { invoke, describe };
