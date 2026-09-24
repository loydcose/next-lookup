import { allowMethod } from "@/lib/api";
import { groqChat, hasGroqKey, stripFences } from "@/lib/groq";

const SYSTEM_PROMPT = `You extract facts from a job posting into JSON. Return only JSON, no preamble, no markdown.

Shape:
{"requirements":["..."],"summary":["..."]}

requirements: must-haves, skills, stack, experience, and anything a candidate would echo in a cover letter.
summary: what the role is, company or team context, responsibilities, and logistics such as hours, pay, or location if present.

Rules:
- Extract only what is in the posting. Do not invent skills, requirements, or facts.
- Keep each bullet short.
- Use empty arrays if a section has nothing to extract.`;

const SUMMARY_ERROR = "Could not summarize the job. Try again.";

function parseJsonObject(text) {
  const cleaned = stripFences(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("invalid json");
    }

    return JSON.parse(match[0]);
  }
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (!allowMethod(req, res, "POST")) {
    return;
  }

  if (!hasGroqKey()) {
    res.status(503).json({ error: "GROQ_API_KEY is not configured." });
    return;
  }

  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const description =
    typeof req.body?.description === "string" ? req.body.description.trim() : "";

  if (!description) {
    res.status(400).json({ error: "Send a non-empty job description." });
    return;
  }

  try {
    const reply = await groqChat({
      system: SYSTEM_PROMPT,
      user: title ? `Job title: ${title}\n\n${description}` : description,
      temperature: 0.2,
    });
    const parsed = parseJsonObject(reply);
    const requirements = asStringArray(parsed.requirements);
    const summary = asStringArray(parsed.summary);

    if (!requirements || !summary) {
      res.status(502).json({ error: SUMMARY_ERROR });
      return;
    }

    res.status(200).json({ requirements, summary });
  } catch (error) {
    console.error("Groq request failed", error);
    res.status(502).json({ error: SUMMARY_ERROR });
  }
}

export const config = {
  maxDuration: 15,
};
