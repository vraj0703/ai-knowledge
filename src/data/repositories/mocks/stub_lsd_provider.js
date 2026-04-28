/**
 * StubLSDProvider — default mock for LangflowLSDProvider / DirectLSDProvider.
 *
 * Latent Semantic Discovery — finds new edges between capability nodes.
 * Real path uses an LLM (via Langflow or direct Ollama). Mock returns
 * deterministic suggestions based on shared categories so tests +
 * standalone runs work without a model.
 */

class StubLSDProvider {
  constructor() {
    this._batches = 0;
  }

  async discover({ nodes = [], existing = [] } = {}) {
    this._batches += 1;
    const existingPairs = new Set(
      existing.map((e) => `${e.from}|${e.to}`),
    );
    const suggestions = [];

    // Pair every two nodes that share a category and aren't already linked.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (!a.categories || !b.categories) continue;
        const shared = a.categories.filter((c) => b.categories.includes(c));
        if (shared.length === 0) continue;
        if (existingPairs.has(`${a.id}|${b.id}`) || existingPairs.has(`${b.id}|${a.id}`)) continue;
        suggestions.push({
          from: a.id,
          to: b.id,
          type: "lsd",
          strength: 0.2 + 0.1 * shared.length, // 0.2-0.5
          reason: `[mock] shared categories: ${shared.join(", ")}`,
          mock: true,
        });
      }
    }
    return suggestions;
  }

  async health() {
    return { status: "mock", mock: true };
  }
}

module.exports = { StubLSDProvider };
