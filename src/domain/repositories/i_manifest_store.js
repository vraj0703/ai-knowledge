/**
 * IManifestStore — abstract interface for capability manifest CRUD.
 *
 * Manages TOML manifests on disk: load, query, save, remove.
 */
class IManifestStore {
  /** @returns {Promise<import('../entities/capability').Capability[]>} */
  async loadAll() { throw new Error("not implemented"); }

  /** @param {string} id @returns {Promise<import('../entities/capability').Capability|null>} */
  async getById(id) { throw new Error("not implemented"); }

  /**
   * Text search across id, name, description, category.
   * @param {string} query
   * @returns {Promise<import('../entities/capability').Capability[]>}
   */
  async search(query) { throw new Error("not implemented"); }

  /** @param {string} category @returns {Promise<import('../entities/capability').Capability[]>} */
  async getByCategory(category) { throw new Error("not implemented"); }

  /** @param {string} tier @returns {Promise<import('../entities/capability').Capability[]>} */
  async getByTier(tier) { throw new Error("not implemented"); }

  /** @param {string} consumer @returns {Promise<import('../entities/capability').Capability[]>} */
  async getForConsumer(consumer) { throw new Error("not implemented"); }

  /**
   * Save a capability — creates or overwrites the TOML manifest on disk.
   * @param {import('../entities/capability').Capability} capability
   * @returns {Promise<void>}
   */
  async save(capability) { throw new Error("not implemented"); }

  /**
   * Remove a capability manifest from disk.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async remove(id) { throw new Error("not implemented"); }

  /**
   * List with composite filters (tier, status, consumer, category, method, search).
   * @param {object} [filters]
   * @returns {Promise<import('../entities/capability').Capability[]>}
   */
  async list(filters) { throw new Error("not implemented"); }

  /** @returns {Promise<{total: number, tiers: object, statuses: object, methods: object, consumers: object, totalUsage: number}>} */
  async stats() { throw new Error("not implemented"); }

  /** Force reload from disk. */
  async reload() { throw new Error("not implemented"); }
}

module.exports = { IManifestStore };
