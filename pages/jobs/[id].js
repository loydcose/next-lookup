import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Geist } from "next/font/google";
import TimeAgo from "../../components/TimeAgo";
import { useOpenedJobs } from "../../hooks/useOpenedJobs";
import { DEFAULT_COVER_LETTER } from "../../config";

const geistSans = Geist({
  subsets: ["latin"],
});

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

const toolbarButtonClass =
  "rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50";

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

export default function JobDetailsPage({ job, description, descriptionError }) {
  const { markOpened } = useOpenedJobs();
  const coverLetterRef = useRef(null);
  const [versions, setVersions] = useState(() => [DEFAULT_COVER_LETTER]);
  const [versionIndex, setVersionIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [aiAction, setAiAction] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [jobSummary, setJobSummary] = useState(null);
  const [showingSummary, setShowingSummary] = useState(false);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const currentLetter = versions[versionIndex] ?? "";
  const hasLetter = currentLetter.trim().length > 0;
  const hasDescription = description.trim().length > 0;
  const versionCount = versions.length;
  const aiBusy = Boolean(aiAction);

  useEffect(() => {
    markOpened(job.id);
  }, [job.id]);

  useEffect(() => {
    setVersions([DEFAULT_COVER_LETTER]);
    setVersionIndex(0);
    setCopied(false);
    setAiError(null);
    setAiAction(null);
    setJobSummary(null);
    setShowingSummary(false);
    setSummaryBusy(false);
    setSummaryError(null);
  }, [job.id]);

  function updateCurrentLetter(text) {
    setVersions((prev) =>
      prev.map((version, index) => (index === versionIndex ? text : version)),
    );
  }

  async function copyCoverLetter() {
    try {
      await navigator.clipboard.writeText(currentLetter);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      coverLetterRef.current?.select();
    }
  }

  async function runAi(action) {
    if (aiAction || !hasLetter) {
      return;
    }

    setAiAction(action);
    setAiError(null);

    try {
      const response = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: currentLetter }),
      });
      const data = await response.json().catch(() => ({}));
      const nextText = typeof data.text === "string" ? data.text.trim() : "";

      if (!response.ok || !nextText) {
        setAiError(data.error || "Could not rewrite the letter. Try again.");
        return;
      }

      setVersions((prev) => [...prev, nextText]);
      setVersionIndex(versionCount);
    } catch {
      setAiError("Could not rewrite the letter. Try again.");
    } finally {
      setAiAction(null);
    }
  }

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
    <div className={`${geistSans.className} flex h-dvh flex-col overflow-hidden bg-stone-100 text-stone-900`}>
      <Head>
        <title>{`${job.title} · Next Look Up`}</title>
      </Head>
      <header className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-3 py-1.5">
        <Link
          href="/"
          className="text-xs font-medium text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline"
        >
          Back to jobs
        </Link>
      </header>

      <main className="grid min-h-0 flex-1 grid-rows-2 gap-2 p-2 lg:grid-cols-2 lg:grid-rows-1">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-stone-300 bg-white">
          <div className="shrink-0 border-b border-stone-200 px-3 py-2">
            <h1 className="text-base font-semibold leading-snug tracking-tight text-stone-900">
              {job.title}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
              {job.employmentType ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${employmentTypeClass(job.employmentType)}`}
                >
                  {job.employmentType}
                </span>
              ) : null}
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
              <button
                type="button"
                onClick={() => setShowingSummary((value) => !value)}
                className={toolbarButtonClass}
              >
                {showingSummary ? "Show original" : "Show summary"}
              </button>
            ) : (
              <button
                type="button"
                onClick={summarizeJob}
                disabled={summaryBusy || !hasDescription}
                className={toolbarButtonClass}
              >
                {summaryBusy ? "Working..." : "Summarize"}
              </button>
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

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-stone-300 bg-white">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-stone-900">Cover letter</h2>
            <button type="button" onClick={copyCoverLetter} className={toolbarButtonClass}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => runAi("professional")}
                disabled={aiBusy || !hasLetter}
                className={toolbarButtonClass}
              >
                {aiAction === "professional" ? "Working..." : "Make professional"}
              </button>
              <button
                type="button"
                onClick={() => runAi("grammar")}
                disabled={aiBusy || !hasLetter}
                className={toolbarButtonClass}
              >
                {aiAction === "grammar" ? "Working..." : "Fix grammar"}
              </button>
            </div>
            {versionCount > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous version"
                  onClick={() => setVersionIndex((index) => Math.max(0, index - 1))}
                  disabled={versionIndex === 0}
                  className={toolbarButtonClass}
                >
                  ←
                </button>
                <span className="min-w-16 px-1 text-center text-xs text-stone-500">
                  {`v${versionIndex + 1} of ${versionCount}`}
                </span>
                <button
                  type="button"
                  aria-label="Next version"
                  onClick={() => setVersionIndex((index) => Math.min(versionCount - 1, index + 1))}
                  disabled={versionIndex === versionCount - 1}
                  className={toolbarButtonClass}
                >
                  →
                </button>
              </div>
            ) : null}
          </div>
          {aiError ? (
            <p className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800">
              {aiError}
            </p>
          ) : null}
          <textarea
            ref={coverLetterRef}
            value={currentLetter}
            onChange={(event) => updateCurrentLetter(event.target.value)}
            spellCheck
            className="min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-stone-50 px-3 py-2 text-sm leading-5 text-stone-800 outline-none"
          />
        </section>
      </main>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const { getJobById } = await import("../../lib/db.js");
  const job = await getJobById(params.id);

  if (!job) {
    return { notFound: true };
  }

  let description = job.snippet || "";
  let descriptionError = null;

  try {
    const { scrapeJobDescription } = await import("../../scraper/jobs.js");
    description = await scrapeJobDescription(job.url);
  } catch {
    descriptionError =
      "Could not load the full job description. Showing the listing snippet instead.";
  }

  return {
    props: {
      job,
      description,
      descriptionError,
    },
  };
}
