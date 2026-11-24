import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import type { BoardDTO, CardDTO } from "./types";

/**
 * Card and column order is stored as fractional index keys: strings that sort
 * by code point, where a new key can always be generated between two others.
 * Moving a card writes one row instead of renumbering the whole column.
 */

type Positioned = { id: string; position: string };

export function compareKeys(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Sort by position, breaking ties by id so every client sees the same order. */
export function sortByPosition<T extends Positioned>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => compareKeys(a.position, b.position) || compareKeys(a.id, b.id));
}

function isStrictlyIncreasing(keys: readonly string[]): boolean {
  for (let i = 1; i < keys.length; i++) {
    if (keys[i - 1] >= keys[i]) return false;
  }
  return true;
}

export type InsertPlan = {
  /** Key for the item being inserted. */
  position: string;
  /** Other items whose keys must change. Empty unless the list needed repair. */
  updates: Positioned[];
};

/**
 * Work out the key for inserting an item at `index` in `siblings`.
 *
 * `siblings` must be sorted and must not contain the item being moved. If the
 * existing keys are broken (duplicates, which can only come from a bug or a
 * manual edit), every sibling gets a fresh, evenly spaced key instead.
 */
export function planInsert(siblings: readonly Positioned[], index: number): InsertPlan {
  const at = Math.max(0, Math.min(Math.trunc(index), siblings.length));
  const keys = siblings.map((s) => s.position);

  if (isStrictlyIncreasing(keys)) {
    return {
      position: generateKeyBetween(keys[at - 1] ?? null, keys[at] ?? null),
      updates: [],
    };
  }

  const fresh = generateNKeysBetween(null, null, siblings.length + 1);
  const updates: Positioned[] = [];
  let position = "";
  let s = 0;
  for (let i = 0; i < fresh.length; i++) {
    if (i === at) {
      position = fresh[i];
    } else {
      updates.push({ id: siblings[s].id, position: fresh[i] });
      s++;
    }
  }
  return { position, updates };
}

/** Key that places a new item after every item in `siblings`. */
export function keyAtEnd(siblings: readonly Positioned[]): string {
  const sorted = sortByPosition(siblings);
  return planInsert(sorted, sorted.length).position;
}

/**
 * Return a copy of `board` with `cardId` moved to `toIndex` in `toColumnId`.
 * The browser uses this for optimistic updates; the server runs the same
 * `planInsert` against the database, so both agree on the resulting order.
 */
export function applyMove(
  board: BoardDTO,
  cardId: string,
  toColumnId: string,
  toIndex: number,
): BoardDTO {
  const card = board.columns.flatMap((c) => c.cards).find((c) => c.id === cardId);
  const target = board.columns.find((c) => c.id === toColumnId);
  if (!card || !target) return board;

  const siblings = target.cards.filter((c) => c.id !== cardId);
  const plan = planInsert(siblings, toIndex);
  const newPositions = new Map(plan.updates.map((u) => [u.id, u.position]));
  const moved: CardDTO = { ...card, columnId: toColumnId, position: plan.position };

  return {
    ...board,
    columns: board.columns.map((column) => {
      const rest = column.cards
        .filter((c) => c.id !== cardId)
        .map((c) => {
          const position = newPositions.get(c.id);
          return position ? { ...c, position } : c;
        });
      if (column.id !== toColumnId) {
        return rest.length === column.cards.length ? column : { ...column, cards: rest };
      }
      return { ...column, cards: sortByPosition([...rest, moved]) };
    }),
  };
}
