import { readJson, withUser } from "@/lib/http";
import { createCardSchema } from "@/lib/validation";
import { createCard } from "@/server/cards";

export const POST = withUser<{ columnId: string }>(async ({ req, userId, params }) => {
  const input = await readJson(req, createCardSchema);
  return Response.json(await createCard(userId, params.columnId, input), { status: 201 });
});
