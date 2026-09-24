# Next Look Up

Scrapes developer listings from OnlineJobs.ph, stores them in MongoDB, and sends Telegram alerts for relevant new jobs. Each job page includes an AI job summary and a cover letter editor powered by Groq.

## Commands

```bash
npm run dev      # start the app on http://localhost:3000
npm run scrape   # scrape once from your machine (no Telegram alerts)
npm run lint
npm run build
```

In production, `.github/workflows/scrape.yml` calls `GET /api/scrape?source=github` every 15 minutes. That is the only path that sends Telegram alerts.

## Environment variables (`.env`)

| Variable | Used for |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. The database name goes in the path (`.../next-lookup?...`). |
| `SITE_PASSWORD`, `AUTH_SECRET` | Password gate for the site. Leave `SITE_PASSWORD` empty to disable it. |
| `CRON_SECRET` | Bearer token the GitHub workflow sends to `/api/scrape`. |
| `GROQ_API_KEY` | Job summaries and cover letter rewrites. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | New-job alerts. |

## Project structure

```
config/                  Settings you edit by hand
  search.js              Search URL, page size, max job age
  keywords.js            Interest keywords (starred + alerted) and exclude keywords (dropped)
  cover-letter.js        Default cover letter text

lib/                     Server and shared logic
  db.js                  MongoDB access: listJobs, getJobById, upsertJobs
  scraper/
    onlinejobs.js        Fetch + parse onlinejobs.ph pages
    run-scrape.js        Crawl listing pages, merge with stored jobs, save
  jobs/
    filters.js           Relevance, exclusion, age filtering, sorting
    dates.js             Parse job dates, "3 hours ago" formatting
  telegram.js            Telegram alert messages
  groq.js                Groq chat client
  auth.js                Site password cookie + cron bearer check
  api.js                 API route helpers
  env.js                 .env loader for plain Node scripts
  fonts.js, local-storage.js

components/
  jobs/                  Home page: JobList, JobCard
  job-details/           Job page: JobDescriptionPanel, CoverLetterPanel
  ui/                    Small shared pieces: TimeAgo, EmploymentTypeBadge, ToolbarButton

hooks/                   Browser-side state (seen/opened jobs in localStorage)
pages/                   Routes and API routes
scripts/scrape.js        Entry point for `npm run scrape`
proxy.js                 Redirects to /login when the password gate is on
```

Files under `lib/` and `config/` use relative imports because `npm run scrape` runs them with plain Node. Everything else uses the `@/` alias.
