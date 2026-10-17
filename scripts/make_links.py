"""Build one tagged link per group so visits can be attributed (?via=<tag>).

    python scripts/make_links.py mom dad friends-college cousins
    -> data/share_links.json  (and prints the links)

Tags are lowercase letters, digits, '-' and '_' (the Worker strips anything else).
Use a group or nickname, not a full real name: the tag is stored with each visit.
"""
import json
import os
import re
import sys
from pathlib import Path

SITE = os.environ.get("OFS_SITE", "https://krunalpanchal1995.github.io/")
OUT = Path(os.environ.get("OFS_DATA_DIR") or Path(__file__).resolve().parent.parent / "data") / "share_links.json"


def main():
    tags = [re.sub(r"[^a-z0-9_-]", "", t.lower())[:40] for t in sys.argv[1:]]
    tags = [t for t in dict.fromkeys(tags) if t]
    if not tags:
        sys.exit("usage: make_links.py <tag> [<tag> ...]")
    links = {t: f"{SITE}?via={t}" for t in tags}
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(links, indent=2))
    for t, u in links.items():
        print(f"{t:20} {u}")


if __name__ == "__main__":
    main()
