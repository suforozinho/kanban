import { beforeEach, describe, expect, it, vi } from "vitest";
import * as boardsRoute from "@/app/api/boards/route";
import * as boardRoute from "@/app/api/boards/[boardId]/route";
import * as boardColumnsRoute from "@/app/api/boards/[boardId]/columns/route";
import * as cardRoute from "@/app/api/cards/[cardId]/route";
import * as blockersRoute from "@/app/api/cards/[cardId]/blockers/route";
import * as blockerRoute from "@/app/api/cards/[cardId]/blockers/[blockerId]/route";
import * as moveRoute from "@/app/api/cards/[cardId]/move/route";
import * as columnRoute from "@/app/api/columns/[columnId]/route";
import * as columnCardsRoute from "@/app/api/columns/[columnId]/cards/route";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { getBoard } from "@/server/boards";
import { addBlocker, createCard } from "@/server/cards";
import { createUserWithBoard } from "../../test/factories";

/*
 * Proves that one user cannot read or change another user's data through any
 * API route. User A is signed in and aims every request at user B's ids.
 */

vi.mock("@/lib/session", () => ({
  getCurrentUserId: vi.fn(),
  requireUserId: vi.fn(),
  getRenderSession: vi.fn(),
}));

const signInAs = (userId: string | null) => vi.mocked(getCurrentUserId).mockResolvedValue(userId);

function call<P>(
  handler: (req: Request, ctx: { params: Promise<P> }) => Promise<Response>,
  params: P,
  init?: { method?: string; body?: unknown },
) {
  const req = new Request("http://test.local/api", {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return handler(req, { params: Promise.resolve(params) });
}

let alice: Awaited<ReturnType<typeof createUserWithBoard>>;
let bob: Awaited<ReturnType<typeof createUserWithBoard>>;
let bobCardId: string;
let bobOtherCardId: string;
let aliceCardId: string;

beforeEach(async () => {
  alice = await createUserWithBoard("Alice");
  bob = await createUserWithBoard("Bob");
  bobCardId = (await createCard(bob.user.id, bob.columnIds[0], { title: "Bob's secret" })).id;
  bobOtherCardId = (await createCard(bob.user.id, bob.columnIds[1], { title: "Bob's other" })).id;
  await addBlocker(bob.user.id, bobCardId, bobOtherCardId);
  aliceCardId = (await createCard(alice.user.id, alice.columnIds[0], { title: "Alice's card" })).id;
  signInAs(alice.user.id);
});

describe("user A cannot reach user B's data", () => {
  const requests = () =>
    [
      ["GET board", () => call(boardRoute.GET, { boardId: bob.boardId })],
      [
        "rename board",
        () =>
          call(
            boardRoute.PATCH,
            { boardId: bob.boardId },
            { method: "PATCH", body: { title: "Hacked" } },
          ),
      ],
      [
        "delete board",
        () => call(boardRoute.DELETE, { boardId: bob.boardId }, { method: "DELETE" }),
      ],
      [
        "add column",
        () =>
          call(
            boardColumnsRoute.POST,
            { boardId: bob.boardId },
            { method: "POST", body: { title: "Hacked" } },
          ),
      ],
      [
        "rename column",
        () =>
          call(
            columnRoute.PATCH,
            { columnId: bob.columnIds[0] },
            { method: "PATCH", body: { title: "Hacked" } },
          ),
      ],
      [
        "delete column",
        () => call(columnRoute.DELETE, { columnId: bob.columnIds[0] }, { method: "DELETE" }),
      ],
      [
        "add card",
        () =>
          call(
            columnCardsRoute.POST,
            { columnId: bob.columnIds[0] },
            { method: "POST", body: { title: "Hacked" } },
          ),
      ],
      [
        "update card",
        () =>
          call(
            cardRoute.PATCH,
            { cardId: bobCardId },
            { method: "PATCH", body: { title: "Hacked" } },
          ),
      ],
      ["delete card", () => call(cardRoute.DELETE, { cardId: bobCardId }, { method: "DELETE" })],
      [
        "move card",
        () =>
          call(
            moveRoute.POST,
            { cardId: bobCardId },
            { method: "POST", body: { columnId: bob.columnIds[2], index: 0 } },
          ),
      ],
      [
        "move own card into B's column",
        () =>
          call(
            moveRoute.POST,
            { cardId: aliceCardId },
            { method: "POST", body: { columnId: bob.columnIds[0], index: 0 } },
          ),
      ],
      [
        "add blocker",
        () =>
          call(
            blockersRoute.POST,
            { cardId: bobOtherCardId },
            { method: "POST", body: { blockerId: bobCardId } },
          ),
      ],
      [
        "block own card by B's card",
        () =>
          call(
            blockersRoute.POST,
            { cardId: aliceCardId },
            { method: "POST", body: { blockerId: bobCardId } },
          ),
      ],
      [
        "remove blocker",
        () =>
          call(
            blockerRoute.DELETE,
            { cardId: bobCardId, blockerId: bobOtherCardId },
            { method: "DELETE" },
          ),
      ],
    ] as const;

  it.each(requests().map(([name], i) => [name, i] as const))("%s returns 404", async (_name, i) => {
    const before = await getBoard(bob.user.id, bob.boardId);
    const res = await requests()[i][1]();
    expect(res.status).toBe(404);
    // Bob's board is exactly as it was.
    expect(await getBoard(bob.user.id, bob.boardId)).toEqual(before);
  });

  it("does not include B's boards in A's list", async () => {
    const res = await call(boardsRoute.GET, {});
    const boards = (await res.json()) as { id: string }[];
    expect(boards.map((b) => b.id)).toEqual([alice.boardId]);
  });

  it("leaves A's own card where it was after a rejected cross-board move", async () => {
    await call(
      moveRoute.POST,
      { cardId: aliceCardId },
      { method: "POST", body: { columnId: bob.columnIds[0], index: 0 } },
    );
    const card = await prisma.card.findUniqueOrThrow({ where: { id: aliceCardId } });
    expect(card.columnId).toBe(alice.columnIds[0]);
  });
});

describe("the owner can do the same things", () => {
  it("reads, renames and deletes their own board", async () => {
    signInAs(bob.user.id);
    expect((await call(boardRoute.GET, { boardId: bob.boardId })).status).toBe(200);
    const renamed = await call(
      boardRoute.PATCH,
      { boardId: bob.boardId },
      { method: "PATCH", body: { title: "Renamed" } },
    );
    expect(renamed.status).toBe(200);
    expect(
      (await call(boardRoute.DELETE, { boardId: bob.boardId }, { method: "DELETE" })).status,
    ).toBe(204);
  });
});

describe("signed-out requests", () => {
  it("are rejected with 401", async () => {
    signInAs(null);
    expect((await call(boardsRoute.GET, {})).status).toBe(401);
    expect((await call(boardRoute.GET, { boardId: bob.boardId })).status).toBe(401);
    expect(
      (
        await call(
          moveRoute.POST,
          { cardId: bobCardId },
          { method: "POST", body: { columnId: bob.columnIds[1], index: 0 } },
        )
      ).status,
    ).toBe(401);
  });
});

describe("input validation", () => {
  it("rejects an empty title with 400 and a message", async () => {
    const res = await call(boardsRoute.POST, {}, { method: "POST", body: { title: "  " } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Title is required" });
  });

  it("rejects a body that is not JSON", async () => {
    const req = new Request("http://test.local/api", { method: "POST", body: "{nope" });
    const res = await boardsRoute.POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });
});
