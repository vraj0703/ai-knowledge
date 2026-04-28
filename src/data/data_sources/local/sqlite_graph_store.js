/**
 * SQLiteGraphStore — knowledge graph edge storage backed by better-sqlite3.
 *
 * Persists weighted edges between capability nodes. Supports Hebbian learning
 * operations (reinforce, weaken, decay) via GraphEdge entity methods.
 *
 * Pattern: mirrors memory/data/data_sources/local/sqlite_vector_store.js
 */

const path = require("path");
const { IGraphStore } = require("../../../domain/repositories/i_graph_store");
const { GraphEdge } = require("../../../domain/entities/graph_edge");

class SQLiteGraphStore extends IGraphStore {
  constructor(opts = {}) {
    super();
    const Database = require("better-sqlite3");
    const dbPath = opts.dbPath || path.resolve(process.cwd(), "knowledge", "data", "data_sources", "local", "knowledge.db");
    require("fs").mkdirSync(path.dirname(dbPath), { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this._initSchema();
  }

  _initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS edges (
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('consumer','category','co-usage','lsd')),
        weight REAL DEFAULT 0.1,
        last_activated TEXT,
        created_at TEXT NOT NULL,
        reason TEXT,
        PRIMARY KEY (source, target)
      );
      CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source);
      CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target);
      CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(type);
    `);
  }

  /**
   * Map a DB row to a GraphEdge entity.
   * @param {object} row
   * @returns {GraphEdge}
   */
  _rowToEdge(row) {
    return new GraphEdge({
      source: row.source,
      target: row.target,
      type: row.type,
      weight: row.weight,
      lastActivated: row.last_activated,
      createdAt: row.created_at,
      reason: row.reason,
    });
  }

  /**
   * Canonical sort — ensures [source, target] are alphabetically ordered
   * to match GraphEdge constructor behavior.
   * @param {string} a
   * @param {string} b
   * @returns {[string, string]}
   */
  _canonical(a, b) {
    return [a, b].sort();
  }

  /** @returns {Promise<GraphEdge[]>} */
  async loadAll() {
    const rows = this.db.prepare(`SELECT * FROM edges ORDER BY weight DESC`).all();
    return rows.map(r => this._rowToEdge(r));
  }

  /**
   * @param {string} source
   * @param {string} target
   * @returns {Promise<GraphEdge|null>}
   */
  async getEdge(source, target) {
    const [s, t] = this._canonical(source, target);
    const row = this.db.prepare(`SELECT * FROM edges WHERE source = ? AND target = ?`).get(s, t);
    return row ? this._rowToEdge(row) : null;
  }

  /**
   * @param {string} nodeId
   * @param {number} [limit=10]
   * @returns {Promise<GraphEdge[]>}
   */
  async getNeighbors(nodeId, limit = 10) {
    const rows = this.db.prepare(
      `SELECT * FROM edges WHERE source = ? OR target = ? ORDER BY weight DESC LIMIT ?`
    ).all(nodeId, nodeId, limit);
    return rows.map(r => this._rowToEdge(r));
  }

  /**
   * @param {string} type
   * @returns {Promise<GraphEdge[]>}
   */
  async getByType(type) {
    const rows = this.db.prepare(`SELECT * FROM edges WHERE type = ? ORDER BY weight DESC`).all(type);
    return rows.map(r => this._rowToEdge(r));
  }

  /**
   * @param {GraphEdge} edge
   * @returns {Promise<GraphEdge>}
   */
  async addEdge(edge) {
    this.db.prepare(`
      INSERT OR REPLACE INTO edges (source, target, type, weight, last_activated, created_at, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(edge.source, edge.target, edge.type, edge.weight, edge.lastActivated, edge.createdAt, edge.reason);
    return edge;
  }

  /**
   * @param {GraphEdge} edge
   * @returns {Promise<void>}
   */
  async updateEdge(edge) {
    this.db.prepare(`
      UPDATE edges SET weight = ?, last_activated = ?, reason = ?
      WHERE source = ? AND target = ?
    `).run(edge.weight, edge.lastActivated, edge.reason, edge.source, edge.target);
  }

  /**
   * @param {string} source
   * @param {string} target
   * @returns {Promise<boolean>}
   */
  async removeEdge(source, target) {
    const [s, t] = this._canonical(source, target);
    const result = this.db.prepare(`DELETE FROM edges WHERE source = ? AND target = ?`).run(s, t);
    return result.changes > 0;
  }

  /**
   * @param {string} nodeId
   * @returns {Promise<number>}
   */
  async removeNode(nodeId) {
    const result = this.db.prepare(`DELETE FROM edges WHERE source = ? OR target = ?`).run(nodeId, nodeId);
    return result.changes;
  }

  /** @returns {Promise<{totalEdges: number, byType: object, avgWeight: number, strongest: object[]}>} */
  async stats() {
    const totalRow = this.db.prepare(`SELECT COUNT(*) as cnt FROM edges`).get();
    const totalEdges = totalRow.cnt;

    const typeRows = this.db.prepare(`SELECT type, COUNT(*) as cnt FROM edges GROUP BY type`).all();
    const byType = {};
    for (const r of typeRows) {
      byType[r.type] = r.cnt;
    }

    const avgRow = this.db.prepare(`SELECT AVG(weight) as avg FROM edges`).get();
    const avgWeight = avgRow.avg || 0;

    const strongest = this.db.prepare(
      `SELECT * FROM edges ORDER BY weight DESC LIMIT 5`
    ).all().map(r => this._rowToEdge(r));

    return { totalEdges, byType, avgWeight, strongest };
  }

  /** Close the database connection. */
  close() {
    this.db.close();
  }
}

module.exports = { SQLiteGraphStore };
