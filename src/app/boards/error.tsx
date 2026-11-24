"use client";

import { useEffect } from "react";

export default function BoardsError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-slate-600 dark:text-slate-400">We could not load this page.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
      >
        Try again
      </button>
    </main>
  );
}
