import { readJson, withUser } from "@/lib/http";
import { titleSchema } from "@/lib/validation";
import { createColumn } from "@/server/columns";

export const POST = withUser<{ boardId: string }>(async ({ req, userId, params }) => {
  const { title } = await readJson(req, titleSchema);
  return Response.json(await createColumn(userId, params.boardId, title), { status: 201 });
});
