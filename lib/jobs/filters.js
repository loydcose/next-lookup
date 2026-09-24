import { TITLE_EXCLUDE_KEYWORDS } from "../../config/keywords.js";
import { JOB_MAX_AGE_DAYS } from "../../config/search.js";
import { parseJobDate } from "./dates.js";
import { matchesAny } from "./keyword-match.js";
import { isRelevantJob } from "./relevance.js";

export function isTitleExcluded(job) {
  return matchesAny(job.title, TITLE_EXCLUDE_KEYWORDS);
}

export function isRecentJob(job, now = Date.now()) {
  const date = parseJobDate(job.postedAt);

  if (!date) {
    return false;
  }

  return now - date.getTime() <= JOB_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

export function shouldKeepJob(job, now = Date.now()) {
  return isRecentJob(job, now) && !isTitleExcluded(job);
}

// Unread first, then relevant, then newest.
export function sortJobs(jobs, { isUnread }) {
  return [...jobs].sort((a, b) => {
    const unreadScore = Number(isUnread(b.id)) - Number(isUnread(a.id));
    if (unreadScore !== 0) {
      return unreadScore;
    }

    const relevantScore = Number(isRelevantJob(b)) - Number(isRelevantJob(a));
    if (relevantScore !== 0) {
      return relevantScore;
    }

    const dateA = parseJobDate(a.postedAt || a.firstSeenAt)?.getTime() || 0;
    const dateB = parseJobDate(b.postedAt || b.firstSeenAt)?.getTime() || 0;
    return dateB - dateA;
  });
}
