/**
 * Ollama Adapter — Local LLM Fleet
 *
 * List models, show details, generate text.
 * Endpoint: http://localhost:11434
 * Auth: None required
 *
 * invoke({ action: "list" }) → list installed models
 * invoke({ action: "show", model }) → model details
 * invoke({ action: "generate", model, prompt, system }) → generate text
 */

const rawHost = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_HOST = rawHost.startsWith("http") ? rawHost : `http://${rawHost}`;

async function invoke(params = {}) {
  const { action, model, prompt, system } = params;

  if (!action) throw new Error("Missing required param: action (list|show|generate)");

  switch (action) {
    case "list": {
      const res = await fetch(`${OLLAMA_HOST}/api/tags`);
      if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        count: data.models?.length || 0,
        models: (data.models || []).map(m => ({
          name: m.name,
          size: m.size,
          modified: m.modified_at,
          family: m.details?.family,
          parameters: m.details?.parameter_size
        }))
      };
    }

    case "show": {
      if (!model) throw new Error("Missing required param: model");
      const res = await fetch(`${OLLAMA_HOST}/api/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: model })
      });
      if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        model,
        family: data.details?.family,
        parameters: data.details?.parameter_size,
        quantization: data.details?.quantization_level,
        format: data.details?.format,
        template: data.template?.substring(0, 200)
      };
    }

    case "generate": {
      if (!model) throw new Error("Missing required param: model");
      if (!prompt) throw new Error("Missing required param: prompt");
      const body = { model, prompt, stream: false };
      if (system) body.system = system;
      const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        model,
        response: data.response,
        eval_count: data.eval_count,
        eval_duration_ms: data.eval_duration ? Math.round(data.eval_duration / 1e6) : null
      };
    }

    default:
      throw new Error(`Unknown action: ${action}. Use: list, show, generate`);
  }
}

function describe() {
  return {
    name: "Ollama Local LLM",
    params: {
      action: "list|show|generate (required)",
      model: "string — model name (required for show/generate)",
      prompt: "string — text prompt (required for generate)",
      system: "string — system prompt (optional, for generate)"
    },
    example: { action: "list" }
  };
}

module.exports = { invoke, describe };
