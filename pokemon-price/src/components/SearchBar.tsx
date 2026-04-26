import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <form onSubmit={submit} className="w-full max-w-2xl mx-auto flex gap-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rechercher une carte Pokémon... (ex: Charizard, Pikachu)"
        className="flex-1 px-5 py-3 rounded-xl bg-[#16213e] border border-[#0f3460] text-white placeholder-gray-500 focus:outline-none focus:border-[#FFCB05] focus:ring-1 focus:ring-[#FFCB05] transition-all"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="px-6 py-3 bg-[#FFCB05] text-[#1a1a2e] font-bold rounded-xl hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? "..." : "Rechercher"}
      </button>
    </form>
  );
}
