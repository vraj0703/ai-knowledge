/**
 * IAdapterRunner — abstract interface for invoking capability adapters.
 */
class IAdapterRunner {
  /**
   * Invoke an adapter by capability ID.
   * @param {string} id - capability ID
   * @param {object} [params] - parameters to pass to the adapter
   * @returns {Promise<object>} adapter result
   */
  async invoke(id, params) { throw new Error("not implemented"); }

  /**
   * Get adapter description/metadata.
   * @param {string} id - capability ID
   * @returns {Promise<object|null>}
   */
  async describe(id) { throw new Error("not implemented"); }
}

module.exports = { IAdapterRunner };
