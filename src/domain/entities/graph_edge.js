/**
 * GraphEdge — a weighted edge in the knowledge graph.
 *
 * Edges track relationships between capabilities: co-usage, shared category,
 * shared consumer, and LSD-discovered connections.
 *
 * Hebbian learning: reinforce on co-activation, weaken on disuse, decay over time.
 * Mirrors Strategy entity's learning pattern from v2/memory.
 */

const { VALID_EDGE_TYPES, DECAY_HALF_LIFE_DAYS, DECAY_FLOOR } = require("../constants");

class GraphEdge {
  /**
   * @param {object} raw
   * @param {string} raw.source
   * @param {string} raw.target
   * @param {string} raw.type - consumer|category|co-usage|lsd
   * @param {number} [raw.weight=0.1]
   * @param {string} [raw.lastActivated]
   * @param {string} [raw.createdAt]
   * @param {string} [raw.reason] - LSD-discovered edges include a reason
   */
  constructor(raw) {
    if (!raw.source) throw new Error("GraphEdge source is required");
    if (!raw.target) throw new Error("GraphEdge target is required");
    if (raw.source === raw.target) throw new Error("GraphEdge source and target must differ");
    if (!VALID_EDGE_TYPES.includes(raw.type)) {
      throw new Error(`Invalid edge type "${raw.type}". Must be one of: ${VALID_EDGE_TYPES.join(", ")}`);
    }

    // Canonical order: alphabetically sorted so A→B === B→A
    const sorted = [raw.source, raw.target].sort();
    this.source = sorted[0];
    this.target = sorted[1];
    this.type = raw.type;
    this.weight = typeof raw.weight === "number" ? Math.max(0, Math.min(1, raw.weight)) : 0.1;
    this.lastActivated = raw.lastActivated || new Date().toISOString();
    this.createdAt = raw.createdAt || new Date().toISOString();
    this.reason = raw.reason || null;
  }

  /** Canonical key for deduplication: "source::target" (already sorted) */
  canonicalKey() {
    return `${this.source}::${this.target}`;
  }

  /**
   * Hebbian reinforcement — logarithmic dampening near 1.0.
   * Returns a new GraphEdge (immutable pattern).
   * @param {number} [delta=0.1] - base reinforcement rate
   * @returns {GraphEdge}
   */
  reinforce(delta = 0.1) {
    return new GraphEdge({
      ...this,
      weight: Math.min(1, this.weight + delta * (1 - this.weight)),
      lastActivated: new Date().toISOString(),
    });
  }

  /**
   * Weaken by multiplicative factor.
   * @param {number} [factor=0.95]
   * @returns {GraphEdge}
   */
  weaken(factor = 0.95) {
    return new GraphEdge({
      ...this,
      weight: Math.max(0, this.weight * factor),
      lastActivated: new Date().toISOString(),
    });
  }

  /**
   * Time-based exponential decay — half-life model.
   * Returns a new GraphEdge with decayed weight.
   * @param {number} [halfLifeDays=30]
   * @returns {GraphEdge}
   */
  decay(halfLifeDays = DECAY_HALF_LIFE_DAYS) {
    if (!this.lastActivated) return this;
    const daysSince = (Date.now() - new Date(this.lastActivated).getTime()) / 86_400_000;
    const factor = Math.pow(0.5, daysSince / halfLifeDays);
    return new GraphEdge({
      ...this,
      weight: Math.max(0, this.weight * factor),
    });
  }

  /** Is this edge below the decay floor? */
  isBelowFloor(floor = DECAY_FLOOR) {
    return this.weight < floor;
  }

  /** Get the neighbor of a given node in this edge */
  neighborOf(nodeId) {
    if (this.source === nodeId) return this.target;
    if (this.target === nodeId) return this.source;
    return null;
  }
}

module.exports = { GraphEdge, VALID_EDGE_TYPES };
