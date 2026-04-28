/**
 * uiGradients Adapter — CSS Gradient Collection
 *
 * Fetches gradient definitions from the uiGradients GitHub JSON.
 * No API key needed.
 *
 * invoke({ query? })
 *   query: string — gradient name to search for (optional, returns all if omitted)
 */

const GRADIENTS_JSON = "https://raw.githubusercontent.com/ghosh/uiGradients/master/gradients.json";

async function invoke(params = {}) {
  const { query } = params;

  try {
    const res = await fetch(GRADIENTS_JSON, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { query, url: GRADIENTS_JSON, status: `error-${res.status}` };
    }

    const gradients = await res.json();

    let results = gradients;
    if (query) {
      const q = query.toLowerCase();
      results = gradients.filter(g => g.name.toLowerCase().includes(q));
    }

    // Limit output to 20
    const limited = results.slice(0, 20);

    return {
      query,
      url: "https://uigradients.com/",
      totalGradients: gradients.length,
      matchCount: results.length,
      gradients: limited.map(g => ({
        name: g.name,
        colors: g.colors
      }))
    };
  } catch (err) {
    return {
      query,
      url: "https://uigradients.com/",
      status: "fetch-failed",
      error: err.message,
      note: "URL is still valid for manual browsing"
    };
  }
}

function describe() {
  return {
    name: "uiGradients — CSS Gradient Collection",
    params: {
      query: "string — gradient name filter (optional)"
    },
    example: { query: "sunset" }
  };
}

module.exports = { invoke, describe };
