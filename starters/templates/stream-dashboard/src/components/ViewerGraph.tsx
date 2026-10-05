export function ViewerGraph({ values }: { values: number[] }) {
  const max = Math.max(...values) * 1.1;
  return (
    <div className="flex h-40 items-end gap-1" role="img" aria-label="Viewer count over time">
      {values.map((value, index) => (
        <div key={index} className="flex-1 rounded-t bg-gradient-to-t from-purple-700 to-fuchsia-400" style={{ height: `${(value / max) * 100}%` }} />
      ))}
    </div>
  );
}
