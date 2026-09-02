import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./load-env.js";

loadEnv();

let sqlClient;
let schemaReady = false;

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
}

function getSql() {
  requireDatabaseUrl();

  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }

  return sqlClient;
}

function toIso(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function mapJobRow(row) {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    snippet: row.snippet || "",
    employmentType: row.employment_type || "",
    salary: row.salary || "",
    postedAt: row.posted_at || "",
    firstSeenAt: toIso(row.first_seen_at),
    lastSeenAt: toIso(row.last_seen_at),
    notifiedAt: toIso(row.notified_at),
  };
}

async function ensureSchema(sql) {
  if (schemaReady) {
    return;
  }

  await sql`
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
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS scrape_meta (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      scraped_at TIMESTAMPTZ
    )
  `;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ`;
  await sql`
    ALTER TABLE scrape_meta
    ADD COLUMN IF NOT EXISTS alerts_seeded BOOLEAN NOT NULL DEFAULT FALSE
  `;

  const seedRows = await sql`
    SELECT alerts_seeded FROM scrape_meta WHERE id = 1
  `;
  const alreadySeeded = Boolean(seedRows[0]?.alerts_seeded);

  if (!alreadySeeded) {
    await sql`
      UPDATE jobs
      SET notified_at = COALESCE(first_seen_at, NOW())
      WHERE notified_at IS NULL
    `;
    await sql`
      INSERT INTO scrape_meta (id, alerts_seeded)
      VALUES (1, TRUE)
      ON CONFLICT (id) DO UPDATE SET alerts_seeded = TRUE
    `;
  }

  schemaReady = true;
}

async function readFromNeon() {
  const sql = getSql();
  await ensureSchema(sql);

  const [jobRows, metaRows] = await sql.transaction([
    sql`SELECT * FROM jobs`,
    sql`SELECT scraped_at FROM scrape_meta WHERE id = 1`,
  ]);

  return {
    scrapedAt: toIso(metaRows[0]?.scraped_at) || null,
    jobs: jobRows.map(mapJobRow),
  };
}

async function writeToNeon(jobs, scrapedAt) {
  const sql = getSql();
  await ensureSchema(sql);

  const statements = [sql`DELETE FROM jobs`];

  for (const job of jobs) {
    statements.push(sql`
      INSERT INTO jobs (
        id,
        url,
        title,
        snippet,
        employment_type,
        salary,
        posted_at,
        first_seen_at,
        last_seen_at,
        notified_at
      ) VALUES (
        ${job.id},
        ${job.url},
        ${job.title},
        ${job.snippet || ""},
        ${job.employmentType || ""},
        ${job.salary || ""},
        ${job.postedAt || ""},
        ${job.firstSeenAt || scrapedAt},
        ${job.lastSeenAt || scrapedAt},
        ${job.notifiedAt || null}
      )
    `);
  }

  statements.push(sql`
    INSERT INTO scrape_meta (id, scraped_at, alerts_seeded)
    VALUES (1, ${scrapedAt}, TRUE)
    ON CONFLICT (id) DO UPDATE SET
      scraped_at = EXCLUDED.scraped_at,
      alerts_seeded = TRUE
  `);

  await sql.transaction(statements);
}

export async function listJobs() {
  return readFromNeon();
}

export async function getJobById(id) {
  const data = await listJobs();
  return data.jobs.find((job) => job.id === String(id)) || null;
}

export async function upsertJobs(jobs, scrapedAt) {
  await writeToNeon(jobs, scrapedAt);
}
