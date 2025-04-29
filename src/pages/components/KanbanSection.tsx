import { useState } from "react";
import Task from "./Task";
import { DropZone, TextDropItem } from "react-aria-components";

interface KanbanSectionProps {
  sectionName: string;
}

export default function KanbanSection(props: KanbanSectionProps) {
  const [tasksList, setTasksList] = useState(["TASK 1", "TASK 2", "TASK 3"]);

  return (
    <DropZone
      className="kanban-section todo"
      onDrop={async (e) => {
        const valuePromise = (e.items[0] as TextDropItem).getText("text/plain");
        const droppedTask = await valuePromise;
        setTasksList([...tasksList, droppedTask]);
      }}
    >
      <h3 className="kanban-section-title">{props.sectionName}</h3>
      <div className="tasks-container">
        {tasksList.map((task, index) => (
          <Task text={task} key={index} />
        ))}
      </div>
    </DropZone>
  );
}
