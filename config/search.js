export const SEARCH_URL =
  "https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword=developer&skill_tags=&gig=on&partTime=on&fullTime=on&isFromJobsearchForm=1";

export const JOBS_PER_PAGE = 30;
export const PAGE_DELAY_MS = 500;
export const JOB_MAX_AGE_DAYS = 3;

// onlinejobs.ph returns 429 when job pages are fetched too quickly, so descriptions
// are fetched slowly and in small batches; the rest are picked up on later runs.
export const DESCRIPTION_DELAY_MS = 2000;
export const MAX_DESCRIPTIONS_PER_RUN = 15;
