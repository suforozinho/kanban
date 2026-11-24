"use client";

import { useState } from "react";

type Props = {
  /** Button text, e.g. "Add card". */
  label: string;
  /** Input label and placeholder, e.g. "Card title". */
  placeholder: string;
  onAdd: (title: string) => void;
  disabled?: boolean;
};

/** A "+ Add …" button that opens a one-field form. Stays open for quick entry. */
export function AddForm({ label, placeholder, onAdd, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
      >
        + {label}
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const title = value.trim();
        if (!title) return;
        onAdd(title);
        setValue("");
      }}
    >
      <input
        autoFocus
        value={value}
        maxLength={120}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {label}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1 text-sm text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
