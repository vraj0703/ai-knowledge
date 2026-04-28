/**
 * MyMemory Translation Adapter — Free Machine Translation
 *
 * Uses MyMemory API (mymemory.translated.net) — truly free, no auth.
 * 1000 words/day anonymous, 10000 with email. Replaces DeepL.
 *
 * invoke({ text, source, target, action })
 *   text:   string (required for translate) — text to translate
 *   source: string (optional, default "en") — source language code
 *   target: string (optional, default "hi") — target language code
 *   action: string (optional, default "translate") — "translate" | "detect"
 */

const BASE_URL = "https://api.mymemory.translated.net";

async function invoke(params = {}, credentials = {}) {
  const { text, source = "en", target = "hi", action = "translate" } = params;

  if (action === "detect") {
    if (!text) throw new Error("Missing required param: text");
    // Use translate endpoint with auto-detect
    const url = `${BASE_URL}/get?q=${encodeURIComponent(text.slice(0, 200))}&langpair=autodetect|en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MyMemory ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      text: text.slice(0, 200),
      detected: data.responseData?.detectedLanguage || "unknown",
      confidence: data.responseData?.match || 0
    };
  }

  // Default: translate
  if (!text) throw new Error("Missing required param: text");

  const langpair = `${source}|${target}`;
  const url = `${BASE_URL}/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory ${res.status}: ${await res.text()}`);
  const data = await res.json();

  if (data.responseStatus !== 200 && data.responseStatus !== "200") {
    throw new Error(`MyMemory error: ${data.responseDetails || "unknown"}`);
  }

  return {
    original: text,
    translated: data.responseData?.translatedText || "",
    source,
    target,
    match: data.responseData?.match || 0
  };
}

function describe() {
  return {
    name: "MyMemory Translation",
    params: {
      text: "string (required) — text to translate",
      source: "string (optional, default 'en') — source language code",
      target: "string (optional, default 'hi') — target language code",
      action: "string (optional) — 'translate' or 'detect'"
    },
    example: { text: "Good morning", target: "hi" }
  };
}

module.exports = { invoke, describe };
