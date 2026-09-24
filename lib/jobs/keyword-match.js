function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word, case-insensitive match. Uses lookarounds instead of \b so patterns
// that start or end with a symbol (".net", "c#") still match, while "java" won't
// match "javascript" and "react" won't match "reactive".
export function matchesAny(text, patterns) {
  return patterns.some((pattern) =>
    new RegExp(`(?<!\\w)${escapeRegex(pattern)}(?!\\w)`, "i").test(text || ""),
  );
}
