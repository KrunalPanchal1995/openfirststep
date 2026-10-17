-- One row per page view. There is deliberately NO column for IP address,
-- user-agent, cookies or any browser fingerprint.
CREATE TABLE IF NOT EXISTS visits (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            TEXT NOT NULL,      -- ISO-8601 UTC
  path          TEXT NOT NULL,      -- e.g. /projects/
  referrer_host TEXT,               -- hostname only, e.g. linkedin.com (NULL = direct)
  via           TEXT,               -- optional tag from ?via=mom
  country       TEXT,
  region        TEXT,
  region_code   TEXT,
  city          TEXT,
  postal_code   TEXT,
  latitude      TEXT,
  longitude     TEXT,
  timezone      TEXT,
  continent     TEXT
);
CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits (ts);
