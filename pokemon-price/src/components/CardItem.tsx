import type { CardWithPSA } from "@/types";
import RatioBadge from "./RatioBadge";

interface CardItemProps {
  card: CardWithPSA;
  onFetchPSA: (card: CardWithPSA) => void;
}

export default function CardItem({ card, onFetchPSA }: CardItemProps) {
  const { psaData, loading } = card;

  return (
    <div className="bg-[#16213e] border border-[#0f3460] rounded-2xl overflow-hidden flex flex-col hover:border-[#FFCB05] transition-all duration-200 hover:shadow-lg hover:shadow-yellow-900/20">
      <div className="relative w-full pt-[70%] bg-[#0d0d1a]">
        <img
          src={card.images.small}
          alt={card.name}
          className="absolute inset-0 w-full h-full object-contain p-2"
        />
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="font-bold text-sm text-white truncate">{card.name}</h3>
          <p className="text-xs text-gray-400 truncate">{card.set.name} · #{card.number}</p>
          {card.rarity && <p className="text-xs text-[#FFCB05]">{card.rarity}</p>}
        </div>

        {!psaData && !loading && (
          <button
            onClick={() => onFetchPSA(card)}
            className="mt-auto w-full py-2 bg-[#3B4CCA] text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-all"
          >
            Analyser PSA 10
          </button>
        )}

        {loading && (
          <div className="mt-auto flex items-center justify-center gap-2 py-2 text-xs text-gray-400">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Analyse en cours...
          </div>
        )}

        {psaData && (
          <div className="mt-auto space-y-1.5 pt-2 border-t border-[#0f3460]">
            {psaData.error && (
              <p className="text-xs text-red-400 mb-1">{psaData.error}</p>
            )}

            {psaData.rawPrice !== null && (
              <Row label="Prix raw" value={`$${psaData.rawPrice.toLocaleString()}`} dim />
            )}
            <Row
              label="Prix PSA 10"
              value={psaData.price !== null ? `$${psaData.price.toLocaleString()}` : "N/A"}
              highlight
            />
            <Row
              label="% Gem Mint"
              value={psaData.gemMintPct !== null ? `${psaData.gemMintPct}%` : "N/A"}
            />

            {psaData.ratio !== null && (
              <div className="flex justify-between items-center pt-1 border-t border-[#0f3460]">
                <div>
                  <span className="text-xs text-gray-300 font-semibold">Score</span>
                  <span className="text-xs text-gray-500 ml-1">(raw/psa10 × gem%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white">{psaData.ratio}</span>
                  <RatioBadge ratio={psaData.ratio} />
                </div>
              </div>
            )}

            {psaData.lastSaleDate && (
              <p className="text-xs text-gray-600 text-right">Dernière vente {psaData.lastSaleDate}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  dim,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-400">{label}</span>
      <span
        className={`text-sm font-bold ${highlight ? "text-[#FFCB05]" : dim ? "text-gray-400" : "text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}
