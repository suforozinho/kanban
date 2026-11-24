"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardDTO } from "@/lib/types";

type Props = {
  card: CardDTO;
  /** How many unfinished cards block this one. */
  openBlockerCount: number;
  onOpen: (cardId: string) => void;
  /** Cards that are still being saved can't be dragged yet. */
  disabled?: boolean;
};

export function GripIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="currentColor">
      <circle cx="7" cy="5" r="1.5" />
      <circle cx="13" cy="5" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="13" cy="15" r="1.5" />
    </svg>
  );
}

/**
 * A card on the board. The whole card can be dragged with a mouse or finger;
 * keyboard users focus the grip handle and press Space to pick it up.
 * Clicking the title opens the details dialog.
 */
export function CardItem({ card, openBlockerCount, onOpen, disabled }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: "card" }, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...listeners}
      data-testid="card"
      className={`group flex items-start gap-1 rounded-lg border bg-white p-2 shadow-sm dark:bg-slate-800 ${
        openBlockerCount > 0
          ? "border-amber-400 dark:border-amber-500"
          : "border-slate-200 dark:border-slate-700"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        aria-label={`Move card: ${card.title}`}
        className="mt-0.5 cursor-grab rounded p-0.5 text-slate-500 hover:bg-slate-100 active:cursor-grabbing dark:text-slate-400 dark:hover:bg-slate-700"
      >
        <GripIcon />
      </button>
      <button
        type="button"
        onClick={() => onOpen(card.id)}
        className="min-w-0 flex-1 rounded px-1 text-left text-sm text-slate-900 dark:text-slate-100"
      >
        <span className="block break-words">{card.title}</span>
        {(openBlockerCount > 0 || card.description) && (
          <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
            {openBlockerCount > 0 && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                Blocked by {openBlockerCount}
              </span>
            )}
            {card.description && (
              <span className="text-slate-600 dark:text-slate-400">Has notes</span>
            )}
          </span>
        )}
      </button>
    </li>
  );
}

/** What follows the pointer while a card is being dragged. */
export function CardPreview({ card }: { card: CardDTO }) {
  return (
    <div className="flex cursor-grabbing items-start gap-1 rounded-lg border border-indigo-400 bg-white p-2 text-sm text-slate-900 shadow-lg dark:bg-slate-800 dark:text-slate-100">
      <span className="mt-0.5 p-0.5 text-slate-500">
        <GripIcon />
      </span>
      <span className="px-1">{card.title}</span>
    </div>
  );
}
