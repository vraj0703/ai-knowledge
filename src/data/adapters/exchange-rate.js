/**
 * Exchange Rate Adapter — Currency Exchange Rates
 *
 * Free API via open.er-api.com, no auth required.
 *
 * invoke({ base?, targets? })
 *   base: currency code (default: "INR")
 *   targets: array of codes (default: ["USD", "EUR", "GBP"])
 */

const API_BASE = "https://open.er-api.com/v6/latest";

async function invoke(params = {}) {
  const { base = "INR", targets = ["USD", "EUR", "GBP"] } = params;

  const res = await fetch(`${API_BASE}/${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error(`ExchangeRate ${res.status}: ${await res.text()}`);
  const data = await res.json();

  if (data.result !== "success") {
    throw new Error(`ExchangeRate error: ${data["error-type"] || "unknown"}`);
  }

  const rates = {};
  for (const code of targets) {
    const upper = code.toUpperCase();
    if (data.rates[upper] !== undefined) {
      rates[upper] = data.rates[upper];
    }
  }

  return {
    base: base.toUpperCase(),
    rates,
    updated: data.time_last_update_utc
  };
}

function describe() {
  return {
    name: "Currency Exchange Rates",
    params: {
      base: "string — base currency code (default: INR)",
      targets: "string[] — target currency codes (default: [USD, EUR, GBP])"
    },
    example: { base: "INR", targets: ["USD", "EUR"] }
  };
}

module.exports = { invoke, describe };
