/**
 * Gumroad Adapter — Digital Products API
 *
 * Manage products, check sales, analytics.
 * Docs: https://app.gumroad.com/api
 * Auth: GUMROAD_ACCESS_TOKEN
 *
 * invoke({ action, product_id?, name?, price?, description? })
 *   action: "products" | "product" | "sales"
 */

const API_BASE = "https://api.gumroad.com/v2";

function getToken() {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  if (!token) throw new Error("GUMROAD_ACCESS_TOKEN not set");
  return token;
}

async function invoke(params = {}) {
  const { action = "products", product_id } = params;
  const token = getToken();

  switch (action) {
    case "products": {
      const res = await fetch(`${API_BASE}/products?access_token=${token}`);
      if (!res.ok) throw new Error(`Gumroad API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        count: data.products?.length || 0,
        products: (data.products || []).map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          currency: p.currency,
          sales_count: p.sales_count,
          sales_usd_cents: p.sales_usd_cents,
          published: p.published,
          url: p.short_url
        }))
      };
    }
    case "product": {
      if (!product_id) throw new Error("Missing required param: product_id");
      const res = await fetch(`${API_BASE}/products/${product_id}?access_token=${token}`);
      if (!res.ok) throw new Error(`Gumroad API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const p = data.product;
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description?.substring(0, 300),
        sales_count: p.sales_count,
        sales_usd_cents: p.sales_usd_cents,
        url: p.short_url
      };
    }
    case "sales": {
      const res = await fetch(`${API_BASE}/sales?access_token=${token}`);
      if (!res.ok) throw new Error(`Gumroad API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        count: data.sales?.length || 0,
        sales: (data.sales || []).slice(0, 20).map(s => ({
          id: s.id,
          product_name: s.product_name,
          price: s.price,
          email: s.email,
          created_at: s.created_at
        }))
      };
    }
    default:
      throw new Error(`Unknown action: ${action}. Use: products, product, sales`);
  }
}

function describe() {
  return {
    name: "Gumroad Digital Products",
    params: {
      action: "products|product|sales (default: products)",
      product_id: "string — for 'product' action"
    },
    example: { action: "products" }
  };
}

module.exports = { invoke, describe };
