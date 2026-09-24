import { RELEVANCE_THRESHOLD, SKILLS } from "../../config/keywords.js";
import { matchesAny } from "./keyword-match.js";

// Returns { score, matched: [{ name, points }] }. See config/keywords.js for the rules.
export function scoreJob(job) {
  const body = job.description || job.snippet || "";
  const matched = [];

  for (const skill of SKILLS) {
    let points = 0;

    if (matchesAny(job.title, skill.patterns)) {
      points = skill.weight * 2;
    } else if (matchesAny(body, skill.patterns)) {
      points = skill.weight;
    }

    if (points !== 0) {
      matched.push({ name: skill.name, points });
    }
  }

  const score = matched.reduce((total, skill) => total + skill.points, 0);
  return { score, matched };
}

// Prefers the score stored by the scraper; falls back to scoring the card text.
export function jobRelevance(job) {
  return job.relevance || scoreJob(job);
}

export function isRelevantJob(job) {
  return jobRelevance(job).score >= RELEVANCE_THRESHOLD;
}

// "Score 12 · Next.js, React, −PHP"
export function formatRelevance(relevance) {
  const skills = relevance.matched
    .map((skill) => (skill.points < 0 ? `−${skill.name}` : skill.name))
    .join(", ");

  return skills ? `Score ${relevance.score} · ${skills}` : `Score ${relevance.score}`;
}
