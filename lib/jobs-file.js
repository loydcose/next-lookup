import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const JOBS_FILE_PATH = path.join(process.cwd(), "data", "jobs.json");

export function emptyJobsFile() {
  return { scrapedAt: null, jobs: [] };
}

export function readJobsFile() {
  try {
    const raw = readFileSync(JOBS_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return {
      scrapedAt: parsed.scrapedAt || null,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    };
  } catch {
    return emptyJobsFile();
  }
}

export function writeJobsFile(data) {
  mkdirSync(path.dirname(JOBS_FILE_PATH), { recursive: true });
  writeFileSync(JOBS_FILE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
