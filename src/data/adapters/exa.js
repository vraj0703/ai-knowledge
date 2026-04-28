/**
 * Exa.ai Adapter — Web Search API
 *
 * Semantic search, content retrieval, website crawling.
 * Docs: https://docs.exa.ai
 * Auth: EXA_API_KEY
 *
 * invoke({ query, type?, numResults?, contents?, category? })
 *   type: "auto" | "fast" | "deep" | "deep-reasoning" (default: "auto")
 *   numResults: 1-10 (default: 5)
 *   contents: "highlights" | "text" | false (default: "highlights")
 *   category: "news" | "company" | "people" | "tweet" | "research paper" (optional)
 */

const API_BASE = "https://api.exa.ai";

function getKey() {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error("EXA_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { query, type = "auto", numResults = 5, contents = "highlights", category } = params;
  if (!query) throw new Error("Missing required param: query");

  const body = {
    query,
    type,
    num_results: Math.min(numResults, 10)
  };

  if (category) body.category = category;

  // Content config — highlights (compact) or text (full)
  if (contents === "text") {
    body.contents = { text: { maxCharacters: 10000 } };
  } else if (contents === "highlights" || contents === true) {
    body.contents = { highlights: { maxCharacters: 4000 } };
  }

  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getKey()
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Exa API ${res.status}: ${err}`);
  }

  const data = await res.json();

  return {
    query,
    count: data.results?.length || 0,
    results: (data.results || []).map(r => ({
      title: r.title,
      url: r.url,
      score: r.score,
      published: r.publishedDate,
      text: r.text?.substring(0, 500),
      highlights: r.highlights
    }))
  };
}

async function getContents(params = {}) {
  const { urls, mode = "highlights" } = params;
  if (!urls || !urls.length) throw new Error("Missing required param: urls");

  const body = { urls };
  if (mode === "text") {
    body.text = { maxCharacters: 20000 };
  } else {
    body.highlights = { maxCharacters: 4000 };
  }

  const res = await fetch(`${API_BASE}/contents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getKey()
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Exa API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    count: data.results?.length || 0,
    results: (data.results || []).map(r => ({
      title: r.title,
      url: r.url,
      text: r.text?.substring(0, 1000),
      highlights: r.highlights
    }))
  };
}

function describe() {
  return {
    name: "Exa.ai Web Search",
    params: {
      query: "string (required) — search query",
      type: "auto|fast|deep|deep-reasoning (default: auto)",
      numResults: "number 1-10 (default: 5)",
      contents: "highlights|text|false (default: highlights)",
      category: "news|company|people|tweet|research paper (optional)"
    },
    example: { query: "flutter state management 2025", numResults: 3 }
  };
}

module.exports = { invoke, getContents, describe };
