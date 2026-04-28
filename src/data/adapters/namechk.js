/**
 * Namechk Adapter — Username Availability Checker
 *
 * Returns the namechk.com URL for checking username availability.
 * No API — namechk requires JS rendering, so we return the check URL.
 *
 * invoke({ username })
 *   username: string (required) — username to check
 */

async function invoke(params = {}) {
  const { username } = params;
  if (!username) throw new Error("Missing required param: username");

  const clean = username.replace(/[^a-zA-Z0-9_.-]/g, "");
  if (!clean) throw new Error("Invalid username — must contain alphanumeric characters");

  const url = `https://namechk.com/username/${encodeURIComponent(clean)}`;

  return {
    username: clean,
    url,
    note: "Open this URL in a browser to check availability across platforms"
  };
}

function describe() {
  return {
    name: "Namechk Username Availability",
    params: {
      username: "string (required) — username to check across platforms"
    },
    example: { username: "rajsadan" }
  };
}

module.exports = { invoke, describe };
