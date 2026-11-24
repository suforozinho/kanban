import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoardView } from "@/components/BoardView";
import { HttpError } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { getBoard } from "@/server/boards";
import { BoardSkeleton } from "../skeletons";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage({ params }: PageProps<"/boards/[boardId]">) {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<BoardSkeleton />}>
        <BoardLoader params={params} />
      </Suspense>
    </main>
  );
}

async function BoardLoader({ params }: { params: PageProps<"/boards/[boardId]">["params"] }) {
  const { boardId } = await params;
  const userId = await requireUserId();
  const board = await getBoard(userId, boardId).catch((error: unknown) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });
  return <BoardView initialBoard={board} />;
}
