import { useState } from "react";
import EmploymentTypeBadge from "@/components/ui/EmploymentTypeBadge";
import TimeAgo from "@/components/ui/TimeAgo";
import ToolbarButton from "@/components/ui/ToolbarButton";

function SummaryList({ title, items }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      <ul className="mt-1.5 list-disc space-y-1 pl-4">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function JobDescriptionPanel({ job, description, descriptionError }) {
  const [jobSummary, setJobSummary] = useState(null);
  const [showingSummary, setShowingSummary] = useState(false);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const hasDescription = description.trim().length > 0;

  async function summarizeJob() {
    if (summaryBusy || !hasDescription || jobSummary) {
      return;
    }

    setSummaryBusy(true);
    setSummaryError(null);

    try {
      const response = await fetch("/api/job-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: job.title, description }),
      });
      const data = await response.json().catch(() => ({}));
      const requirements = Array.isArray(data.requirements) ? data.requirements : null;
      const summary = Array.isArray(data.summary) ? data.summary : null;

      if (!response.ok || !requirements || !summary) {
        setSummaryError(data.error || "Could not summarize the job. Try again.");
        return;
      }

      setJobSummary({ requirements, summary });
      setShowingSummary(true);
    } catch {
      setSummaryError("Could not summarize the job. Try again.");
    } finally {
      setSummaryBusy(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-stone-300 bg-white">
      <div className="shrink-0 border-b border-stone-200 px-3 py-2">
        <h1 className="text-base font-semibold leading-snug tracking-tight text-stone-900">
          {job.title}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          <EmploymentTypeBadge type={job.employmentType} className="text-[10px]" />
          {job.salary ? <span>{job.salary}</span> : null}
          <TimeAgo value={job.postedAt} />
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-stone-700 underline-offset-2 hover:underline"
          >
            Open original posting
          </a>
        </p>
        {descriptionError ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
            {descriptionError}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-b border-stone-200 px-3 py-2">
        {jobSummary ? (
          <ToolbarButton onClick={() => setShowingSummary((value) => !value)}>
            {showingSummary ? "Show original" : "Show summary"}
          </ToolbarButton>
        ) : (
          <ToolbarButton onClick={summarizeJob} disabled={summaryBusy || !hasDescription}>
            {summaryBusy ? "Working..." : "Summarize"}
          </ToolbarButton>
        )}
      </div>
      {summaryError ? (
        <p className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800">
          {summaryError}
        </p>
      ) : null}
      {showingSummary && jobSummary ? (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-2 text-sm leading-5 text-stone-700">
          <SummaryList title="For your cover letter" items={jobSummary.requirements} />
          <SummaryList title="Overview" items={jobSummary.summary} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 whitespace-pre-wrap text-sm leading-5 text-stone-700">
          {description}
        </div>
      )}
    </section>
  );
}
