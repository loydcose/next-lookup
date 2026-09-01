import * as cheerio from "cheerio";
import {
  EXCLUDE_KEYWORDS,
  JOB_MAX_AGE_DAYS,
  JOBS_PER_PAGE,
  PAGE_DELAY_MS,
  SEARCH_URL,
} from "../config.js";
import { listJobs, upsertJobs } from "../lib/db.js";
import { isRecentJob, shouldKeepJob } from "../lib/job-utils.js";

const SITE_ORIGIN = "https://www.onlinejobs.ph";

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function descriptionFromHtml(html) {
  return (html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function scrapeJobDescription(url) {
  const html = await fetchListingHtml(url);
  const $ = cheerio.load(html);
  const $description = $("#job-description").first();

  if ($description.length === 0) {
    throw new Error("Job description not found on the listing page");
  }

  const description = descriptionFromHtml($description.html());

  if (!description) {
    throw new Error("Job description was empty");
  }

  return description;
}

export function buildPageUrl(offset) {
  if (offset <= 0) {
    return SEARCH_URL;
  }

  const pageUrl = new URL(SEARCH_URL);
  pageUrl.pathname = `/jobseekers/jobsearch/${offset}`;
  return pageUrl.toString();
}

async function fetchListingHtml(url) {
  const response = await fetch(url, { headers: REQUEST_HEADERS });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }

  return response.text();
}

function parseTotalJobCount(html) {
  const match = html.match(/Displaying\s+\d+\s+out of\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function jobIdFromUrl(jobUrl) {
  const match = jobUrl.match(/-(\d+)\/?$/);
  return match ? match[1] : jobUrl;
}

export function parseJobCards(html) {
  const $ = cheerio.load(html);
  const jobs = [];

  $(".jobpost-cat-box").each((_, card) => {
    const $card = $(card);
    const $link = $card.closest("a");
    const relativeUrl =
      $link.attr("href") ||
      $card.find('a[href*="/jobseekers/job/"]').attr("href");

    if (!relativeUrl) {
      return;
    }
    const url = new URL(relativeUrl, SITE_ORIGIN).href;
    const $title = $card.find("h4").first();
    const employmentType = cleanText($title.find("span.badge").first().text());
    const title = cleanText(
      $title.clone().find("span.badge").remove().end().text(),
    );
    const postedAt = $card.find("p[data-temp]").first().attr("data-temp") || "";
    const salary = cleanText($card.find("dd.col").first().text());
    const snippet = cleanText($card.find(".desc").first().text()).replace(
      /See More$/i,
      "",
    ).trim();

    if (!title || !url) {
      return;
    }

    jobs.push({
      id: jobIdFromUrl(url),
      url,
      title,
      snippet,
      employmentType,
      salary,
      postedAt,
    });
  });

  return jobs;
}

export function mergeJobs(existingJobs, incomingJobs, scrapedAt) {
  const jobsByUrl = new Map(existingJobs.map((job) => [job.url, job]));

  for (const incoming of incomingJobs) {
    const previous = jobsByUrl.get(incoming.url);

    jobsByUrl.set(incoming.url, {
      ...previous,
      ...incoming,
      firstSeenAt: previous?.firstSeenAt || scrapedAt,
      lastSeenAt: scrapedAt,
    });
  }

  return [...jobsByUrl.values()].filter((job) =>
    shouldKeepJob(job, {
      excludeKeywords: EXCLUDE_KEYWORDS,
      maxAgeDays: JOB_MAX_AGE_DAYS,
    }),
  );
}

export async function runScrape() {
  const scrapedAt = new Date().toISOString();
  const existing = await listJobs();
  const incomingJobs = [];
  let totalJobCount = null;
  let offset = 0;

  console.log(`Scraping ${SEARCH_URL}`);

  while (true) {
    if (offset > 0) {
      await wait(PAGE_DELAY_MS);
    }

    const pageUrl = buildPageUrl(offset);
    const html = await fetchListingHtml(pageUrl);
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

    const recentPageJobs = pageJobs.filter((job) =>
      shouldKeepJob(job, {
        excludeKeywords: EXCLUDE_KEYWORDS,
        maxAgeDays: JOB_MAX_AGE_DAYS,
      }),
    );
    const reachedOlderJobs = pageJobs.some(
      (job) => !isRecentJob(job, JOB_MAX_AGE_DAYS),
    );

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

  const jobs = mergeJobs(existing.jobs, incomingJobs, scrapedAt);
  await upsertJobs(jobs, scrapedAt);

  console.log(
    `Saved ${jobs.length} jobs (${incomingJobs.length} from this scrape)`,
  );

  return { scrapedAt, jobs };
}
