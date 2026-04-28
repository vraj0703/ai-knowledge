/**
 * Unicode Table Adapter — Unicode Character Lookup
 *
 * Returns the unicode-table.com search URL for character lookup.
 * Site blocks automated scraping, so we return the formatted URL.
 *
 * invoke({ query })
 *   query: string (required) — character name, code point, or keyword
 */

const BASE = "https://unicode-table.com/en";

async function invoke(params = {}) {
  const { query } = params;
  if (!query) throw new Error("Missing required param: query");

  const searchUrl = `${BASE}/search/?q=${encodeURIComponent(query)}`;

  // Check if query looks like a code point (e.g. "U+1F600" or "1F600")
  const codePointMatch = query.match(/^(?:U\+)?([0-9A-Fa-f]{4,6})$/);
  if (codePointMatch) {
    const hex = codePointMatch[1].toUpperCase();
    const directUrl = `${BASE}/${hex}/`;
    const char = String.fromCodePoint(parseInt(hex, 16));
    return {
      query,
      codePoint: `U+${hex}`,
      character: char,
      directUrl,
      searchUrl
    };
  }

  return {
    query,
    searchUrl,
    note: "Open the search URL to browse matching Unicode characters"
  };
}

function describe() {
  return {
    name: "Unicode Table Character Lookup",
    params: {
      query: "string (required) — character name, code point (e.g. U+1F600), or keyword"
    },
    example: { query: "arrow right" }
  };
}

module.exports = { invoke, describe };
