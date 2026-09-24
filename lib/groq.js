const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";

export function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY);
}

// Removes a wrapping ```lang ... ``` block if the model added one.
export function stripFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:\w*)\r?\n([\s\S]*?)\r?\n```$/);

  return (fenced ? fenced[1] : trimmed).trim();
}

// Sends one system + user message and returns the reply text.
export async function groqChat({ system, user, temperature }) {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature,
      reasoning_effort: "low",
      reasoning_format: "hidden",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed (${response.status})`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
