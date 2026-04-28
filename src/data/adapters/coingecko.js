/**
 * CoinGecko Adapter — Cryptocurrency Prices
 *
 * Free crypto price data and trending coins.
 * Docs: https://www.coingecko.com/en/api/documentation
 * Auth: None (rate limited ~10-30 req/min)
 *
 * invoke({ action, ids?, vs_currency? })
 *   action: "price" | "trending" (default: "price")
 *   ids: comma-separated coin IDs (default: "bitcoin,ethereum")
 *   vs_currency: fiat currency (default: "inr")
 */

const API_BASE = "https://api.coingecko.com/api/v3";

async function invoke(params = {}) {
  const { action = "price", ids = "bitcoin,ethereum", vs_currency = "inr" } = params;

  if (action === "trending") {
    const res = await fetch(`${API_BASE}/search/trending`);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`CoinGecko API ${res.status}: ${err}`);
    }

    const data = await res.json();
    const trending = (data.coins || []).slice(0, 7).map(c => ({
      name: c.item.name,
      symbol: c.item.symbol,
      market_cap_rank: c.item.market_cap_rank
    }));

    return { trending };
  }

  // Default: price
  const url = `${API_BASE}/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${encodeURIComponent(vs_currency)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CoinGecko API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return { prices: data };
}

function describe() {
  return {
    name: "CoinGecko — Crypto Prices",
    params: {
      action: "string (optional) — 'price' or 'trending' (default: 'price')",
      ids: "string (optional) — comma-separated coin IDs (default: 'bitcoin,ethereum')",
      vs_currency: "string (optional) — fiat currency code (default: 'inr')"
    },
    example: { action: "price", ids: "bitcoin,ethereum,solana", vs_currency: "inr" }
  };
}

module.exports = { invoke, describe };
