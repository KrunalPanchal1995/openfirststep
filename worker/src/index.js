// openfirststep: a privacy-first visit counter on Cloudflare Workers + D1.
//
// Stores: timestamp, page path, referrer hostname, optional ?via= tag, and the
// location fields Cloudflare derives from the connection (request.cf).
// Never reads or stores: IP address, User-Agent, cookies, or any identifier.

const MAX_PATH = 200;
const MAX_TAG = 40;
const MAX_BODY = 2048; // bytes; a real beacon is ~60
const PATH_RE = /^\/[A-Za-z0-9\/_.~%-]*$/;

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function json(body, status, env, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env), ...extra },
  });
}

// Keep only a clean hostname; anything else becomes null.
function cleanHost(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const host = new URL(value.includes("://") ? value : "https://" + value).hostname;
    return host.slice(0, 100) || null;
  } catch {
    return null;
  }
}

function cleanPath(value) {
  if (typeof value !== "string" || value.length > MAX_PATH + 100) return null;
  const path = value.split(/[?#]/)[0].slice(0, MAX_PATH);
  return PATH_RE.test(path) && !path.includes("..") ? path : null;
}

function cleanTag(value) {
  if (typeof value !== "string") return null;
  const tag = value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, MAX_TAG);
  return tag || null;
}

// Compare SHA-256 digests byte by byte without early exit, so timing reveals nothing about the token.
async function authorized(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const enc = new TextEncoder();
  const digest = async (text) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text)));
  const [a, b] = await Promise.all([digest(request.headers.get("Authorization") || ""), digest(`Bearer ${env.ADMIN_TOKEN}`)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function handleHit(request, env) {
  if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
    return json({ error: "forbidden" }, 403, env);
  }
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_BODY) return json({ error: "too large" }, 413, env);
  let data;
  try {
    // sendBeacon posts text/plain, so parse the body ourselves.
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: "too large" }, 413, env);
    data = JSON.parse(text);
  } catch {
    return json({ error: "bad json" }, 400, env);
  }
  const path = cleanPath(data.p);
  if (!path) return json({ error: "bad path" }, 400, env);

  const cf = request.cf || {};
  await env.DB.prepare(
    `INSERT INTO visits
       (ts, path, referrer_host, via, country, region, region_code, city,
        postal_code, latitude, longitude, timezone, continent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      new Date().toISOString(),
      path,
      cleanHost(data.r),
      cleanTag(data.via),
      cf.country ?? null,
      cf.region ?? null,
      cf.regionCode ?? null,
      cf.city ?? null,
      cf.postalCode ?? null,
      cf.latitude ?? null,
      cf.longitude ?? null,
      cf.timezone ?? null,
      cf.continent ?? null
    )
    .run();
  return json({ ok: true }, 202, env);
}

async function handleExport(request, env) {
  if (!(await authorized(request, env))) return json({ error: "unauthorized" }, 401, env);
  const { results } = await env.DB.prepare("SELECT * FROM visits ORDER BY id").all();
  return json({ exported_at: new Date().toISOString(), count: results.length, visits: results }, 200, env, {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
}

async function handleStats(env) {
  const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM visits").first();
  const days = await env.DB.prepare(
    "SELECT substr(ts,1,10) AS day, COUNT(*) AS views FROM visits GROUP BY day ORDER BY day"
  ).all();
  return json({ total_views: total.n, per_day: days.results }, 200, env, { "Cache-Control": "public, max-age=60" });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    if (request.method === "POST" && pathname === "/hit") return handleHit(request, env);
    if (request.method === "GET" && pathname === "/export") return handleExport(request, env);
    if (request.method === "GET" && pathname === "/stats") return handleStats(env);
    return json({ error: "not found" }, 404, env);
  },
};
