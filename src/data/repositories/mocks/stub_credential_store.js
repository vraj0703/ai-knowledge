/**
 * StubCredentialStore — default mock for FileCredentialStore.
 *
 * Returns canned secrets. Deliberately never reads real credentials.
 */

class StubCredentialStore {
  async get(_capabilityId) {
    return { mock: true, token: "[mock] not a real secret" };
  }

  async set(_capabilityId, _value) {
    return { ok: true, mock: true };
  }

  async list() {
    return [];
  }
}

module.exports = { StubCredentialStore };
