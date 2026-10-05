export function TrafficChart({ values }: { values: number[] }) {
  const width = 640;
  const height = 220;
  const max = Math.max(...values) * 1.1;
  const step = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => `${i * step},${height - (v / max) * height}`);
  const line = `M${points.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" preserveAspectRatio="none" role="img" aria-label="Traffic chart">
      <defs>
        <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={width} y1={height * f} y2={height * f} stroke="rgba(255,255,255,0.05)" />
      ))}
      <path d={area} fill="url(#fill)" />
      <path d={line} fill="none" stroke="#22d3ee" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
