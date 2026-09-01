import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "site_access";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAuthRequired() {
  return Boolean(process.env.SITE_PASSWORD);
}

function signingKey() {
  return `${process.env.AUTH_SECRET || ""}:${process.env.SITE_PASSWORD || ""}`;
}

export function createAuthToken() {
  return createHmac("sha256", signingKey()).update("site-access").digest("hex");
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== "string") {
    return false;
  }

  const expected = createAuthToken();
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function passwordsMatch(input) {
  const expected = process.env.SITE_PASSWORD || "";
  const actual = typeof input === "string" ? input : "";
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function safeNextPath(value) {
  if (typeof value !== "string") {
    return "/";
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }

  if (value === "/login" || value.startsWith("/login?")) {
    return "/";
  }

  return value;
}

export function authCookieHeader(token) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${COOKIE_MAX_AGE}`,
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}
