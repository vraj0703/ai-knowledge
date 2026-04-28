/**
 * Capability — a registered tool/API/service in the knowledge system.
 *
 * Each capability has a TOML manifest describing what it does,
 * how to access it, who uses it, and usage stats.
 *
 * Enhanced from v2/memory version with full v1 manifest fields.
 */

const { VALID_TIERS, VALID_STATUSES, TIER_METHOD } = require("../constants");

class Capability {
  /**
   * @param {object} raw
   * @param {string} raw.id
   * @param {string} [raw.name]
   * @param {string} [raw.url]
   * @param {string} [raw.tier]
   * @param {string} [raw.status]
   * @param {boolean} [raw.free]
   * @param {string} [raw.category]
   * @param {string} [raw.description]
   * @param {string} [raw.method]
   * @param {string} [raw.apiDocs]
   * @param {string} [raw.authType]
   * @param {string} [raw.authEnv]
   * @param {string} [raw.adapter]
   * @param {string[]} [raw.ministers]
   * @param {string[]} [raw.sherpas]
   * @param {boolean} [raw.mrV]
   * @param {boolean} [raw.pm]
   * @param {number} [raw.useCount]
   * @param {string} [raw.lastUsed]
   * @param {string} [raw.evaluation]
   * @param {string} [raw._file] - internal: manifest filename for round-trip
   */
  constructor(raw) {
    if (!raw.id) throw new Error("Capability id is required");

    this.id = raw.id;
    this.name = raw.name || raw.id;
    this.url = raw.url || null;
    this.tier = VALID_TIERS.includes(raw.tier) ? raw.tier : "T1-API";
    this.status = VALID_STATUSES.includes(raw.status) ? raw.status : "enabled";
    this.free = raw.free !== false;
    this.category = raw.category || "uncategorized";
    this.description = raw.description || "";

    // Integration
    this.method = raw.method || TIER_METHOD[this.tier] || null;
    this.apiDocs = raw.apiDocs || "";
    this.authType = raw.authType || "none";
    this.authEnv = raw.authEnv || "";
    this.adapter = raw.adapter || "";

    // Consumers
    this.ministers = raw.ministers || [];
    this.sherpas = raw.sherpas || [];
    this.mrV = raw.mrV !== undefined ? raw.mrV : true;
    this.pm = raw.pm !== undefined ? raw.pm : false;

    // Usage
    this.useCount = raw.useCount || 0;
    this.lastUsed = raw.lastUsed || "";

    // Evaluation (for parked/rejected)
    this.evaluation = raw.evaluation || null;

    // Internal — not serialized to API responses
    this._file = raw._file || null;
  }

  isActive() {
    return this.status === "enabled";
  }

  isParked() {
    return this.status === "parked" || this.status === "evaluated-candidate";
  }

  isInvocable() {
    return this.isActive() && this.adapter && this.tier !== "T6-REFERENCE";
  }

  matchesQuery(query) {
    const q = query.toLowerCase();
    return this.name.toLowerCase().includes(q)
      || this.description.toLowerCase().includes(q)
      || this.category.toLowerCase().includes(q)
      || this.id.toLowerCase().includes(q);
  }

  recordUsage() {
    return new Capability({
      ...this,
      useCount: this.useCount + 1,
      lastUsed: new Date().toISOString(),
    });
  }

  /** Convert to compact summary for API responses */
  toSummary() {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      tier: this.tier,
      status: this.status,
      category: this.category,
      description: this.description,
      method: this.method,
      free: this.free,
      use_count: this.useCount,
    };
  }

  /** Convert back to TOML manifest string (matching v1 format exactly) */
  toManifest() {
    const esc = (s) => (s || "").replace(/"/g, '\\"');
    const boolStr = (v) => v ? "true" : "false";
    const arrStr = (arr) => `[${(arr || []).map(s => `"${s}"`).join(", ")}]`;

    return `[capability]
id          = "${this.id}"
name        = "${esc(this.name)}"
url         = "${this.url || ""}"
tier        = "${this.tier}"
status      = "${this.status}"
free        = ${boolStr(this.free)}
category    = "${esc(this.category)}"
description = "${esc(this.description)}"

[integration]
method      = "${this.method || ""}"
api_docs    = "${this.apiDocs || ""}"
auth_type   = "${this.authType || "none"}"
auth_env    = "${this.authEnv || ""}"
adapter     = "${this.adapter || ""}"

[consumers]
ministers   = ${arrStr(this.ministers)}
sherpas    = ${arrStr(this.sherpas)}
mr_v       = ${boolStr(this.mrV)}
pm         = ${boolStr(this.pm)}

[usage]
use_count  = ${this.useCount}
last_used  = "${this.lastUsed || ""}"
`;
  }

  /**
   * Build a Capability from a parsed TOML manifest object (v1 format).
   * @param {object} manifest - parsed TOML with [capability], [integration], [consumers], [usage] sections
   * @param {string} [file] - source filename
   * @returns {Capability}
   */
  static fromManifest(manifest, file) {
    const c = manifest.capability || {};
    const i = manifest.integration || {};
    const cons = manifest.consumers || {};
    const u = manifest.usage || {};

    return new Capability({
      id: c.id || "",
      name: c.name || c.id || "",
      url: c.url || null,
      tier: c.tier || "T1-API",
      status: c.status || "disabled",
      free: c.free !== false,
      category: c.category || "uncategorized",
      description: c.description || "",
      method: i.method || null,
      apiDocs: i.api_docs || "",
      authType: i.auth_type || "none",
      authEnv: i.auth_env || "",
      adapter: i.adapter || "",
      ministers: cons.ministers || [],
      sherpas: cons.sherpas || [],
      mrV: cons.mr_v !== undefined ? cons.mr_v : true,
      pm: cons.pm !== undefined ? cons.pm : false,
      useCount: u.use_count || 0,
      lastUsed: u.last_used || "",
      _file: file || null,
    });
  }
}

module.exports = { Capability, VALID_TIERS, VALID_STATUSES };
