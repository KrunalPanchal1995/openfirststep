"""Turn data/visits.json into data/summary.json (counts by page, referrer, place, day, via tag).

    python scripts/summarize.py [path/to/visits.json]
"""
import json
import sys
from collections import Counter
from pathlib import Path

import os

ROOT = Path(os.environ.get('OFS_DATA_DIR') or Path(__file__).resolve().parent.parent / 'data')


def top(counter):
    return [{"key": k, "views": n} for k, n in counter.most_common()]


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "visits.json"
    visits = json.loads(src.read_text())["visits"]

    summary = {
        "total_views": len(visits),
        "first_visit": min((v["ts"] for v in visits), default=None),
        "last_visit": max((v["ts"] for v in visits), default=None),
        "by_page": top(Counter(v["path"] for v in visits)),
        "by_referrer": top(Counter(v["referrer_host"] or "(direct)" for v in visits)),
        "by_via": top(Counter(v["via"] or "(untagged)" for v in visits)),
        "by_country": top(Counter(v["country"] or "(unknown)" for v in visits)),
        "by_city": top(Counter(f"{v['city'] or '?'}, {v['country'] or '?'}" for v in visits)),
        "by_day": sorted(top(Counter(v["ts"][:10] for v in visits)), key=lambda r: r["key"]),
    }
    out = ROOT / "summary.json"
    out.write_text(json.dumps(summary, indent=2))
    print(f"wrote {out}: {summary['total_views']} views")


if __name__ == "__main__":
    main()
