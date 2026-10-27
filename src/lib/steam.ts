import { parseRequirements } from "./requirements";
import type { GameDetails, GameSearchResult } from "./types";

// Public Steam store endpoints; no API key needed.
const STORE = "https://store.steampowered.com/api";
const DAY = 60 * 60 * 24;

export async function searchGames(term: string): Promise<GameSearchResult[]> {
  const url = `${STORE}/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=US`;
  const res = await fetch(url, { next: { revalidate: DAY } });
  if (!res.ok) throw new Error(`Steam search failed: ${res.status}`);
  const json: { items?: { type: string; id: number; name: string; tiny_image: string }[] } = await res.json();
  return (json.items ?? [])
    .filter((item) => item.type === "app")
    .map((item) => ({ appid: item.id, name: item.name, image: item.tiny_image }));
}

// Steam's chart includes tools like Wallpaper Engine; these genres mark non-games.
const SOFTWARE_GENRES = new Set([
  "Utilities", "Animation & Modeling", "Design & Illustration", "Video Production",
  "Audio Production", "Photo Editing", "Software Training", "Web Publishing", "Game Development",
]);

/** Most played games on Steam right now, by daily peak players. */
export async function getPopularGames(limit = 12): Promise<GameSearchResult[]> {
  const res = await fetch("https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/", {
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) return [];
  const json: { response?: { ranks?: { appid: number }[] } } = await res.json();
  const appids = (json.response?.ranks ?? []).slice(0, limit + 8).map((r) => r.appid);
  const games = await Promise.all(appids.map((id) => getGame(id).catch(() => null)));
  return games
    .filter((g): g is GameDetails => !!g && !g.genres.some((genre) => SOFTWARE_GENRES.has(genre)))
    .slice(0, limit)
    .map((g) => ({ appid: g.appid, name: g.name, image: g.headerImage }));
}

interface SteamApp {
  name: string;
  header_image: string;
  short_description: string;
  genres?: { description: string }[];
  release_date?: { date: string };
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  // An empty array when the game lists no requirements.
  pc_requirements: { minimum?: string; recommended?: string } | [];
}

export async function getGame(appid: number): Promise<GameDetails | null> {
  const url = `${STORE}/appdetails?appids=${appid}&l=english&cc=US&filters=basic,genres,release_date,platforms`;
  const res = await fetch(url, { next: { revalidate: DAY } });
  if (!res.ok) throw new Error(`Steam details failed: ${res.status}`);
  const json: Record<string, { success: boolean; data?: SteamApp }> = await res.json();
  const app = json[appid]?.data;
  if (!json[appid]?.success || !app) return null;

  const reqs = Array.isArray(app.pc_requirements) ? {} : app.pc_requirements;
  return {
    appid,
    name: app.name,
    headerImage: app.header_image,
    shortDescription: app.short_description,
    genres: app.genres?.map((g) => g.description) ?? [],
    releaseDate: app.release_date?.date || null,
    platforms: app.platforms,
    minimum: parseRequirements(reqs.minimum),
    recommended: parseRequirements(reqs.recommended),
  };
}
