"use client";

import { useEffect, useRef, useState } from "react";

interface Child {
  id: string;
  first_name: string;
}

interface Props {
  children: Child[];
  name?: string;
}

export function ChildSelector({ children, name = "child_ids" }: Props) {
  const [selected, setSelected] = useState<string[]>(
    children.map((c) => c.id), // default: all selected
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = children.filter((c) =>
    c.first_name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const label =
    selected.length === 0
      ? "Select children…"
      : selected.length === children.length
        ? `All ${children.length} children`
        : children
            .filter((c) => selected.includes(c.id))
            .map((c) => c.first_name)
            .join(", ");

  return (
    <div ref={ref} className="relative">
      {/* Hidden inputs carry the values into the form */}
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-coral-light bg-white px-3 py-2.5 text-left text-sm text-ink focus:border-coral focus:outline-none"
      >
        <span className="truncate">{label}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-coral-light bg-white shadow-lg">
          {children.length > 5 && (
            <div className="border-b border-coral-light px-3 py-2">
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-coral-light px-2 py-1.5 text-sm focus:border-coral focus:outline-none"
              />
            </div>
          )}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.map((child) => (
              <li key={child.id}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-coral-light/20">
                  <input
                    type="checkbox"
                    checked={selected.includes(child.id)}
                    onChange={() => toggle(child.id)}
                    className="accent-coral"
                  />
                  <span className="text-sm text-ink">{child.first_name}</span>
                </label>
              </li>
            ))}
          </ul>
          {!search && (
            <div className="border-t border-coral-light px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  if (selected.length === children.length) {
                    setSelected([]);
                  } else {
                    setSelected(children.map((c) => c.id));
                  }
                }}
                className="text-xs font-medium text-coral-dark hover:underline"
              >
                {selected.length === children.length
                  ? "Deselect all"
                  : `Select all (${children.length})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearch("");
                }}
                className="ml-4 text-xs font-medium text-ink/40 hover:text-ink"
              >
                Done ({selected.length} selected)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
