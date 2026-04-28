/**
 * SearchResult — a capability match with score and method metadata.
 */

const VALID_METHODS = ["text", "semantic", "graph-expanded", "lsd", "suggestion"];

class SearchResult {
  /**
   * @param {object} raw
   * @param {import('./capability').Capability} raw.capability
   * @param {number} [raw.score=0]
   * @param {string} [raw.method="text"]
   */
  constructor(raw) {
    if (!raw.capability) throw new Error("SearchResult capability is required");

    this.capability = raw.capability;
    this.score = typeof raw.score === "number" ? raw.score : 0;
    this.method = VALID_METHODS.includes(raw.method) ? raw.method : "text";
  }

  toJSON() {
    return {
      ...this.capability.toSummary(),
      score: this.score,
      method: this.method,
    };
  }
}

module.exports = { SearchResult, VALID_METHODS };
