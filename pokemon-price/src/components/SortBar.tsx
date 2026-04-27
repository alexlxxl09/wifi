export type SortMode = "default" | "ratio_desc" | "price_asc" | "gem_desc";

interface SortBarProps {
  mode: SortMode;
  onChange: (mode: SortMode) => void;
  analyzedCount: number;
}

const OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default",    label: "Par défaut" },
  { value: "ratio_desc", label: "Meilleur score" },
  { value: "gem_desc",   label: "Gem mint % ↑" },
  { value: "price_asc",  label: "Prix PSA 10 ↓" },
];

export default function SortBar({ mode, onChange, analyzedCount }: SortBarProps) {
  if (analyzedCount === 0) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-gray-400">Trier par :</span>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
            mode === opt.value
              ? "border-[#FFCB05] bg-[#FFCB05] text-[#1a1a2e] font-bold"
              : "border-[#0f3460] text-gray-400 hover:border-gray-500"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
