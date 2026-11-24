import { readJson, withUser } from "@/lib/http";
import { titleSchema } from "@/lib/validation";
import { createBoard, listBoards } from "@/server/boards";

export const GET = withUser(async ({ userId }) => listBoards(userId));

export const POST = withUser(async ({ req, userId }) => {
  const { title } = await readJson(req, titleSchema);
  return Response.json(await createBoard(userId, title), { status: 201 });
});
