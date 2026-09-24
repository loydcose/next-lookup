import Link from "next/link";
import EmploymentTypeBadge from "@/components/ui/EmploymentTypeBadge";
import TimeAgo from "@/components/ui/TimeAgo";

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 fill-current"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4L8.5 12l6.8-6.7a1 1 0 0 1 1.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function leftBarClass({ isUnread, isRelevant }) {
  if (isUnread) {
    return "bg-orange-500";
  }

  if (isRelevant) {
    return "bg-blue-500";
  }

  return "bg-stone-400";
}

export default function JobCard({ job, isUnread, isRelevant, isOpened, onOpenJob }) {
  const barClass = leftBarClass({ isUnread, isRelevant });

  return (
    <article className="relative rounded-xl border border-stone-300 bg-white p-5 pl-6 shadow-md">
      <span className={`absolute inset-y-0 left-0 w-1.5 rounded-l-xl ${barClass}`} />

      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-snug text-stone-900">
          {job.title}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
          <EmploymentTypeBadge type={job.employmentType} className="text-[11px]" />
          {job.salary ? <span>{job.salary}</span> : null}
          <TimeAgo value={job.postedAt} />
        </p>
      </div>

      {job.snippet ? (
        <p className="mt-3 text-sm leading-6 text-stone-600">{job.snippet}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href={`/jobs/${job.id}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => onOpenJob(job.id)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-700 underline-offset-2 hover:underline"
        >
          {isOpened ? <CheckIcon /> : null}
          See job details
        </Link>
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-stone-700 underline-offset-2 hover:underline"
        >
          Open job post
        </a>
      </div>
    </article>
  );
}
