import { readJson, withUser } from "@/lib/http";
import { titleSchema } from "@/lib/validation";
import { deleteColumn, renameColumn } from "@/server/columns";

type Params = { columnId: string };

export const PATCH = withUser<Params>(async ({ req, userId, params }) => {
  const { title } = await readJson(req, titleSchema);
  await renameColumn(userId, params.columnId, title);
  return { id: params.columnId, title };
});

export const DELETE = withUser<Params>(async ({ userId, params }) => {
  await deleteColumn(userId, params.columnId);
  return null;
});
