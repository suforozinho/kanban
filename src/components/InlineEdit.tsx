"use client";

import { useState } from "react";

type Props = {
  value: string;
  /** What is being renamed, for screen readers ("board", "column"). */
  label: string;
  onSave: (value: string) => void;
  className?: string;
};

/** Text that turns into an input when clicked. Enter or blur saves, Escape cancels. */
export function InlineEdit({ value, label, onSave, className = "" }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title={`Rename ${label}`}
        aria-label={`${value}, rename ${label}`}
        className={`max-w-full truncate rounded px-1 text-left hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
      >
        {value}
      </button>
    );
  }

  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    setEditing(false);
  };

  return (
    <input
      autoFocus
      value={draft}
      maxLength={120}
      aria-label={`Rename ${label}`}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className={`w-full rounded border border-indigo-400 bg-white px-1 text-slate-900 dark:bg-slate-800 dark:text-slate-100 ${className}`}
    />
  );
}
