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
}

export interface PSAData {
  price: number | null;
  pop: number | null;
  ratio: number | null;
  source: string;
  lastSaleDate?: string;
  error?: string;
}

export interface CardWithPSA extends PokemonCard {
  psaData?: PSAData;
  loading?: boolean;
}
