/**
 * DirectLSDProvider — Lateral Synapse Discovery via direct Ollama calls.
 *
 * Fallback when Langflow/Pi is unavailable. Uses the same LSD system prompt
 * from v1 lsd.js, calling Ollama directly.
 */

const { ILSDProvider } = require("../../../domain/repositories/i_lsd_provider");
const { OLLAMA_HOST, OLLAMA_MODEL } = require("../../../domain/constants");

const LSD_SYSTEM_PROMPT = `You are a creative AI system analyst. Given a list of tools and capabilities, find unexpected but useful connections between them. Think about how combining tools could create new workflows, solve problems in novel ways, or enhance existing processes. Return a JSON array of objects: { source: "id1", target: "id2", reason: "why these connect", strength: 0.1-0.5 }. Return 3-8 connections. Only connect tools that are NOT already obviously related (different categories preferred).`;

class DirectLSDProvider extends ILSDProvider {
  /**
   * @param {object} [opts]
   * @param {string} [opts.host] - Ollama host URL
   * @param {string} [opts.model] - Ollama model name
   */
  constructor(opts = {}) {
    super();
    this.host = opts.host || OLLAMA_HOST;
    this.model = opts.model || OLLAMA_MODEL;
  }

  /**
   * @param {import('../../../domain/entities/capability').Capability[]} capabilities
   * @returns {Promise<{source: string, target: string, reason: string, strength: number}[]>}
   */
  async discover(capabilities) {
    const capList = capabilities.map(c =>
      `- ${c.id} | ${c.name} | ${c.tier} | ${c.category} | ${c.description}`
    ).join("\n");

    try {
      const res = await fetch(`${this.host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: LSD_SYSTEM_PROMPT },
            { role: "user", content: capList },
          ],
          stream: false,
        }),
      });

      if (!res.ok) {
        console.log(`[knowledge-v2] LSD direct: Ollama returned ${res.status}`);
        return [];
      }

      const data = await res.json();
      const raw = data.message?.content || "";
      return this._parseResponse(raw);
    } catch (err) {
      console.log(`[knowledge-v2] LSD direct: ${err.message}`);
      return [];
    }
  }

  /** Parse LLM response JSON */
  _parseResponse(raw) {
    try {
      let cleaned = raw.trim();
      const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) cleaned = fence[1].trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(s => s.source && s.target && s.reason);
    } catch {
      return [];
    }
  }
}

module.exports = { DirectLSDProvider, LSD_SYSTEM_PROMPT };
