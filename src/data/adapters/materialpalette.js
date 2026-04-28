/**
 * Material Palette Adapter — Material Design Colors
 *
 * Generates Material Design color palettes from two color names.
 * No API key needed.
 *
 * invoke({ primary, accent })
 *   primary: string (required) — primary color name (red, pink, purple, deep-purple, indigo, blue, light-blue, cyan, teal, green, light-green, lime, yellow, amber, orange, deep-orange, brown, grey, blue-grey)
 *   accent: string (required) — accent color name (same options)
 */

const BASE = "https://www.materialpalette.com";

async function invoke(params = {}) {
  const { primary, accent } = params;
  if (!primary || !accent) throw new Error("Missing required params: primary and accent");

  const url = `${BASE}/${encodeURIComponent(primary)}/${encodeURIComponent(accent)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { primary, accent, url, status: `error-${res.status}` };
    }

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Try to extract hex color values
    const colorMatches = html.match(/#[0-9A-Fa-f]{6}/g);
    const colors = colorMatches ? [...new Set(colorMatches)].slice(0, 12) : [];

    return { primary, accent, url, title, colors, note: "Open URL for full palette with CSS/SASS downloads" };
  } catch (err) {
    return { primary, accent, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "Material Palette — Color Generator",
    params: {
      primary: "string (required) — primary color name (e.g. blue, green, red)",
      accent: "string (required) — accent color name"
    },
    example: { primary: "green", accent: "pink" }
  };
}

module.exports = { invoke, describe };
