import { MongoClient } from "mongodb";
import { loadEnv } from "./env.js";

loadEnv();

const META_ID = "singleton";

function requireMongoUri() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }
}

async function getDb() {
  requireMongoUri();

  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = new MongoClient(process.env.MONGODB_URI)
      .connect()
      .catch((error) => {
        // Don't cache a failed connection; let the next request retry.
        globalThis._mongoClientPromise = undefined;
        throw error;
      });
  }

  const client = await globalThis._mongoClientPromise;
  // Database name comes from the URI path, e.g. mongodb://.../next-lookup
  return client.db();
}

function toIso(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function toDate(value) {
  return value ? new Date(value) : null;
}

function mapJobDoc(doc) {
  return {
    id: doc._id,
    url: doc.url,
    title: doc.title,
    snippet: doc.snippet || "",
    employmentType: doc.employmentType || "",
    salary: doc.salary || "",
    postedAt: doc.postedAt || "",
    firstSeenAt: toIso(doc.firstSeenAt),
    lastSeenAt: toIso(doc.lastSeenAt),
    notifiedAt: toIso(doc.notifiedAt),
  };
}

function uniqueJobsById(jobs) {
  const jobsById = new Map();

  for (const job of jobs) {
    jobsById.set(String(job.id), { ...job, id: String(job.id) });
  }

  if (jobsById.size !== jobs.length) {
    console.warn(
      `Dropped ${jobs.length - jobsById.size} duplicate job id(s) before write`,
    );
  }

  return [...jobsById.values()];
}

export async function listJobs() {
  const db = await getDb();

  const [jobDocs, meta] = await Promise.all([
    db.collection("jobs").find({}).toArray(),
    db.collection("scrape_meta").findOne({ _id: META_ID }),
  ]);

  return {
    scrapedAt: toIso(meta?.scrapedAt) || null,
    jobs: jobDocs.map(mapJobDoc),
  };
}

export async function getJobById(id) {
  const db = await getDb();
  const doc = await db.collection("jobs").findOne({ _id: String(id) });
  return doc ? mapJobDoc(doc) : null;
}

export async function upsertJobs(jobs, scrapedAt) {
  const db = await getDb();
  const jobsCollection = db.collection("jobs");
  const uniqueJobs = uniqueJobsById(jobs);

  if (uniqueJobs.length > 0) {
    await jobsCollection.bulkWrite(
      uniqueJobs.map((job) => ({
        replaceOne: {
          filter: { _id: job.id },
          replacement: {
            url: job.url,
            title: job.title,
            snippet: job.snippet || "",
            employmentType: job.employmentType || "",
            salary: job.salary || "",
            postedAt: job.postedAt || "",
            firstSeenAt: toDate(job.firstSeenAt || scrapedAt),
            lastSeenAt: toDate(job.lastSeenAt || scrapedAt),
            notifiedAt: toDate(job.notifiedAt),
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  await jobsCollection.deleteMany({
    _id: { $nin: uniqueJobs.map((job) => job.id) },
  });

  await db
    .collection("scrape_meta")
    .updateOne(
      { _id: META_ID },
      { $set: { scrapedAt: toDate(scrapedAt) } },
      { upsert: true },
    );
}
