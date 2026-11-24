import type { BoardDTO, CardDTO } from "@/lib/types";
import { sortByPosition } from "@/lib/ordering";

type CardRow = {
  id: string;
  title: string;
  description: string;
  position: string;
  columnId: string;
  blockedBy: { blockerId: string }[];
};

type BoardRow = {
  id: string;
  title: string;
  columns: { id: string; title: string; position: string; cards: CardRow[] }[];
};

/** Prisma include that loads what `toCardDTO` needs. */
export const cardInclude = { blockedBy: { select: { blockerId: true } } } as const;

export function toCardDTO(card: CardRow): CardDTO {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    position: card.position,
    columnId: card.columnId,
    blockerIds: card.blockedBy.map((d) => d.blockerId).sort(),
  };
}

export function toBoardDTO(board: BoardRow): BoardDTO {
  return {
    id: board.id,
    title: board.title,
    columns: sortByPosition(board.columns).map((column) => ({
      id: column.id,
      title: column.title,
      position: column.position,
      cards: sortByPosition(column.cards.map(toCardDTO)),
    })),
  };
}
