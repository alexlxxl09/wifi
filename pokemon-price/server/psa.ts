import type { Request, Response } from "express";

const EBAY_APP_ID = process.env.EBAY_APP_ID ?? "";

interface EbayItem {
  sellingStatus: { currentPrice: { __value__: string }[] }[];
  listingInfo: { endTime: string[] }[];
}

interface EbayFindingResponse {
  findCompletedItemsResponse?: {
    searchResult?: { item?: EbayItem[] }[];
    paginationOutput?: { totalEntries: string[] }[];
    ack?: string[];
  }[];
}

async function ebaySearch(keywords: string, entriesPerPage = 5): Promise<{ items: EbayItem[]; total: number }> {
  const params = new URLSearchParams({
    "OPERATION-NAME": "findCompletedItems",
    "SERVICE-VERSION": "1.0.0",
    "SECURITY-APPNAME": EBAY_APP_ID,
    "RESPONSE-DATA-FORMAT": "JSON",
    keywords,
    categoryId: "2536",
    "itemFilter(0).name": "SoldItemsOnly",
    "itemFilter(0).value": "true",
    sortOrder: "EndTimeSoonest",
    "paginationInput.entriesPerPage": String(entriesPerPage),
  });

  const res = await fetch(
    `https://svcs.ebay.com/services/search/FindingService/v1?${params}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`eBay HTTP ${res.status}`);
  const data = (await res.json()) as EbayFindingResponse;
  const r = data.findCompletedItemsResponse?.[0];
  if (r?.ack?.[0] !== "Success") throw new Error("eBay API error");
  return {
    items: r?.searchResult?.[0]?.item ?? [],
    total: parseInt(r?.paginationOutput?.[0]?.totalEntries?.[0] ?? "0", 10),
  };
}

export async function psaHandler(req: Request, res: Response) {
  const name = (req.query.name as string) ?? "";
  const setName = (req.query.set as string) ?? "";
  const rawPrice = parseFloat((req.query.rawPrice as string) ?? "0") || null;

  if (!name) return res.status(400).json({ error: "Missing card name" });

  if (!EBAY_APP_ID) {
    return res.json({
      price: null, pop: null, gemMintPct: null, rawPrice, ratio: null,
      source: "eBay",
      error: "EBAY_APP_ID manquant — crée .env avec ta clé (developer.ebay.com)",
    });
  }

  try {
    const base = `${name} ${setName} pokemon`.trim();

    // Deux recherches en parallèle : PSA 10 seul + PSA toutes grades
    const [psa10Result, psaAllResult] = await Promise.all([
      ebaySearch(`${base} PSA 10`, 10),
      ebaySearch(`${base} PSA`, 1),       // on veut juste le total
    ]);

    // Prix PSA 10 : moyenne des 5 dernières ventes
    const prices = psa10Result.items
      .map((i) => parseFloat(i.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? "0"))
      .filter((p) => p > 0)
      .slice(0, 5);

    const psa10Price = prices.length
      ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
      : null;

    const psa10Count = psa10Result.total;
    const psaAllCount = psaAllResult.total;

    // % Gem Mint = PSA 10 / toutes grades × 100
    const gemMintPct =
      psaAllCount > 0 && psa10Count > 0
        ? Math.round((psa10Count / psaAllCount) * 1000) / 10   // 1 décimale
        : null;

    // Formule : (rawPrice / psa10Price) × gemMintPct
    const ratio =
      rawPrice !== null && psa10Price !== null && psa10Price > 0 && gemMintPct !== null
        ? Math.round((rawPrice / psa10Price) * gemMintPct * 100) / 100
        : null;

    const lastSaleDate = psa10Result.items[0]?.listingInfo?.[0]?.endTime?.[0]?.slice(0, 10);

    console.log(
      `[eBay] "${name}": raw=$${rawPrice} psa10=$${psa10Price} gem=${gemMintPct}% ratio=${ratio}`
    );

    res.json({ price: psa10Price, pop: psa10Count, gemMintPct, rawPrice, ratio, source: "eBay", lastSaleDate });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[eBay] Error:", msg);
    res.json({ price: null, pop: null, gemMintPct: null, rawPrice, ratio: null, source: "eBay", error: msg });
  }
}
