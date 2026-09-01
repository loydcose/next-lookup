import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Geist } from "next/font/google";
import TimeAgo from "../../components/TimeAgo";
import { useOpenedJobs } from "../../hooks/useOpenedJobs";

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

function mockCoverLetter(title) {
  return `Hello,

I am writing to apply for the ${title} role. I have experience with React and Next.js, and I would welcome the chance to discuss how I can help.

I can start quickly, communicate clearly, and ship work you can review in production.

Best regards,
[Your Name]`;
}

export default function JobDetailsPage({ job, description, descriptionError }) {
  const { markOpened } = useOpenedJobs();
  const coverLetterRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    markOpened(job.id);
  }, [job.id]);

  async function copyCoverLetter() {
    const text = coverLetterRef.current?.value ?? "";

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      coverLetterRef.current?.select();
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
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 whitespace-pre-wrap text-sm leading-5 text-stone-700">
            {description}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-stone-300 bg-white">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-stone-900">Cover letter</h2>
            <button
              type="button"
              onClick={copyCoverLetter}
              className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            key={job.id}
            ref={coverLetterRef}
            defaultValue={mockCoverLetter(job.title)}
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
