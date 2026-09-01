import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function applyEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);

  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSync(filePath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

let loaded = false;

export function loadEnv() {
  if (loaded) {
    return;
  }

  applyEnvFile(".env");
  applyEnvFile(".env.local");
  loaded = true;
}
