/**
 * Freepik Adapter — Stock Vectors, Photos, PSD Files
 *
 * 30M+ premium and free resources.
 * Docs: https://docs.freepik.com/introduction
 * Auth: FREEPIK_API_KEY
 *
 * invoke({ query, type?, page?, per_page? })
 *   query: search term (required)
 *   type: photo|vector|psd|all (default: all)
 *   page: page number (default: 1)
 *   per_page: 1-50 (default: 10)
 */

const API_BASE = "https://api.freepik.com/v1";

function getKey() {
  const key = process.env.FREEPIK_API_KEY;
  if (!key) throw new Error("FREEPIK_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { query, type = "all", page = 1, per_page = 10 } = params;
  if (!query) throw new Error("Missing required param: query");

  const qs = new URLSearchParams({
    term: query,
    page: String(page),
    limit: String(Math.min(per_page, 50))
  });

  if (type !== "all") {
    qs.set(`filters[content_type][${type}]`, "1");
  }

  const res = await fetch(`${API_BASE}/resources?${qs}`, {
    headers: { "x-freepik-api-key": getKey() }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Freepik API ${res.status}: ${err}`);
  }

  const body = await res.json();
  const items = body.data || [];

  return {
    query,
    count: items.length,
    resources: items.map(r => ({
      id: r.id,
      title: r.title,
      url: r.url,
      preview_url: r.preview?.url || null,
      type: r.type,
      premium: !!r.is_premium
    }))
  };
}

function describe() {
  return {
    name: "Freepik Stock Resources",
    params: {
      query: "string (required) — search term",
      type: "photo|vector|psd|all (default: all)",
      page: "number (default: 1)",
      per_page: "number 1-50 (default: 10)"
    },
    example: { query: "business infographic", type: "vector", per_page: 5 }
  };
}

module.exports = { invoke, describe };
