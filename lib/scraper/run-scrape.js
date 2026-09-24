// Crawls the listing pages, merges results with stored jobs, and saves them.
import { JOBS_PER_PAGE, PAGE_DELAY_MS, JOB_MAX_AGE_DAYS, SEARCH_URL } from "../../config/search.js";
import { listJobs, upsertJobs } from "../db.js";
import { isRecentJob, shouldKeepJob } from "../jobs/filters.js";
import { buildPageUrl, fetchHtml, parseJobCards, parseTotalJobCount } from "./onlinejobs.js";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function crawlRecentJobs() {
  const incomingJobs = [];
  let totalJobCount = null;
  let offset = 0;

  console.log(`Scraping ${SEARCH_URL}`);

  while (true) {
    if (offset > 0) {
      await wait(PAGE_DELAY_MS);
    }

    const html = await fetchHtml(buildPageUrl(offset));
    const pageJobs = parseJobCards(html);

    if (totalJobCount === null) {
      totalJobCount = parseTotalJobCount(html);
      if (totalJobCount) {
        console.log(`Found ${totalJobCount} jobs across listing pages`);
      }
    }

    if (pageJobs.length === 0) {
      break;
    }

    const recentPageJobs = pageJobs.filter((job) => shouldKeepJob(job));
    const reachedOlderJobs = pageJobs.some((job) => !isRecentJob(job));

    incomingJobs.push(...recentPageJobs);
    console.log(
      `Page offset ${offset}: kept ${recentPageJobs.length}/${pageJobs.length} jobs (running total ${incomingJobs.length})`,
    );

    offset += JOBS_PER_PAGE;

    if (reachedOlderJobs) {
      console.log(`Stopped at jobs older than ${JOB_MAX_AGE_DAYS} days`);
      break;
    }

    if (totalJobCount !== null && offset >= totalJobCount) {
      break;
    }

    if (totalJobCount === null && pageJobs.length < JOBS_PER_PAGE) {
      break;
    }
  }

  return incomingJobs;
}

export function mergeJobs(existingJobs, incomingJobs, scrapedAt) {
  const jobsById = new Map(
    existingJobs.map((job) => [String(job.id), job]),
  );

  for (const incoming of incomingJobs) {
    const id = String(incoming.id);
    const previous = jobsById.get(id);

    if (previous?.url && previous.url !== incoming.url) {
      console.log(
        `Job ${id} url changed: ${previous.url} -> ${incoming.url}`,
      );
    }

    jobsById.set(id, {
      ...previous,
      ...incoming,
      id,
      firstSeenAt: previous?.firstSeenAt || scrapedAt,
      lastSeenAt: scrapedAt,
      notifiedAt: previous?.notifiedAt || null,
    });
  }

  return [...jobsById.values()].filter((job) => shouldKeepJob(job));
}

export async function runScrape() {
  const scrapedAt = new Date().toISOString();
  const existing = await listJobs();
  const incomingJobs = await crawlRecentJobs();

  let jobs = mergeJobs(existing.jobs, incomingJobs, scrapedAt);

  // Fresh database: mark everything as notified so the first run doesn't flood alerts.
  if (!existing.scrapedAt) {
    jobs = jobs.map((job) => ({ ...job, notifiedAt: job.notifiedAt || scrapedAt }));
  }

  await upsertJobs(jobs, scrapedAt);

  const newJobs = jobs.filter((job) => job.firstSeenAt === scrapedAt);

  console.log(
    `Saved ${jobs.length} jobs (${incomingJobs.length} from this scrape, ${newJobs.length} new)`,
  );

  return { scrapedAt, jobs, newJobs };
}
