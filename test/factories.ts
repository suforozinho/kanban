import { prisma } from "@/lib/db";
import { sortByPosition } from "@/lib/ordering";
import { createBoard } from "@/server/boards";

/** A user with one board that has the default three columns. */
export async function createUserWithBoard(name: string) {
  const user = await prisma.user.create({
    data: { name, email: `${name.toLowerCase()}@example.com` },
  });
  const summary = await createBoard(user.id, `${name}'s board`);
  const columns = sortByPosition(await prisma.column.findMany({ where: { boardId: summary.id } }));
  return { user, boardId: summary.id, columnIds: columns.map((c) => c.id) };
}
