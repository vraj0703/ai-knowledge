/**
 * TOMLManifestStore — concrete IManifestStore backed by TOML files on disk.
 *
 * Reads/writes capability manifests from a directory of .toml files.
 * Ported from v1 registry.js, adapted for v2 DDD architecture.
 */

const fs = require("fs");
const path = require("path");
const TOML = require("smol-toml");
const { IManifestStore } = require("../../domain/repositories/i_manifest_store");
const { Capability } = require("../../domain/entities/capability");
const { PathTraversalError } = require("../../domain/exceptions");

class TOMLManifestStore extends IManifestStore {
  /**
   * @param {object} [opts]
   * @param {string} [opts.manifestsDir] - path to manifests directory
   */
  constructor(opts = {}) {
    super();
    this.manifestsDir = opts.manifestsDir ||
      path.join(__dirname, "..", "..", "data", "manifests");
    this.capabilities = new Map();  // id -> Capability
    this.byTier = {};               // tier -> [ids]
    this.byCategory = {};           // category -> [ids]
    this.byConsumer = {};           // consumer -> [ids]
    this._lastLoad = 0;
    this._cacheTTL = 60000;
  }

  // ── Private ──────────────────────────────────────────────

  _ensureLoaded() {
    if (Date.now() - this._lastLoad > this._cacheTTL) {
      this._load();
    }
  }

  _load() {
    this.capabilities.clear();
    this.byTier = {};
    this.byCategory = {};
    this.byConsumer = {};

    let files;
    try {
      files = fs.readdirSync(this.manifestsDir).filter(f => f.endsWith(".toml"));
    } catch (err) {
      console.error(`[TOMLManifestStore] Cannot read manifestsDir: ${err.message}`);
      this._lastLoad = Date.now();
      return;
    }

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.manifestsDir, file), "utf-8");
        const parsed = TOML.parse(content);
        const cap = Capability.fromManifest(parsed, file);

        this.capabilities.set(cap.id, cap);

        // Index by tier
        if (!this.byTier[cap.tier]) this.byTier[cap.tier] = [];
        this.byTier[cap.tier].push(cap.id);

        // Index by category
        if (!this.byCategory[cap.category]) this.byCategory[cap.category] = [];
        this.byCategory[cap.category].push(cap.id);

        // Index by consumer
        this._indexConsumers(cap);
      } catch (err) {
        console.error(`[TOMLManifestStore] Failed to load ${file}: ${err.message}`);
      }
    }

    this._lastLoad = Date.now();
  }

  _indexConsumers(cap) {
    if (cap.mrV) {
      if (!this.byConsumer["mr-v"]) this.byConsumer["mr-v"] = [];
      this.byConsumer["mr-v"].push(cap.id);
    }
    if (cap.pm) {
      if (!this.byConsumer["pm"]) this.byConsumer["pm"] = [];
      this.byConsumer["pm"].push(cap.id);
    }
    for (const m of cap.ministers) {
      const key = `minister-${m}`;
      if (!this.byConsumer[key]) this.byConsumer[key] = [];
      this.byConsumer[key].push(cap.id);
    }
    for (const s of cap.sherpas) {
      const key = `sherpa-${s}`;
      if (!this.byConsumer[key]) this.byConsumer[key] = [];
      this.byConsumer[key].push(cap.id);
    }
  }

  _removeFromIndexes(cap) {
    // Remove from byTier
    if (this.byTier[cap.tier]) {
      this.byTier[cap.tier] = this.byTier[cap.tier].filter(id => id !== cap.id);
      if (this.byTier[cap.tier].length === 0) delete this.byTier[cap.tier];
    }

    // Remove from byCategory
    if (this.byCategory[cap.category]) {
      this.byCategory[cap.category] = this.byCategory[cap.category].filter(id => id !== cap.id);
      if (this.byCategory[cap.category].length === 0) delete this.byCategory[cap.category];
    }

    // Remove from byConsumer (all keys)
    for (const key of Object.keys(this.byConsumer)) {
      this.byConsumer[key] = this.byConsumer[key].filter(id => id !== cap.id);
      if (this.byConsumer[key].length === 0) delete this.byConsumer[key];
    }
  }

  _assertWithinDir(filePath) {
    const resolved = path.resolve(filePath);
    const base = path.resolve(this.manifestsDir);
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw new PathTraversalError(filePath, this.manifestsDir);
    }
  }

  // ── Public API (IManifestStore) ──────────────────────────

  /** @returns {Promise<Capability[]>} */
  async loadAll() {
    this._ensureLoaded();
    return [...this.capabilities.values()];
  }

  /** @param {string} id @returns {Promise<Capability|null>} */
  async getById(id) {
    this._ensureLoaded();
    return this.capabilities.get(id) || null;
  }

  /** @param {string} query @returns {Promise<Capability[]>} */
  async search(query) {
    this._ensureLoaded();
    return [...this.capabilities.values()].filter(cap => cap.matchesQuery(query));
  }

  /** @param {string} category @returns {Promise<Capability[]>} */
  async getByCategory(category) {
    this._ensureLoaded();
    const ids = this.byCategory[category] || [];
    return ids.map(id => this.capabilities.get(id)).filter(Boolean);
  }

  /** @param {string} tier @returns {Promise<Capability[]>} */
  async getByTier(tier) {
    this._ensureLoaded();
    const ids = this.byTier[tier] || [];
    return ids.map(id => this.capabilities.get(id)).filter(Boolean);
  }

  /** @param {string} consumer @returns {Promise<Capability[]>} */
  async getForConsumer(consumer) {
    this._ensureLoaded();
    const ids = this.byConsumer[consumer] || [];
    return ids.map(id => this.capabilities.get(id)).filter(Boolean);
  }

  /**
   * List with composite filters.
   * @param {object} [filters]
   * @param {string} [filters.tier]
   * @param {string} [filters.status]
   * @param {string} [filters.consumer]
   * @param {string} [filters.category]
   * @param {string} [filters.method]
   * @param {string} [filters.search]
   * @returns {Promise<Capability[]>}
   */
  async list(filters = {}) {
    this._ensureLoaded();
    let results = [...this.capabilities.values()];

    if (filters.tier) {
      results = results.filter(cap => cap.tier === filters.tier);
    }
    if (filters.status) {
      results = results.filter(cap => cap.status === filters.status);
    }
    if (filters.consumer) {
      const consumerIds = new Set(this.byConsumer[filters.consumer] || []);
      results = results.filter(cap => consumerIds.has(cap.id));
    }
    if (filters.category) {
      results = results.filter(cap => cap.category === filters.category);
    }
    if (filters.method) {
      results = results.filter(cap => cap.method === filters.method);
    }
    if (filters.search) {
      results = results.filter(cap => cap.matchesQuery(filters.search));
    }

    return results;
  }

  /**
   * Save a capability to disk and update cache.
   * @param {Capability} capability
   * @returns {Promise<void>}
   */
  async save(capability) {
    const filePath = path.resolve(this.manifestsDir, `${capability.id}.toml`);
    this._assertWithinDir(filePath);

    const toml = capability.toManifest();
    fs.writeFileSync(filePath, toml, "utf-8");

    // Update in-memory cache
    const existing = this.capabilities.get(capability.id);
    if (existing) {
      this._removeFromIndexes(existing);
    }

    // Store with _file set
    const stored = new Capability({ ...capability, _file: `${capability.id}.toml` });
    this.capabilities.set(stored.id, stored);

    // Rebuild indexes for this cap
    if (!this.byTier[stored.tier]) this.byTier[stored.tier] = [];
    this.byTier[stored.tier].push(stored.id);

    if (!this.byCategory[stored.category]) this.byCategory[stored.category] = [];
    this.byCategory[stored.category].push(stored.id);

    this._indexConsumers(stored);

    // Invalidate cache so next access reloads fresh
    this._lastLoad = 0;
  }

  /**
   * Remove a capability manifest from disk.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async remove(id) {
    this._ensureLoaded();
    const cap = this.capabilities.get(id);
    if (!cap || !cap._file) return false;

    const filePath = path.resolve(this.manifestsDir, cap._file);
    this._assertWithinDir(filePath);

    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      if (err.code === "ENOENT") return false;
      throw err;
    }

    // Remove from in-memory cache
    this._removeFromIndexes(cap);
    this.capabilities.delete(id);

    return true;
  }

  /**
   * Aggregate stats across all capabilities.
   * @returns {Promise<{total: number, tiers: object, statuses: object, methods: object, consumers: object, totalUsage: number}>}
   */
  async stats() {
    this._ensureLoaded();

    const tiers = {};
    const statuses = {};
    const methods = {};
    let totalUsage = 0;

    for (const [, cap] of this.capabilities) {
      const tier = cap.tier || "unknown";
      const status = cap.status || "disabled";
      const method = cap.method || "unknown";

      tiers[tier] = (tiers[tier] || 0) + 1;
      statuses[status] = (statuses[status] || 0) + 1;
      methods[method] = (methods[method] || 0) + 1;
      totalUsage += cap.useCount || 0;
    }

    return {
      total: this.capabilities.size,
      tiers,
      statuses,
      methods,
      consumers: Object.fromEntries(
        Object.entries(this.byConsumer).map(([k, v]) => [k, v.length])
      ),
      totalUsage,
    };
  }

  /** Force reload from disk. */
  async reload() {
    this._lastLoad = 0;
    this._load();
  }
}

module.exports = { TOMLManifestStore };
