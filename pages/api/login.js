import {
  authCookieHeader,
  createAuthToken,
  isAuthRequired,
  passwordsMatch,
  safeNextPath,
} from "../../lib/auth.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const nextPath = safeNextPath(req.body?.next);

  if (!isAuthRequired() || passwordsMatch(req.body?.password)) {
    res.setHeader("Set-Cookie", authCookieHeader(createAuthToken()));
    res.redirect(303, nextPath);
    return;
  }

  const loginUrl = new URL("/login", `http://${req.headers.host || "localhost"}`);
  loginUrl.searchParams.set("error", "1");

  if (nextPath !== "/") {
    loginUrl.searchParams.set("next", nextPath);
  }

  res.redirect(303, `${loginUrl.pathname}${loginUrl.search}`);
}
