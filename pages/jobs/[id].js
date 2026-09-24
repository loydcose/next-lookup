import { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import CoverLetterPanel from "@/components/job-details/CoverLetterPanel";
import JobDescriptionPanel from "@/components/job-details/JobDescriptionPanel";
import { useOpenedJobs } from "@/hooks/useOpenedJobs";
import { geistSans } from "@/lib/fonts";

export default function JobDetailsPage({ job, description, descriptionError }) {
  const { markOpened } = useOpenedJobs();

  useEffect(() => {
    markOpened(job.id);
  }, [job.id]);

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

      {/* Keyed by job so panel state resets when navigating to another job. */}
      <main className="grid min-h-0 flex-1 grid-rows-2 gap-2 p-2 lg:grid-cols-2 lg:grid-rows-1">
        <JobDescriptionPanel
          key={`description-${job.id}`}
          job={job}
          description={description}
          descriptionError={descriptionError}
        />
        <CoverLetterPanel key={`cover-letter-${job.id}`} />
      </main>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const { getJobById } = await import("@/lib/db");
  const job = await getJobById(params.id);

  if (!job) {
    return { notFound: true };
  }

  let description = job.snippet || "";
  let descriptionError = null;

  try {
    const { scrapeJobDescription } = await import("@/lib/scraper/onlinejobs");
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
