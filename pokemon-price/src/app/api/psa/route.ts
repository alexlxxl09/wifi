import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import type { PSAData } from "@/types";

async function withBrowser<T>(fn: (page: import("playwright").Page) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function fetch130PointPrice(
  cardName: string,
  setName: string
): Promise<{ price: number | null; lastSaleDate?: string }> {
  return withBrowser(async (page) => {
    const query = encodeURIComponent(`${cardName} ${setName}`);
    await page.goto(`https://www.130point.com/sales/?search=${query}&grade=10`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    // Wait for results to load
    await page.waitForTimeout(2000);

    // Extract sold prices from the results table
    const prices = await page.evaluate(() => {
      const results: number[] = [];
      // 130point shows prices in table rows
      document.querySelectorAll("table tr, .sale-row, [class*='sale'], [class*='price']").forEach((el) => {
        const text = el.textContent ?? "";
        const match = text.match(/\$\s*([\d,]+\.?\d{0,2})/);
        if (match) {
          const val = parseFloat(match[1].replace(",", ""));
          if (val > 1 && val < 500000) results.push(val);
        }
      });
      return results;
    });

    if (prices.length === 0) return { price: null };

    // Get the most recent price (first result = most recent on 130point)
    const lastSalePrice = prices[0];

    // Try to get the sale date
    const lastSaleDate = await page.evaluate(() => {
      const dateEl = document.querySelector("table tr td:first-child, .sale-date, [class*='date']");
      return dateEl?.textContent?.trim() ?? undefined;
    });

    return { price: lastSalePrice, lastSaleDate };
  });
}

async function fetchPSAPop(cardName: string, setName: string, cardNumber: string): Promise<number | null> {
  return withBrowser(async (page) => {
    // Search PSA pop report
    const query = encodeURIComponent(`${cardName} ${setName}`);
    await page.goto(`https://www.psacard.com/pop/search?q=${query}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(3000);

    // Try to find and click the correct card entry
    const cardLink = await page.evaluate(
      ({ name, number }: { name: string; number: string }) => {
        const links = Array.from(document.querySelectorAll("a, tr"));
        for (const el of links) {
          const text = el.textContent?.toLowerCase() ?? "";
          if (text.includes(name.toLowerCase()) || text.includes(`#${number}`)) {
            return (el as HTMLAnchorElement).href ?? null;
          }
        }
        return null;
      },
      { name: cardName, number: cardNumber }
    );

    if (cardLink) {
      await page.goto(cardLink, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000);
    }

    // Extract PSA 10 population from the pop report table
    const pop10 = await page.evaluate(() => {
      // Look for a row or cell that indicates "PSA 10" or "GEM MT 10"
      const rows = Array.from(document.querySelectorAll("tr"));
      for (const row of rows) {
        const text = row.textContent?.toLowerCase() ?? "";
        if (text.includes("gem") || text.includes("10")) {
          const cells = Array.from(row.querySelectorAll("td"));
          // Pop count is usually the last numeric cell
          for (let i = cells.length - 1; i >= 0; i--) {
            const val = parseInt((cells[i].textContent ?? "").replace(/,/g, ""), 10);
            if (!isNaN(val) && val >= 0) return val;
          }
        }
      }

      // Fallback: look for any element labeled "10" with a count
      const allText = document.body.innerText;
      const match = allText.match(/GEM[\s\S]{0,50}?(\d{1,6})/i);
      if (match) return parseInt(match[1], 10);
      return null;
    });

    return pop10;
  });
}

async function fetchFromCollectr(
  cardName: string,
  setName: string,
  cardNumber: string
): Promise<PSAData> {
  const [priceData, pop] = await Promise.all([
    fetch130PointPrice(cardName, setName),
    fetchPSAPop(cardName, setName, cardNumber),
  ]);

  const price = priceData.price;

  let ratio: number | null = null;
  if (pop !== null && price !== null && price > 0) {
    ratio = Math.round((pop / price) * 100) / 100;
  }

  return {
    price,
    pop,
    ratio,
    source: "130point + PSA",
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
    const data = await fetchFromCollectr(name, setName, number);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      {
        price: null,
        pop: null,
        ratio: null,
        source: "130point + PSA",
        error: e instanceof Error ? e.message : "Erreur lors de la récupération des données",
      },
      { status: 500 }
    );
  }
}
