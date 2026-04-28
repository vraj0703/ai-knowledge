/**
 * Email Manager Adapter — Cloudflare Email Routing + Resend SMTP
 *
 * invoke({ action, alias, purpose, to, subject, body })
 *   action:  "create" | "list" | "delete" | "send" | "dns-check" | "setup"
 *   alias:   string — alias name (e.g. "support" → support@vishalraj.space)
 *   purpose: string — description for the alias
 *   to:      string — recipient email (for send)
 *   subject: string — email subject (for send)
 *   body:    string — email body (for send)
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const DOMAIN = "vishalraj.space";
const ALIASES_PATH = path.join(__dirname, "..", "data", "email-aliases.json");
const CREDS_PATH = path.join(__dirname, "..", "credentials.toml");

// ── Load credentials from Knowledge credentials.toml ──

function loadCreds() {
  const raw = fs.readFileSync(CREDS_PATH, "utf8");
  const get = (key) => {
    const m = raw.match(new RegExp(`\\[${key}\\][\\s\\S]*?key\\s*=\\s*"([^"]+)"`));
    return m ? m[1] : "";
  };
  const getField = (section, field) => {
    const m = raw.match(new RegExp(`\\[${section}\\][\\s\\S]*?${field}\\s*=\\s*"([^"]+)"`));
    return m ? m[1] : "";
  };
  return {
    cloudflare_zone_id: getField("cloudflare_email", "zone_id"),
    cloudflare_api_token: getField("cloudflare_email", "api_token"),
    resend_api_key: get("resend"),
    destination_email: getField("cloudflare_email", "destination_email"),
  };
}

function loadAliases() {
  if (!fs.existsSync(ALIASES_PATH)) return { aliases: [], created_count: 0 };
  return JSON.parse(fs.readFileSync(ALIASES_PATH, "utf8"));
}

function saveAliases(data) {
  data.last_updated = new Date().toISOString();
  fs.writeFileSync(ALIASES_PATH, JSON.stringify(data, null, 2));
}

// ── HTTP helpers ──

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function cfRequest(method, endpoint, creds, body = null) {
  return request({
    hostname: "api.cloudflare.com",
    path: `/client/v4/zones/${creds.cloudflare_zone_id}${endpoint}`,
    method,
    headers: {
      Authorization: `Bearer ${creds.cloudflare_api_token}`,
      "Content-Type": "application/json",
    },
  }, body);
}

function resendRequest(method, endpoint, creds, body = null) {
  return request({
    hostname: "api.resend.com",
    path: endpoint,
    method,
    headers: {
      Authorization: `Bearer ${creds.resend_api_key}`,
      "Content-Type": "application/json",
    },
  }, body);
}

// ── Actions ──

async function actionCreate(alias, purpose, creds) {
  const aliases = loadAliases();
  const email = `${alias}@${DOMAIN}`;
  if (aliases.aliases.find((a) => a.alias === alias)) {
    return { success: false, error: `Alias '${alias}' already exists` };
  }
  const result = await cfRequest("POST", "/email/routing/rules", creds, {
    actions: [{ type: "forward", value: [creds.destination_email] }],
    enabled: true,
    matchers: [{ field: "to", type: "literal", value: email }],
    name: `Raj Sadan: ${purpose}`,
    priority: 0,
  });
  if (result.status === 200 && result.data.success) {
    const rule = result.data.result;
    aliases.aliases.push({
      alias, email, purpose,
      cloudflare_rule_id: rule.tag || rule.id,
      created_at: new Date().toISOString(),
      status: "active",
    });
    aliases.created_count++;
    saveAliases(aliases);
    return { success: true, email, purpose, rule_id: rule.tag || rule.id, forwards_to: creds.destination_email };
  }
  return { success: false, error: "Cloudflare API failed", details: result.data.errors || result.data };
}

async function actionList() {
  const aliases = loadAliases();
  return {
    success: true,
    domain: DOMAIN,
    count: aliases.aliases.length,
    aliases: aliases.aliases.map((a) => ({
      email: a.email, purpose: a.purpose, status: a.status, created: a.created_at,
    })),
  };
}

async function actionDelete(alias, creds) {
  const aliases = loadAliases();
  const entry = aliases.aliases.find((a) => a.alias === alias);
  if (!entry) return { success: false, error: `Alias '${alias}' not found` };
  const result = await cfRequest("DELETE", `/email/routing/rules/${entry.cloudflare_rule_id}`, creds);
  if (result.status === 200 && result.data.success) {
    aliases.aliases = aliases.aliases.filter((a) => a.alias !== alias);
    saveAliases(aliases);
    return { success: true, deleted: entry.email };
  }
  return { success: false, error: "Cloudflare delete failed", details: result.data.errors || result.data };
}

async function actionSend(from, to, subject, body, creds) {
  if (!creds.resend_api_key) return { success: false, error: "Resend API key not configured" };
  const fromEmail = from.includes("@") ? from : `${from}@${DOMAIN}`;
  const result = await resendRequest("POST", "/emails", creds, {
    from: fromEmail, to: [to], subject, text: body,
  });
  if (result.status === 200 && result.data.id) {
    return { success: true, email_id: result.data.id, from: fromEmail, to };
  }
  return { success: false, error: "Send failed", details: result.data };
}

async function actionDnsCheck(creds) {
  const result = await cfRequest("GET", "/dns_records", creds);
  if (result.status === 200 && result.data.success) {
    const records = result.data.result.filter((r) =>
      r.type === "MX" || (r.type === "TXT" && (r.content.includes("spf") || r.content.includes("dkim") || r.content.includes("dmarc")))
    );
    return {
      success: true,
      domain: DOMAIN,
      email_records: records.map((r) => ({ type: r.type, name: r.name, content: r.content, priority: r.priority })),
      has_mx: records.some((r) => r.type === "MX"),
      has_spf: records.some((r) => r.content.includes("v=spf")),
    };
  }
  return { success: false, error: "DNS check failed" };
}

async function actionSetup(creds) {
  if (!creds.cloudflare_zone_id || !creds.cloudflare_api_token) {
    return { success: false, error: "Missing cloudflare_email credentials in credentials.toml" };
  }
  const zoneCheck = await cfRequest("GET", "", creds);
  if (zoneCheck.status !== 200 || !zoneCheck.data.success) {
    return { success: false, error: "Cloudflare zone check failed" };
  }
  const routingCheck = await cfRequest("GET", "/email/routing", creds);
  const routing = routingCheck.data?.result || {};
  return {
    success: true,
    zone: zoneCheck.data.result.name,
    email_routing_enabled: routing.enabled || false,
    destination: creds.destination_email,
    aliases_count: loadAliases().aliases.length,
  };
}

// ── Knowledge adapter interface ──

async function invoke(params = {}) {
  const action = params.action || "list";
  const creds = loadCreds();

  switch (action) {
    case "create":
      if (!params.alias) return { success: false, error: "alias is required" };
      return actionCreate(params.alias, params.purpose || "General", creds);
    case "list":
      return actionList();
    case "delete":
      if (!params.alias) return { success: false, error: "alias is required" };
      return actionDelete(params.alias, creds);
    case "send":
      if (!params.from && !params.alias) return { success: false, error: "from/alias is required" };
      if (!params.to) return { success: false, error: "to is required" };
      return actionSend(params.from || params.alias, params.to, params.subject || "(no subject)", params.body || "", creds);
    case "dns-check":
      return actionDnsCheck(creds);
    case "setup":
      return actionSetup(creds);
    default:
      return { success: false, error: `Unknown action: ${action}. Use: create, list, delete, send, dns-check, setup` };
  }
}

module.exports = { invoke };
