import { useEffect, useState } from "react";
import TimeAgo from "./TimeAgo";

function employmentTypeClass(type) {
  const normalized = (type || "").toLowerCase();

  if (normalized.includes("full")) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (normalized.includes("part")) {
    return "bg-orange-100 text-orange-800";
  }

  if (normalized.includes("gig")) {
    return "bg-violet-100 text-violet-800";
  }

  return "bg-stone-200 text-stone-700";
}

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
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const showOpened = hasMounted && isOpened;
  const showUnread = hasMounted && isUnread;
  const barClass = leftBarClass({
    isUnread: showUnread,
    isRelevant,
  });

  return (
    <article className="relative rounded-xl border border-stone-300 bg-white p-5 pl-6 shadow-md">
      <span className={`absolute inset-y-0 left-0 w-1.5 rounded-l-xl ${barClass}`} />

      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-snug text-stone-900">
          {job.title}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
          {job.employmentType ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${employmentTypeClass(job.employmentType)}`}
            >
              {job.employmentType}
            </span>
          ) : null}
          {job.salary ? <span>{job.salary}</span> : null}
          <TimeAgo value={job.postedAt} />
        </p>
      </div>

      {job.snippet ? (
        <p className="mt-3 text-sm leading-6 text-stone-600">{job.snippet}</p>
      ) : null}

      <a
        href={job.url}
        target="_blank"
        rel="noreferrer"
        onClick={() => onOpenJob(job.id)}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-stone-700 underline-offset-2 hover:underline"
      >
        {showOpened ? (
          <>
            <CheckIcon />
            Opened job post
          </>
        ) : (
          "Open job post"
        )}
      </a>
    </article>
  );
}
