/**
 * Flat UI Color Picker Adapter — Flat UI Colors
 *
 * Fetches flat UI color values from flatuicolorpicker.com.
 * No API key needed.
 *
 * invoke({ category? })
 *   category: string — color category (optional)
 */

const BASE = "http://www.flatuicolorpicker.com";

async function invoke(params = {}) {
  const { category } = params;

  const url = category
    ? `${BASE}/${encodeURIComponent(category)}`
    : BASE;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { category, url, status: `error-${res.status}` };
    }

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Extract hex color values from the page
    const colorMatches = html.match(/#[0-9A-Fa-f]{6}/g);
    const colors = colorMatches ? [...new Set(colorMatches)].slice(0, 30) : [];

    return { category, url, title, colorCount: colors.length, colors, note: "Open URL to browse and copy color values" };
  } catch (err) {
    return { category, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "Flat UI Color Picker",
    params: {
      category: "string — color category (optional)"
    },
    example: {}
  };
}

module.exports = { invoke, describe };
