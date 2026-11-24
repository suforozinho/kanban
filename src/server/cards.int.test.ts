import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { getBoard } from "@/server/boards";
import { addBlocker, createCard, deleteCard, moveCard, removeBlocker } from "@/server/cards";
import { createGuestUser } from "@/server/guest";
import { createUserWithBoard } from "../../test/factories";

const titles = async (userId: string, boardId: string) =>
  (await getBoard(userId, boardId)).columns.map((c) => c.cards.map((card) => card.title));

describe("card order", () => {
  it("adds new cards to the end of a column", async () => {
    const { user, boardId, columnIds } = await createUserWithBoard("Ann");
    for (const title of ["one", "two", "three"]) {
      await createCard(user.id, columnIds[0], { title });
    }
    expect(await titles(user.id, boardId)).toEqual([["one", "two", "three"], [], []]);
  });

  it("moves cards within and between columns and keeps the order after reloading", async () => {
    const { user, boardId, columnIds } = await createUserWithBoard("Ann");
    const ids: string[] = [];
    for (const title of ["one", "two", "three"]) {
      ids.push((await createCard(user.id, columnIds[0], { title })).id);
    }

    await moveCard(user.id, ids[2], { columnId: columnIds[0], index: 0 });
    expect(await titles(user.id, boardId)).toEqual([["three", "one", "two"], [], []]);

    await moveCard(user.id, ids[0], { columnId: columnIds[1], index: 0 });
    await moveCard(user.id, ids[1], { columnId: columnIds[1], index: 0 });
    expect(await titles(user.id, boardId)).toEqual([["three"], ["two", "one"], []]);

    await moveCard(user.id, ids[2], { columnId: columnIds[1], index: 1 });
    expect(await titles(user.id, boardId)).toEqual([[], ["two", "three", "one"], []]);
  });

  it("keeps positions unique when many cards are dropped into one column at once", async () => {
    const { user, boardId, columnIds } = await createUserWithBoard("Ann");
    const ids: string[] = [];
    for (let i = 0; i < 8; i++) {
      ids.push((await createCard(user.id, columnIds[0], { title: `card ${i}` })).id);
    }

    // Every card is dropped at the top of column 2 at the same moment.
    await Promise.all(ids.map((id) => moveCard(user.id, id, { columnId: columnIds[1], index: 0 })));

    const cards = await prisma.card.findMany({ where: { columnId: columnIds[1] } });
    expect(cards).toHaveLength(8);
    expect(new Set(cards.map((c) => c.position)).size).toBe(8);
    const board = await getBoard(user.id, boardId);
    expect(board.columns[1].cards).toHaveLength(8);
  });

  it("keeps positions unique when cards are created at the same moment", async () => {
    const { user, columnIds } = await createUserWithBoard("Ann");
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        createCard(user.id, columnIds[0], { title: `card ${i}` }),
      ),
    );
    const cards = await prisma.card.findMany({ where: { columnId: columnIds[0] } });
    expect(new Set(cards.map((c) => c.position)).size).toBe(8);
  });
});

describe("card dependencies", () => {
  async function threeCards() {
    const setup = await createUserWithBoard("Ann");
    const [a, b, c] = await Promise.all(
      ["a", "b", "c"].map((title, i) => createCard(setup.user.id, setup.columnIds[i], { title })),
    );
    return { ...setup, a, b, c };
  }

  it("records which cards block a card", async () => {
    const { user, a, b, c } = await threeCards();
    await addBlocker(user.id, a.id, b.id);
    const updated = await addBlocker(user.id, a.id, c.id);
    expect(updated.blockerIds).toEqual([b.id, c.id].sort());
  });

  it("is idempotent", async () => {
    const { user, a, b } = await threeCards();
    await addBlocker(user.id, a.id, b.id);
    const again = await addBlocker(user.id, a.id, b.id);
    expect(again.blockerIds).toEqual([b.id]);
  });

  it("rejects loops with 409", async () => {
    const { user, a, b, c } = await threeCards();
    await addBlocker(user.id, a.id, b.id);
    await addBlocker(user.id, b.id, c.id);
    await expect(addBlocker(user.id, c.id, a.id)).rejects.toMatchObject({ status: 409 });
    await expect(addBlocker(user.id, a.id, a.id)).rejects.toMatchObject({ status: 409 });
  });

  it("rejects a blocker from another board", async () => {
    const { user, a } = await threeCards();
    const otherBoard = await prisma.board.create({
      data: {
        title: "Other",
        ownerId: user.id,
        columns: { create: { title: "Col", position: "a0" } },
      },
      include: { columns: true },
    });
    const other = await createCard(user.id, otherBoard.columns[0].id, { title: "elsewhere" });
    await expect(addBlocker(user.id, a.id, other.id)).rejects.toBeInstanceOf(HttpError);
  });

  it("removes a dependency, and deleting a blocker removes it too", async () => {
    const { user, a, b, c } = await threeCards();
    await addBlocker(user.id, a.id, b.id);
    await addBlocker(user.id, a.id, c.id);
    expect((await removeBlocker(user.id, a.id, b.id)).blockerIds).toEqual([c.id]);
    await deleteCard(user.id, c.id);
    expect(await prisma.cardDependency.count()).toBe(0);
  });
});

describe("guest demo", () => {
  it("creates a guest with a seeded demo board", async () => {
    const guest = await createGuestUser();
    const boards = await prisma.board.findMany({ where: { ownerId: guest.id } });
    expect(boards).toHaveLength(1);
    const board = await getBoard(guest.id, boards[0].id);
    expect(board.columns.map((c) => c.title)).toEqual(["To do", "In progress", "Done"]);
    expect(board.columns.flatMap((c) => c.cards).some((c) => c.blockerIds.length > 0)).toBe(true);
  });

  it("deletes guests older than a day", async () => {
    const old = await createGuestUser();
    await prisma.user.update({
      where: { id: old.id },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });
    await createGuestUser();
    expect(await prisma.user.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await prisma.board.count({ where: { ownerId: old.id } })).toBe(0);
  });
});
