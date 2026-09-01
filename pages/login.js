import Head from "next/head";
import { Geist } from "next/font/google";
import {
  COOKIE_NAME,
  isAuthRequired,
  safeNextPath,
  verifyAuthToken,
} from "../lib/auth.js";

const geistSans = Geist({
  subsets: ["latin"],
});

export default function Login({ next, error }) {
  return (
    <div className={`${geistSans.className} min-h-screen bg-stone-100 text-stone-900`}>
      <Head>
        <title>Sign in · Next Look Up</title>
      </Head>
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10 sm:px-6">
        <form
          method="POST"
          action="/api/login"
          className="w-full rounded-xl border border-stone-300 bg-white p-6 shadow-md"
        >
          <h1 className="text-2xl font-semibold tracking-tight">Next Look Up</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Enter the site password to continue.
          </p>

          <input type="hidden" name="next" value={next} />

          <label className="mt-6 block text-sm font-medium text-stone-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            required
            className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-500"
          />

          {error ? (
            <p className="mt-3 text-sm text-red-700">Incorrect password. Try again.</p>
          ) : null}

          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Continue
          </button>
        </form>
      </main>
    </div>
  );
}

export async function getServerSideProps({ query, req }) {
  const next = safeNextPath(query.next);
  const token = req.cookies?.[COOKIE_NAME];

  if (!isAuthRequired() || verifyAuthToken(token)) {
    return {
      redirect: {
        destination: next,
        permanent: false,
      },
    };
  }

  return {
    props: {
      next,
      error: query.error === "1",
    },
  };
}
