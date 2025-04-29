import { useState } from "react";
import { useDrag } from "react-aria";

interface TaskProps {
  text: string;
}

export default function Task(props: TaskProps) {
  const [moved, setMoved] = useState(false);
  const { dragProps, isDragging } = useDrag({
    getItems() {
      return [
        {
          "text/plain": props.text,
        },
      ];
    },
    onDragEnd(e) {
      if (e.dropOperation === "move") {
        setMoved(true);
      }
    },
  });

  return moved ? null : (
    <div
      {...dragProps}
      role="button"
      className={`task ${isDragging ? "dragging" : ""}`}
    >
      {props.text}
    </div>
  );
}
