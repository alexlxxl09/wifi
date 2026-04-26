import type { Request, Response } from "express";
import * as cheerio from "cheerio";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Cache-Control": "max-age=0",
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

async function fetch130PointPrice(
  cardName: string,
  setName: string
): Promise<{ price: number | null; lastSaleDate?: string }> {
  try {
    const query = encodeURIComponent(`${cardName} ${setName}`);
    const html = await fetchHtml(`https://www.130point.com/sales/?search=${query}&grade=10`);
    const $ = cheerio.load(html);

    const prices: { price: number; date?: string }[] = [];

    $("table tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;
      const lastCell = $(cells[cells.length - 1]).text().trim();
      const match = lastCell.match(/\$?([\d,]+\.?\d{0,2})/);
      if (!match) return;
      const val = parseFloat(match[1].replace(",", ""));
      if (val < 1 || val > 500000) return;
      prices.push({ price: val, date: $(cells[0]).text().trim() });
    });

    if (prices.length === 0) {
      const bodyText = $("body").text();
      for (const m of bodyText.matchAll(/\$\s*([\d,]+\.?\d{0,2})/g)) {
        const val = parseFloat(m[1].replace(",", ""));
        if (val > 1 && val < 500000) prices.push({ price: val });
      }
    }

    if (prices.length === 0) return { price: null };
    return { price: prices[0].price, lastSaleDate: prices[0].date };
  } catch {
    return { price: null };
  }
}

async function fetchPSAPop(
  cardName: string,
  setName: string,
  cardNumber: string
): Promise<number | null> {
  try {
    const query = encodeURIComponent(`${cardName} ${setName} ${cardNumber}`);
    const html = await fetchHtml(
      `https://www.psacard.com/pop/trading-card-games/year/pokemon/search?q=${query}`
    );
    const $ = cheerio.load(html);

    let pop10: number | null = null;
    $("table tr").each((_, row) => {
      if (pop10 !== null) return false;
      if (!/GEM\s*MT\s*10|PSA\s*10/i.test($(row).text())) return;
      $(row).find("td").each((i, cell) => {
        if (i === 0) return;
        const val = parseInt($(cell).text().replace(/,/g, "").trim(), 10);
        if (!isNaN(val) && val >= 0) { pop10 = val; return false; }
      });
    });

    return pop10;
  } catch {
    return null;
  }
}

export async function psaHandler(req: Request, res: Response) {
  const name = (req.query.name as string) ?? "";
  const setName = (req.query.set as string) ?? "";
  const number = (req.query.number as string) ?? "";

  if (!name) return res.status(400).json({ error: "Missing card name" });

  const [priceData, pop] = await Promise.all([
    fetch130PointPrice(name, setName),
    fetchPSAPop(name, setName, number),
  ]);

  const price = priceData.price;
  const ratio =
    pop !== null && price !== null && price > 0
      ? Math.round((pop / price) * 100) / 100
      : null;

  res.json({ price, pop, ratio, source: "130point + PSA", lastSaleDate: priceData.lastSaleDate });
}
