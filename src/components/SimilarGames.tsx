"use client";

import { useEffect, useMemo, useState } from "react";
import { estimate, type Estimate, type Tier } from "@/lib/estimate";
import type { GameDetails, GameSearchResult, Rig } from "@/lib/types";

const RANK: Record<Tier, number> = { unknown: -1, none: 0, low: 1, medium: 2, high: 3, ultra: 4 };
const LABEL: Record<Tier, string> = { unknown: "", none: "", low: "Low", medium: "Medium", high: "High", ultra: "Ultra" };

const rank = (e: Estimate) => RANK[e.tier] * 2 + Number(e.smooth);

/** Games similar to one your PC struggles with, kept only if they run clearly better. */
export function SimilarGames({
  game,
  current,
  rig,
  onPick,
}: {
  game: GameDetails;
  current: Estimate;
  rig: Rig;
  onPick: (game: GameSearchResult) => void;
}) {
  const [similar, setSimilar] = useState<{ appid: number; games: GameDetails[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/${game.appid}/similar`)
      .then((res) => (res.ok ? res.json() : []))
      .then((games: GameDetails[]) => !cancelled && setSimilar({ appid: game.appid, games }))
      .catch(() => !cancelled && setSimilar({ appid: game.appid, games: [] }));
    return () => {
      cancelled = true;
    };
  }, [game.appid]);

  const better = useMemo(() => {
    if (!similar || similar.appid !== game.appid) return null;
    const floor = Math.max(rank(current), RANK.low * 2) + 1; // at least smooth on Low, and better than now
    return similar.games
      .map((g) => ({ game: g, est: estimate(g, rig) }))
      .filter((x): x is { game: GameDetails; est: Estimate } => !!x.est && rank(x.est) >= floor)
      .slice(0, 6);
  }, [similar, game.appid, current, rig]);

  if (better === null) {
    return <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" aria-label="Finding similar games" />;
  }
  if (better.length === 0) return null;

  return (
    <section className="animate-rise">
      <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">Similar games that run better on your PC</h2>
      <p className="mb-3 text-sm text-muted">Based on Steam&apos;s &ldquo;More like this&rdquo; for {game.name}.</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {better.map(({ game: g, est }) => (
          <li key={g.appid}>
            <button
              type="button"
              onClick={() => onPick({ appid: g.appid, name: g.name, image: g.headerImage })}
              className="group w-full overflow-hidden rounded-xl border border-border bg-surface text-left transition hover:-translate-y-0.5 hover:border-muted/50 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote Steam header image */}
              <img src={g.headerImage} alt="" loading="lazy" className="aspect-[460/215] w-full object-cover opacity-85 transition group-hover:opacity-100" />
              <span className="block px-3 pt-2 text-sm">
                <span className="block truncate">{g.name}</span>
                <span className="block pb-2 text-xs" style={{ color: `var(--tier-${est.tier})` }}>
                  {LABEL[est.tier]} settings{est.smooth ? ", smooth" : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
