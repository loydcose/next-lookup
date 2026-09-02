import { Resend } from "resend";
import { loadEnv } from "./load-env.js";

loadEnv();

const DEFAULT_FROM = "next-lookup <onboarding@resend.dev>";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jobLine(job) {
  const title = escapeHtml(job.title);
  const url = escapeHtml(job.url);
  const salary = escapeHtml(job.salary || "Salary not listed");
  const type = escapeHtml(job.employmentType || "Type not listed");
  const posted = escapeHtml(job.postedAt || "Unknown date");

  return `<li style="margin:0 0 16px">
  <p style="margin:0 0 4px"><a href="${url}">${title}</a></p>
  <p style="margin:0;color:#57534e;font-size:14px">${type} · ${salary} · ${posted}</p>
</li>`;
}

export function canSendAlerts() {
  return Boolean(process.env.RESEND_API_KEY && process.env.ALERT_EMAIL);
}

export async function sendNewJobsEmail(jobs) {
  if (!jobs.length) {
    return { sent: false, skipped: true };
  }

  if (!canSendAlerts()) {
    return {
      sent: false,
      skipped: true,
      warning: "RESEND_API_KEY or ALERT_EMAIL is not set",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const count = jobs.length;
  const subject = count === 1 ? "1 new relevant job" : `${count} new relevant jobs`;
  const jobIds = jobs
    .map((job) => job.id)
    .sort()
    .join(",");

  const { data, error } = await resend.emails.send(
    {
      from: process.env.RESEND_FROM || DEFAULT_FROM,
      to: [process.env.ALERT_EMAIL],
      subject,
      html: `<p>${escapeHtml(subject)} on OnlineJobs.ph:</p>
<ul style="padding-left:20px">${jobs.map(jobLine).join("")}</ul>`,
    },
    { idempotencyKey: `job-alert/${jobIds}`.slice(0, 256) },
  );

  if (error) {
    throw new Error(error.message || "Failed to send alert email");
  }

  return { sent: true, id: data?.id || null };
}
