import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { wouldCreateCycle } from "@/lib/dependencies";
import { HttpError, notFound } from "@/lib/errors";
import { keyAtEnd, planInsert, sortByPosition } from "@/lib/ordering";
import type { CardDTO } from "@/lib/types";
import type { CreateCardInput, MoveCardInput, UpdateCardInput } from "@/lib/validation";
import { cardInclude, toCardDTO } from "./mappers";

type Tx = Prisma.TransactionClient;

/**
 * Lock a column the user owns, so concurrent inserts into it are serialised.
 * Each insert then computes its position from the latest committed order.
 */
async function lockOwnedColumn(tx: Tx, userId: string, columnId: string) {
  const rows = await tx.$queryRaw<{ id: string; boardId: string }[]>`
    SELECT c."id", c."boardId"
    FROM "Column" c
    JOIN "Board" b ON b."id" = c."boardId"
    WHERE c."id" = ${columnId} AND b."ownerId" = ${userId}
    FOR UPDATE OF c`;
  return rows[0] ?? null;
}

async function findOwnedCard(db: Tx, userId: string, cardId: string) {
  const card = await db.card.findFirst({
    where: { id: cardId, board: { ownerId: userId } },
    select: { id: true, boardId: true, columnId: true },
  });
  if (!card) throw notFound("Card");
  return card;
}

async function touchBoard(tx: Tx, boardId: string) {
  await tx.board.update({ where: { id: boardId }, data: { updatedAt: new Date() } });
}

export async function createCard(
  userId: string,
  columnId: string,
  input: CreateCardInput,
): Promise<CardDTO> {
  return prisma.$transaction(async (tx) => {
    const column = await lockOwnedColumn(tx, userId, columnId);
    if (!column) throw notFound("Column");

    const siblings = await tx.card.findMany({
      where: { columnId },
      select: { id: true, position: true },
    });
    const card = await tx.card.create({
      data: {
        title: input.title,
        description: input.description ?? "",
        position: keyAtEnd(siblings),
        columnId,
        boardId: column.boardId,
      },
      include: cardInclude,
    });
    await touchBoard(tx, column.boardId);
    return toCardDTO(card);
  });
}

export async function updateCard(
  userId: string,
  cardId: string,
  input: UpdateCardInput,
): Promise<CardDTO> {
  const { count } = await prisma.card.updateMany({
    where: { id: cardId, board: { ownerId: userId } },
    data: input,
  });
  if (count === 0) throw notFound("Card");
  const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId }, include: cardInclude });
  return toCardDTO(card);
}

export async function deleteCard(userId: string, cardId: string): Promise<void> {
  const { count } = await prisma.card.deleteMany({
    where: { id: cardId, board: { ownerId: userId } },
  });
  if (count === 0) throw notFound("Card");
}

/**
 * Move a card to `index` in a column (the index counts the other cards only).
 *
 * The client sends where it wants the card, not a position key. The key is
 * computed here, under a lock on the destination column, from the order that
 * is actually in the database. Two people dropping cards into the same column
 * at once are applied one after the other, and neither move can produce a
 * duplicate or out-of-order key. The last move wins, which is the trade-off.
 */
export async function moveCard(
  userId: string,
  cardId: string,
  { columnId, index }: MoveCardInput,
): Promise<CardDTO> {
  return prisma.$transaction(async (tx) => {
    const card = await findOwnedCard(tx, userId, cardId);
    const column = await lockOwnedColumn(tx, userId, columnId);
    if (!column || column.boardId !== card.boardId) throw notFound("Column");

    const siblings = sortByPosition(
      await tx.card.findMany({
        where: { columnId, NOT: { id: cardId } },
        select: { id: true, position: true },
      }),
    );
    const plan = planInsert(siblings, index);
    for (const update of plan.updates) {
      await tx.card.update({ where: { id: update.id }, data: { position: update.position } });
    }
    const moved = await tx.card.update({
      where: { id: cardId },
      data: { columnId, position: plan.position },
      include: cardInclude,
    });
    await touchBoard(tx, card.boardId);
    return toCardDTO(moved);
  });
}

export async function addBlocker(
  userId: string,
  cardId: string,
  blockerId: string,
): Promise<CardDTO> {
  return prisma.$transaction(async (tx) => {
    const card = await findOwnedCard(tx, userId, cardId);
    const blocker = await findOwnedCard(tx, userId, blockerId).catch(() => null);
    if (!blocker || blocker.boardId !== card.boardId) throw notFound("Blocking card");

    // Lock the board so two dependencies added at once can't form a loop together.
    await tx.$queryRaw`SELECT "id" FROM "Board" WHERE "id" = ${card.boardId} FOR UPDATE`;

    const edges = await tx.cardDependency.findMany({
      where: { card: { boardId: card.boardId } },
      select: { cardId: true, blockerId: true },
    });
    if (wouldCreateCycle(edges, cardId, blockerId)) {
      throw new HttpError(409, "That would create a loop of cards blocking each other");
    }

    await tx.cardDependency.upsert({
      where: { cardId_blockerId: { cardId, blockerId } },
      create: { cardId, blockerId },
      update: {},
    });
    const updated = await tx.card.findUniqueOrThrow({
      where: { id: cardId },
      include: cardInclude,
    });
    return toCardDTO(updated);
  });
}

export async function removeBlocker(
  userId: string,
  cardId: string,
  blockerId: string,
): Promise<CardDTO> {
  await findOwnedCard(prisma, userId, cardId);
  await prisma.cardDependency.deleteMany({ where: { cardId, blockerId } });
  const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId }, include: cardInclude });
  return toCardDTO(card);
}
