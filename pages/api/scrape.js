import { allowMethod } from "@/lib/api";
import {
  bearerTokenMatches,
  COOKIE_NAME,
  isAuthRequired,
  verifyAuthToken,
} from "@/lib/auth";
import { upsertJobs } from "@/lib/db";
import { isRelevantJob } from "@/lib/jobs/filters";
import { runScrape } from "@/lib/scraper/run-scrape";
import { canSendAlerts, sendNewJobsAlert } from "@/lib/telegram";

function hasSiteAccess(req) {
  if (!isAuthRequired()) {
    return true;
  }

  return verifyAuthToken(req.cookies?.[COOKIE_NAME]);
}

function jobsToNotify(jobs) {
  return jobs.filter((job) => !job.notifiedAt && isRelevantJob(job));
}

// GET /api/scrape?source=github  (cron, Bearer CRON_SECRET, sends Telegram alerts)
// GET /api/scrape?source=<other> (signed-in user, no alerts)
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
  } else if (!hasSiteAccess(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { scrapedAt, jobs, newJobs } = await runScrape();
    const payload = {
      ok: true,
      source,
      scrapedAt,
      jobCount: jobs.length,
      newCount: newJobs.length,
      notified: 0,
    };

    if (!fromGithub) {
      res.status(200).json(payload);
      return;
    }

    const pending = jobsToNotify(jobs);

    if (pending.length === 0) {
      res.status(200).json(payload);
      return;
    }

    if (!canSendAlerts()) {
      payload.warning = "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set";
      res.status(200).json(payload);
      return;
    }

    await sendNewJobsAlert(pending);

    const notifiedAt = new Date().toISOString();
    const notifiedIds = new Set(pending.map((job) => job.id));
    const updatedJobs = jobs.map((job) =>
      notifiedIds.has(job.id) ? { ...job, notifiedAt } : job,
    );

    await upsertJobs(updatedJobs, scrapedAt);
    payload.notified = pending.length;
    res.status(200).json(payload);
  } catch (error) {
    console.error("Scrape failed:", error);
    res.status(500).json({ error: "Scrape failed." });
  }
}

export const config = {
  maxDuration: 300,
};
