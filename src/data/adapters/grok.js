/**
 * Grok Adapter — xAI LLM API
 *
 * Chat completions via xAI API (OpenAI-compatible).
 * Docs: https://docs.x.ai
 * Auth: GROK_API_KEY
 *
 * invoke({ prompt, system?, model?, temperature? })
 *   prompt: user message (required)
 *   system: system prompt (optional)
 *   model: grok-4-1-fast | grok-3-mini-fast | grok-3 (default: grok-4-1-fast)
 *   temperature: 0-2 (default: 0.7)
 */

const API_BASE = "https://api.x.ai/v1";

function getKey() {
  const key = process.env.GROK_API_KEY;
  if (!key) throw new Error("GROK_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { prompt, system, model = "grok-4-1-fast", temperature = 0.7 } = params;
  if (!prompt) throw new Error("Missing required param: prompt");

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getKey()}`
    },
    body: JSON.stringify({ messages, model, stream: false, temperature })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`xAI API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];

  return {
    model: data.model,
    response: choice?.message?.content || "",
    finish_reason: choice?.finish_reason,
    usage: data.usage ? {
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens
    } : null
  };
}

function describe() {
  return {
    name: "Grok (xAI) LLM",
    params: {
      prompt: "string (required) — user message",
      system: "string (optional) — system prompt",
      model: "grok-4-1-fast|grok-3-mini-fast|grok-3 (default: grok-4-1-fast)",
      temperature: "number 0-2 (default: 0.7)"
    },
    example: { prompt: "Explain quantum computing in one sentence", model: "grok-4-1-fast" }
  };
}

module.exports = { invoke, describe };
