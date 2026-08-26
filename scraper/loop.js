import { SCRAPE_INTERVAL_MS } from "../config.js";
import { runScrape } from "./jobs.js";

export function startScrapeLoop() {
  let isScraping = false;

  async function tick() {
    if (isScraping) {
      console.log("Skipping scrape because the previous run is still going");
      return;
    }

    isScraping = true;

    try {
      await runScrape();
    } catch (error) {
      console.error("Scrape failed:", error);
    } finally {
      isScraping = false;
    }
  }

  tick();
  setInterval(tick, SCRAPE_INTERVAL_MS);
  console.log("Scrape loop started. Next runs every 15 minutes.");
}
