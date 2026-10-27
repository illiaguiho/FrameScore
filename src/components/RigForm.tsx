"use client";

import { useCallback, useState } from "react";
import { Combobox } from "./Combobox";
import { CPUS, GPUS, cpuById, findGpus, gpuById, searchParts, type Cpu, type Gpu } from "@/lib/hardware";
import type { Rig } from "@/lib/types";

const RAM_OPTIONS = [4, 8, 12, 16, 24, 32, 64];

/** Ask the browser which graphics chip it's drawing with. Some browsers hide or blur this. */
function detectGpu(): { gpu?: Gpu; raw?: string; approximate?: boolean } {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return {};
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const raw = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    // Firefox rounds to a "similar" card to prevent fingerprinting, so the model can't be trusted.
    const approximate = /or similar/i.test(raw);
    return { gpu: approximate ? undefined : findGpus(raw)[0], raw, approximate };
  } catch {
    return {};
  }
}

const kindLabel: Record<Gpu["kind"], string> = { desktop: "", laptop: "Laptop", integrated: "Integrated" };

function PartRow({ name, tag }: { name: string; tag?: string }) {
  return (
    <span className="flex items-center justify-between gap-3">
      <span>{name}</span>
      {tag && <span className="shrink-0 rounded-md bg-bg px-1.5 py-0.5 text-[11px] text-muted">{tag}</span>}
    </span>
  );
}

export function RigForm({ rig, onChange }: { rig: Rig; onChange: (rig: Rig) => void }) {
  const [detectMsg, setDetectMsg] = useState<string | null>(null);

  const searchGpus = useCallback((q: string) => searchParts(GPUS, q), []);
  const searchCpus = useCallback((q: string) => searchParts(CPUS, q), []);
  const gpuLabel = useCallback((g: Gpu) => g.name, []);
  const cpuLabel = useCallback((c: Cpu) => c.name, []);

  const detect = () => {
    const { gpu, raw, approximate } = detectGpu();
    if (gpu) {
      onChange({ ...rig, gpuId: gpu.id });
      setDetectMsg(
        gpu.kind === "integrated"
          ? `Detected ${gpu.name}. If your PC also has a separate graphics card (common in gaming laptops), pick that instead; browsers often use the built-in chip.`
          : `Detected ${gpu.name}. Change it if that's wrong.`,
      );
    } else if (approximate) {
      setDetectMsg(`Your browser only gives an approximate model ("${raw}"), usually for privacy. Try Chrome or Edge, or pick it from the list.`);
    } else if (raw) {
      setDetectMsg(`Your browser reported "${raw}", which we couldn't match. Please pick it from the list.`);
    } else {
      setDetectMsg("Your browser doesn't share this. Please pick it from the list.");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Combobox<Gpu>
          label="Graphics card"
          placeholder="e.g. RTX 3060, RX 6600, Iris Xe"
          selected={gpuById(rig.gpuId) ?? null}
          getKey={(g) => g.id}
          getLabel={gpuLabel}
          search={searchGpus}
          onSelect={(g) => onChange({ ...rig, gpuId: g.id })}
          renderItem={(g) => <PartRow name={g.name} tag={kindLabel[g.kind]} />}
          emptyText="Not in our list yet. Try the closest model."
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button type="button" onClick={detect} className="text-xs font-medium text-accent hover:underline">
            Detect my graphics card
          </button>
          {detectMsg && <span className="text-xs text-muted">{detectMsg}</span>}
        </div>
        <details className="mt-2 text-xs text-muted">
          <summary className="cursor-pointer hover:text-text">Where do I find my parts?</summary>
          <p className="mt-1.5 leading-relaxed">
            On Windows, press <kbd className="rounded bg-surface-2 px-1">Ctrl</kbd>+<kbd className="rounded bg-surface-2 px-1">Shift</kbd>+<kbd className="rounded bg-surface-2 px-1">Esc</kbd> to
            open Task Manager, then go to <span className="text-text/80">Performance</span>. The <span className="text-text/80">GPU</span> entries
            show your graphics card(s) and <span className="text-text/80">CPU</span> shows your processor. If you see two GPUs, pick the one that isn&apos;t
            &ldquo;Intel UHD/Iris&rdquo; or &ldquo;AMD Radeon Graphics&rdquo;.
          </p>
        </details>
      </div>

      <Combobox<Cpu>
        label="Processor"
        placeholder="e.g. i5-12400, Ryzen 5 3600"
        selected={cpuById(rig.cpuId) ?? null}
        getKey={(c) => c.id}
        getLabel={cpuLabel}
        search={searchCpus}
        onSelect={(c) => onChange({ ...rig, cpuId: c.id })}
        renderItem={(c) => <PartRow name={c.name} tag={c.laptop ? "Laptop" : undefined} />}
        emptyText="Not in our list yet. Try the closest model."
      />

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">Memory (RAM)</legend>
        <div className="flex flex-wrap gap-1.5">
          {RAM_OPTIONS.map((gb) => (
            <button
              key={gb}
              type="button"
              aria-pressed={rig.ramGb === gb}
              onClick={() => onChange({ ...rig, ramGb: gb })}
              className={`rounded-lg border px-3.5 py-2 text-sm transition ${
                rig.ramGb === gb
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-border bg-surface text-text/80 hover:border-muted/50"
              }`}
            >
              {gb} GB
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3">
        <span className="text-sm">
          Game drive is an SSD
          <span className="block text-xs text-muted">Turn off if you install games on a hard drive (HDD).</span>
        </span>
        <input
          type="checkbox"
          checked={rig.ssd}
          onChange={(e) => onChange({ ...rig, ssd: e.target.checked })}
          className="h-5 w-5 accent-[var(--accent)]"
        />
      </label>
    </div>
  );
}
