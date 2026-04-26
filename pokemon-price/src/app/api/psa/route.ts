import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { PSAData } from "@/types";

// Headers qui imitent un vrai navigateur Chrome sur Android
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
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.text();
}

// ─── 130point.com : dernières ventes PSA 10 eBay ─────────────────────────────
async function fetch130PointPrice(
  cardName: string,
  setName: string
): Promise<{ price: number | null; lastSaleDate?: string }> {
  try {
    const query = encodeURIComponent(`${cardName} ${setName}`);
    const html = await fetchHtml(
      `https://www.130point.com/sales/?search=${query}&grade=10`
    );
    const $ = cheerio.load(html);

    const prices: { price: number; date?: string }[] = [];

    // 130point affiche les ventes dans un tableau : date | titre | prix
    $("table tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      // Le prix est généralement dans la dernière colonne
      const lastCell = $(cells[cells.length - 1]).text().trim();
      const priceMatch = lastCell.match(/\$?([\d,]+\.?\d{0,2})/);
      if (!priceMatch) return;

      const val = parseFloat(priceMatch[1].replace(",", ""));
      if (val < 1 || val > 500000) return;

      const date = $(cells[0]).text().trim();
      prices.push({ price: val, date });
    });

    // Fallback : chercher n'importe quel montant dans la page
    if (prices.length === 0) {
      const bodyText = $("body").text();
      const matches = [...bodyText.matchAll(/\$\s*([\d,]+\.?\d{0,2})/g)];
      for (const m of matches) {
        const val = parseFloat(m[1].replace(",", ""));
        if (val > 1 && val < 500000) prices.push({ price: val });
      }
    }

    if (prices.length === 0) return { price: null };

    // Première entrée = vente la plus récente
    return { price: prices[0].price, lastSaleDate: prices[0].date };
  } catch {
    return { price: null };
  }
}

// ─── PSA : pop report PSA 10 ─────────────────────────────────────────────────
async function fetchPSAPop(
  cardName: string,
  setName: string,
  cardNumber: string
): Promise<number | null> {
  try {
    // Recherche dans le pop report PSA
    const query = encodeURIComponent(`${cardName} ${setName} ${cardNumber}`);
    const html = await fetchHtml(
      `https://www.psacard.com/pop/trading-card-games/year/pokemon/search?q=${query}`
    );
    const $ = cheerio.load(html);

    // Chercher la ligne correspondant à la carte dans le tableau PSA
    // Le tableau PSA a des colonnes : Grade | Pop | Pop Higher
    // La colonne PSA 10 "GEM MT 10" est la dernière grade avant "TOTAL"
    let pop10: number | null = null;

    $("table tr").each((_, row) => {
      const rowText = $(row).text();
      // Trouver la ligne GEM MT 10
      if (/GEM\s*MT\s*10|PSA\s*10/i.test(rowText)) {
        const cells = $(row).find("td");
        // Le chiffre de pop est dans la 2e colonne (après le label du grade)
        cells.each((i, cell) => {
          if (i === 0) return; // skip label
          const val = parseInt($(cell).text().replace(/,/g, "").trim(), 10);
          if (!isNaN(val) && val >= 0) {
            pop10 = val;
            return false; // break
          }
        });
        return false; // break outer loop
      }
    });

    return pop10;
  } catch {
    return null;
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const setName = req.nextUrl.searchParams.get("set") ?? "";
  const number = req.nextUrl.searchParams.get("number") ?? "";

  if (!name) {
    return NextResponse.json({ error: "Missing card name" }, { status: 400 });
  }

  const [priceData, pop] = await Promise.all([
    fetch130PointPrice(name, setName),
    fetchPSAPop(name, setName, number),
  ]);

  const price = priceData.price;
  let ratio: number | null = null;
  if (pop !== null && price !== null && price > 0) {
    ratio = Math.round((pop / price) * 100) / 100;
  }

  const data: PSAData = {
    price,
    pop,
    ratio,
    source: "130point + PSA",
    lastSaleDate: priceData.lastSaleDate,
  };

  return NextResponse.json(data);
}
