import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function KpiCard({ label, value, delta }: { label: string; value: string; delta: number }) {
  const up = delta >= 0;
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0f1520] p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className={`mt-2 flex items-center gap-1 text-xs ${up ? "text-emerald-400" : "text-rose-400"}`}>
        {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {Math.abs(delta)}% vs last period
      </p>
    </div>
  );
}
