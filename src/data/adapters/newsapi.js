/**
 * NewsAPI Adapter — World News Headlines
 *
 * 80,000+ news sources, headlines by country/category, full-text search.
 * Docs: https://newsapi.org/docs
 * Auth: NEWSAPI_KEY
 *
 * invoke({ query?, category?, country?, pageSize? })
 *   query: search term (uses /everything endpoint)
 *   category: business|technology|science|health|sports|entertainment|general
 *   country: ISO 3166-1 code, default "in" (India)
 *   pageSize: 1-10, default 5
 */

const API_BASE = "https://newsapi.org/v2";

function getKey() {
  const key = process.env.NEWSAPI_KEY;
  if (!key) throw new Error("NEWSAPI_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { query, category, country = "in", pageSize = 5 } = params;
  const size = Math.min(pageSize, 10);

  let endpoint;
  if (query) {
    endpoint = `${API_BASE}/everything?q=${encodeURIComponent(query)}&pageSize=${size}&sortBy=publishedAt`;
  } else {
    const qs = [`country=${country}`, `pageSize=${size}`];
    if (category) qs.push(`category=${category}`);
    endpoint = `${API_BASE}/top-headlines?${qs.join("&")}`;
  }

  const res = await fetch(endpoint, {
    headers: { "X-Api-Key": getKey() }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NewsAPI ${res.status}: ${err}`);
  }

  const data = await res.json();

  return {
    ...(query ? { query } : { category: category || "general" }),
    total: data.totalResults || 0,
    articles: (data.articles || []).map(a => ({
      title: a.title,
      source: a.source?.name,
      url: a.url,
      publishedAt: a.publishedAt,
      description: a.description
    }))
  };
}

function describe() {
  return {
    name: "NewsAPI — World News Headlines",
    params: {
      query: "string (optional) — search articles by keyword",
      category: "business|technology|science|health|sports|entertainment|general (optional)",
      country: "string (default: in) — ISO country code",
      pageSize: "number 1-10 (default: 5)"
    },
    example: { category: "technology", country: "in", pageSize: 3 }
  };
}

module.exports = { invoke, describe };
