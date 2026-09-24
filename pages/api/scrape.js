import { waitUntil } from "@vercel/functions";
import { allowMethod } from "@/lib/api";
import {
  bearerTokenMatches,
  COOKIE_NAME,
  isAuthRequired,
  verifyAuthToken,
} from "@/lib/auth";
import { upsertJobs } from "@/lib/db";
import { isRelevantJob } from "@/lib/jobs/relevance";
import { runScrape } from "@/lib/scraper/run-scrape";
import { canSendAlerts, sendNewJobsAlert } from "@/lib/telegram";

function hasSiteAccess(req) {
  if (!isAuthRequired()) {
    return true;
  }

  return verifyAuthToken(req.cookies?.[COOKIE_NAME]);
}

// Wait for the description before alerting, so alerts aren't scored from the snippet alone.
function jobsToNotify(jobs) {
  return jobs.filter(
    (job) => !job.notifiedAt && job.description && isRelevantJob(job),
  );
}

async function sendPendingAlerts(jobs, scrapedAt) {
  const pending = jobsToNotify(jobs);

  if (pending.length === 0) {
    return 0;
  }

  if (!canSendAlerts()) {
    console.warn("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
    return 0;
  }

  await sendNewJobsAlert(pending);

  const notifiedAt = new Date().toISOString();
  const notifiedIds = new Set(pending.map((job) => job.id));
  const updatedJobs = jobs.map((job) =>
    notifiedIds.has(job.id) ? { ...job, notifiedAt } : job,
  );

  await upsertJobs(updatedJobs, scrapedAt);
  return pending.length;
}

async function scrapeAndAlert() {
  const { scrapedAt, jobs, newJobs } = await runScrape();
  const notified = await sendPendingAlerts(jobs, scrapedAt);
  console.log(
    `Cron scrape done: ${jobs.length} jobs, ${newJobs.length} new, ${notified} alerted`,
  );
}

// GET /api/scrape?source=github  (cron, Bearer CRON_SECRET, sends Telegram alerts)
//   Responds 202 right away and keeps working in the background, because cron
//   services time out long before a scrape with description fetches finishes.
// GET /api/scrape?source=<other> (signed-in user, no alerts, waits for the result)
export default async function handler(req, res) {
  if (!allowMethod(req, res, "GET")) {
    return;
  }

  const source =
    typeof req.query.source === "string" ? req.query.source.trim() : "";

  if (!source) {
    res.status(400).json({ error: "Missing source query parameter." });
    return;
  }

  const fromGithub = source === "github";

  if (fromGithub) {
    if (!bearerTokenMatches(req.headers.authorization, process.env.CRON_SECRET)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    waitUntil(
      scrapeAndAlert().catch((error) => console.error("Scrape failed:", error)),
    );
    res.status(202).json({ ok: true, source, started: true });
    return;
  }

  if (!hasSiteAccess(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { scrapedAt, jobs, newJobs } = await runScrape();
    res.status(200).json({
      ok: true,
      source,
      scrapedAt,
      jobCount: jobs.length,
      newCount: newJobs.length,
    });
  } catch (error) {
    console.error("Scrape failed:", error);
    res.status(500).json({ error: "Scrape failed." });
  }
}

export const config = {
  maxDuration: 300,
};
