import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CardDTO } from "@/lib/types";
import { expectNoAxeViolations } from "../../test/axe";
import { CardItem } from "./CardItem";
import { useBoardSensors } from "./sensors";

const card: CardDTO = {
  id: "card-1",
  title: "Write tests",
  description: "",
  position: "a0",
  columnId: "col-1",
  blockerIds: [],
};

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <DndContext sensors={useBoardSensors()}>
      <SortableContext items={[card.id]}>
        <ul>{children}</ul>
      </SortableContext>
    </DndContext>
  );
}

const renderCard = (props: Partial<Parameters<typeof CardItem>[0]> = {}) =>
  render(<CardItem card={card} openBlockerCount={0} onOpen={() => {}} {...props} />, {
    wrapper: Wrapper,
  });

describe("CardItem", () => {
  it("shows the title and opens the card when the title is clicked", async () => {
    const onOpen = vi.fn();
    renderCard({ onOpen });
    await userEvent.click(screen.getByRole("button", { name: "Write tests" }));
    expect(onOpen).toHaveBeenCalledWith("card-1");
  });

  it("has a separate, labelled drag handle for keyboard users", () => {
    renderCard();
    const handle = screen.getByRole("button", { name: "Move card: Write tests" });
    expect(handle).toHaveAttribute("aria-roledescription", "sortable");
    expect(handle).toHaveAttribute("tabindex", "0");
  });

  it("shows a badge when unfinished cards block it", () => {
    renderCard({ openBlockerCount: 2 });
    expect(screen.getByText("Blocked by 2")).toBeInTheDocument();
  });

  it("shows no badge when nothing blocks it", () => {
    renderCard();
    expect(screen.queryByText(/blocked by/i)).not.toBeInTheDocument();
  });

  it("mentions notes when the card has a description", () => {
    renderCard({ card: { ...card, description: "Details" } });
    expect(screen.getByText("Has notes")).toBeInTheDocument();
  });

  it("has no detectable accessibility problems", async () => {
    const { container } = renderCard({ openBlockerCount: 1 });
    await expectNoAxeViolations(container);
  });
});
