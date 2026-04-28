/**
 * ICredentialStore — abstract interface for capability credential management.
 *
 * Loads API keys from credentials.toml and injects them into process.env.
 */
class ICredentialStore {
  /**
   * Load all credentials from the store.
   * @returns {Promise<Map<string, {key: string, envVar: string}>>}
   */
  async loadAll() { throw new Error("not implemented"); }

  /**
   * Get credentials for a specific adapter's auth_env.
   * @param {string} envVar - environment variable name
   * @returns {Promise<{envVar: string, value: string}|null>}
   */
  async getForEnvVar(envVar) { throw new Error("not implemented"); }

  /**
   * Inject all credentials into process.env.
   * @returns {Promise<number>} count of env vars injected
   */
  async injectToEnv() { throw new Error("not implemented"); }
}

module.exports = { ICredentialStore };
