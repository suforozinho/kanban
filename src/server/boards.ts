import "server-only";
import { generateNKeysBetween } from "fractional-indexing";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import type { BoardDTO, BoardSummaryDTO } from "@/lib/types";
import { cardInclude, toBoardDTO } from "./mappers";

/*
 * Every function here takes the signed-in user's id and filters by it, so a
 * caller can never reach another user's board by guessing an id.
 */

export const DEFAULT_COLUMNS = ["To do", "In progress", "Done"];

export async function listBoards(userId: string): Promise<BoardSummaryDTO[]> {
  const boards = await prisma.board.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, updatedAt: true, _count: { select: { cards: true } } },
  });
  return boards.map((b) => ({
    id: b.id,
    title: b.title,
    cardCount: b._count.cards,
    updatedAt: b.updatedAt.toISOString(),
  }));
}

export async function getBoard(userId: string, boardId: string): Promise<BoardDTO> {
  const board = await prisma.board.findFirst({
    where: { id: boardId, ownerId: userId },
    include: { columns: { include: { cards: { include: cardInclude } } } },
  });
  if (!board) throw notFound("Board");
  return toBoardDTO(board);
}

export async function createBoard(userId: string, title: string): Promise<BoardSummaryDTO> {
  const keys = generateNKeysBetween(null, null, DEFAULT_COLUMNS.length);
  const board = await prisma.board.create({
    data: {
      title,
      ownerId: userId,
      columns: { create: DEFAULT_COLUMNS.map((t, i) => ({ title: t, position: keys[i] })) },
    },
  });
  return {
    id: board.id,
    title: board.title,
    cardCount: 0,
    updatedAt: board.updatedAt.toISOString(),
  };
}

export async function renameBoard(userId: string, boardId: string, title: string): Promise<void> {
  const { count } = await prisma.board.updateMany({
    where: { id: boardId, ownerId: userId },
    data: { title },
  });
  if (count === 0) throw notFound("Board");
}

export async function deleteBoard(userId: string, boardId: string): Promise<void> {
  const { count } = await prisma.board.deleteMany({ where: { id: boardId, ownerId: userId } });
  if (count === 0) throw notFound("Board");
}
