/**
 * ILSDProvider — abstract interface for Lateral Synapse Discovery.
 *
 * Discovers unexpected connections between capabilities using LLM.
 * Can be backed by Langflow (Pi) or direct Ollama calls.
 */
class ILSDProvider {
  /**
   * Discover new edges between capabilities.
   * @param {import('../entities/capability').Capability[]} capabilities - sampled capabilities to analyze
   * @returns {Promise<{source: string, target: string, reason: string, strength: number}[]>}
   */
  async discover(capabilities) { throw new Error("not implemented"); }
}

module.exports = { ILSDProvider };
