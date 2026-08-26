function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseJobDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function pluralLabel(count, unit) {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

export function formatTimeAgo(value) {
  const date = parseJobDate(value);

  if (!date) {
    return null;
  }

  const diffMs = Date.now() - date.getTime();

  if (diffMs < 45 * 1000) {
    return "just now";
  }

  const minutes = Math.floor(diffMs / (60 * 1000));

  if (minutes < 60) {
    return pluralLabel(Math.max(minutes, 1), "minute");
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return pluralLabel(hours, "hour");
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return pluralLabel(days, "day");
  }

  return pluralLabel(Math.floor(days / 30), "month");
}

function jobSearchText(job) {
  return `${job.title || ""} ${job.snippet || ""}`;
}

function matchesKeywords(job, keywords) {
  const text = jobSearchText(job);

  return keywords.some((keyword) => {
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
    return pattern.test(text);
  });
}

export function isRelevantJob(job, keywords) {
  return matchesKeywords(job, keywords);
}

export function isExcludedJob(job, keywords) {
  return matchesKeywords(job, keywords);
}

export function isRecentJob(job, maxAgeDays) {
  const date = parseJobDate(job.postedAt);

  if (!date) {
    return false;
  }

  return Date.now() - date.getTime() <= maxAgeDays * 24 * 60 * 60 * 1000;
}

export function shouldKeepJob(job, { excludeKeywords, maxAgeDays }) {
  return (
    isRecentJob(job, maxAgeDays) && !isExcludedJob(job, excludeKeywords)
  );
}

export function sortJobs(jobs, { isUnread, isRelevant }) {
  return [...jobs].sort((a, b) => {
    const unreadScore = Number(isUnread(b.id)) - Number(isUnread(a.id));
    if (unreadScore !== 0) {
      return unreadScore;
    }

    const relevantScore = Number(isRelevant(b)) - Number(isRelevant(a));
    if (relevantScore !== 0) {
      return relevantScore;
    }

    const dateA = new Date(a.postedAt || a.firstSeenAt || 0).getTime();
    const dateB = new Date(b.postedAt || b.firstSeenAt || 0).getTime();
    return dateB - dateA;
  });
}
