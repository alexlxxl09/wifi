import type { Request, Response } from "express";

const EBAY_APP_ID = process.env.EBAY_APP_ID ?? "";

interface EbayItem {
  title: string[];
  sellingStatus: { currentPrice: { __value__: string }[] }[];
  listingInfo: { endTime: string[] }[];
}

interface EbayResponse {
  findCompletedItemsResponse?: {
    searchResult?: { item?: EbayItem[] }[];
    paginationOutput?: { totalEntries: string[] }[];
    ack?: string[];
    errorMessage?: { error: { message: string[] }[] }[];
  }[];
}

async function searchEbay(keywords: string, entriesPerPage = 10): Promise<EbayResponse> {
  const params = new URLSearchParams({
    "OPERATION-NAME": "findCompletedItems",
    "SERVICE-VERSION": "1.0.0",
    "SECURITY-APPNAME": EBAY_APP_ID,
    "RESPONSE-DATA-FORMAT": "JSON",
    keywords,
    "categoryId": "2536",
    "itemFilter(0).name": "SoldItemsOnly",
    "itemFilter(0).value": "true",
    "sortOrder": "EndTimeSoonest",
    "paginationInput.entriesPerPage": String(entriesPerPage),
  });

  const res = await fetch(
    `https://svcs.ebay.com/services/search/FindingService/v1?${params}`,
    { signal: AbortSignal.timeout(10000) }
  );

  if (!res.ok) throw new Error(`eBay API HTTP ${res.status}`);
  return res.json() as Promise<EbayResponse>;
}

export async function psaHandler(req: Request, res: Response) {
  const name = (req.query.name as string) ?? "";
  const setName = (req.query.set as string) ?? "";

  if (!name) return res.status(400).json({ error: "Missing card name" });

  if (!EBAY_APP_ID) {
    return res.json({
      price: null, pop: null, ratio: null,
      source: "eBay",
      error: "EBAY_APP_ID manquant — crée .env avec ta clé gratuite (developer.ebay.com)",
    });
  }

  try {
    const keywords = `${name} ${setName} PSA 10`.trim();
    const data = await searchEbay(keywords, 10);
    const response = data.findCompletedItemsResponse?.[0];

    if (response?.ack?.[0] !== "Success") {
      const errMsg = response?.errorMessage?.[0]?.error?.[0]?.message?.[0] ?? "Erreur eBay inconnue";
      return res.json({ price: null, pop: null, ratio: null, source: "eBay", error: errMsg });
    }

    const items = response?.searchResult?.[0]?.item ?? [];
    const totalEntries = parseInt(response?.paginationOutput?.[0]?.totalEntries?.[0] ?? "0", 10);

    // Prix moyen des 5 dernières ventes
    const prices = items
      .map((item) => parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? "0"))
      .filter((p) => p > 0)
      .slice(0, 5);

    const price = prices.length > 0
      ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
      : null;

    // "Pop marché" = nombre total de ventes PSA 10 trouvées (proxy de l'offre)
    const pop = totalEntries > 0 ? totalEntries : null;

    const lastSaleDate = items[0]?.listingInfo?.[0]?.endTime?.[0]?.slice(0, 10);

    const ratio =
      pop !== null && price !== null && price > 0
        ? Math.round((pop / price) * 100) / 100
        : null;

    console.log(`[eBay] "${keywords}": price=$${price}, pop=${pop}, ${prices.length} sales`);

    res.json({ price, pop, ratio, source: "eBay (ventes PSA 10)", lastSaleDate });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[eBay] Error:", msg);
    res.json({ price: null, pop: null, ratio: null, source: "eBay", error: msg });
  }
}
