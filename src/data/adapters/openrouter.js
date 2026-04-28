/**
 * OpenRouter Adapter — Multi-Model LLM Gateway
 *
 * Unified API for GPT-4o, Claude, Gemini, Llama — free models available.
 * Docs: https://openrouter.ai/docs
 * Auth: OPENROUTER_API_KEY
 *
 * invoke({ prompt, system?, model?, temperature? })
 *   prompt: user message (required)
 *   model: default "google/gemini-2.0-flash-exp:free"
 *   temperature: 0-2 (default: 0.7)
 *
 * invoke({ action: "models" }) — list free models
 */

const API_BASE = "https://openrouter.ai/api/v1";

function getKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  if (params.action === "models") return listFreeModels();

  const { prompt, system, model = "google/gemini-2.0-flash-exp:free", temperature = 0.7 } = params;
  if (!prompt) throw new Error("Missing required param: prompt");

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, messages, temperature })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];

  return {
    model: data.model || model,
    response: choice?.message?.content || "",
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0
    }
  };
}

async function listFreeModels() {
  const res = await fetch(`${API_BASE}/models`, {
    headers: { "Authorization": `Bearer ${getKey()}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const free = (data.data || []).filter(m => m.pricing?.prompt === "0");
  return { count: free.length, models: free.map(m => ({ id: m.id, name: m.name })) };
}

function describe() {
  return {
    name: "OpenRouter — Multi-Model LLM Gateway",
    params: {
      prompt: "string (required) — user message",
      system: "string (optional) — system prompt",
      model: "string (default: google/gemini-2.0-flash-exp:free)",
      temperature: "number 0-2 (default: 0.7)",
      action: '"models" — list free models'
    },
    example: { prompt: "Summarize the benefits of clean architecture", model: "google/gemini-2.0-flash-exp:free" }
  };
}

module.exports = { invoke, describe };
