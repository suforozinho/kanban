import type { BoardDTO, CardDTO } from "./types";

export type DependencyEdge = { cardId: string; blockerId: string };

/**
 * Would "cardId is blocked by blockerId" create a cycle?
 * It would if cardId already blocks blockerId, directly or through other cards.
 */
export function wouldCreateCycle(
  edges: readonly DependencyEdge[],
  cardId: string,
  blockerId: string,
): boolean {
  if (cardId === blockerId) return true;

  const blockersOf = new Map<string, string[]>();
  for (const edge of edges) {
    const list = blockersOf.get(edge.cardId);
    if (list) list.push(edge.blockerId);
    else blockersOf.set(edge.cardId, [edge.blockerId]);
  }

  // Walk everything that blocks `blockerId`. Reaching `cardId` means a loop.
  const seen = new Set<string>();
  const stack = [blockerId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === cardId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(blockersOf.get(current) ?? []));
  }
  return false;
}

/** The last column on a board is treated as "done". */
export function doneColumnId(board: BoardDTO): string | null {
  return board.columns.at(-1)?.id ?? null;
}

/** Blockers of `card` that are not done yet. A card with any is "blocked". */
export function openBlockers(board: BoardDTO, card: CardDTO): CardDTO[] {
  if (card.blockerIds.length === 0) return [];
  const done = doneColumnId(board);
  const byId = new Map(board.columns.flatMap((c) => c.cards).map((c) => [c.id, c]));
  return card.blockerIds
    .map((id) => byId.get(id))
    .filter((c): c is CardDTO => c !== undefined && c.columnId !== done);
}
