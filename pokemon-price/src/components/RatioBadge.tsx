"use client";

interface RatioBadgeProps {
  ratio: number | null;
}

function getRatingLabel(ratio: number): { label: string; color: string } {
  if (ratio < 0.5) return { label: "GEM", color: "bg-emerald-500 text-white" };
  if (ratio < 2) return { label: "RARE", color: "bg-blue-500 text-white" };
  if (ratio < 10) return { label: "BON", color: "bg-yellow-500 text-black" };
  return { label: "COMMUN", color: "bg-gray-500 text-white" };
}

export default function RatioBadge({ ratio }: RatioBadgeProps) {
  if (ratio === null) return null;
  const { label, color } = getRatingLabel(ratio);
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full ${color}`}>
      {label}
    </span>
  );
}
