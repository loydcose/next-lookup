import Head from "next/head";
import { Geist } from "next/font/google";
import JobList from "../components/JobList";

const geistSans = Geist({
  subsets: ["latin"],
});

export default function Home({ jobs, scrapedAt, now }) {
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
            highlighted. Matches for React and Next.js get a star.
          </p>
        </header>

        <JobList jobs={jobs} scrapedAt={scrapedAt} />
      </main>
    </div>
  );
}

export async function getServerSideProps() {
  const { readJobsFile } = await import("../scraper/jobs.js");
  const data = readJobsFile();

  return {
    props: {
      jobs: data.jobs,
      scrapedAt: data.scrapedAt,
    },
  };
}
