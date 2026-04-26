interface RatioBadgeProps {
  ratio: number | null;
}

// Score = (raw/psa10) × gem% — PLUS BAS = MEILLEURE OPPORTUNITÉ
function getRating(ratio: number): { label: string; color: string } {
  if (ratio < 5)  return { label: "TOP", color: "bg-emerald-500 text-white" };
  if (ratio < 15) return { label: "BON", color: "bg-blue-500 text-white" };
  if (ratio < 40) return { label: "MOY", color: "bg-yellow-500 text-black" };
  return          { label: "FAIBLE", color: "bg-gray-600 text-white" };
}

export default function RatioBadge({ ratio }: RatioBadgeProps) {
  if (ratio === null) return null;
  const { label, color } = getRating(ratio);
  return <span className={`text-xs font-bold px-2 py-1 rounded-full ${color}`}>{label}</span>;
}
