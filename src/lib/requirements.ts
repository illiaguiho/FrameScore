import { findCpus, findGpus } from "./hardware";
import type { PartRequirement, Requirements } from "./types";

// Steam stores requirements as loosely formatted HTML, e.g.
// <ul><li><strong>Processor:</strong> Intel Core i5-4460 / AMD FX-6300<br></li>...</ul>
// Older games use <br> between lines instead of list items.

type Field = "os" | "cpu" | "ram" | "gpu" | "storage";

const LABELS: Record<string, Field> = {
  os: "os",
  "operating system": "os",
  processor: "cpu",
  cpu: "cpu",
  memory: "ram",
  ram: "ram",
  graphics: "gpu",
  "video card": "gpu",
  video: "gpu",
  gpu: "gpu",
  storage: "storage",
  "hard drive": "storage",
  "hard disk space": "storage",
  "hard disk": "storage",
  "disk space": "storage",
};

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

function toLines(html: string) {
  const text = decode(
    html
      .replace(/<\s*(br|\/li|li|\/p|p)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  );
  const lines: { label: string; value: string }[] = [];
  for (const raw of text.split("\n")) {
    const m = raw.match(/^\s*([A-Za-z][A-Za-z ]{1,30}?)\s*\*?\s*:\s*(.+?)\s*$/);
    if (m && !/^(minimum|recommended)$/i.test(m[1])) lines.push({ label: m[1], value: m[2] });
  }
  return lines;
}

/** First "<number> GB/MB" in the text, in GB. */
function sizeGb(text: string | undefined): number | null {
  const m = text?.match(/(\d+(?:[.,]\d+)?)\s*(gb|mb|tb)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  const unit = m[2].toLowerCase();
  return unit === "mb" ? Math.round((n / 1024) * 4) / 4 : unit === "tb" ? n * 1024 : n;
}

// Rough GPU score from VRAM when the store only says e.g. "2 GB DirectX 11 card".
function gpuFromVram(gb: number) {
  const steps: [number, number][] = [[0.5, 12], [1, 30], [2, 50], [3, 80], [4, 95], [6, 120], [8, 170], [12, 250]];
  let score = 12;
  for (const [vram, s] of steps) if (gb >= vram) score = s;
  return score;
}

// Rough CPU score from "Quad-core 3.0 GHz" style descriptions.
function cpuFromDescription(text: string): number | null {
  const lower = text.toLowerCase();
  const ghz = parseFloat(lower.match(/(\d(?:\.\d+)?)\s*ghz/)?.[1] ?? "");
  const cores = /octa|8[- ]?core/.test(lower) ? 4.6
    : /hexa|six|6[- ]?core/.test(lower) ? 4
    : /quad|4[- ]?core/.test(lower) ? 3.2
    : /dual|2[- ]?core/.test(lower) ? 2.2
    : null;
  if (cores && ghz) return Math.round(ghz * cores * 9);
  if (cores) return Math.round(2.8 * cores * 9);
  const family: [RegExp, number][] = [
    [/ryzen 7|i7/, 140], [/ryzen 5/, 125], [/i5/, 85], [/ryzen 3/, 85], [/i3/, 55],
  ];
  for (const [re, score] of family) if (re.test(lower)) return score;
  if (ghz) return Math.round(ghz * 2.2 * 9);
  return null;
}

function gpuRequirement(text: string | undefined): PartRequirement {
  if (!text) return { text: "", score: null, matched: [], guessed: true };
  const found = findGpus(text);
  if (found.length) {
    // Stores list equivalents ("GTX 970 / RX 480"): meeting any one of them is enough.
    return { text, score: Math.min(...found.map((g) => g.score)), matched: found.map((g) => g.name), guessed: false };
  }
  const vram = sizeGb(text);
  if (vram) return { text, score: gpuFromVram(vram), matched: [], guessed: true };
  if (/integrated|intel hd|directx 9/i.test(text)) return { text, score: 12, matched: [], guessed: true };
  return { text, score: null, matched: [], guessed: true };
}

function cpuRequirement(text: string | undefined): PartRequirement {
  if (!text) return { text: "", score: null, matched: [], guessed: true };
  const found = findCpus(text);
  if (found.length) {
    return { text, score: Math.min(...found.map((c) => c.score)), matched: found.map((c) => c.name), guessed: false };
  }
  return { text, score: cpuFromDescription(text), matched: [], guessed: true };
}

export function parseRequirements(html: string | undefined): Requirements | null {
  if (!html) return null;
  const lines = toLines(html);
  const get = (field: Field) =>
    lines.find((l) => LABELS[l.label.toLowerCase().trim()] === field)?.value;

  const gpuText = get("gpu");
  const storageText = get("storage");
  const vramInGpu = gpuText?.match(/(\d+)\s*gb\s*(of\s*)?(v?ram|vram|video)/i);

  const req: Requirements = {
    gpu: gpuRequirement(gpuText),
    cpu: cpuRequirement(get("cpu")),
    ramGb: sizeGb(get("ram")),
    vramGb: vramInGpu ? parseInt(vramInGpu[1]) : null,
    storageGb: sizeGb(storageText),
    ssd: /ssd[^.]*required|requires? (an )?ssd/i.test(html)
      ? "required"
      : /ssd/i.test(storageText ?? "")
        ? "recommended"
        : null,
    os: get("os") ?? null,
    lines,
  };
  return req.gpu.score === null && req.cpu.score === null && req.ramGb === null ? null : req;
}
