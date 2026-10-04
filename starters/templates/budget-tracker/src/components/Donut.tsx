export function Donut({ slices }: { slices: Array<{ value: number; color: string; label: string }> }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 160 160" className="h-44 w-44" role="img" aria-label="Spending by category">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="22" />
      {total > 0 &&
        slices.map((slice) => {
          const length = (slice.value / total) * circumference;
          const element = (
            <circle
              key={slice.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="22"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 80 80)"
            />
          );
          offset += length;
          return element;
        })}
      <text x="80" y="76" textAnchor="middle" className="fill-slate-500 text-[10px]">Spent</text>
      <text x="80" y="94" textAnchor="middle" className="fill-slate-900 text-[15px] font-semibold">
        ${Math.round(total).toLocaleString()}
      </text>
    </svg>
  );
}
