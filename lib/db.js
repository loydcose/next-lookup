import dns from "node:dns";
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
    // Some home routers refuse the SRV lookup that mongodb+srv:// needs
    // (querySrv ECONNREFUSED). Locally, resolve it through public DNS instead.
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.MONGODB_URI.startsWith("mongodb+srv://")
    ) {
      dns.setServers(["1.1.1.1", "8.8.8.8"]);
    }

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
    description: doc.description ?? null,
    relevance: doc.relevance ?? null,
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

// Descriptions are left out by default so the home page doesn't ship them to the browser.
export async function listJobs({ includeDescription = false } = {}) {
  const db = await getDb();
  const projection = includeDescription ? {} : { description: 0 };

  const [jobDocs, meta] = await Promise.all([
    db.collection("jobs").find({}, { projection }).toArray(),
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
            description: job.description || null,
            relevance: job.relevance || null,
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
