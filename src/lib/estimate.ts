import { CPUS, GPUS, cpuById, gpuById, type Cpu, type Gpu } from "./hardware";
import type { GameDetails, Requirements, Rig } from "./types";

export type Preset = "low" | "medium" | "high" | "ultra";
export type Tier = Preset | "none" | "unknown";
export type Status = "pass" | "warn" | "fail" | "unknown";

export interface Check {
  part: string;
  yours: string;
  minimum: string;
  recommended: string;
  status: Status;
}

export interface Estimate {
  tier: Tier;
  smooth: boolean;
  fps: { low: number; high: number } | null;
  bottleneck: "gpu" | "cpu" | "balanced" | null;
  confidence: "high" | "medium" | "low";
  checks: Check[];
  advice: string[];
  upgrade: { gpu?: Gpu; cpu?: Cpu } | null;
  notes: string[];
}

// Model: a GPU matching the recommended spec runs the High preset at ~55 fps.
// Lighter presets need a fraction of that GPU power. CPU limits fps regardless of preset,
// and scales more gently because stores tend to overstate recommended processors.
const BASE_FPS = 55;
const CPU_BASE_FPS = 75;
const cpuFpsFor = (score: number, rec: number) => CPU_BASE_FPS * Math.sqrt(score / rec);
const COST: Record<Preset, number> = { low: 0.62, medium: 0.8, high: 1, ultra: 1.3 };
const PRESETS: Preset[] = ["ultra", "high", "medium", "low"];
const SMOOTH = 55;

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/** Fill in a missing minimum or recommended score from the other one. */
function pair(min: number | null | undefined, rec: number | null | undefined, ratio: number) {
  if (min == null && rec == null) return null;
  const lo = min ?? rec! / ratio;
  const hi = Math.max(rec ?? lo * ratio, lo * 1.15);
  return { min: lo, rec: hi };
}

function status(value: number, min: number | null | undefined, rec: number | null | undefined): Status {
  if (min == null && rec == null) return "unknown";
  if (rec != null && value >= rec) return "pass";
  if (min != null && value >= min) return rec == null ? "pass" : "warn";
  return min == null ? "warn" : "fail";
}

export function estimate(game: GameDetails, rig: Rig): Estimate | null {
  const gpu = gpuById(rig.gpuId);
  const cpu = cpuById(rig.cpuId);
  if (!gpu || !cpu) return null;

  const min: Partial<Requirements> = game.minimum ?? {};
  const rec: Partial<Requirements> = game.recommended ?? {};
  const g = pair(min.gpu?.score, rec.gpu?.score, 1.8);
  const c = pair(min.cpu?.score, rec.cpu?.score, 1.4);
  const ram = { min: min.ramGb ?? null, rec: rec.ramGb ?? min.ramGb ?? null };
  const vramMin = min.vramGb ?? null;
  const vramRec = rec.vramGb ?? vramMin;
  const laptop = gpu.kind === "laptop" || cpu.laptop;

  // Confidence drops for every piece we had to guess.
  const notes: string[] = [];
  if (!game.minimum || !game.recommended) notes.push(`The store page only lists ${game.minimum ? "minimum" : "recommended"} requirements, so the other tier is inferred.`);
  if (!g) notes.push("The game doesn't name a graphics card, so the GPU isn't factored in.");
  else if (min.gpu?.guessed || rec.gpu?.guessed) notes.push("The graphics requirement is vague, so its level is approximated.");
  if (!c) notes.push("The game doesn't name a processor, so the CPU isn't factored in.");
  else if (min.cpu?.guessed || rec.cpu?.guessed) notes.push("The processor requirement is vague, so its level is approximated.");
  const confidence = notes.length === 0 ? "high" : notes.length <= 2 ? "medium" : "low";

  const checks: Check[] = [
    { part: "Graphics", yours: gpu.name, minimum: min.gpu?.text || "—", recommended: rec.gpu?.text || "—", status: g ? status(gpu.score, g.min, g.rec) : "unknown" },
    { part: "Processor", yours: cpu.name, minimum: min.cpu?.text || "—", recommended: rec.cpu?.text || "—", status: c ? status(cpu.score, c.min, c.rec) : "unknown" },
    { part: "Memory", yours: `${rig.ramGb} GB`, minimum: ram.min ? `${ram.min} GB` : "—", recommended: ram.rec ? `${ram.rec} GB` : "—", status: status(rig.ramGb, ram.min, ram.rec) },
  ];
  if (gpu.vram > 0 && (vramMin || vramRec)) {
    checks.push({ part: "Video memory", yours: `${gpu.vram} GB`, minimum: vramMin ? `${vramMin} GB` : "—", recommended: vramRec ? `${vramRec} GB` : "—", status: status(gpu.vram, vramMin, vramRec) });
  }
  const ssd = min.ssd ?? rec.ssd ?? null;
  const storageGb = rec.storageGb ?? min.storageGb;
  if (storageGb || ssd) {
    checks.push({
      part: "Storage",
      yours: rig.ssd ? "SSD" : "Hard drive",
      minimum: [storageGb && `${storageGb} GB`, min.ssd === "required" && "SSD"].filter(Boolean).join(", ") || "—",
      recommended: [storageGb && `${storageGb} GB`, rec.ssd && "SSD"].filter(Boolean).join(", ") || "—",
      status: rig.ssd || !ssd ? "pass" : ssd === "required" ? "fail" : "warn",
    });
  }

  if (!g && !c) {
    return { tier: "unknown", smooth: false, fps: null, bottleneck: null, confidence: "low", checks, advice: [], upgrade: null, notes };
  }

  const gpuFps = (p: Preset) => (g ? (BASE_FPS * gpu.score) / (g.rec * COST[p]) : Infinity);
  const cpuFps = c ? cpuFpsFor(cpu.score, c.rec) : Infinity;
  const fpsAt = (p: Preset) => Math.min(gpuFps(p), cpuFps);

  const farBelow =
    (g && gpu.score < g.min * 0.6) || (c && cpu.score < c.min * 0.5) || (ram.min && rig.ramGb < ram.min * 0.5);

  let tier: Tier = "none";
  let smooth = false;
  if (!farBelow) {
    // Highest preset that stays smooth; otherwise Low, which gives the best frame rate.
    const smoothPreset = PRESETS.find((p) => fpsAt(p) >= SMOOTH);
    if (smoothPreset) [tier, smooth] = [smoothPreset, true];
    else if (fpsAt("low") >= 20) tier = "low";
  }
  // Too little RAM causes stutter no matter the settings.
  if (ram.min && rig.ramGb < ram.min && tier !== "none") [tier, smooth] = ["low", false];

  const preset: Preset = tier === "none" ? "low" : tier;
  const est = Math.min(fpsAt(preset), 240);
  const fps = isFinite(est) ? { low: round5(est * 0.85), high: round5(est * 1.15) } : null;

  const gf = gpuFps(preset);
  const bottleneck = !g || !c ? (g ? "gpu" : "cpu") : gf < cpuFps * 0.85 ? "gpu" : cpuFps < gf * 0.85 ? "cpu" : "balanced";

  // Advice, most impactful first.
  const advice: string[] = [];
  if (tier === "none") advice.push("Cloud gaming (GeForce NOW, Xbox Cloud Gaming) can run it if the game is supported there.");
  if (bottleneck !== "cpu" && tier !== "ultra") {
    const rtx = gpu.brand === "nvidia" && /RTX/.test(gpu.name);
    advice.push(
      rtx
        ? "Turn on DLSS (Quality or Balanced) if the game supports it. It often adds 30–50% fps with little visual loss."
        : `Turn on ${gpu.name.includes("Arc") ? "XeSS or FSR" : "FSR"} if the game supports it. It renders at a lower resolution and upscales, often adding 30–50% fps.`,
    );
    advice.push("Lower shadows, volumetric fog and anti-aliasing first; they cost the most fps for the least visual change.");
  }
  if (bottleneck === "cpu") {
    advice.push("Your processor is the limit: lower view distance, crowd density and physics settings. Upscaling helps less here.");
    advice.push("Close browsers and background apps while playing to free up the CPU.");
  }
  if (ram.rec && rig.ramGb < ram.rec) advice.push(`Upgrade to ${ram.rec} GB of RAM. With ${rig.ramGb} GB you're likely to see stutter and long loads.`);
  if (gpu.vram > 0 && vramRec && gpu.vram < vramRec) advice.push(`Set texture quality to Medium or lower: your card has ${gpu.vram} GB of video memory and the game recommends ${vramRec} GB.`);
  if (ssd && !rig.ssd) advice.push(`Install it on an SSD. This game ${ssd === "required" ? "requires" : "recommends"} one; a hard drive means long loads and stutter.`);
  if (laptop) advice.push("Plug your laptop in and set Windows power mode to Best performance. Laptops slow down a lot on battery.");
  if (gpu.kind === "integrated") advice.push("Make sure your RAM runs in dual-channel (two sticks). Integrated graphics depend heavily on memory speed.");
  advice.push("Update your graphics driver. New drivers often include fixes and speedups for recent games.");

  // Cheapest card or chip still on sale that would reach High at ~60 fps.
  let upgrade: Estimate["upgrade"] = null;
  if (!laptop && (tier === "none" || tier === "low" || tier === "medium")) {
    const cheapest = <T extends { msrp?: number }>(items: T[], ok: (item: T) => boolean) =>
      items.filter((i) => i.msrp && ok(i)).sort((a, b) => a.msrp! - b.msrp!)[0];
    const newGpu = g && bottleneck !== "cpu"
      ? cheapest(GPUS, (x) => x.score > gpu.score && (BASE_FPS * x.score) / g.rec >= 60 && x.vram >= (vramRec ?? 0))
      : undefined;
    const newCpu = c && bottleneck !== "gpu"
      ? cheapest(CPUS, (x) => x.score > cpu.score && cpuFpsFor(x.score, c.rec) >= 60)
      : undefined;
    if (newGpu || newCpu) upgrade = { gpu: newGpu, cpu: newCpu };
  }

  return { tier, smooth, fps, bottleneck, confidence, checks, advice: advice.slice(0, 5), upgrade, notes };
}
