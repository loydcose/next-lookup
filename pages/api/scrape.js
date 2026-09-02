import { timingSafeEqual } from "node:crypto";
import { INTEREST_KEYWORDS } from "../../config.js";
import {
  COOKIE_NAME,
  isAuthRequired,
  verifyAuthToken,
} from "../../lib/auth.js";
import { upsertJobs } from "../../lib/db.js";
import { isRelevantJob } from "../../lib/job-utils.js";
import { canSendAlerts, sendNewJobsEmail } from "../../lib/notify.js";
import { runScrape } from "../../scraper/jobs.js";

function bearerMatches(header, secret) {
  if (!header || !secret) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(String(header));

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

function hasSiteAccess(req) {
  if (!isAuthRequired()) {
    return true;
  }

  return verifyAuthToken(req.cookies?.[COOKIE_NAME]);
}

function jobsToNotify(jobs) {
  return jobs.filter(
    (job) => !job.notifiedAt && isRelevantJob(job, INTEREST_KEYWORDS),
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
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
    if (!bearerMatches(req.headers.authorization, process.env.CRON_SECRET)) {
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
      emailed: 0,
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
      payload.warning = "RESEND_API_KEY or ALERT_EMAIL is not set";
      res.status(200).json(payload);
      return;
    }

    await sendNewJobsEmail(pending);

    const notifiedAt = new Date().toISOString();
    const notifiedIds = new Set(pending.map((job) => job.id));
    const updatedJobs = jobs.map((job) =>
      notifiedIds.has(job.id) ? { ...job, notifiedAt } : job,
    );

    await upsertJobs(updatedJobs, scrapedAt);
    payload.emailed = pending.length;
    res.status(200).json(payload);
  } catch (error) {
    console.error("Scrape failed:", error);
    res.status(500).json({ error: "Scrape failed." });
  }
}

export const config = {
  maxDuration: 300,
};
