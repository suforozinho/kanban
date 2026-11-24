import "server-only";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { keyAtEnd } from "@/lib/ordering";
import type { ColumnDTO } from "@/lib/types";

export async function createColumn(
  userId: string,
  boardId: string,
  title: string,
): Promise<ColumnDTO> {
  return prisma.$transaction(async (tx) => {
    // Lock the board row so two columns added at once get distinct positions.
    const owned = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Board" WHERE "id" = ${boardId} AND "ownerId" = ${userId} FOR UPDATE`;
    if (owned.length === 0) throw notFound("Board");

    const siblings = await tx.column.findMany({
      where: { boardId },
      select: { id: true, position: true },
    });
    const column = await tx.column.create({
      data: { title, boardId, position: keyAtEnd(siblings) },
    });
    await tx.board.update({ where: { id: boardId }, data: { updatedAt: new Date() } });
    return { id: column.id, title: column.title, position: column.position, cards: [] };
  });
}

export async function renameColumn(userId: string, columnId: string, title: string): Promise<void> {
  const { count } = await prisma.column.updateMany({
    where: { id: columnId, board: { ownerId: userId } },
    data: { title },
  });
  if (count === 0) throw notFound("Column");
}

export async function deleteColumn(userId: string, columnId: string): Promise<void> {
  const { count } = await prisma.column.deleteMany({
    where: { id: columnId, board: { ownerId: userId } },
  });
  if (count === 0) throw notFound("Column");
}
