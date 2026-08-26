function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseJobDate(value) {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();

  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    const date = new Date(`${raw.replace(" ", "T")}+08:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function pluralLabel(count, unit) {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

export function formatTimeAgo(value, now = Date.now()) {
  const date = parseJobDate(value);

  if (!date) {
    return null;
  }

  const diffMs = now - date.getTime();

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

export function isRecentJob(job, maxAgeDays, now = Date.now()) {
  const date = parseJobDate(job.postedAt);

  if (!date) {
    return false;
  }

  return now - date.getTime() <= maxAgeDays * 24 * 60 * 60 * 1000;
}

export function shouldKeepJob(job, { excludeKeywords, maxAgeDays, now = Date.now() }) {
  return (
    isRecentJob(job, maxAgeDays, now) && !isExcludedJob(job, excludeKeywords)
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

    const dateA = parseJobDate(a.postedAt || a.firstSeenAt)?.getTime() || 0;
    const dateB = parseJobDate(b.postedAt || b.firstSeenAt)?.getTime() || 0;
    return dateB - dateA;
  });
}
