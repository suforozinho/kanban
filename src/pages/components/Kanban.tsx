import KanbanSection from "./KanbanSection";
import "./Kanban.css";

export default function Kanban() {
  return (
    <div className="Kanban">
      <div className="Kanban-board">
        <KanbanSection sectionName={"TODO"} />
        <KanbanSection sectionName={"IN-PROGRESS"} />
        <KanbanSection sectionName={"DONE"} />
      </div>
    </div>
  );
}
