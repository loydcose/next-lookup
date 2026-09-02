import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  isAuthRequired,
  safeNextPath,
  verifyAuthToken,
} from "./lib/auth.js";

export function proxy(request) {
  if (!isAuthRequired()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (verifyAuthToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (safeNextPath(nextPath) !== "/") {
    loginUrl.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!login|api/login|api/scrape|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
