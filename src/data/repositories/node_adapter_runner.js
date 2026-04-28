/**
 * NodeAdapterRunner — loads and runs JS adapter files from disk.
 *
 * Resolves adapter paths via the manifest store, enforces path traversal
 * guards, and caches loaded modules for repeated invocations.
 */

const fs = require("fs");
const path = require("path");
const { IAdapterRunner } = require("../../domain/repositories/i_adapter_runner");
const {
  AdapterNotFoundError,
  AdapterInvokeError,
  PathTraversalError,
} = require("../../domain/exceptions");

class NodeAdapterRunner extends IAdapterRunner {
  /**
   * @param {object} [opts]
   * @param {string} [opts.adaptersDir] - path to adapters directory
   * @param {import('../../domain/repositories/i_manifest_store').IManifestStore} opts.manifestStore
   */
  constructor(opts = {}) {
    super();
    this._adaptersDir = path.resolve(
      opts.adaptersDir ||
        path.resolve(process.cwd(), "knowledge", "data", "adapters")
    );
    this._manifestStore = opts.manifestStore;
    this._cache = new Map();
  }

  /**
   * Invoke an adapter by capability ID.
   *
   * @param {string} id - capability ID
   * @param {object} [params={}] - parameters forwarded to adapter.invoke()
   * @returns {Promise<object>} adapter result
   */
  async invoke(id, params = {}) {
    const capability = await this._manifestStore.getById(id);
    if (!capability || !capability.adapter) {
      throw new AdapterNotFoundError(id);
    }

    const adapterPath = this._resolvePath(id, capability.adapter);
    const adapter = this._loadAdapter(adapterPath);

    if (typeof adapter.invoke !== "function") {
      throw new AdapterNotFoundError(id);
    }

    try {
      return await adapter.invoke(params);
    } catch (err) {
      if (err instanceof AdapterNotFoundError) throw err;
      throw new AdapterInvokeError(id, err.message);
    }
  }

  /**
   * Get adapter description/metadata.
   *
   * @param {string} id - capability ID
   * @returns {Promise<object|null>}
   */
  async describe(id) {
    const capability = await this._manifestStore.getById(id);
    if (!capability || !capability.adapter) {
      throw new AdapterNotFoundError(id);
    }

    const adapterPath = this._resolvePath(id, capability.adapter);
    const adapter = this._loadAdapter(adapterPath);

    if (typeof adapter.describe === "function") {
      return adapter.describe();
    }

    return null;
  }

  /**
   * Resolve adapter path with traversal guard.
   * @private
   */
  _resolvePath(id, adapterFile) {
    const resolved = path.resolve(this._adaptersDir, path.basename(adapterFile));

    if (!resolved.startsWith(this._adaptersDir)) {
      throw new PathTraversalError(resolved, this._adaptersDir);
    }

    return resolved;
  }

  /**
   * Load and cache an adapter module.
   * @private
   */
  _loadAdapter(adapterPath) {
    if (this._cache.has(adapterPath)) {
      return this._cache.get(adapterPath);
    }

    if (!fs.existsSync(adapterPath)) {
      throw new AdapterNotFoundError(adapterPath);
    }

    const mod = require(adapterPath);
    this._cache.set(adapterPath, mod);
    return mod;
  }
}

module.exports = { NodeAdapterRunner };
