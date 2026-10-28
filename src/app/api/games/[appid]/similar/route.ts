import { NextResponse } from "next/server";
import { getSimilarGames } from "@/lib/steam";

export async function GET(_request: Request, { params }: { params: Promise<{ appid: string }> }) {
  const appid = Number((await params).appid);
  if (!Number.isInteger(appid) || appid <= 0) {
    return NextResponse.json({ error: "Invalid game id." }, { status: 400 });
  }
  return NextResponse.json(await getSimilarGames(appid));
}
