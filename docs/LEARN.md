# How a visit counter works (level ladder)

- **L0, intuition:** a guest book at the door. Each visitor signs a line. You only ask "which page, who sent you, roughly where".
- **L1, school:** the page runs a script that sends one small message to a server. The server adds a row to a table. Counting rows = counting visits.
- **L2:** `sendBeacon` posts without blocking navigation. The browser sets `Origin`, so the server can refuse other sites. `document.referrer` says where the visitor came from.
- **L3:** the "location" is not asked from the browser. Cloudflare looks the connection's IP up in a GeoIP database and hands the result to the Worker as `request.cf`. The Worker keeps the result and drops the IP.
- **L4:** without cookies you cannot tell a returning visitor from a new one, so "views" are exact but "unique people" are not. The `?via=` tag trades a little link hygiene for knowing which group (family, friends) came.

## /debug runbook
1. No rows? Check `data-endpoint` is set and the script tag renders (view source).
2. 403 on `/hit`? `ALLOWED_ORIGIN` must exactly match the site origin (scheme + host, no trailing slash).
3. Rows without city? Local `wrangler dev` has no `request.cf` geo; deploy to test.
4. Your own visits counted? Run `localStorage.setItem("ofsIgnore","1")`.
