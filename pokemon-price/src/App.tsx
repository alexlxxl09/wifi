import { useState, useMemo } from "react";
import SearchBar from "@/components/SearchBar";
import CardItem from "@/components/CardItem";
import SortBar, { SortMode } from "@/components/SortBar";
import type { CardWithPSA, PSAData } from "@/types";

export default function App() {
  const [cards, setCards] = useState<CardWithPSA[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [analyzedAll, setAnalyzedAll] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);

  async function handleSearch(query: string) {
    setSearching(true);
    setError(null);
    setAnalyzedAll(false);
    setSortMode("default");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCards((data.cards ?? []).map((c: CardWithPSA) => ({ ...c, psaData: undefined, loading: false })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de recherche");
      setCards([]);
    } finally {
      setSearching(false);
    }
  }

  async function fetchPSAForCard(card: CardWithPSA) {
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, loading: true } : c)));
    try {
      const params = new URLSearchParams({ name: card.name, set: card.set.name, number: card.number });
      const res = await fetch(`/api/psa?${params}`);
      const data: PSAData = await res.json();
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, loading: false, psaData: data } : c)));
    } catch {
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, loading: false, psaData: { price: null, pop: null, ratio: null, source: "Error", error: "Erreur réseau" } }
            : c
        )
      );
    }
  }

  async function analyzeAll() {
    setAnalyzingAll(true);
    const unanalyzed = cards.filter((c) => !c.psaData && !c.loading);
    for (const card of unanalyzed) await fetchPSAForCard(card);
    setAnalyzingAll(false);
    setAnalyzedAll(true);
    setSortMode("ratio_asc");
  }

  const sortedCards = useMemo(() => {
    if (sortMode === "default") return cards;
    return [...cards].sort((a, b) => {
      const ap = a.psaData, bp = b.psaData;
      if (sortMode === "ratio_asc") return (ap?.ratio ?? Infinity) - (bp?.ratio ?? Infinity);
      if (sortMode === "price_asc") return (ap?.price ?? Infinity) - (bp?.price ?? Infinity);
      if (sortMode === "pop_asc") return (ap?.pop ?? Infinity) - (bp?.pop ?? Infinity);
      return 0;
    });
  }, [cards, sortMode]);

  const analyzedCount = cards.filter((c) => c.psaData).length;

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-[#FFCB05] tracking-tight mb-1">Pokemon PSA Price Tracker</h1>
        <p className="text-gray-400 text-sm">Recherchez une carte · prix PSA 10 + pop via 130point & PSA · meilleur ratio pop/prix</p>
      </div>

      <div className="mb-8">
        <SearchBar onSearch={handleSearch} loading={searching} />
      </div>

      {error && (
        <div className="max-w-2xl mx-auto mb-6 px-4 py-3 bg-red-900/30 border border-red-700 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {cards.length > 0 && (
        <div className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-400">
              {cards.length} carte{cards.length > 1 ? "s" : ""} trouvée{cards.length > 1 ? "s" : ""}
              {analyzedCount > 0 && ` · ${analyzedCount} analysée${analyzedCount > 1 ? "s" : ""}`}
            </p>
            {!analyzedAll && cards.some((c) => !c.psaData && !c.loading) && (
              <button
                onClick={analyzeAll}
                disabled={analyzingAll}
                className="text-xs px-4 py-2 bg-[#CC0000] text-white font-bold rounded-lg hover:bg-red-500 disabled:opacity-60 transition-all"
              >
                {analyzingAll ? "Analyse en cours..." : "Tout analyser"}
              </button>
            )}
          </div>
          <SortBar mode={sortMode} onChange={setSortMode} analyzedCount={analyzedCount} />
        </div>
      )}

      {analyzedCount > 0 && (
        <div className="max-w-6xl mx-auto mb-4 flex gap-4 flex-wrap text-xs text-gray-500">
          <span>Ratio pop/prix :</span>
          <span className="text-emerald-400">GEM &lt; 0.5</span>
          <span className="text-blue-400">RARE &lt; 2</span>
          <span className="text-yellow-400">BON &lt; 10</span>
          <span className="text-gray-400">COMMUN ≥ 10</span>
          <span className="text-gray-600">· Plus bas = carte plus rare comparée à son prix</span>
        </div>
      )}

      {sortedCards.length > 0 && (
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedCards.map((card) => (
            <CardItem key={card.id} card={card} onFetchPSA={fetchPSAForCard} />
          ))}
        </div>
      )}

      {!searching && cards.length === 0 && !error && (
        <div className="text-center text-gray-600 mt-20 text-sm">Recherchez une carte pour commencer</div>
      )}
    </main>
  );
}
