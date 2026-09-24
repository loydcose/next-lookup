import JobCard from "@/components/jobs/JobCard";
import TimeAgo from "@/components/ui/TimeAgo";
import { useOpenedJobs } from "@/hooks/useOpenedJobs";
import { useSeenJobs } from "@/hooks/useSeenJobs";
import { isRelevantJob, sortJobs } from "@/lib/jobs/filters";

function EmptyJobs() {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-stone-900">No jobs yet</h2>
      <p className="mt-2 text-sm text-stone-500">
        The scraper runs every 15 minutes via GitHub Actions. You can also
        run <code className="rounded bg-stone-100 px-1.5 py-0.5">npm run scrape</code>.
      </p>
    </div>
  );
}

export default function JobList({ jobs, scrapedAt }) {
  const { isUnread, isReady } = useSeenJobs(jobs);
  const { isOpened, markOpened } = useOpenedJobs();

  if (jobs.length === 0) {
    return <EmptyJobs />;
  }

  const orderedJobs = sortJobs(jobs, { isUnread });
  const unreadCount = orderedJobs.filter((job) => isUnread(job.id)).length;
  const relevantCount = orderedJobs.filter(isRelevantJob).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-stone-500">
          <TimeAgo value={scrapedAt} prefix="Last scrape " />
        </p>
        <p className="text-sm text-stone-500">
          {jobs.length} jobs
          {isReady ? ` · ${unreadCount} new` : ""} · {relevantCount} relevant
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {orderedJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isUnread={isUnread(job.id)}
            isRelevant={isRelevantJob(job)}
            isOpened={isOpened(job.id)}
            onOpenJob={markOpened}
          />
        ))}
      </div>
    </div>
  );
}
