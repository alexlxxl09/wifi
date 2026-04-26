export interface PokemonCard {
  id: string;
  name: string;
  number: string;
  set: {
    id: string;
    name: string;
    series: string;
  };
  images: {
    small: string;
    large: string;
  };
  rarity?: string;
  tcgplayer?: {
    prices?: {
      holofoil?: { market?: number };
      normal?: { market?: number };
      reverseHolofoil?: { market?: number };
      "1stEditionHolofoil"?: { market?: number };
    };
  };
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
      trendPrice?: number;
    };
  };
}

export interface PSAData {
  price: number | null;       // Prix PSA 10 (moyenne eBay)
  pop: number | null;         // Nb de ventes PSA 10 sur eBay
  gemMintPct: number | null;  // % gem mint = ventes PSA10 / ventes PSA toutes grades
  rawPrice: number | null;    // Prix raw (TCGPlayer/Cardmarket)
  ratio: number | null;       // Formule : (rawPrice / psa10Price) × gemMintPct
  source: string;
  lastSaleDate?: string;
  error?: string;
}

export interface CardWithPSA extends PokemonCard {
  psaData?: PSAData;
  loading?: boolean;
}
