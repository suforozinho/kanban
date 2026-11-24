import { describe, expect, it } from "vitest";
import { doneColumnId, openBlockers, wouldCreateCycle } from "./dependencies";
import type { BoardDTO, CardDTO } from "./types";

describe("wouldCreateCycle", () => {
  // a is blocked by b, b is blocked by c.
  const edges = [
    { cardId: "a", blockerId: "b" },
    { cardId: "b", blockerId: "c" },
  ];

  it("rejects a card blocking itself", () => {
    expect(wouldCreateCycle([], "a", "a")).toBe(true);
  });

  it("rejects a direct loop", () => {
    expect(wouldCreateCycle(edges, "b", "a")).toBe(true);
  });

  it("rejects a loop through other cards", () => {
    expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
  });

  it("allows chains and shared blockers", () => {
    expect(wouldCreateCycle(edges, "a", "c")).toBe(false);
    expect(wouldCreateCycle(edges, "d", "c")).toBe(false);
    expect(wouldCreateCycle(edges, "c", "d")).toBe(false);
  });

  it("handles diamonds without looping forever", () => {
    const diamond = [
      { cardId: "a", blockerId: "b" },
      { cardId: "a", blockerId: "c" },
      { cardId: "b", blockerId: "d" },
      { cardId: "c", blockerId: "d" },
    ];
    expect(wouldCreateCycle(diamond, "d", "a")).toBe(true);
    expect(wouldCreateCycle(diamond, "e", "a")).toBe(false);
  });
});

describe("openBlockers", () => {
  const card = (id: string, columnId: string, blockerIds: string[] = []): CardDTO => ({
    id,
    title: id,
    description: "",
    position: "a0",
    columnId,
    blockerIds,
  });
  const board: BoardDTO = {
    id: "b",
    title: "B",
    columns: [
      {
        id: "todo",
        title: "To do",
        position: "a0",
        cards: [card("a", "todo", ["b", "c", "gone"])],
      },
      { id: "doing", title: "Doing", position: "a1", cards: [card("b", "doing")] },
      { id: "done", title: "Done", position: "a2", cards: [card("c", "done")] },
    ],
  };

  it("treats the last column as done", () => {
    expect(doneColumnId(board)).toBe("done");
  });

  it("lists blockers that are not done, ignoring deleted ones", () => {
    const a = board.columns[0].cards[0];
    expect(openBlockers(board, a).map((c) => c.id)).toEqual(["b"]);
  });

  it("returns nothing for an unblocked card", () => {
    expect(openBlockers(board, board.columns[1].cards[0])).toEqual([]);
  });
});
