# openfirststep

A tiny, privacy-first visit counter for personal sites. Counts page views and records only the page, the referring website and approximate location. No cookies, no IP, no user-agent.

- `worker/`: Cloudflare Worker + D1 (`POST /hit`, token-protected `GET /export`, public `GET /stats`)
- `client/ofs.js`: the beacon your site loads
- `scripts/`: exporters (Worker, GoatCounter, GitHub traffic) and `summarize.py`
- `templates/data-repo/`: daily snapshot workflow for a **private** data repo
- `docs/PRIVACY.md`, `docs/LEARN.md`

## Deploy
```bash
cd worker
npx wrangler login
npx wrangler d1 create ofs            # paste database_id into wrangler.toml
npx wrangler d1 execute ofs --remote --file=schema.sql
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```
Set `openfirststep_endpoint: https://openfirststep.<you>.workers.dev` in the site's `_config.yml`, host `client/ofs.js` on the site, and share links like `https://yoursite/?via=mom`.

## Get your data
```bash
OFS_ENDPOINT=... OFS_ADMIN_TOKEN=... python scripts/export_worker.py
python scripts/summarize.py
python scripts/export_github_traffic.py   # GitHub repo-page traffic, merged across runs
```
Output lands in `data/` (gitignored here; commit it only to a private repo).
