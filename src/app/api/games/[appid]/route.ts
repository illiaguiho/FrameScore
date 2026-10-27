import { NextResponse } from "next/server";
import { getGame } from "@/lib/steam";

export async function GET(_request: Request, { params }: { params: Promise<{ appid: string }> }) {
  const appid = Number((await params).appid);
  if (!Number.isInteger(appid) || appid <= 0) {
    return NextResponse.json({ error: "Invalid game id." }, { status: 400 });
  }
  try {
    const game = await getGame(appid);
    if (!game) return NextResponse.json({ error: "Game not found on Steam." }, { status: 404 });
    return NextResponse.json(game);
  } catch {
    return NextResponse.json({ error: "Steam is unavailable right now." }, { status: 502 });
  }
}
