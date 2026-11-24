import { readJson, withUser } from "@/lib/http";
import { titleSchema } from "@/lib/validation";
import { deleteBoard, getBoard, renameBoard } from "@/server/boards";

type Params = { boardId: string };

export const GET = withUser<Params>(async ({ userId, params }) => getBoard(userId, params.boardId));

export const PATCH = withUser<Params>(async ({ req, userId, params }) => {
  const { title } = await readJson(req, titleSchema);
  await renameBoard(userId, params.boardId, title);
  return { id: params.boardId, title };
});

export const DELETE = withUser<Params>(async ({ userId, params }) => {
  await deleteBoard(userId, params.boardId);
  return null;
});
