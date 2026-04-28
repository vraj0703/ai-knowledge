/**
 * ipify Adapter — Public IP Address
 *
 * Returns the caller's public IP address.
 * Docs: https://www.ipify.org
 * Auth: None
 *
 * invoke({})
 */

const API = "https://api.ipify.org?format=json";

async function invoke(_params = {}) {
  const res = await fetch(API);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ipify API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return { ip: data.ip };
}

function describe() {
  return {
    name: "ipify — Public IP",
    params: {},
    example: {}
  };
}

module.exports = { invoke, describe };
