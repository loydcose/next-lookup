// Crawls the listing pages, merges results with stored jobs, fetches missing
// descriptions, scores relevance, and saves.
import {
  DESCRIPTION_DELAY_MS,
  JOB_MAX_AGE_DAYS,
  JOBS_PER_PAGE,
  MAX_DESCRIPTIONS_PER_RUN,
  PAGE_DELAY_MS,
  SEARCH_URL,
} from "../../config/search.js";
import { listJobs, upsertJobs } from "../db.js";
import { parseJobDate } from "../jobs/dates.js";
import { isRecentJob, shouldKeepJob } from "../jobs/filters.js";
import { scoreJob } from "../jobs/relevance.js";
import {
  buildPageUrl,
  fetchHtml,
  parseJobCards,
  parseTotalJobCount,
  scrapeJobDescription,
} from "./onlinejobs.js";

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

function postedTime(job) {
  return parseJobDate(job.postedAt)?.getTime() || 0;
}

// Fetches descriptions for jobs that don't have one yet: newest first, one at a
// time, at most MAX_DESCRIPTIONS_PER_RUN. Stops early if the site rate-limits us (429).
// Jobs left without a description are retried on the next run.
async function addMissingDescriptions(jobs) {
  const missing = jobs
    .filter((job) => !job.description)
    .sort((a, b) => postedTime(b) - postedTime(a));
  const batch = missing.slice(0, MAX_DESCRIPTIONS_PER_RUN);
  let fetched = 0;

  for (const [index, job] of batch.entries()) {
    if (index > 0) {
      await wait(DESCRIPTION_DELAY_MS);
    }

    try {
      job.description = await scrapeJobDescription(job.url);
      fetched += 1;
    } catch (error) {
      job.description = null;

      if (error.status === 429) {
        console.warn(`Rate limited after ${fetched} descriptions; continuing next run`);
        break;
      }

      console.warn(`Could not fetch description for job ${job.id}: ${error.message}`);
    }
  }

  console.log(
    `Fetched ${fetched} descriptions (${missing.length - fetched} still missing)`,
  );
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
  const existing = await listJobs({ includeDescription: true });
  const incomingJobs = await crawlRecentJobs();

  let jobs = mergeJobs(existing.jobs, incomingJobs, scrapedAt);
  await addMissingDescriptions(jobs);

  // Rescored every run so weight changes in config/keywords.js apply to stored jobs too.
  jobs = jobs.map((job) => ({ ...job, relevance: scoreJob(job) }));

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
