import { describe, expect, it } from "vitest";
import { moveCardSchema, titleSchema, updateCardSchema } from "./validation";

describe("validation", () => {
  it("trims titles", () => {
    expect(titleSchema.parse({ title: "  Ship it  " })).toEqual({ title: "Ship it" });
  });

  it.each([{ title: "" }, { title: "   " }, { title: "x".repeat(121) }, {}, { title: 5 }])(
    "rejects title %j",
    (input) => {
      expect(titleSchema.safeParse(input).success).toBe(false);
    },
  );

  it("requires at least one field when updating a card", () => {
    expect(updateCardSchema.safeParse({}).success).toBe(false);
    expect(updateCardSchema.safeParse({ description: "" }).success).toBe(true);
  });

  it("only accepts whole, non-negative move indexes", () => {
    expect(moveCardSchema.safeParse({ columnId: "c", index: 0 }).success).toBe(true);
    expect(moveCardSchema.safeParse({ columnId: "c", index: -1 }).success).toBe(false);
    expect(moveCardSchema.safeParse({ columnId: "c", index: 1.5 }).success).toBe(false);
    expect(moveCardSchema.safeParse({ columnId: "", index: 0 }).success).toBe(false);
  });
});
