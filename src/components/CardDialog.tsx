"use client";

import { useEffect, useId, useRef, useState } from "react";
import { doneColumnId, wouldCreateCycle } from "@/lib/dependencies";
import type { BoardDTO, CardDTO } from "@/lib/types";
import type { useBoardMutations } from "@/hooks/useBoard";

type Props = {
  board: BoardDTO;
  card: CardDTO;
  actions: ReturnType<typeof useBoardMutations>;
  onClose: () => void;
};

const field =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export function CardDialog({ board, card, actions, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [blockerToAdd, setBlockerToAdd] = useState("");
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => dialogRef.current?.close();

  const allCards = board.columns.flatMap((c) => c.cards);
  const byId = new Map(allCards.map((c) => [c.id, c]));
  const done = doneColumnId(board);
  const columnTitle = (columnId: string) =>
    board.columns.find((c) => c.id === columnId)?.title ?? "";
  const edges = allCards.flatMap((c) =>
    c.blockerIds.map((blockerId) => ({ cardId: c.id, blockerId })),
  );

  const blockers = card.blockerIds.map((bid) => byId.get(bid)).filter((c) => c !== undefined);
  const blocking = allCards.filter((c) => c.blockerIds.includes(card.id));
  const candidates = allCards.filter(
    (c) =>
      !card.blockerIds.includes(c.id) &&
      !c.id.startsWith("temp-") &&
      !wouldCreateCycle(edges, card.id, c.id),
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-heading`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 dark:bg-slate-900 dark:text-slate-100"
    >
      <form
        method="dialog"
        className="flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const nextTitle = title.trim();
          if (!nextTitle) return;
          if (nextTitle !== card.title || description !== card.description) {
            actions.updateCard({ cardId: card.id, title: nextTitle, description });
          }
          close();
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={`${id}-heading`} className="text-lg font-semibold">
            Card details
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded px-2 py-1 text-xl leading-none text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Title
          <input
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Notes
          <textarea
            rows={4}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Column
          <select
            value={card.columnId}
            onChange={(e) => {
              const target = board.columns.find((c) => c.id === e.target.value);
              if (target) {
                actions.moveCard({
                  cardId: card.id,
                  columnId: target.id,
                  index: target.cards.length,
                });
              }
            }}
            className={field}
          >
            {board.columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.title}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-sm font-medium">Blocked by</legend>
          {blockers.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No other card blocks this one.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {blockers.map((blocker) => {
                const isDone = blocker.columnId === done;
                return (
                  <li key={blocker.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        isDone
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                      }`}
                    >
                      {isDone ? "Done" : columnTitle(blocker.columnId)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{blocker.title}</span>
                    <button
                      type="button"
                      onClick={() =>
                        actions.removeBlocker({ cardId: card.id, blockerId: blocker.id })
                      }
                      aria-label={`Remove blocker ${blocker.title}`}
                      className="rounded px-2 py-0.5 text-xs text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {candidates.length > 0 && (
            <div className="flex gap-2">
              <select
                aria-label="Card that blocks this one"
                value={blockerToAdd}
                onChange={(e) => setBlockerToAdd(e.target.value)}
                className={field}
              >
                <option value="">Choose a card…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({columnTitle(c.columnId)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!blockerToAdd}
                onClick={() => {
                  actions.addBlocker({ cardId: card.id, blockerId: blockerToAdd });
                  setBlockerToAdd("");
                }}
                className="rounded-md bg-slate-200 px-3 text-sm font-medium hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Add
              </button>
            </div>
          )}
          {blocking.length > 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This card blocks: {blocking.map((c) => c.title).join(", ")}
            </p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-400">
            A blocker counts as finished once it reaches the last column.
          </p>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete "${card.title}"?`)) {
                actions.deleteCard(card.id);
                close();
              }
            }}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Delete card
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
