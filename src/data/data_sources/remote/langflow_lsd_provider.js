/**
 * LangflowLSDProvider — Lateral Synapse Discovery via Langflow on Pi.
 *
 * Calls a Langflow flow deployed at http://100.108.180.118:7860 to discover
 * unexpected connections between capabilities using LLM reasoning.
 *
 * Falls back gracefully if Langflow is unavailable.
 */

const { ILSDProvider } = require("../../../domain/repositories/i_lsd_provider");
const { LANGFLOW_HOST, LANGFLOW_TIMEOUT_MS } = require("../../../domain/constants");

class LangflowLSDProvider extends ILSDProvider {
  /**
   * @param {object} [opts]
   * @param {string} [opts.host] - Langflow host URL
   * @param {string} [opts.flowName] - Name of the LSD flow to use
   * @param {number} [opts.timeout] - Request timeout in ms
   */
  constructor(opts = {}) {
    super();
    this.host = opts.host || LANGFLOW_HOST;
    this.flowName = opts.flowName || "PROTOCOL-LSD";
    this.timeout = opts.timeout || LANGFLOW_TIMEOUT_MS;
    this._flowId = null;
  }

  /**
   * Check if Langflow is reachable.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.host}/health`, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Discover the flow ID by name.
   * @returns {Promise<string|null>}
   */
  async _resolveFlowId() {
    if (this._flowId) return this._flowId;
    try {
      const res = await fetch(`${this.host}/api/v1/flows/`);
      if (!res.ok) return null;
      const flows = await res.json();
      const match = flows.find(f => f.name === this.flowName);
      if (match) this._flowId = match.id;
      return this._flowId;
    } catch {
      return null;
    }
  }

  /**
   * @param {import('../../../domain/entities/capability').Capability[]} capabilities
   * @returns {Promise<{source: string, target: string, reason: string, strength: number}[]>}
   */
  async discover(capabilities) {
    const flowId = await this._resolveFlowId();
    if (!flowId) {
      console.log("[knowledge-v2] LSD: Langflow flow not found, returning empty");
      return [];
    }

    const capList = capabilities.map(c =>
      `- ${c.id} | ${c.name} | ${c.tier} | ${c.category} | ${c.description}`
    ).join("\n");

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      const res = await fetch(`${this.host}/api/v1/run/${flowId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_value: capList,
          output_type: "chat",
          input_type: "chat",
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.log(`[knowledge-v2] LSD: Langflow returned ${res.status}`);
        return [];
      }

      const data = await res.json();
      const text = data.outputs?.[0]?.outputs?.[0]?.results?.message?.text || "";
      return this._parseResponse(text);
    } catch (err) {
      console.log(`[knowledge-v2] LSD: Langflow error: ${err.message}`);
      return [];
    }
  }

  /** Parse LLM response JSON from Langflow output */
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

module.exports = { LangflowLSDProvider };
