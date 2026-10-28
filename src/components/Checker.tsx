"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Combobox } from "./Combobox";
import { PopularGames } from "./PopularGames";
import { RigForm } from "./RigForm";
import { SimilarGames } from "./SimilarGames";
import { Verdict } from "./Verdict";
import { estimate } from "@/lib/estimate";
import type { GameDetails, GameSearchResult, Rig } from "@/lib/types";

const RIG_KEY = "fs-rig";
const EMPTY_RIG: Rig = { gpuId: null, cpuId: null, ramGb: 16, ssd: true };

function loadRig(): Rig {
  try {
    const saved = localStorage.getItem(RIG_KEY);
    return saved ? { ...EMPTY_RIG, ...JSON.parse(saved) } : EMPTY_RIG;
  } catch {
    return EMPTY_RIG;
  }
}

async function fetchGames(q: string): Promise<GameSearchResult[]> {
  const res = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`);
  return res.ok ? res.json() : [];
}

export function Checker({ popular }: { popular: GameSearchResult[] }) {
  const [rig, setRig] = useState<Rig>(EMPTY_RIG);
  const [picked, setPicked] = useState<GameSearchResult | null>(null);
  const [game, setGame] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore the saved rig and any game in the URL (?app=123) after the first render.
  useEffect(() => {
    setRig(loadRig());
    const appid = Number(new URLSearchParams(window.location.search).get("app"));
    if (appid) setPicked({ appid, name: "", image: "" });
  }, []);

  const updateRig = (next: Rig) => {
    setRig(next);
    try {
      localStorage.setItem(RIG_KEY, JSON.stringify(next));
    } catch {}
  };

  const appid = picked?.appid;
  useEffect(() => {
    if (!appid) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/games/${appid}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
        return body as GameDetails;
      })
      .then((details) => {
        if (cancelled) return;
        setGame(details);
        window.history.replaceState(null, "", `?app=${details.appid}`);
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [appid]);

  // The search box shows the loaded game's name (needed when it came from the URL).
  const selectedGame = useMemo(
    () => (game ? { appid: game.appid, name: game.name, image: "" } : picked?.name ? picked : null),
    [game, picked],
  );

  const result = useMemo(() => (game ? estimate(game, rig) : null), [game, rig]);
  const gameLabel = useCallback((g: GameSearchResult) => g.name, []);
  const rigReady = rig.gpuId && rig.cpuId;

  const resultRef = useRef<HTMLDivElement>(null);
  const pickGame = (g: GameSearchResult) => {
    if (g.appid !== picked?.appid) setGame(null);
    setPicked(g);
    // Picking from the list under a verdict leaves you scrolled down; bring the result into view.
    const box = resultRef.current;
    if (box && box.getBoundingClientRect().top < 0) box.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const otherPopular = popular.filter((g) => g.appid !== game?.appid);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-6 lg:sticky lg:top-6">
        <div>
          <h2 className="mb-2.5 flex items-center gap-2 text-sm font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent font-mono text-[11px] text-bg">1</span>
            Pick a game
          </h2>
          <Combobox<GameSearchResult>
            label="Game"
            size="lg"
            placeholder="Search Steam games…"
            selected={selectedGame}
            getKey={(g) => g.appid}
            getLabel={gameLabel}
            search={fetchGames}
            delay={250}
            onSelect={pickGame}
            emptyText="No games found."
            renderItem={(g) => (
              <span className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny remote Steam capsule */}
                <img src={g.image} alt="" className="h-[30px] w-[80px] shrink-0 rounded object-cover" loading="lazy" />
                <span className="truncate">{g.name}</span>
              </span>
            )}
          />
        </div>

        <div>
          <h2 className="mb-2.5 flex items-center gap-2 text-sm font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent font-mono text-[11px] text-bg">2</span>
            Your PC
            <span className="ml-auto text-xs font-normal text-muted">Saved on this device</span>
          </h2>
          <RigForm rig={rig} onChange={updateRig} />
        </div>
      </div>

      <div ref={resultRef} className="min-w-0 scroll-mt-6 space-y-8">
        {error ? (
          <Placeholder>{error}</Placeholder>
        ) : loading ? (
          <div className="h-80 animate-pulse rounded-2xl border border-border bg-surface" aria-label="Loading game" />
        ) : !game ? (
          popular.length > 0 ? (
            <PopularGames games={popular} onPick={pickGame} />
          ) : (
            <Placeholder>Search for a game to see how it runs on your PC.</Placeholder>
          )
        ) : !rigReady ? (
          <Placeholder>Add your graphics card and processor to get a verdict for {game.name}.</Placeholder>
        ) : result ? (
          <Verdict key={`${game.appid}-${rig.gpuId}-${rig.cpuId}`} game={game} estimate={result} />
        ) : null}
        {game && result && rigReady && (result.tier === "none" || (result.tier === "low" && !result.smooth)) && (
          <SimilarGames game={game} current={result} rig={rig} onPick={pickGame} />
        )}
        {game && !loading && <PopularGames games={otherPopular} onPick={pickGame} compact />}
      </div>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted lg:min-h-80">
      {children}
    </div>
  );
}
