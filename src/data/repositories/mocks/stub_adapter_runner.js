/**
 * StubAdapterRunner — default mock for NodeAdapterRunner.
 *
 * Records would-be invocations + returns a synthetic result. Nothing
 * actually executes — useful for tests + quickstart without exposing
 * raj-sadan's real adapters (each one wraps a service like Cloudflare,
 * Exa, GitHub).
 */

class StubAdapterRunner {
  constructor() {
    this._invocations = [];
  }

  async run({ capabilityId, args = {} } = {}) {
    this._invocations.push({
      capabilityId,
      args,
      ts: new Date().toISOString(),
    });
    return {
      ok: true,
      mock: true,
      capabilityId,
      result: `[mock] would have invoked ${capabilityId}`,
    };
  }

  async list() {
    return [];
  }

  history() {
    return this._invocations.slice();
  }
}

module.exports = { StubAdapterRunner };
