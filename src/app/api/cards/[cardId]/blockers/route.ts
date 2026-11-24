import { readJson, withUser } from "@/lib/http";
import { addBlockerSchema } from "@/lib/validation";
import { addBlocker } from "@/server/cards";

export const POST = withUser<{ cardId: string }>(async ({ req, userId, params }) => {
  const { blockerId } = await readJson(req, addBlockerSchema);
  return addBlocker(userId, params.cardId, blockerId);
});
