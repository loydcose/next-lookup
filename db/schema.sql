CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT,
  employment_type TEXT,
  salary TEXT,
  posted_at TEXT,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS scrape_meta (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  scraped_at TIMESTAMPTZ
);
