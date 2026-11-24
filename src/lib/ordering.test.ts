import { describe, expect, it } from "vitest";
import { applyMove, keyAtEnd, planInsert, sortByPosition } from "./ordering";
import type { BoardDTO, CardDTO } from "./types";

const card = (id: string, position: string, columnId = "c1"): CardDTO => ({
  id,
  title: id,
  description: "",
  position,
  columnId,
  blockerIds: [],
});

const ids = (items: { id: string }[]) => items.map((i) => i.id);

function board(columns: Record<string, CardDTO[]>): BoardDTO {
  return {
    id: "b",
    title: "Board",
    columns: Object.entries(columns).map(([id, cards], i) => ({
      id,
      title: id,
      position: `a${i}`,
      cards,
    })),
  };
}

describe("planInsert", () => {
  const siblings = [card("x", "a0"), card("y", "a1"), card("z", "a2")];

  it("creates a first key in an empty list", () => {
    expect(planInsert([], 0)).toEqual({ position: "a0", updates: [] });
  });

  it.each([
    [0, ["new", "x", "y", "z"]],
    [1, ["x", "new", "y", "z"]],
    [2, ["x", "y", "new", "z"]],
    [3, ["x", "y", "z", "new"]],
  ])("inserts at index %i without touching other cards", (index, expected) => {
    const plan = planInsert(siblings, index);
    expect(plan.updates).toEqual([]);
    expect(ids(sortByPosition([...siblings, card("new", plan.position)]))).toEqual(expected);
  });

  it("clamps an index past the end to the end", () => {
    const plan = planInsert(siblings, 99);
    expect(ids(sortByPosition([...siblings, card("new", plan.position)]))).toEqual([
      "x",
      "y",
      "z",
      "new",
    ]);
  });

  it("repairs duplicate keys by spacing every card out again", () => {
    const broken = [card("x", "a0"), card("y", "a0"), card("z", "a1")];
    const plan = planInsert(broken, 1);
    expect(plan.updates).toHaveLength(3);

    const positions = new Map(plan.updates.map((u) => [u.id, u.position]));
    const repaired = broken.map((c) => ({ ...c, position: positions.get(c.id)! }));
    const result = sortByPosition([...repaired, card("new", plan.position)]);
    expect(ids(result)).toEqual(["x", "new", "y", "z"]);
    expect(new Set(result.map((c) => c.position)).size).toBe(4);
  });

  it("keeps keys unique and ordered over many random moves", () => {
    let seed = 42;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let list = [card("c0", "a0")];
    for (let i = 1; i < 300; i++) {
      const index = Math.floor(random() * (list.length + 1));
      const plan = planInsert(list, index);
      const expected = [...ids(list)];
      expected.splice(index, 0, `c${i}`);
      list = sortByPosition([...list, card(`c${i}`, plan.position)]);
      expect(ids(list)).toEqual(expected);
    }
    expect(new Set(list.map((c) => c.position)).size).toBe(list.length);
  });
});

describe("keyAtEnd", () => {
  it("places after the largest key even if the input is unsorted", () => {
    const key = keyAtEnd([card("b", "a2"), card("a", "a0")]);
    expect(key > "a2").toBe(true);
  });
});

describe("sortByPosition", () => {
  it("compares by code point, not locale, and breaks ties by id", () => {
    const sorted = sortByPosition([card("b", "a0"), card("x", "Zz"), card("a", "a0")]);
    expect(ids(sorted)).toEqual(["x", "a", "b"]);
  });
});

describe("applyMove", () => {
  const start = board({
    todo: [card("1", "a0", "todo"), card("2", "a1", "todo"), card("3", "a2", "todo")],
    done: [card("4", "a0", "done")],
  });

  it("reorders inside a column", () => {
    const next = applyMove(start, "3", "todo", 0);
    expect(ids(next.columns[0].cards)).toEqual(["3", "1", "2"]);
    expect(next.columns[1]).toBe(start.columns[1]);
  });

  it("moves a card to another column and updates its columnId", () => {
    const next = applyMove(start, "2", "done", 1);
    expect(ids(next.columns[0].cards)).toEqual(["1", "3"]);
    expect(ids(next.columns[1].cards)).toEqual(["4", "2"]);
    expect(next.columns[1].cards[1].columnId).toBe("done");
  });

  it("moves into an empty column", () => {
    const withEmpty = board({ todo: [card("1", "a0", "todo")], empty: [] });
    const next = applyMove(withEmpty, "1", "empty", 0);
    expect(next.columns[0].cards).toEqual([]);
    expect(ids(next.columns[1].cards)).toEqual(["1"]);
  });

  it("does not change the input board", () => {
    const copy = structuredClone(start);
    applyMove(start, "1", "done", 0);
    expect(start).toEqual(copy);
  });

  it("returns the same board for an unknown card or column", () => {
    expect(applyMove(start, "nope", "todo", 0)).toBe(start);
    expect(applyMove(start, "1", "nope", 0)).toBe(start);
  });
});
