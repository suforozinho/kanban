"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { BoardSummaryDTO } from "@/lib/types";
import { AddForm } from "./AddForm";
import { InlineEdit } from "./InlineEdit";
import { useToast } from "./Toast";

const boardsKey = ["boards"] as const;

export function BoardList({ initialBoards }: { initialBoards: BoardSummaryDTO[] }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const {
    data: boards,
    isError,
    refetch,
  } = useQuery({
    queryKey: boardsKey,
    queryFn: api.listBoards,
    initialData: initialBoards,
  });

  const onError = (error: Error) => toast(error.message);
  const refresh = () => queryClient.invalidateQueries({ queryKey: boardsKey });
  const setBoards = (fn: (all: BoardSummaryDTO[]) => BoardSummaryDTO[]) =>
    queryClient.setQueryData<BoardSummaryDTO[]>(boardsKey, (all) => fn(all ?? []));

  const create = useMutation({
    mutationFn: api.createBoard,
    onSuccess: (board) => {
      setBoards((all) => [...all, board]);
      router.push(`/boards/${board.id}`);
    },
    onError,
  });

  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.renameBoard(id, title),
    onMutate: ({ id, title }) =>
      setBoards((all) => all.map((b) => (b.id === id ? { ...b, title } : b))),
    onError,
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: api.deleteBoard,
    onMutate: (id) => setBoards((all) => all.filter((b) => b.id !== id)),
    onError,
    onSettled: refresh,
  });

  return (
    <div className="flex flex-col gap-6">
      {isError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          Could not refresh your boards.{" "}
          <button type="button" onClick={() => refetch()} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      {boards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
          <p className="font-medium text-slate-900 dark:text-slate-100">You have no boards yet.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Create one below. It starts with To do, In progress and Done columns.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <li
              key={board.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start gap-2">
                <h2 className="min-w-0 flex-1 font-semibold text-slate-900 dark:text-slate-100">
                  <InlineEdit
                    value={board.title}
                    label="board"
                    onSave={(title) => rename.mutate({ id: board.id, title })}
                  />
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete "${board.title}" and all its cards?`))
                      remove.mutate(board.id);
                  }}
                  aria-label={`Delete board ${board.title}`}
                  className="rounded px-2 py-0.5 text-xs text-slate-600 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {board.cardCount} {board.cardCount === 1 ? "card" : "cards"}
              </p>
              <Link
                href={`/boards/${board.id}`}
                className="self-start rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Open <span className="sr-only">{board.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="max-w-sm">
        <AddForm
          label="Create board"
          placeholder="Board title"
          onAdd={(title) => create.mutate(title)}
          disabled={create.isPending}
        />
      </div>
    </div>
  );
}
