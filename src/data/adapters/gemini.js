/**
 * Gemini Adapter — Google AI API
 *
 * Chat, summarize, analyze with Gemini models.
 * Docs: https://ai.google.dev/gemini-api/docs
 * Auth: GEMINI_API_KEY
 *
 * invoke({ prompt, system?, model?, temperature? })
 *   prompt: user message (required)
 *   system: system instruction (optional)
 *   model: gemini-2.5-flash | gemini-2.0-flash | gemini-1.5-pro (default: gemini-2.5-flash)
 *   temperature: 0-2 (default: 0.7)
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function getKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { prompt, system, model = "gemini-2.5-flash", temperature = 0.7 } = params;
  if (!prompt) throw new Error("Missing required param: prompt");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature }
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${getKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map(p => p.text).join("") || "";

  return {
    model,
    response: text,
    finish_reason: candidate?.finishReason,
    usage: data.usageMetadata ? {
      prompt_tokens: data.usageMetadata.promptTokenCount,
      completion_tokens: data.usageMetadata.candidatesTokenCount,
      total_tokens: data.usageMetadata.totalTokenCount
    } : null
  };
}

function describe() {
  return {
    name: "Google Gemini AI",
    params: {
      prompt: "string (required) — user message",
      system: "string (optional) — system instruction",
      model: "gemini-2.5-flash|gemini-2.0-flash|gemini-1.5-pro (default: gemini-2.5-flash)",
      temperature: "number 0-2 (default: 0.7)"
    },
    example: { prompt: "Explain clean architecture in 3 sentences", model: "gemini-2.5-flash" }
  };
}

module.exports = { invoke, describe };
