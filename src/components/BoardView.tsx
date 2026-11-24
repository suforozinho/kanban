"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Link from "next/link";
import { useMemo, useState } from "react";
import { isTempId, useBoard, useBoardMutations } from "@/hooks/useBoard";
import { doneColumnId, openBlockers } from "@/lib/dependencies";
import type { BoardDTO } from "@/lib/types";
import { AddForm } from "./AddForm";
import { CardDialog } from "./CardDialog";
import { CardPreview } from "./CardItem";
import { ColumnView } from "./ColumnView";
import { InlineEdit } from "./InlineEdit";
import { useBoardSensors } from "./sensors";

/** Card ids per column, in display order. */
type Layout = Record<string, string[]>;

const layoutOf = (board: BoardDTO): Layout =>
  Object.fromEntries(board.columns.map((c) => [c.id, c.cards.map((card) => card.id)]));

function containerOf(layout: Layout, id: UniqueIdentifier): string | undefined {
  const key = String(id);
  if (key in layout) return key;
  return Object.keys(layout).find((columnId) => layout[columnId].includes(key));
}

export function BoardView({ initialBoard }: { initialBoard: BoardDTO }) {
  const { data: board, isError, refetch } = useBoard(initialBoard);
  const actions = useBoardMutations(board.id);

  // While dragging, cards move between columns in this local copy. The saved
  // board is only changed once, when the card is dropped.
  const [dragLayout, setDragLayout] = useState<Layout | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const layout = dragLayout ?? layoutOf(board);

  const cardsById = useMemo(
    () => new Map(board.columns.flatMap((c) => c.cards).map((card) => [card.id, card])),
    [board],
  );
  const openBlockerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cardsById.values()) counts.set(card.id, openBlockers(board, card).length);
    return counts;
  }, [board, cardsById]);
  const doneId = doneColumnId(board);

  const sensors = useBoardSensors();

  // Screen reader messages. dnd-kit reads these out while a card is moved.
  // `layout` is the live drag layout, so positions match what is on screen.
  const titleOf = (id: UniqueIdentifier) => cardsById.get(String(id))?.title ?? "card";
  const columnTitle = (columnId: string | undefined) =>
    board.columns.find((c) => c.id === columnId)?.title ?? "";
  const positionOf = (id: UniqueIdentifier) => {
    const columnId = containerOf(layout, id);
    if (!columnId) return "";
    const items = layout[columnId];
    return `position ${items.indexOf(String(id)) + 1} of ${items.length} in column ${columnTitle(columnId)}`;
  };
  const overText = (activeId: UniqueIdentifier, overId: UniqueIdentifier) => {
    if (overId === activeId) return `at ${positionOf(activeId)}`;
    const key = String(overId);
    if (key in layout) return `over column ${columnTitle(key)}`;
    return `over ${titleOf(key)} in column ${columnTitle(containerOf(layout, key))}`;
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}, ${positionOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${titleOf(active.id)} is ${overText(active.id, over.id)}.`
        : `${titleOf(active.id)} is not over a column.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${titleOf(active.id)} ${overText(active.id, over.id)}.`
        : `Dropped ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelled. ${titleOf(active.id)} went back to where it was.`,
  };

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setDragLayout(layoutOf(board));
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    setDragLayout((prev) => {
      if (!prev) return prev;
      const from = containerOf(prev, active.id);
      const to = containerOf(prev, over.id);
      if (!from || !to || from === to) return prev;

      const target = prev[to].filter((id) => id !== active.id);
      let index = target.indexOf(String(over.id));
      if (index === -1) {
        index = target.length; // Over the column itself, so go to the end.
      } else {
        const dragged = active.rect.current.translated;
        if (dragged && dragged.top > over.rect.top + over.rect.height / 2) index += 1;
      }
      target.splice(index, 0, String(active.id));
      return { ...prev, [from]: prev[from].filter((id) => id !== active.id), [to]: target };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const current = dragLayout;
    setActiveId(null);
    setDragLayout(null);
    if (!over || !current) return;

    const cardId = String(active.id);
    const columnId = containerOf(current, cardId);
    if (!columnId) return;

    let items = current[columnId];
    if (containerOf(current, over.id) === columnId && over.id !== columnId) {
      const from = items.indexOf(cardId);
      const to = items.indexOf(String(over.id));
      if (from !== to) items = arrayMove(items, from, to);
    }
    const index = items.indexOf(cardId);

    const original = cardsById.get(cardId);
    const originalColumn = board.columns.find((c) => c.id === original?.columnId);
    const originalIndex = originalColumn?.cards.findIndex((c) => c.id === cardId);
    if (original?.columnId === columnId && originalIndex === index) return;

    actions.moveCard({ cardId, columnId, index });
  }

  const activeCard = activeId ? cardsById.get(activeId) : undefined;
  const openCard = openCardId ? cardsById.get(openCardId) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
        <Link
          href="/boards"
          className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Boards
        </Link>
        <h1 className="min-w-0 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <InlineEdit value={board.title} label="board" onSave={actions.renameBoard} />
        </h1>
      </div>

      {isError && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          Could not load the latest version of this board.{" "}
          <button type="button" onClick={() => refetch()} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To pick up a card, press Space. Use the arrow keys to move it between positions and columns. Press Space again to drop it, or Escape to cancel.",
          },
        }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setDragLayout(null);
        }}
      >
        <div className="flex min-h-0 flex-1 snap-x snap-mandatory scroll-px-4 items-start gap-3 overflow-x-auto p-4 sm:snap-none">
          {board.columns.map((column) => (
            <ColumnView
              key={column.id}
              column={column}
              cards={(layout[column.id] ?? []).flatMap((id) => cardsById.get(id) ?? [])}
              openBlockerCounts={openBlockerCounts}
              isDone={column.id === doneId && board.columns.length > 1}
              isCardDisabled={isTempId}
              onOpenCard={setOpenCardId}
              onRename={(title) => actions.renameColumn({ columnId: column.id, title })}
              onDelete={() => {
                const count = column.cards.length;
                const message =
                  count > 0
                    ? `Delete "${column.title}" and its ${count} card${count === 1 ? "" : "s"}?`
                    : `Delete "${column.title}"?`;
                if (window.confirm(message)) actions.deleteColumn(column.id);
              }}
              onAddCard={(title) => actions.addCard(column.id, title)}
            />
          ))}

          <div className="w-[85vw] max-w-80 shrink-0 snap-start rounded-xl bg-slate-100/60 p-2 sm:w-72 dark:bg-slate-900/60">
            {board.columns.length === 0 && (
              <p className="px-3 pb-2 text-sm text-slate-600 dark:text-slate-400">
                This board has no columns yet. Add one to start adding cards.
              </p>
            )}
            <AddForm
              label="Add column"
              placeholder="Column title"
              onAdd={actions.addColumn}
              disabled={actions.isAddingColumn}
            />
          </div>
        </div>

        <DragOverlay>{activeCard ? <CardPreview card={activeCard} /> : null}</DragOverlay>
      </DndContext>

      {openCard && (
        <CardDialog
          key={openCard.id}
          board={board}
          card={openCard}
          actions={actions}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </div>
  );
}
