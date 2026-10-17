"""Pull aggregate stats from GoatCounter into data/goatcounter.json.

Only pages, referrers, countries and daily totals are kept. Browser, OS and
screen-size breakdowns are deliberately NOT fetched.

    GOATCOUNTER_CODE=mysite GOATCOUNTER_TOKEN=... python scripts/export_goatcounter.py
"""
import json
import os
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "goatcounter.json"


def get(base, token, path):
    req = urllib.request.Request(base + path, headers={"Authorization": f"Bearer {token}", "User-Agent": "openfirststep-exporter/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def main():
    code = os.environ["GOATCOUNTER_CODE"]
    token = os.environ["GOATCOUNTER_TOKEN"]
    base = f"https://{code}.goatcounter.com/api/v0"
    snapshot = {
        "total": get(base, token, "/stats/total"),
        "pages": get(base, token, "/stats/hits"),
        "locations": get(base, token, "/stats/locations"),
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(snapshot, indent=2))
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
