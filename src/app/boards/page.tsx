import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardList } from "@/components/BoardList";
import { requireUserId } from "@/lib/session";
import { listBoards } from "@/server/boards";
import { BoardListSkeleton } from "./skeletons";

export const metadata: Metadata = { title: "Your boards" };

export default function BoardsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Your boards</h1>
      <Suspense fallback={<BoardListSkeleton />}>
        <Boards />
      </Suspense>
    </main>
  );
}

async function Boards() {
  const userId = await requireUserId();
  const boards = await listBoards(userId);
  return <BoardList initialBoards={boards} />;
}
