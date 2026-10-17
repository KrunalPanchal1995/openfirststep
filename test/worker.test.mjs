import assert from "node:assert/strict";
import worker from "../worker/src/index.js";

const rows = [];
const env = {
  ALLOWED_ORIGIN: "https://krunalpanchal1995.github.io",
  ADMIN_TOKEN: "secret",
  DB: {
    prepare(sql) {
      return {
        bind: (...a) => ({ run: async () => { rows.push(a); } }),
        all: async () => ({ results: rows }),
        first: async () => ({ n: rows.length }),
      };
    },
  },
};
const ORIGIN = env.ALLOWED_ORIGIN;
const hit = (body, origin = ORIGIN) =>
  worker.fetch(Object.assign(new Request("https://w.dev/hit", { method: "POST", headers: { Origin: origin }, body }), {
    cf: { country: "IN", city: "Mumbai", region: "Maharashtra", regionCode: "MH", postalCode: "400001", latitude: "19.07", longitude: "72.87", timezone: "Asia/Kolkata", continent: "AS" },
  }), env);

let r = await hit(JSON.stringify({ p: "/projects/?x=1#a", r: "https://www.linkedin.com/feed/?q=1", via: "Mom!" }));
assert.equal(r.status, 202);
const row = rows[0];
assert.equal(row[1], "/projects/");           // query/hash stripped
assert.equal(row[2], "www.linkedin.com");     // hostname only
assert.equal(row[3], "mom");                  // sanitised tag
assert.equal(row[5], "Maharashtra"); assert.equal(row[7], "Mumbai");
assert.equal(row.length, 13);                 // no IP / UA column

assert.equal((await hit(JSON.stringify({ p: "/" }), "https://evil.example")).status, 403);
assert.equal((await hit("not json")).status, 400);
assert.equal((await hit(JSON.stringify({ p: "nope" }))).status, 400);

const ex = (h) => worker.fetch(new Request("https://w.dev/export", { headers: h }), env);
assert.equal((await ex({})).status, 401);
assert.equal((await ex({ Authorization: "Bearer wrong" })).status, 401);
const ok = await ex({ Authorization: "Bearer secret" });
assert.equal(ok.status, 200); assert.equal((await ok.json()).count, 1);
// hardening
const big = JSON.stringify({ p: "/", via: "x".repeat(3000) });
assert.equal((await hit(big)).status, 413);                                   // oversized body
assert.equal((await hit(JSON.stringify({ p: "/../etc/passwd" }))).status, 400); // traversal
assert.equal((await hit(JSON.stringify({ p: "/a b" }))).status, 400);           // space not allowed
assert.equal((await hit(JSON.stringify({ p: "/<script>" }))).status, 400);
assert.equal((await hit(JSON.stringify({ p: "/caf%C3%A9/" }))).status, 202);    // percent-encoding is fine
assert.equal((await ex({ Authorization: "Bearer s" })).status, 401);            // shorter wrong token
assert.equal((await ex({ Authorization: "Bearer " + "s".repeat(500) })).status, 401); // longer wrong token
const exp = await ex({ Authorization: "Bearer secret" });
assert.equal(exp.headers.get("Cache-Control"), "no-store");
assert.equal(exp.headers.get("X-Content-Type-Options"), "nosniff");
console.log("worker tests passed");
