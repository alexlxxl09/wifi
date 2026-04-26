import type { Request, Response } from "express";

export async function searchHandler(req: Request, res: Response) {
  const query = req.query.q as string;
  if (!query) return res.json({ cards: [] });

  try {
    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=name:"${query}*"&pageSize=20&orderBy=-set.releaseDate&select=id,name,number,set,images,rarity`
    );
    const data = await response.json() as { data?: unknown[] };
    res.json({ cards: data.data ?? [] });
  } catch {
    res.status(500).json({ cards: [], error: "Pokemon TCG API unavailable" });
  }
}
