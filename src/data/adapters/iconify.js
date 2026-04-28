/**
 * Iconify Adapter — Open Source Icon Search
 *
 * Free, no auth required. Replaces Flaticon + Icons8.
 *
 * invoke({ query, limit, action })
 *   query:  string (required for search) — icon search term
 *   limit:  number (optional, default 20) — max results
 *   action: string (optional, default "search") — "search" | "collections"
 */

const SEARCH_URL = "https://api.iconify.design/search";
const COLLECTIONS_URL = "https://api.iconify.design/collections";

async function invoke(params = {}, credentials = {}) {
  const { query, limit = 20, action = "search" } = params;

  if (action === "collections") {
    const res = await fetch(COLLECTIONS_URL);
    if (!res.ok) throw new Error(`Iconify collections ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const sets = Object.entries(data).slice(0, 30).map(([prefix, info]) => ({
      prefix,
      name: info.name,
      total: info.total,
      category: info.category || null
    }));
    return { count: sets.length, collections: sets };
  }

  // Default: search
  if (!query) throw new Error("Missing required param: query");

  const url = `${SEARCH_URL}?query=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Iconify search ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const icons = (data.icons || []).map(icon => ({
    name: icon,
    svg_url: `https://api.iconify.design/${icon}.svg`,
    browse_url: `https://icon-sets.iconify.design/icon/${icon.replace(":", "/")}`
  }));

  return {
    query,
    total: data.total || icons.length,
    icons
  };
}

function describe() {
  return {
    name: "Iconify Icon Search",
    params: {
      query: "string (required for search) — icon search term",
      limit: "number (optional, default 20) — max results",
      action: "string (optional) — 'search' or 'collections'"
    },
    example: { query: "dashboard", limit: 10 }
  };
}

module.exports = { invoke, describe };
