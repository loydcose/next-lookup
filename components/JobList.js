import { useEffect, useState } from "react";
import JobCard from "./JobCard";
import { INTEREST_KEYWORDS } from "../config";
import { useOpenedJobs } from "../hooks/useOpenedJobs";
import { isRelevantJob, sortJobs } from "../lib/job-utils";
import TimeAgo from "./TimeAgo";
import { useSeenJobs } from "@/hooks/useSeenJobs";

function EmptyJobs() {
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

export default function JobList({ jobs, scrapedAt }) {
  const [hasMounted, setHasMounted] = useState(false);
  const { isUnread, isReady } = useSeenJobs(jobs);
  const { isOpened, markOpened } = useOpenedJobs();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const orderedJobs = sortJobs(jobs, {
    isUnread: hasMounted ? isUnread : () => false,
    isRelevant: (job) => isRelevantJob(job, INTEREST_KEYWORDS),
  });

  const unreadCount = orderedJobs.filter((job) => isUnread(job.id)).length;
  const relevantCount = orderedJobs.filter((job) =>
    isRelevantJob(job, INTEREST_KEYWORDS),
  ).length;

  return jobs.length === 0 ? (
    <EmptyJobs />
  ) : (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-stone-500">
          <TimeAgo value={scrapedAt} prefix="Last scrape " />
        </p>
        <p className="text-sm text-stone-500">
          {jobs.length} jobs
          {hasMounted && isReady ? ` · ${unreadCount} new` : ""} · {relevantCount} relevant
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {orderedJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isUnread={isUnread(job.id)}
            isRelevant={isRelevantJob(job, INTEREST_KEYWORDS)}
            isOpened={isOpened(job.id)}
            onOpenJob={markOpened}
          />
        ))}
      </div>
    </div>
  );
}
