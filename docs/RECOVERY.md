# Recovery guide

Where the copies live:

| What | Copies |
|---|---|
| Website, counter code, data repo | GitHub (main copy) + weekly bundles in `D:\KrunalPanchal1995\backups\<date>\` and `OneDrive\Backups\website\<date>\` |
| Visitor rows | Cloudflare D1 (`ofs`) + daily `visits.json` in the private `openfirststep-data` repo + the bundles above |
| Known-good code | git tag `known-good-2026-10-18` in the site and `openfirststep` repos |

Backups run every Sunday 10:00 (Task Scheduler: `openfirststep-weekly-backup`). Run one by hand any time:
`powershell -ExecutionPolicy Bypass -File scripts\backup.ps1`. Every bundle is verified and checksummed (`SHA256SUMS.txt`).

## The site was defaced or broken
1. Find the last good commit: `git log --oneline` or use the tag `known-good-2026-10-18`.
2. Repair `main` with a normal commit: `git revert <bad-commit>` (or `git checkout known-good-2026-10-18 -- .` then commit). `main` cannot be force-pushed or deleted, by design.
3. Push. The **Deploy site** workflow rebuilds and republishes within a few minutes.

## GitHub repo deleted or account locked
1. `git clone D:\KrunalPanchal1995\backups\<date>\<repo>-<date>.bundle <repo>` restores full history, all branches and tags.
2. Create a new empty repo with the same name, then `git remote add origin <url>` and `git push --mirror origin`.
3. Re-add the secret `OFS_ADMIN_TOKEN` and variable `OFS_ENDPOINT` in `openfirststep-data`, and re-enable Pages (Settings, Pages, branch `gh-pages`).

## Visitor database damaged
- Point-in-time restore (last 30 days): `cd worker && npx wrangler d1 time-travel restore ofs --timestamp=<ISO time>`.
- Or rebuild from the newest `visits.json`: recreate the table with `worker/schema.sql`, then re-insert the rows.

## Counter token leaked, or you simply want a new one
1. `python -c "import secrets;print(secrets.token_urlsafe(32))"`
2. `cd worker && npx wrangler secret put ADMIN_TOKEN` (paste it).
3. `gh secret set OFS_ADMIN_TOKEN -R KrunalPanchal1995/openfirststep-data` (paste it), and update your local `.admin_token`.
The old token stops working immediately.

## You think an account was compromised
1. Change the password and sign out all sessions (GitHub: Settings, Sessions; Cloudflare: My Profile, Sessions).
2. Check GitHub: Settings, Applications (revoke anything you don't know), SSH and GPG keys, and the repo Security and Actions logs.
3. Rotate the counter token (above) and run `wrangler logout` then `wrangler login` again.
4. Turn on 2FA everywhere (below) before anything else if it isn't already on.

## Accounts to protect (only you can do these)
Use an authenticator app or passkey, not SMS. Save the recovery codes offline (printed or on a USB stick, not in OneDrive).
1. **GitHub**: github.com/settings/security
2. **Cloudflare**: dash.cloudflare.com, My Profile, Authentication
3. **Your email** (Gmail) and **Microsoft/OneDrive**: they are the recovery route for the other two, and OneDrive holds a copy of the visitor data.
