import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions";
import { getRenderSession } from "@/lib/session";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <Link
        href="/boards"
        className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100"
      >
        <Logo />
        Kanban
      </Link>
      <Suspense fallback={null}>
        <UserMenu />
      </Suspense>
    </header>
  );
}

async function UserMenu() {
  const session = await getRenderSession();
  const user = session?.user;
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      {user.image && (
        <Image src={user.image} alt="" width={28} height={28} className="rounded-full" />
      )}
      <span className="hidden text-slate-700 sm:inline dark:text-slate-300">
        {user.name ?? "Signed in"}
      </span>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-md px-2 py-1 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

export function Logo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="2" y="3" width="6" height="18" rx="1.5" className="fill-indigo-600" />
      <rect x="9" y="3" width="6" height="12" rx="1.5" className="fill-indigo-400" />
      <rect x="16" y="3" width="6" height="8" rx="1.5" className="fill-indigo-300" />
    </svg>
  );
}
