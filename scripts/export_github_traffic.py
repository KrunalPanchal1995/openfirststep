"""Snapshot GitHub's repo traffic API into data/github-traffic.json.

GitHub only keeps 14 days of history, so each run merges new days into the
existing file (deduped by day). Needs the `gh` CLI logged in, or GH_TOKEN set.

    python scripts/export_github_traffic.py [owner/repo]
"""
import json
import os
import subprocess
import sys
from pathlib import Path

REPO = sys.argv[1] if len(sys.argv) > 1 else "KrunalPanchal1995/KrunalPanchal1995.github.io"
OUT = Path(os.environ.get("OFS_DATA_DIR") or Path(__file__).resolve().parent.parent / "data") / "github-traffic.json"


def gh(endpoint):
    out = subprocess.run(["gh", "api", f"repos/{REPO}/{endpoint}"], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def main():
    previous = json.loads(OUT.read_text()) if OUT.exists() else {"views": [], "clones": []}
    views_by_day = {v["timestamp"][:10]: v for v in previous.get("views", [])}
    clones_by_day = {c["timestamp"][:10]: c for c in previous.get("clones", [])}

    for v in gh("traffic/views")["views"]:
        views_by_day[v["timestamp"][:10]] = v
    for c in gh("traffic/clones")["clones"]:
        clones_by_day[c["timestamp"][:10]] = c

    snapshot = {
        "repo": REPO,
        "note": "Traffic to the GitHub repo PAGE (github.com), not the website itself.",
        "views": [views_by_day[d] for d in sorted(views_by_day)],
        "clones": [clones_by_day[d] for d in sorted(clones_by_day)],
        "referrers": gh("traffic/popular/referrers"),
        "popular_paths": gh("traffic/popular/paths"),
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(snapshot, indent=2))
    print(f"wrote {OUT} ({sum(v['count'] for v in snapshot['views'])} views)")


if __name__ == "__main__":
    main()
