// OnlineJobs.ph posts dates as "YYYY-MM-DD HH:MM:SS" in Philippine time (UTC+8).
export function parseJobDate(value) {
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
