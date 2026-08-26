import JobCard from "./JobCard";
import {
  EXCLUDE_KEYWORDS,
  INTEREST_KEYWORDS,
  JOB_MAX_AGE_DAYS,
} from "../config";
import { useSeenJobs } from "../hooks/useSeenJobs";
import { formatTimeAgo, isRelevantJob, shouldKeepJob, sortJobs } from "../lib/job-utils";

function formatScrapedAt(scrapedAt) {
  const ago = formatTimeAgo(scrapedAt);

  if (!ago) {
    return "Not scraped yet";
  }

  return `Last scrape ${ago}`;
}

export default function JobList({ jobs, scrapedAt }) {
  const visibleJobs = jobs.filter((job) =>
    shouldKeepJob(job, {
      excludeKeywords: EXCLUDE_KEYWORDS,
      maxAgeDays: JOB_MAX_AGE_DAYS,
    }),
  );
  const { isUnread, isReady } = useSeenJobs(visibleJobs);

  if (!visibleJobs.length) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
        <h2 className="text-lg font-semibold text-stone-900">No jobs yet</h2>
        <p className="mt-2 text-sm text-stone-500">
          The scraper runs when the app starts, then every 15 minutes. You can
          also run <code className="rounded bg-stone-100 px-1.5 py-0.5">npm run scrape</code>.
        </p>
      </div>
    );
  }

  const orderedJobs = sortJobs(visibleJobs, {
    isUnread,
    isRelevant: (job) => isRelevantJob(job, INTEREST_KEYWORDS),
  });

  const unreadCount = orderedJobs.filter((job) => isUnread(job.id)).length;
  const relevantCount = orderedJobs.filter((job) =>
    isRelevantJob(job, INTEREST_KEYWORDS),
  ).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-stone-500" suppressHydrationWarning>
          {formatScrapedAt(scrapedAt)}
        </p>
        <p className="text-sm text-stone-500">
          {visibleJobs.length} jobs
          {isReady ? ` · ${unreadCount} new` : ""} · {relevantCount} relevant
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {orderedJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isUnread={isUnread(job.id)}
            isRelevant={isRelevantJob(job, INTEREST_KEYWORDS)}
          />
        ))}
      </div>
    </div>
  );
}
