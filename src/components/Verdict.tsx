import type { Estimate, Status, Tier } from "@/lib/estimate";
import type { GameDetails } from "@/lib/types";

const TIERS: Record<Tier, { label: string; color: string; level: number }> = {
  none: { label: "Won't run", color: "var(--tier-none)", level: 0 },
  low: { label: "Low settings", color: "var(--tier-low)", level: 1 },
  medium: { label: "Medium settings", color: "var(--tier-medium)", level: 2 },
  high: { label: "High settings", color: "var(--tier-high)", level: 3 },
  ultra: { label: "Ultra settings", color: "var(--tier-ultra)", level: 4 },
  unknown: { label: "Not enough info", color: "var(--muted)", level: 0 },
};
const METER = ["low", "medium", "high", "ultra"] as const;

const STATUS: Record<Status, { icon: string; color: string; label: string }> = {
  pass: { icon: "✓", color: "var(--tier-high)", label: "Meets recommended" },
  warn: { icon: "!", color: "var(--tier-medium)", label: "Meets minimum only" },
  fail: { icon: "✕", color: "var(--tier-none)", label: "Below minimum" },
  unknown: { icon: "?", color: "var(--muted)", label: "Not listed" },
};

function summary(e: Estimate) {
  if (e.tier === "unknown") return "This game doesn't list enough requirements to estimate.";
  if (e.tier === "none") return "Your PC is well below the minimum requirements.";
  if (e.smooth) return "Should run smoothly at around 60 fps or more.";
  return e.fps && e.fps.high >= 30 ? "Playable, but don't expect a smooth 60." : "It will start, but expect heavy stutter.";
}

const card = "rounded-2xl border border-border bg-surface";
const heading = "mb-3 text-xs font-medium uppercase tracking-wider text-muted";

export function Verdict({ game, estimate: e }: { game: GameDetails; estimate: Estimate }) {
  const tier = TIERS[e.tier];
  const bottleneck =
    e.bottleneck === "gpu" ? "Your graphics card is what holds it back."
    : e.bottleneck === "cpu" ? "Your processor is what holds it back."
    : e.bottleneck === "balanced" ? "Your graphics card and processor are evenly matched for this game."
    : null;

  return (
    <section className="animate-rise space-y-4" aria-live="polite">
      <div className={`${card} overflow-hidden`}>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote Steam image, already sized */}
          <img src={game.headerImage} alt="" className="aspect-[460/215] w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <h2 className="text-xl font-semibold sm:text-2xl">{game.name}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {[game.genres.slice(0, 3).join(" · "), game.releaseDate].filter(Boolean).join(" — ")}
            </p>
          </div>
        </div>

        <div className="p-5 pt-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: tier.color }}>
                {tier.label}
              </p>
              <p className="mt-1 text-sm text-text/80">{summary(e)}</p>
            </div>
            {e.fps && e.tier !== "none" && (
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold">
                  {e.fps.low}–{e.fps.high}
                  <span className="ml-1 text-sm font-normal text-muted">fps</span>
                </p>
                <p className="text-xs text-muted">estimated at 1080p</p>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-4 gap-1.5" aria-hidden>
            {METER.map((t, i) => (
              <div key={t}>
                <div
                  className="h-1.5 rounded-full transition-colors duration-500"
                  style={{ background: i < tier.level ? tier.color : "var(--border)" }}
                />
                <p className="mt-1.5 text-[11px] capitalize text-muted">{t}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {bottleneck && <span className="text-text/80">{bottleneck}</span>}
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
              {e.confidence[0].toUpperCase() + e.confidence.slice(1)} confidence
            </span>
          </div>
        </div>
      </div>

      {e.advice.length > 0 && (
        <div className={`${card} p-5`}>
          <h3 className={heading}>How to make it run better</h3>
          <ol className="space-y-2.5">
            {e.advice.map((tip, i) => (
              <li key={tip} className="flex gap-3 text-sm leading-relaxed text-text/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[11px] text-accent">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ol>
        </div>
      )}

      {e.upgrade && (
        <div className={`${card} border-accent/25 p-5`}>
          <h3 className={heading}>Cheapest upgrade to reach High settings</h3>
          <ul className="space-y-1.5 text-sm">
            {e.upgrade.gpu && (
              <li>
                <span className="font-medium">{e.upgrade.gpu.name}</span>
                <span className="text-muted"> — about ${e.upgrade.gpu.msrp} launch price</span>
              </li>
            )}
            {e.upgrade.cpu && (
              <li>
                <span className="font-medium">{e.upgrade.cpu.name}</span>
                <span className="text-muted"> — about ${e.upgrade.cpu.msrp} launch price (may need a new motherboard)</span>
              </li>
            )}
          </ul>
          <p className="mt-2 text-xs text-muted">Check your power supply and case size before buying a new graphics card.</p>
        </div>
      )}

      <div className={`${card} p-5`}>
        <h3 className={heading}>Your PC vs. the requirements</h3>
        <div className="divide-y divide-border">
          {e.checks.map((c) => {
            const s = STATUS[c.status];
            return (
              <div key={c.part} className="grid gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr]">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span
                    title={s.label}
                    aria-label={s.label}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-bg"
                    style={{ background: s.color }}
                  >
                    {s.icon}
                  </span>
                  {c.part}
                </div>
                <dl className="grid gap-1 text-sm sm:grid-cols-3">
                  <div><dt className="text-[11px] text-muted">Yours</dt><dd>{c.yours}</dd></div>
                  <div><dt className="text-[11px] text-muted">Minimum</dt><dd className="text-text/75">{c.minimum}</dd></div>
                  <div><dt className="text-[11px] text-muted">Recommended</dt><dd className="text-text/75">{c.recommended}</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
      </div>

      <p className="px-1 text-xs leading-relaxed text-muted">
        {e.notes.length > 0 && <>{e.notes.join(" ")} </>}
        Estimates use approximate hardware scores and the game&apos;s listed requirements. Real performance varies with drivers, resolution and game updates.
      </p>
    </section>
  );
}
