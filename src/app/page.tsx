import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/AppHeader";
import { isDemoEnabled, isGitHubEnabled } from "@/lib/config";
import { getRenderSession } from "@/lib/session";
import { signInAsGuest, signInWithGitHub } from "./actions";

const features = [
  ["Drag and drop", "Move cards between columns with a mouse, a finger or the keyboard."],
  [
    "Blocked cards",
    "Mark a card as blocked by another. It stays flagged until the blocker is done.",
  ],
  ["Your boards only", "Sign in with GitHub. Every request checks that the board is yours."],
];

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Logo /> Kanban
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Plan work in columns. See what is blocked.
        </h1>
        <p className="max-w-xl text-lg text-slate-600 dark:text-slate-400">
          A Kanban board built with Next.js, TypeScript and PostgreSQL. Try it as a guest with a
          ready-made demo board, no sign-up needed.
        </p>
      </div>

      <Suspense fallback={<div className="h-11" />}>
        <SignInActions searchParams={searchParams} />
      </Suspense>

      <ul className="grid gap-4 sm:grid-cols-3">
        {features.map(([title, text]) => (
          <li
            key={title}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

const primary =
  "rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-700";
const secondary =
  "rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800";

async function SignInActions({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const session = await getRenderSession();
  if (session?.user) {
    return (
      <div>
        <Link href="/boards" className={`inline-block ${primary}`}>
          Open your boards
        </Link>
      </div>
    );
  }

  const { error } = await searchParams;
  const github = isGitHubEnabled();
  const demo = isDemoEnabled();

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          Sign-in did not work. Please try again.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {demo && (
          <form action={signInAsGuest}>
            <button type="submit" className={primary}>
              Try the demo
            </button>
          </form>
        )}
        {github && (
          <form action={signInWithGitHub}>
            <button type="submit" className={demo ? secondary : primary}>
              Sign in with GitHub
            </button>
          </form>
        )}
        {!demo && !github && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No sign-in method is configured. See the README to set up GitHub sign-in.
          </p>
        )}
      </div>
      {demo && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Demo boards are deleted after 24 hours.
        </p>
      )}
    </div>
  );
}
