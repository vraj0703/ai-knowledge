/**
 * IGraphStore — abstract interface for the knowledge graph (SQLite-backed).
 *
 * Manages weighted edges between capability nodes.
 * Supports Hebbian learning operations.
 */
class IGraphStore {
  /** @returns {Promise<import('../entities/graph_edge').GraphEdge[]>} */
  async loadAll() { throw new Error("not implemented"); }

  /**
   * @param {string} source
   * @param {string} target
   * @returns {Promise<import('../entities/graph_edge').GraphEdge|null>}
   */
  async getEdge(source, target) { throw new Error("not implemented"); }

  /**
   * Get neighbors of a node, sorted by weight descending.
   * @param {string} nodeId
   * @param {number} [limit=10]
   * @returns {Promise<import('../entities/graph_edge').GraphEdge[]>}
   */
  async getNeighbors(nodeId, limit) { throw new Error("not implemented"); }

  /**
   * @param {string} type
   * @returns {Promise<import('../entities/graph_edge').GraphEdge[]>}
   */
  async getByType(type) { throw new Error("not implemented"); }

  /**
   * Add or upsert an edge.
   * @param {import('../entities/graph_edge').GraphEdge} edge
   * @returns {Promise<import('../entities/graph_edge').GraphEdge>}
   */
  async addEdge(edge) { throw new Error("not implemented"); }

  /**
   * Update an existing edge (e.g., after reinforce/weaken/decay).
   * @param {import('../entities/graph_edge').GraphEdge} edge
   * @returns {Promise<void>}
   */
  async updateEdge(edge) { throw new Error("not implemented"); }

  /**
   * Remove an edge.
   * @param {string} source
   * @param {string} target
   * @returns {Promise<boolean>}
   */
  async removeEdge(source, target) { throw new Error("not implemented"); }

  /**
   * Remove all edges touching a node.
   * @param {string} nodeId
   * @returns {Promise<number>} count removed
   */
  async removeNode(nodeId) { throw new Error("not implemented"); }

  /** @returns {Promise<{totalEdges: number, byType: object, avgWeight: number, strongest: object[]}>} */
  async stats() { throw new Error("not implemented"); }

  /** Close the database connection. */
  close() {}
}

module.exports = { IGraphStore };
