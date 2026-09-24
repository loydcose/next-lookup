import { allowMethod } from "@/lib/api";
import { groqChat, hasGroqKey, stripFences } from "@/lib/groq";

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

const REWRITE_ERROR = "Could not rewrite the letter. Try again.";

export default async function handler(req, res) {
  if (!allowMethod(req, res, "POST")) {
    return;
  }

  if (!hasGroqKey()) {
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
    const reply = await groqChat({
      system: prompt.system,
      user: text,
      temperature: prompt.temperature,
    });
    const rewritten = stripFences(reply);

    if (!rewritten) {
      res.status(502).json({ error: REWRITE_ERROR });
      return;
    }

    res.status(200).json({ text: rewritten });
  } catch (error) {
    console.error("Groq request failed", error);
    res.status(502).json({ error: REWRITE_ERROR });
  }
}

export const config = {
  maxDuration: 15,
};
