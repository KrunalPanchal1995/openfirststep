"""Download all rows from the Worker's /export endpoint into data/visits.json.

    OFS_ENDPOINT=https://openfirststep.<you>.workers.dev OFS_ADMIN_TOKEN=... python scripts/export_worker.py
"""
import json
import os
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "visits.json"


def main():
    endpoint = os.environ["OFS_ENDPOINT"].rstrip("/")
    token = os.environ["OFS_ADMIN_TOKEN"]
    req = urllib.request.Request(endpoint + "/export", headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2))
    print(f"wrote {OUT} ({data['count']} visits)")


if __name__ == "__main__":
    main()
