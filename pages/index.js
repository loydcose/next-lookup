import Head from "next/head";
import JobList from "@/components/jobs/JobList";
import { RELEVANCE_THRESHOLD } from "@/config/keywords";
import { geistSans } from "@/lib/fonts";

export default function Home({ jobs, scrapedAt }) {
  return (
    <div className={`${geistSans.className} min-h-screen bg-stone-100 text-stone-900`}>
      <Head>
        <title>Next Look Up</title>
      </Head>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Next Look Up
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
            Developer listings from OnlineJobs.ph, last 3 days. New posts are
            highlighted. Jobs scoring {RELEVANCE_THRESHOLD}+ on your skills are
            marked blue.
          </p>
        </header>

        <JobList jobs={jobs} scrapedAt={scrapedAt} />
      </main>
    </div>
  );
}

export async function getServerSideProps() {
  const { listJobs } = await import("@/lib/db");
  const { shouldKeepJob } = await import("@/lib/jobs/filters");
  const data = await listJobs();
  const now = Date.now();
  const jobs = data.jobs.filter((job) => shouldKeepJob(job, now));

  return {
    props: {
      jobs,
      scrapedAt: data.scrapedAt,
    },
  };
}
