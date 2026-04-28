/**
 * Google Fonts Adapter — Typography Data API
 *
 * 1500+ fonts, free, no auth required.
 * Docs: https://developers.google.com/fonts/docs/developer_api
 * Auth: GOOGLE_FONTS_API_KEY (optional, higher rate limits)
 *
 * invoke({ query?, category?, sort? })
 *   query: search by font family name
 *   category: serif|sans-serif|display|handwriting|monospace
 *   sort: alpha|popularity|trending|date (default: popularity)
 */

const API_BASE = "https://www.googleapis.com/webfonts/v1/webfonts";

async function invoke(params = {}) {
  const { query, category, sort = "popularity" } = params;

  const key = process.env.GOOGLE_FONTS_API_KEY;
  const qs = new URLSearchParams({ sort });
  if (key) qs.set("key", key);

  const res = await fetch(`${API_BASE}?${qs}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Fonts API ${res.status}: ${err}`);
  }

  let fonts = (await res.json()).items || [];

  // Filter by query
  if (query) {
    const q = query.toLowerCase();
    fonts = fonts.filter(f => f.family.toLowerCase().includes(q));
  }

  // Filter by category
  if (category) {
    fonts = fonts.filter(f => f.category === category);
  }

  // Limit results
  fonts = fonts.slice(0, 20);

  return {
    query: query || "(all)",
    category: category || "(all)",
    count: fonts.length,
    fonts: fonts.map(f => ({
      family: f.family,
      category: f.category,
      variants: f.variants,
      subsets: f.subsets,
      css_url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:wght@400;700&display=swap`,
      files: Object.keys(f.files || {}).length + " variants"
    }))
  };
}

function describe() {
  return {
    name: "Google Fonts",
    params: {
      query: "string (optional) — search by font name",
      category: "serif|sans-serif|display|handwriting|monospace (optional)",
      sort: "alpha|popularity|trending|date (default: popularity)"
    },
    example: { query: "roboto", category: "sans-serif" }
  };
}

module.exports = { invoke, describe };
