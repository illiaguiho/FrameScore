import type { GameSearchResult } from "@/lib/types";

export function PopularGames({
  games,
  onPick,
  compact = false,
}: {
  games: GameSearchResult[];
  onPick: (game: GameSearchResult) => void;
  compact?: boolean;
}) {
  if (games.length === 0) return null;
  return (
    <section className="animate-rise">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        {compact ? "Try another popular game" : "Most played on Steam right now"}
      </h2>
      <ul className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
        {(compact ? games.slice(0, 4) : games).map((g) => (
          <li key={g.appid}>
            <button
              type="button"
              onClick={() => onPick(g)}
              className="group w-full overflow-hidden rounded-xl border border-border bg-surface text-left transition hover:-translate-y-0.5 hover:border-muted/50 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote Steam header image */}
              <img
                src={g.image}
                alt=""
                loading="lazy"
                className="aspect-[460/215] w-full object-cover opacity-85 transition group-hover:opacity-100"
              />
              <span className="block truncate px-3 py-2 text-sm">{g.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
