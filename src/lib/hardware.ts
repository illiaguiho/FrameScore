import { GPUS, type Gpu } from "@/data/gpus";
import { CPUS, type Cpu } from "@/data/cpus";

// Words that vary between how stores, browsers and people write the same part.
const NOISE = new Set([
  "nvidia", "geforce", "amd", "radeon", "ati", "intel", "core",
  "graphics", "gpu", "processor", "cpu", "series", "dedicated", "with", "design",
]);

/** Lowercase, split letters from digits ("i5-4590" -> "i 5 4590") and drop punctuation. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\(r\)|\(tm\)|®|™/g, " ")
    .replace(/max-?q/g, " laptop ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((t) => (t === "mobile" ? "laptop" : t));
}

const matchTokens = (text: string) => tokenize(text).filter((t) => !NOISE.has(t));

interface Indexed<T> {
  item: T;
  tokens: string[];
}

function buildIndex<T extends { name: string }>(items: T[], aliases?: (tokens: string[]) => string[] | null) {
  const byFirst = new Map<string, Indexed<T>[]>();
  const add = (item: T, tokens: string[]) => {
    const list = byFirst.get(tokens[0]) ?? [];
    list.push({ item, tokens });
    byFirst.set(tokens[0], list);
  };
  for (const item of items) {
    const tokens = matchTokens(item.name);
    add(item, tokens);
    const alias = aliases?.(tokens);
    if (alias) add(item, alias);
  }
  return byFirst;
}

// Stores often drop the prefix ("Nvidia 2060 Super"). Only 4-digit GeForce numbers are
// distinctive enough to match on their own; "580" could be a GTX 580 or an RX 580.
const gpuIndex = buildIndex(GPUS, (t) => (/^[gr]tx$/.test(t[0]) && /^\d{4}$/.test(t[1]) ? t.slice(1) : null));
const cpuIndex = buildIndex(CPUS);

/** Every known part named in free text, preferring the longest name at each spot. */
function findAll<T>(text: string, index: Map<string, Indexed<T>[]>): T[] {
  const tokens = matchTokens(text);
  const found: T[] = [];
  let i = 0;
  while (i < tokens.length) {
    let best: Indexed<T> | undefined;
    for (const candidate of index.get(tokens[i]) ?? []) {
      const fits = candidate.tokens.every((t, j) => tokens[i + j] === t);
      if (fits && (!best || candidate.tokens.length > best.tokens.length)) best = candidate;
    }
    if (best) {
      if (!found.includes(best.item)) found.push(best.item);
      i += best.tokens.length;
    } else {
      i++;
    }
  }
  return found;
}

export const findGpus = (text: string) => findAll(text, gpuIndex);
export const findCpus = (text: string) => findAll(text, cpuIndex);

export const gpuById = (id: string | null | undefined) => GPUS.find((g) => g.id === id);
export const cpuById = (id: string | null | undefined) => CPUS.find((c) => c.id === id);

/** Drops memory sizes ("6 gb") so "1060 6gb" still finds a part named just "GTX 1060". */
function withoutMemory(tokens: string[]) {
  return tokens.filter((t, i) => !(t === "gb" || t === "mb" || (/^\d+$/.test(t) && /^[gm]b$/.test(tokens[i + 1] ?? ""))));
}

/** Autocomplete: every query word must start some word of the part's name. */
export function searchParts<T extends Gpu | Cpu>(items: T[], query: string, limit = 10): T[] {
  const full = tokenize(query);
  const required = withoutMemory(full);
  if (required.length === 0) return [];
  const covers = (words: string[], q: string[]) => q.every((part) => words.some((w) => w.startsWith(part)));
  const hits = items
    .map((item) => ({ item, words: tokenize(item.name) }))
    .filter(({ words }) => covers(words, required))
    // Parts matching every typed word (memory size included) come first, then fastest first.
    .map(({ item, words }) => ({ item, exact: covers(words, full) }))
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.item.score - a.item.score);
  return hits.slice(0, limit).map((h) => h.item);
}

export { GPUS, CPUS };
export type { Gpu, Cpu };
