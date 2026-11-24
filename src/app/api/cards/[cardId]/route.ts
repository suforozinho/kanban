import { readJson, withUser } from "@/lib/http";
import { updateCardSchema } from "@/lib/validation";
import { deleteCard, updateCard } from "@/server/cards";

type Params = { cardId: string };

export const PATCH = withUser<Params>(async ({ req, userId, params }) => {
  const input = await readJson(req, updateCardSchema);
  return updateCard(userId, params.cardId, input);
});

export const DELETE = withUser<Params>(async ({ userId, params }) => {
  await deleteCard(userId, params.cardId);
  return null;
});
