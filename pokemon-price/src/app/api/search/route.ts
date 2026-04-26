import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ cards: [] });

  try {
    const res = await axios.get("https://api.pokemontcg.io/v2/cards", {
      params: {
        q: `name:"${query}*"`,
        pageSize: 20,
        orderBy: "-set.releaseDate",
        select: "id,name,number,set,images,rarity",
      },
      timeout: 10000,
    });

    return NextResponse.json({ cards: res.data.data ?? [] });
  } catch {
    return NextResponse.json({ cards: [], error: "Pokemon TCG API unavailable" }, { status: 500 });
  }
}
