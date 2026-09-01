const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `You extract facts from a job posting into JSON. Return only JSON, no preamble, no markdown.

Shape:
{"requirements":["..."],"summary":["..."]}

requirements: must-haves, skills, stack, experience, and anything a candidate would echo in a cover letter.
summary: what the role is, company or team context, responsibilities, and logistics such as hours, pay, or location if present.

Rules:
- Extract only what is in the posting. Do not invent skills, requirements, or facts.
- Keep each bullet short.
- Use empty arrays if a section has nothing to extract.`;

function stripFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:\w*)\r?\n([\s\S]*?)\r?\n```$/);

  return (fenced ? fenced[1] : trimmed).trim();
}

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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
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

  const userContent = title
    ? `Job title: ${title}\n\n${description}`
    : description;

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        reasoning_effort: "low",
        reasoning_format: "hidden",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!groqRes.ok) {
      console.error("Groq request failed", groqRes.status);
      res.status(502).json({ error: "Could not summarize the job. Try again." });
      return;
    }

    const data = await groqRes.json();
    const parsed = parseJsonObject(data.choices?.[0]?.message?.content || "");
    const requirements = asStringArray(parsed.requirements);
    const summary = asStringArray(parsed.summary);

    if (!requirements || !summary) {
      res.status(502).json({ error: "Could not summarize the job. Try again." });
      return;
    }

    res.status(200).json({ requirements, summary });
  } catch (error) {
    console.error("Groq request failed", error);
    res.status(502).json({ error: "Could not summarize the job. Try again." });
  }
}

export const config = {
  maxDuration: 15,
};
