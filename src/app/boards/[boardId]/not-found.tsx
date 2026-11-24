import Link from "next/link";

export default function BoardNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">Board not found</h1>
      <p className="text-slate-600 dark:text-slate-400">
        It may have been deleted, or it belongs to someone else.
      </p>
      <Link href="/boards" className="font-medium text-indigo-700 underline dark:text-indigo-300">
        Back to your boards
      </Link>
    </main>
  );
}
