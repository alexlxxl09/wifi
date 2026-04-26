import type { Request, Response } from "express";
import * as cheerio from "cheerio";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Cache-Control": "max-age=0",
};

async function fetchHtml(url: string, label: string): Promise<string> {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(12000),
  });
  console.log(`[${label}] HTTP ${res.status} — ${url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetch130PointPrice(
  cardName: string,
  setName: string
): Promise<{ price: number | null; lastSaleDate?: string; error?: string }> {
  try {
    const query = encodeURIComponent(`${cardName} ${setName}`);
    const html = await fetchHtml(
      `https://www.130point.com/sales/?search=${query}&grade=10`,
      "130point"
    );
    const $ = cheerio.load(html);

    const prices: { price: number; date?: string }[] = [];

    // Essai 1 : tableau de ventes
    $("table tbody tr, table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;
      cells.each((_, cell) => {
        const match = $(cell).text().match(/\$([\d,]+\.?\d{0,2})/);
        if (!match) return;
        const val = parseFloat(match[1].replace(",", ""));
        if (val > 1 && val < 500000) prices.push({ price: val });
      });
    });

    // Essai 2 : n'importe quel montant en dollars dans la page
    if (prices.length === 0) {
      const bodyText = $("body").text();
      for (const m of bodyText.matchAll(/\$([\d,]+\.?\d{0,2})/g)) {
        const val = parseFloat(m[1].replace(",", ""));
        if (val > 1 && val < 500000) prices.push({ price: val });
      }
    }

    console.log(`[130point] Found ${prices.length} prices`);
    if (prices.length === 0) return { price: null, error: "Aucune vente trouvée sur 130point" };
    return { price: prices[0].price };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[130point] Error:", msg);
    return { price: null, error: `130point: ${msg}` };
  }
}

async function fetchPSAPop(
  cardName: string,
  setName: string,
  cardNumber: string
): Promise<{ pop: number | null; error?: string }> {
  try {
    const query = encodeURIComponent(`${cardName} ${setName}`);
    const html = await fetchHtml(
      `https://www.psacard.com/pop/trading-card-games/year/pokemon/search?q=${query}`,
      "PSA"
    );
    const $ = cheerio.load(html);

    let pop10: number | null = null;

    $("table tr").each((_, row) => {
      if (pop10 !== null) return false;
      const rowText = $(row).text();
      if (!/GEM\s*MT\s*10|PSA\s*10|\b10\b/i.test(rowText)) return;
      $(row).find("td").each((i, cell) => {
        if (i === 0) return;
        const val = parseInt($(cell).text().replace(/[^0-9]/g, ""), 10);
        if (!isNaN(val) && val >= 0) { pop10 = val; return false; }
      });
    });

    // Essai 2 : chercher dans tout le texte de la page
    if (pop10 === null) {
      const bodyText = $("body").text();
      const m = bodyText.match(/GEM[^0-9]*(\d+)/i);
      if (m) pop10 = parseInt(m[1], 10);
    }

    console.log(`[PSA] pop10 = ${pop10}`);
    if (pop10 === null) return { pop: null, error: "Pop PSA 10 introuvable" };
    return { pop: pop10 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PSA] Error:", msg);
    return { pop: null, error: `PSA: ${msg}` };
  }
}

export async function psaHandler(req: Request, res: Response) {
  const name = (req.query.name as string) ?? "";
  const setName = (req.query.set as string) ?? "";
  const number = (req.query.number as string) ?? "";

  if (!name) return res.status(400).json({ error: "Missing card name" });

  const [priceResult, popResult] = await Promise.all([
    fetch130PointPrice(name, setName),
    fetchPSAPop(name, setName, number),
  ]);

  const price = priceResult.price;
  const pop = popResult.pop;

  const ratio =
    pop !== null && price !== null && price > 0
      ? Math.round((pop / price) * 100) / 100
      : null;

  const errors = [priceResult.error, popResult.error].filter(Boolean);

  res.json({
    price,
    pop,
    ratio,
    source: "130point + PSA",
    lastSaleDate: priceResult.lastSaleDate,
    error: errors.length ? errors.join(" | ") : undefined,
  });
}
