/**
 * FileCredentialStore — reads credentials from a TOML file.
 *
 * Ported from v1's boot _load_knowledge_credentials logic.
 * Lazy-loads and caches parsed credentials. Supports injecting
 * API keys into process.env for adapter consumption.
 */

const fs = require("fs");
const path = require("path");
const TOML = require("smol-toml");
const { ICredentialStore } = require("../../domain/repositories/i_credential_store");

class FileCredentialStore extends ICredentialStore {
  /**
   * @param {object} [opts]
   * @param {string} [opts.credentialsPath] - path to credentials.toml
   */
  constructor(opts = {}) {
    super();
    this._credentialsPath =
      opts.credentialsPath ||
      path.resolve(process.cwd(), "config", "secrets", "knowledge.credentials.toml");
    this._credentials = null;
  }

  /**
   * Load all credentials from the TOML file.
   * Each section (e.g. [exa]) may have `key` or `access_token` as the secret,
   * and `env_var` as the target environment variable name.
   *
   * @returns {Promise<Map<string, {key: string, envVar: string}>>}
   */
  async loadAll() {
    if (this._credentials) return this._credentials;

    const result = new Map();

    if (!fs.existsSync(this._credentialsPath)) {
      this._credentials = result;
      return result;
    }

    const raw = fs.readFileSync(this._credentialsPath, "utf-8");
    const parsed = TOML.parse(raw);

    for (const [section, value] of Object.entries(parsed)) {
      if (typeof value !== "object" || value === null) continue;

      const secret = value.key || value.access_token || "";
      const envVar = value.env_var || "";

      result.set(section, { key: String(secret), envVar: String(envVar) });
    }

    this._credentials = result;
    return result;
  }

  /**
   * Find credential entry by its target environment variable name.
   *
   * @param {string} envVar - e.g. "EXA_API_KEY"
   * @returns {Promise<{envVar: string, value: string}|null>}
   */
  async getForEnvVar(envVar) {
    const all = await this.loadAll();

    for (const entry of all.values()) {
      if (entry.envVar === envVar) {
        return { envVar: entry.envVar, value: entry.key };
      }
    }

    return null;
  }

  /**
   * Inject all non-empty credentials into process.env.
   *
   * @returns {Promise<number>} count of env vars injected
   */
  async injectToEnv() {
    const all = await this.loadAll();
    let count = 0;

    for (const entry of all.values()) {
      if (entry.key && entry.envVar) {
        process.env[entry.envVar] = entry.key;
        count++;
      }
    }

    return count;
  }
}

module.exports = { FileCredentialStore };
