import "server-only";
import { generateNKeysBetween } from "fractional-indexing";
import { prisma } from "@/lib/db";

const GUEST_LIFETIME_MS = 24 * 60 * 60 * 1000;

const DEMO_COLUMNS: { title: string; cards: { title: string; description?: string }[] }[] = [
  {
    title: "To do",
    cards: [
      { title: "Write the release notes", description: "Blocked until the deploy is done." },
      { title: "Plan next sprint" },
      {
        title: "Try dragging me with the keyboard",
        description: "Focus the handle, press Space, use the arrow keys, then press Space again.",
      },
    ],
  },
  {
    title: "In progress",
    cards: [
      { title: "Deploy to production", description: "Waiting on the test run." },
      { title: "Fix flaky login test" },
    ],
  },
  {
    title: "Done",
    cards: [{ title: "Set up CI" }, { title: "Design the database schema" }],
  },
];

/**
 * Create a throwaway user with a ready-made board for "Try the demo".
 * Guests older than a day are removed first, along with their boards.
 */
export async function createGuestUser(): Promise<{ id: string; name: string }> {
  await prisma.user.deleteMany({
    where: { isGuest: true, createdAt: { lt: new Date(Date.now() - GUEST_LIFETIME_MS) } },
  });

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: "Guest", isGuest: true } });
    const board = await tx.board.create({ data: { title: "Demo board", ownerId: user.id } });

    const columnKeys = generateNKeysBetween(null, null, DEMO_COLUMNS.length);
    const cardIds = new Map<string, string>();
    for (const [i, column] of DEMO_COLUMNS.entries()) {
      const created = await tx.column.create({
        data: { title: column.title, position: columnKeys[i], boardId: board.id },
      });
      const cardKeys = generateNKeysBetween(null, null, column.cards.length);
      for (const [j, card] of column.cards.entries()) {
        const c = await tx.card.create({
          data: {
            title: card.title,
            description: card.description ?? "",
            position: cardKeys[j],
            columnId: created.id,
            boardId: board.id,
          },
        });
        cardIds.set(card.title, c.id);
      }
    }

    await tx.cardDependency.create({
      data: {
        cardId: cardIds.get("Write the release notes")!,
        blockerId: cardIds.get("Deploy to production")!,
      },
    });
    await tx.cardDependency.create({
      data: {
        cardId: cardIds.get("Deploy to production")!,
        blockerId: cardIds.get("Fix flaky login test")!,
      },
    });

    return { id: user.id, name: user.name ?? "Guest" };
  });
}
