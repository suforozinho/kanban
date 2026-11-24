"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { CardDTO, ColumnDTO } from "@/lib/types";
import { AddForm } from "./AddForm";
import { CardItem } from "./CardItem";
import { InlineEdit } from "./InlineEdit";

type Props = {
  column: Pick<ColumnDTO, "id" | "title">;
  /** Cards in display order. During a drag this can differ from the saved order. */
  cards: CardDTO[];
  openBlockerCounts: ReadonlyMap<string, number>;
  isDone?: boolean;
  isCardDisabled?: (cardId: string) => boolean;
  onOpenCard: (cardId: string) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddCard: (title: string) => void;
};

export function ColumnView({
  column,
  cards,
  openBlockerCounts,
  isDone,
  isCardDisabled,
  onOpenCard,
  onRename,
  onDelete,
  onAddCard,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } });
  const headingId = `column-${column.id}-title`;

  return (
    <section
      aria-labelledby={headingId}
      data-testid="column"
      className="flex max-h-full w-[85vw] max-w-80 shrink-0 snap-start flex-col rounded-xl bg-slate-100 p-2 sm:w-72 dark:bg-slate-900"
    >
      <header className="flex items-center gap-2 px-1 pb-2">
        <h2
          id={headingId}
          className="min-w-0 flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
        >
          <InlineEdit value={column.title} label="column" onSave={onRename} />
        </h2>
        {isDone && (
          <span
            className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
            title="Cards here count as done for blocking"
          >
            Done
          </span>
        )}
        <span
          className="text-xs text-slate-600 dark:text-slate-400"
          aria-label={`${cards.length} cards`}
        >
          {cards.length}
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete column ${column.title}`}
          className="rounded p-1 text-slate-500 hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-900/40 dark:hover:text-red-300"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" fill="currentColor">
            <path d="M8 2h4a1 1 0 0 1 1 1v1h4v2H3V4h4V3a1 1 0 0 1 1-1Zm-3 6h10l-.8 9.1A1 1 0 0 1 13.2 18H6.8a1 1 0 0 1-1-.9L5 8Z" />
          </svg>
        </button>
      </header>

      <SortableContext
        id={column.id}
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`min-h-20 flex-1 overflow-y-auto rounded-lg p-1 transition-colors ${
            isOver ? "bg-indigo-50 dark:bg-indigo-950/40" : ""
          }`}
        >
          {cards.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
              No cards yet. Drop one here or add one below.
            </p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label={`Cards in ${column.title}`}>
              {cards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  openBlockerCount={openBlockerCounts.get(card.id) ?? 0}
                  onOpen={onOpenCard}
                  disabled={isCardDisabled?.(card.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </SortableContext>

      <div className="pt-2">
        <AddForm label="Add card" placeholder="Card title" onAdd={onAddCard} />
      </div>
    </section>
  );
}
