/** Shapes sent between the API and the browser. */

export type CardDTO = {
  id: string;
  title: string;
  description: string;
  position: string;
  columnId: string;
  /** Ids of cards that block this one. */
  blockerIds: string[];
};

export type ColumnDTO = {
  id: string;
  title: string;
  position: string;
  /** Always sorted by position. */
  cards: CardDTO[];
};

export type BoardDTO = {
  id: string;
  title: string;
  /** Always sorted by position. The last column counts as "done". */
  columns: ColumnDTO[];
};

export type BoardSummaryDTO = {
  id: string;
  title: string;
  cardCount: number;
  updatedAt: string;
};
