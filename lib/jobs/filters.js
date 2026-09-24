import { EXCLUDE_KEYWORDS, INTEREST_KEYWORDS } from "../../config/keywords.js";
import { JOB_MAX_AGE_DAYS } from "../../config/search.js";
import { parseJobDate } from "./dates.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeywords(job, keywords) {
  const text = `${job.title || ""} ${job.snippet || ""}`;

  return keywords.some((keyword) => {
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
    return pattern.test(text);
  });
}

export function isRelevantJob(job) {
  return matchesKeywords(job, INTEREST_KEYWORDS);
}

export function isExcludedJob(job) {
  return matchesKeywords(job, EXCLUDE_KEYWORDS);
}

export function isRecentJob(job, now = Date.now()) {
  const date = parseJobDate(job.postedAt);

  if (!date) {
    return false;
  }

  return now - date.getTime() <= JOB_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

export function shouldKeepJob(job, now = Date.now()) {
  return isRecentJob(job, now) && !isExcludedJob(job);
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
