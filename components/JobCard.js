import { formatTimeAgo } from "../lib/job-utils";

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5 fill-current"
    >
      <path d="M10 1.5l2.35 5.04 5.5.64-4.07 3.78.96 5.45L10 13.77 5.26 16.41l.96-5.45L2.15 7.18l5.5-.64L10 1.5z" />
    </svg>
  );
}

function employmentTypeClass(type) {
  const normalized = (type || "").toLowerCase();

  if (normalized.includes("full")) {
    return "text-emerald-600";
  }

  if (normalized.includes("part")) {
    return "text-orange-500";
  }

  if (normalized.includes("gig")) {
    return "text-violet-600";
  }

  return "text-stone-500";
}

export default function JobCard({ job, isUnread, isRelevant }) {
  const postedLabel = formatTimeAgo(job.postedAt);

  return (
    <article
      className={[
        "relative rounded-xl border p-5 pl-6 transition-colors",
        isUnread
          ? "border-amber-400 bg-amber-50 shadow-md"
          : "border-stone-300 bg-white shadow-md",
      ].join(" ")}
    >
      <span
        className={[
          "absolute inset-y-0 left-0 w-1.5 rounded-l-xl",
          isUnread ? "bg-amber-500" : "bg-stone-400",
        ].join(" ")}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {isUnread || isRelevant ? (
            <div className="flex flex-wrap items-center gap-2">
              {isUnread ? (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  New
                </span>
              ) : null}
              {isRelevant ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700/80">
                  <StarIcon />
                  Relevant
                </span>
              ) : null}
            </div>
          ) : null}
          <h2
            className={[
              "text-lg leading-snug",
              isUnread || isRelevant ? "mt-1.5" : "",
              isUnread ? "font-bold text-stone-900" : "font-semibold text-stone-800",
            ].join(" ")}
          >
            {job.title}
          </h2>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-stone-500">
            {job.employmentType ? (
              <span className={employmentTypeClass(job.employmentType)}>
                {job.employmentType}
              </span>
            ) : null}
            {job.salary ? <span>{job.salary}</span> : null}
            {postedLabel ? (
              <span suppressHydrationWarning>{postedLabel}</span>
            ) : null}
          </p>
        </div>
      </div>

      {job.snippet ? (
        <p
          className={[
            "mt-3 text-sm leading-6",
            isUnread ? "text-stone-800" : "text-stone-600",
          ].join(" ")}
        >
          {job.snippet}
        </p>
      ) : null}

      <a
        href={job.url}
        target="_blank"
        rel="noreferrer"
        className={[
          "mt-4 inline-flex text-sm font-medium underline-offset-2 hover:underline",
          isUnread ? "text-amber-800" : "text-stone-600",
        ].join(" ")}
      >
        Open job post
      </a>
    </article>
  );
}
