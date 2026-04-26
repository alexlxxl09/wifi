"use client";

import Image from "next/image";
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
        <Image
          src={card.images.small}
          alt={card.name}
          fill
          className="object-contain p-2"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
            Recherche en cours...
          </div>
        )}

        {psaData && (
          <div className="mt-auto space-y-2 pt-2 border-t border-[#0f3460]">
            {psaData.error && !psaData.price && !psaData.pop ? (
              <p className="text-xs text-red-400">{psaData.error}</p>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Prix PSA 10</span>
                  <span className="text-sm font-bold text-[#FFCB05]">
                    {psaData.price !== null ? `$${psaData.price.toLocaleString()}` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Pop PSA 10</span>
                  <span className="text-sm font-bold text-white">
                    {psaData.pop !== null ? psaData.pop.toLocaleString() : "N/A"}
                  </span>
                </div>
                {psaData.ratio !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Ratio pop/prix</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{psaData.ratio}</span>
                      <RatioBadge ratio={psaData.ratio} />
                    </div>
                  </div>
                )}
                {psaData.lastSaleDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Dernière vente</span>
                    <span className="text-xs text-gray-400">{psaData.lastSaleDate}</span>
                  </div>
                )}
                <div className="text-xs text-gray-600 text-right">{psaData.source}</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
