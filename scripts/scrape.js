import { runScrape } from "../lib/scraper/run-scrape.js";

try {
  await runScrape();
  process.exit(0);
} catch (error) {
  console.error("Scrape failed:", error);
  process.exit(1);
}
