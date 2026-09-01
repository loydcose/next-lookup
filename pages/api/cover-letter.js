const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";

const PROMPTS = {
  professional: {
    temperature: 0.4,
    system:
      "You rewrite cover letters to sound more professional. Keep the same meaning and similar length. Do not invent experience, skills, or facts. Return only the rewritten letter. No preamble, no markdown, no quotes.",
  },
  grammar: {
    temperature: 0.2,
    system:
      "You fix grammar, spelling, and punctuation in cover letters. Keep the original voice and wording whenever you can. Return only the corrected letter. No preamble, no markdown, no quotes.",
  },
};

function stripFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:\w*)\r?\n([\s\S]*?)\r?\n```$/);

  return (fenced ? fenced[1] : trimmed).trim();
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

  const action = req.body?.action;
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const prompt = PROMPTS[action];

  if (!prompt || !text) {
    res.status(400).json({ error: "Send a non-empty letter and a valid action." });
    return;
  }

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: prompt.temperature,
        reasoning_effort: "low",
        reasoning_format: "hidden",
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: text },
        ],
      }),
    });

    if (!groqRes.ok) {
      console.error("Groq request failed", groqRes.status);
      res.status(502).json({ error: "Could not rewrite the letter. Try again." });
      return;
    }

    const data = await groqRes.json();
    const rewritten = stripFences(data.choices?.[0]?.message?.content || "");

    if (!rewritten) {
      res.status(502).json({ error: "Could not rewrite the letter. Try again." });
      return;
    }

    res.status(200).json({ text: rewritten });
  } catch (error) {
    console.error("Groq request failed", error);
    res.status(502).json({ error: "Could not rewrite the letter. Try again." });
  }
}

export const config = {
  maxDuration: 15,
};
