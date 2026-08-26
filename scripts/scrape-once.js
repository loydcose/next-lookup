import { runScrape } from "../scraper/jobs.js";

try {
  await runScrape();
} catch (error) {
  console.error("Scrape failed:", error);
  process.exit(1);
}
