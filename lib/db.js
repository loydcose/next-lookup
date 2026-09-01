import { neon } from "@neondatabase/serverless";
import { readJobsFile, writeJobsFile } from "./jobs-file.js";
import { loadEnv } from "./load-env.js";

loadEnv();

let sqlClient;
let schemaReady = false;
let warnedMissingDatabase = false;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function getSql() {
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
        last_seen_at
      ) VALUES (
        ${job.id},
        ${job.url},
        ${job.title},
        ${job.snippet || ""},
        ${job.employmentType || ""},
        ${job.salary || ""},
        ${job.postedAt || ""},
        ${job.firstSeenAt || scrapedAt},
        ${job.lastSeenAt || scrapedAt}
      )
    `);
  }

  statements.push(sql`
    INSERT INTO scrape_meta (id, scraped_at)
    VALUES (1, ${scrapedAt})
    ON CONFLICT (id) DO UPDATE SET scraped_at = EXCLUDED.scraped_at
  `);

  await sql.transaction(statements);
}

async function seedNeonFromFileIfEmpty() {
  const current = await readFromNeon();

  if (current.jobs.length > 0) {
    return current;
  }

  const file = readJobsFile();

  if (file.jobs.length === 0) {
    return current;
  }

  await writeToNeon(file.jobs, file.scrapedAt);
  console.log(`Seeded ${file.jobs.length} jobs from data/jobs.json into Neon`);

  return {
    scrapedAt: file.scrapedAt,
    jobs: file.jobs,
  };
}

function warnMissingDatabase() {
  if (warnedMissingDatabase) {
    return;
  }

  console.warn("DATABASE_URL is not set; using data/jobs.json until Neon is configured.");
  warnedMissingDatabase = true;
}

export async function listJobs() {
  if (!hasDatabaseUrl()) {
    warnMissingDatabase();
    return readJobsFile();
  }

  return seedNeonFromFileIfEmpty();
}

export async function getJobById(id) {
  const data = await listJobs();
  return data.jobs.find((job) => job.id === String(id)) || null;
}

export async function upsertJobs(jobs, scrapedAt) {
  if (!hasDatabaseUrl()) {
    warnMissingDatabase();
    writeJobsFile({ scrapedAt, jobs });
    return;
  }

  await writeToNeon(jobs, scrapedAt);
}
