/**
 * Dictionary Adapter — English Definitions
 *
 * Free Dictionary API, no auth required.
 *
 * invoke({ word })
 *   word: string (required) — English word to look up
 */

const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

async function invoke(params = {}) {
  const { word } = params;
  if (!word) throw new Error("Missing required param: word");

  const res = await fetch(`${API_BASE}/${encodeURIComponent(word)}`);
  if (res.status === 404) throw new Error(`Word not found: ${word}`);
  if (!res.ok) throw new Error(`Dictionary ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const entry = data[0] || {};
  const meanings = (entry.meanings || []).slice(0, 3).map(m => ({
    partOfSpeech: m.partOfSpeech,
    definitions: (m.definitions || []).slice(0, 2).map(d => ({
      definition: d.definition,
      ...(d.example ? { example: d.example } : {})
    }))
  }));

  return {
    word: entry.word || word,
    phonetic: entry.phonetic || entry.phonetics?.[0]?.text || null,
    meanings
  };
}

function describe() {
  return {
    name: "English Dictionary",
    params: {
      word: "string (required) — English word to look up"
    },
    example: { word: "serendipity" }
  };
}

module.exports = { invoke, describe };
