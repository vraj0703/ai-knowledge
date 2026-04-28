/**
 * PurgoMalum Adapter — Profanity Filter
 *
 * Filters profanity from text using a free web service.
 * Docs: https://www.purgomalum.com
 * Auth: None
 *
 * invoke({ text })
 *   text: string to check/filter (required)
 */

const API = "https://www.purgomalum.com/service/json";

async function invoke(params = {}) {
  const { text } = params;
  if (!text) throw new Error("Missing required param: text");

  const url = `${API}?text=${encodeURIComponent(text)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PurgoMalum API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const filtered = data.result;

  return {
    original: text,
    filtered,
    has_profanity: text !== filtered
  };
}

function describe() {
  return {
    name: "PurgoMalum — Profanity Filter",
    params: {
      text: "string (required) — text to filter for profanity"
    },
    example: { text: "This is some sample text" }
  };
}

module.exports = { invoke, describe };
