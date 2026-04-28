/**
 * InMemoryGraphStore — default mock for SQLiteGraphStore.
 *
 * Map-backed nodes + edges. Implements the public surface the rest of the
 * organ depends on so use cases run without SQLite. Hebbian strengthening
 * works on in-memory weights.
 */

class InMemoryGraphStore {
  constructor() {
    this._nodes = new Map();   // id -> { id, kind, name, status, meta }
    this._edges = new Map();   // `${from}|${to}|${type}` -> { from, to, type, weight, last_used }
  }

  // ─── Nodes ─────────────────────────────────────────────────

  async upsertNode(node) {
    const n = { ...node, mock: true };
    this._nodes.set(n.id, n);
    return n.id;
  }

  async getNode(id) {
    return this._nodes.get(id) || null;
  }

  async listNodes({ status } = {}) {
    const all = Array.from(this._nodes.values());
    return status ? all.filter((n) => n.status === status) : all;
  }

  async deleteNode(id) {
    return this._nodes.delete(id);
  }

  // ─── Edges ─────────────────────────────────────────────────

  _key(from, to, type) {
    return `${from}|${to}|${type}`;
  }

  async upsertEdge(edge) {
    const e = {
      from: edge.from,
      to: edge.to,
      type: edge.type,
      weight: edge.weight ?? 0,
      last_used: edge.last_used || new Date().toISOString(),
      mock: true,
    };
    this._edges.set(this._key(e.from, e.to, e.type), e);
    return true;
  }

  async getEdge(from, to, type) {
    return this._edges.get(this._key(from, to, type)) || null;
  }

  async listEdges({ from, to, type } = {}) {
    const all = Array.from(this._edges.values());
    return all.filter((e) =>
      (!from || e.from === from) && (!to || e.to === to) && (!type || e.type === type),
    );
  }

  async neighbors(id, { limit = 10 } = {}) {
    const all = Array.from(this._edges.values())
      .filter((e) => e.from === id || e.to === id)
      .sort((a, b) => b.weight - a.weight);
    return all.slice(0, limit);
  }

  async reinforce(from, to, type, amount = 0.1) {
    const k = this._key(from, to, type);
    const e = this._edges.get(k);
    if (!e) return null;
    e.weight = Math.min(1.0, e.weight + amount);
    e.last_used = new Date().toISOString();
    return e;
  }
}

module.exports = { InMemoryGraphStore };
