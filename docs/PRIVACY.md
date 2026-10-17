# What openfirststep stores

| Stored | Source |
|---|---|
| Timestamp (UTC) | the Worker's clock |
| Page path (no query string/hash) | the page |
| Referrer **hostname** only (e.g. `linkedin.com`) | `document.referrer`, trimmed |
| Optional `via` tag (`?via=mom`) | the link you shared |
| Country, region, city, postal code, lat/long, timezone, continent | Cloudflare `request.cf`, derived from the connection |

**Never stored or read:** IP address, User-Agent, cookies, localStorage identifiers, screen size, language, fingerprints.
Precise location is IP-derived and approximate (city level); with a small audience, city + timestamp can point at a person, so keep the data repo private.
Visitors can opt out by running `localStorage.setItem("ofsIgnore","1")` in their console, and the site's privacy page says what is collected.
