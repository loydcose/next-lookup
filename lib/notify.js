import { loadEnv } from "./load-env.js";

loadEnv();

const TELEGRAM_API = "https://api.telegram.org";
const MAX_MESSAGE_LENGTH = 4096;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function jobLine(job) {
  const title = escapeHtml(job.title);
  const url = escapeHtml(job.url);
  const salary = escapeHtml(job.salary || "Salary not listed");
  const type = escapeHtml(job.employmentType || "Type not listed");
  const posted = escapeHtml(job.postedAt || "Unknown date");

  return `<a href="${url}">${title}</a>\n${type} · ${salary} · ${posted}`;
}

function alertHeader(count) {
  const label = count === 1 ? "1 new relevant job" : `${count} new relevant jobs`;
  return `<b>${escapeHtml(label)}</b> on OnlineJobs.ph:\n\n`;
}

function buildMessage(jobs) {
  return `${alertHeader(jobs.length)}${jobs.map(jobLine).join("\n\n")}`;
}

function fitMessage(jobs) {
  const text = buildMessage(jobs);

  if (text.length <= MAX_MESSAGE_LENGTH) {
    return text;
  }

  return text.slice(0, MAX_MESSAGE_LENGTH);
}

function chunkJobs(jobs) {
  const chunks = [];
  let current = [];

  for (const job of jobs) {
    const candidate = [...current, job];

    if (buildMessage(candidate).length <= MAX_MESSAGE_LENGTH) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      chunks.push(current);
    }

    current = [job];
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

async function sendTelegramMessage(text) {
  const response = await fetch(
    `${TELEGRAM_API}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );

  const payload = await response.json();

  if (!payload.ok) {
    throw new Error(payload.description || "Failed to send Telegram alert");
  }

  return payload.result?.message_id ?? null;
}

export function canSendAlerts() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendNewJobsAlert(jobs) {
  if (!jobs.length) {
    return { sent: false, skipped: true };
  }

  if (!canSendAlerts()) {
    return {
      sent: false,
      skipped: true,
      warning: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set",
    };
  }

  const ids = [];

  for (const chunk of chunkJobs(jobs)) {
    const id = await sendTelegramMessage(fitMessage(chunk));
    ids.push(id);
  }

  return { sent: true, ids };
}
