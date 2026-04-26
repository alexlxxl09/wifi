import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import type { PSAData } from "@/types";

async function fetchMavinPrice(cardName: string, setName: string): Promise<{ price: number | null; lastSaleDate?: string }> {
  try {
    const query = encodeURIComponent(`${cardName} ${setName} PSA 10`);
    const url = `https://mavin.io/search?q=${query}`;
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 12000,
    });

    const $ = cheerio.load(res.data);
    const priceText = $(".price-item, .sold-price, [class*='price']").first().text().trim();
    const match = priceText.match(/\$?([\d,]+\.?\d*)/);
    if (match) {
      return { price: parseFloat(match[1].replace(",", "")) };
    }

    // Fallback: look for any dollar amount in the page
    const bodyText = $("body").text();
    const prices: number[] = [];
    const allMatches = bodyText.matchAll(/\$\s*([\d,]+\.?\d{0,2})/g);
    for (const m of allMatches) {
      const val = parseFloat(m[1].replace(",", ""));
      if (val > 1 && val < 100000) prices.push(val);
    }
    if (prices.length > 0) {
      prices.sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      return { price: median };
    }

    return { price: null };
  } catch {
    return { price: null };
  }
}

async function fetchPSAPop(cardName: string, setName: string, cardNumber: string): Promise<number | null> {
  try {
    const query = encodeURIComponent(`pokemon ${cardName} ${setName}`);
    const url = `https://www.psacard.com/pop/trading-card-games/year/pokemon/${query}/10000`;
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 12000,
    });

    const $ = cheerio.load(res.data);

    // Try to find PSA 10 pop in the table
    let psa10Pop: number | null = null;
    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      const rowText = $(row).text().toLowerCase();
      if (
        rowText.includes(cardName.toLowerCase()) ||
        rowText.includes(cardNumber)
      ) {
        // PSA 10 is usually the last or specific column
        cells.each((i, cell) => {
          const cellText = $(cell).text().trim();
          if (i >= 10) {
            const val = parseInt(cellText.replace(",", ""), 10);
            if (!isNaN(val)) psa10Pop = val;
          }
        });
      }
    });

    return psa10Pop;
  } catch {
    return null;
  }
}

async function fetchFromCollecte(cardName: string, setName: string, cardNumber: string): Promise<PSAData> {
  // Parallel fetch price and pop
  const [priceData, pop] = await Promise.all([
    fetchMavinPrice(cardName, setName),
    fetchPSAPop(cardName, setName, cardNumber),
  ]);

  const price = priceData.price;

  let ratio: number | null = null;
  if (pop !== null && price !== null && price > 0) {
    // pop/price: lower is better (rare card at low price)
    ratio = Math.round((pop / price) * 100) / 100;
  }

  return {
    price,
    pop,
    ratio,
    source: "Mavin.io + PSA",
    lastSaleDate: priceData.lastSaleDate,
  };
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const setName = req.nextUrl.searchParams.get("set") ?? "";
  const number = req.nextUrl.searchParams.get("number") ?? "";

  if (!name) {
    return NextResponse.json({ error: "Missing card name" }, { status: 400 });
  }

  try {
    const data = await fetchFromCollecte(name, setName, number);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { price: null, pop: null, ratio: null, source: "Error", error: "Failed to fetch PSA data" },
      { status: 500 }
    );
  }
}
