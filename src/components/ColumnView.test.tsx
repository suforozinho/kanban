import { DndContext } from "@dnd-kit/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CardDTO } from "@/lib/types";
import { expectNoAxeViolations } from "../../test/axe";
import { ColumnView } from "./ColumnView";
import { useBoardSensors } from "./sensors";

const card = (id: string, title: string): CardDTO => ({
  id,
  title,
  description: "",
  position: "a0",
  columnId: "col-1",
  blockerIds: [],
});

function Wrapper({ children }: { children: ReactNode }) {
  return <DndContext sensors={useBoardSensors()}>{children}</DndContext>;
}

function renderColumn(props: Partial<Parameters<typeof ColumnView>[0]> = {}) {
  const handlers = {
    onOpenCard: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onAddCard: vi.fn(),
  };
  const result = render(
    <ColumnView
      column={{ id: "col-1", title: "To do" }}
      cards={[card("1", "First"), card("2", "Second")]}
      openBlockerCounts={new Map([["2", 1]])}
      {...handlers}
      {...props}
    />,
    { wrapper: Wrapper },
  );
  return { ...result, ...handlers };
}

describe("ColumnView", () => {
  it("lists cards in the order given, with a count", () => {
    renderColumn();
    const list = screen.getByRole("list", { name: "Cards in To do" });
    const titles = within(list)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(titles).toEqual(["First", "SecondBlocked by 1"]);
    expect(screen.getByLabelText("2 cards")).toBeInTheDocument();
  });

  it("shows an empty state when there are no cards", () => {
    renderColumn({ cards: [] });
    expect(screen.getByText(/no cards yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("adds a card with a trimmed title and keeps the form open", async () => {
    const { onAddCard } = renderColumn();
    await userEvent.click(screen.getByRole("button", { name: "+ Add card" }));
    await userEvent.type(screen.getByLabelText("Card title"), "  New card {Enter}");
    expect(onAddCard).toHaveBeenCalledWith("New card");
    expect(screen.getByLabelText("Card title")).toHaveValue("");
  });

  it("does not add a card with an empty title", async () => {
    const { onAddCard } = renderColumn();
    await userEvent.click(screen.getByRole("button", { name: "+ Add card" }));
    await userEvent.type(screen.getByLabelText("Card title"), "   {Enter}");
    expect(onAddCard).not.toHaveBeenCalled();
  });

  it("renames the column inline", async () => {
    const { onRename } = renderColumn();
    await userEvent.click(screen.getByRole("button", { name: "To do, rename column" }));
    const input = screen.getByLabelText("Rename column");
    await userEvent.clear(input);
    await userEvent.type(input, "Backlog{Enter}");
    expect(onRename).toHaveBeenCalledWith("Backlog");
  });

  it("cancels a rename with Escape", async () => {
    const { onRename } = renderColumn();
    await userEvent.click(screen.getByRole("button", { name: "To do, rename column" }));
    await userEvent.type(screen.getByLabelText("Rename column"), "zzz{Escape}");
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "To do, rename column" })).toBeInTheDocument();
  });

  it("asks to delete the column", async () => {
    const { onDelete } = renderColumn();
    await userEvent.click(screen.getByRole("button", { name: "Delete column To do" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("opens a card", async () => {
    const { onOpenCard } = renderColumn();
    await userEvent.click(screen.getByRole("button", { name: "First" }));
    expect(onOpenCard).toHaveBeenCalledWith("1");
  });

  it("has no detectable accessibility problems", async () => {
    const { container } = renderColumn({ isDone: true });
    await expectNoAxeViolations(container);
  });
});
