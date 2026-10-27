"use client";

import { useEffect, useState } from "react";

/** Switches between near-black and true black (#000) for OLED screens. */
export function BlackToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => setOn(document.documentElement.dataset.black === "true"), []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    document.documentElement.dataset.black = String(next);
    try {
      localStorage.setItem("fs-black", next ? "1" : "0");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:text-text"
    >
      {on ? "True black: on" : "True black: off"}
    </button>
  );
}
