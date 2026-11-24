import { z } from "zod";

const title = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(120, "Title must be 120 characters or fewer");

const description = z.string().max(5000, "Description must be 5000 characters or fewer");

const id = z.string().trim().min(1).max(64);

export const titleSchema = z.object({ title });

export const createCardSchema = z.object({
  title,
  description: description.optional(),
});

export const updateCardSchema = z
  .object({ title: title.optional(), description: description.optional() })
  .refine((v) => v.title !== undefined || v.description !== undefined, {
    message: "Nothing to update",
  });

export const moveCardSchema = z.object({
  columnId: id,
  index: z.number().int().min(0).max(10_000),
});

export const addBlockerSchema = z.object({ blockerId: id });

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
