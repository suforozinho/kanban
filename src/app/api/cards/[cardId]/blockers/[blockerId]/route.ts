import { withUser } from "@/lib/http";
import { removeBlocker } from "@/server/cards";

export const DELETE = withUser<{ cardId: string; blockerId: string }>(async ({ userId, params }) =>
  removeBlocker(userId, params.cardId, params.blockerId),
);
