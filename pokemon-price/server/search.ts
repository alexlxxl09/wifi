import type { Request, Response } from "express";

export async function searchHandler(req: Request, res: Response) {
  const query = (req.query.q as string) ?? "";
  if (!query) return res.json({ cards: [] });

  const url =
    `https://api.pokemontcg.io/v2/cards` +
    `?q=name:%22${encodeURIComponent(query)}%22` +
    `&pageSize=20&orderBy=-set.releaseDate` +
    `&select=id,name,number,set,images,rarity`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error("TCG API error:", response.status, await response.text());
      return res.json({ cards: [], error: `TCG API: ${response.status}` });
    }

    const data = (await response.json()) as { data?: unknown[] };
    console.log(`Search "${query}": ${data.data?.length ?? 0} cards`);
    res.json({ cards: data.data ?? [] });
  } catch (e) {
    console.error("Search error:", e);
    res.json({ cards: [], error: String(e) });
  }
}
