import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "site_access";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAuthRequired() {
  return Boolean(process.env.SITE_PASSWORD);
}

// Constant-time string compare; still does the work when lengths differ.
function safeEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));

  if (actualBuffer.length !== expectedBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
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

  return safeEqual(token, createAuthToken());
}

export function passwordsMatch(input) {
  return safeEqual(
    typeof input === "string" ? input : "",
    process.env.SITE_PASSWORD || "",
  );
}

export function bearerTokenMatches(header, secret) {
  if (!header || !secret) {
    return false;
  }

  return safeEqual(header, `Bearer ${secret}`);
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
