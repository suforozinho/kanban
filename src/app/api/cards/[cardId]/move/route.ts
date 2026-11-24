import { readJson, withUser } from "@/lib/http";
import { moveCardSchema } from "@/lib/validation";
import { moveCard } from "@/server/cards";

export const POST = withUser<{ cardId: string }>(async ({ req, userId, params }) => {
  const input = await readJson(req, moveCardSchema);
  return moveCard(userId, params.cardId, input);
});
