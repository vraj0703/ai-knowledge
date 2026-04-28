/**
 * Solar System Scope Adapter — Solar System Textures
 *
 * Fetches solar system texture metadata from solarsystemscope.com.
 * No API key needed.
 *
 * invoke({ body? })
 *   body: string — planet or body name (e.g. "earth", "mars", "jupiter")
 */

const BASE = "https://www.solarsystemscope.com";

async function invoke(params = {}) {
  const { body } = params;

  const url = `${BASE}/textures/`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { body, url, status: `error-${res.status}` };
    }

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : null;

    return {
      body,
      url,
      title,
      description,
      note: body
        ? `Open URL and look for ${body} textures`
        : "Open URL to browse all solar system textures"
    };
  } catch (err) {
    return { body, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "Solar System Scope — Planet Textures",
    params: {
      body: "string — planet or body name (optional, e.g. earth, mars, moon)"
    },
    example: { body: "earth" }
  };
}

module.exports = { invoke, describe };
