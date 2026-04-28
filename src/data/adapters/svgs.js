/**
 * SVGs.app Adapter — AI SVG Generator
 *
 * Fetches metadata from svgs.app AI SVG generator.
 * No API key needed.
 *
 * invoke({ query? })
 *   query: string — what kind of SVG to look for
 */

const BASE = "https://svgs.app";

async function invoke(params = {}) {
  const { query } = params;

  const url = BASE;

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

    return {
      query,
      url,
      title,
      description,
      note: query ? `Open URL and search for "${query}" SVGs` : "Open URL to generate AI SVGs"
    };
  } catch (err) {
    return { query, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "SVGs.app — AI SVG Generator",
    params: {
      query: "string — SVG search term (optional)"
    },
    example: { query: "arrow icon" }
  };
}

module.exports = { invoke, describe };
