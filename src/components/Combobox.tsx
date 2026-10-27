"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface Props<T> {
  label: string;
  placeholder: string;
  selected: T | null;
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string;
  search: (query: string) => T[] | Promise<T[]>;
  onSelect: (item: T) => void;
  renderItem?: (item: T) => ReactNode;
  size?: "lg" | "md";
  delay?: number;
  emptyText?: string;
}

/** Text input with a suggestion list; works with mouse, touch and keyboard. */
export function Combobox<T>({
  label, placeholder, selected, getKey, getLabel, search, onSelect, renderItem,
  size = "md", delay = 0, emptyText = "No matches",
}: Props<T>) {
  const id = useId();
  const [query, setQuery] = useState(selected ? getLabel(selected) : "");
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const typed = useRef(false);

  // Show the chosen item's name when it changes from outside (e.g. GPU detection).
  useEffect(() => {
    if (selected) setQuery(getLabel(selected));
  }, [selected, getLabel]);

  useEffect(() => {
    if (!typed.current) return;
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await search(q);
        if (!cancelled) {
          setItems(result);
          setActive(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, search, delay]);

  const choose = (item: T) => {
    typed.current = false;
    setQuery(getLabel(item));
    setOpen(false);
    onSelect(item);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && items[active]) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 2 && typed.current;
  const big = size === "lg";

  return (
    <div className="relative">
      <label htmlFor={id} className={big ? "sr-only" : "mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted"}>
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-activedescendant={showList && items[active] ? `${id}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          typed.current = true;
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className={`w-full rounded-xl border border-border bg-surface text-text placeholder:text-muted/70 outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10 ${
          big ? "px-5 py-4 text-lg" : "px-4 py-3 text-[15px]"
        }`}
      />
      {loading && (
        <span className="pointer-events-none absolute right-4 bottom-0 flex h-[50px] items-center" aria-hidden>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted/40 border-t-accent" />
        </span>
      )}
      {showList && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="animate-rise absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-border bg-surface-2 p-1.5 shadow-2xl shadow-black/60"
          style={{ animationDuration: "0.2s" }}
        >
          {items.length === 0 && !loading && <li className="px-3 py-2.5 text-sm text-muted">{emptyText}</li>}
          {items.map((item, i) => (
            <li
              key={getKey(item)}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(item)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm transition-colors ${i === active ? "bg-border/70 text-text" : "text-text/85"}`}
            >
              {renderItem ? renderItem(item) : getLabel(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
