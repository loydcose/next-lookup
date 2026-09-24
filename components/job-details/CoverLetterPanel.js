import { useRef, useState } from "react";
import ToolbarButton from "@/components/ui/ToolbarButton";
import { DEFAULT_COVER_LETTER } from "@/config/cover-letter";

// Editable cover letter with AI rewrites. Each rewrite is kept as a version you can step through.
export default function CoverLetterPanel() {
  const coverLetterRef = useRef(null);
  const [versions, setVersions] = useState(() => [DEFAULT_COVER_LETTER]);
  const [versionIndex, setVersionIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [aiAction, setAiAction] = useState(null);
  const [aiError, setAiError] = useState(null);

  const currentLetter = versions[versionIndex] ?? "";
  const hasLetter = currentLetter.trim().length > 0;
  const versionCount = versions.length;
  const aiBusy = Boolean(aiAction);

  function updateCurrentLetter(text) {
    setVersions((prev) =>
      prev.map((version, index) => (index === versionIndex ? text : version)),
    );
  }

  async function copyCoverLetter() {
    try {
      await navigator.clipboard.writeText(currentLetter);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      coverLetterRef.current?.select();
    }
  }

  async function runAi(action) {
    if (aiAction || !hasLetter) {
      return;
    }

    setAiAction(action);
    setAiError(null);

    try {
      const response = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: currentLetter }),
      });
      const data = await response.json().catch(() => ({}));
      const nextText = typeof data.text === "string" ? data.text.trim() : "";

      if (!response.ok || !nextText) {
        setAiError(data.error || "Could not rewrite the letter. Try again.");
        return;
      }

      setVersions((prev) => [...prev, nextText]);
      setVersionIndex(versionCount);
    } catch {
      setAiError("Could not rewrite the letter. Try again.");
    } finally {
      setAiAction(null);
    }
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-stone-300 bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-stone-900">Cover letter</h2>
        <ToolbarButton onClick={copyCoverLetter}>{copied ? "Copied" : "Copy"}</ToolbarButton>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton onClick={() => runAi("professional")} disabled={aiBusy || !hasLetter}>
            {aiAction === "professional" ? "Working..." : "Make professional"}
          </ToolbarButton>
          <ToolbarButton onClick={() => runAi("grammar")} disabled={aiBusy || !hasLetter}>
            {aiAction === "grammar" ? "Working..." : "Fix grammar"}
          </ToolbarButton>
        </div>
        {versionCount > 1 ? (
          <div className="flex items-center gap-1">
            <ToolbarButton
              aria-label="Previous version"
              onClick={() => setVersionIndex((index) => Math.max(0, index - 1))}
              disabled={versionIndex === 0}
            >
              ←
            </ToolbarButton>
            <span className="min-w-16 px-1 text-center text-xs text-stone-500">
              {`v${versionIndex + 1} of ${versionCount}`}
            </span>
            <ToolbarButton
              aria-label="Next version"
              onClick={() => setVersionIndex((index) => Math.min(versionCount - 1, index + 1))}
              disabled={versionIndex === versionCount - 1}
            >
              →
            </ToolbarButton>
          </div>
        ) : null}
      </div>
      {aiError ? (
        <p className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800">
          {aiError}
        </p>
      ) : null}
      <textarea
        ref={coverLetterRef}
        value={currentLetter}
        onChange={(event) => updateCurrentLetter(event.target.value)}
        spellCheck
        className="min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-stone-50 px-3 py-2 text-sm leading-5 text-stone-800 outline-none"
      />
    </section>
  );
}
