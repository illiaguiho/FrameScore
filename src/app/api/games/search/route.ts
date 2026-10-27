import { NextResponse } from "next/server";
import { searchGames } from "@/lib/steam";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);
  try {
    return NextResponse.json(await searchGames(q));
  } catch {
    return NextResponse.json({ error: "Steam search is unavailable right now." }, { status: 502 });
  }
}
