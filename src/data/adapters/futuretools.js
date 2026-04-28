/**
 * FutureTools Adapter — AI Tool Directory
 *
 * Searches AI tools on futuretools.io.
 * No API key needed.
 *
 * invoke({ query?, tag? })
 *   query: string — search term
 *   tag: string — category tag (e.g. "for-fun", "marketing", "code")
 */

const BASE = "https://www.futuretools.io";

async function invoke(params = {}) {
  const { query, tag } = params;
  if (!query && !tag) throw new Error("Missing required param: query or tag");

  let url;
  if (query) {
    url = `${BASE}/?search=${encodeURIComponent(query)}`;
  } else {
    url = `${BASE}/?tags-n5zn=${encodeURIComponent(tag)}`;
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { query, tag, url, status: `error-${res.status}` };
    }

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : null;

    return { query, tag, url, title, description, note: "Open URL to browse AI tools" };
  } catch (err) {
    return { query, tag, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "FutureTools AI Directory",
    params: {
      query: "string — search term",
      tag: "string — category tag (for-fun, marketing, code, etc.)"
    },
    example: { query: "video editing" }
  };
}

module.exports = { invoke, describe };
