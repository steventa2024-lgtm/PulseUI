const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const VALUES = [42, 46, 49, 52, 55, 58, 61, 66, 70, 74, 79, 84];

export function MrrChart() {
  return (
    <div className="flex h-56 items-end gap-3">
      {VALUES.map((value, index) => (
        <div key={MONTHS[index]} className="flex flex-1 flex-col items-center gap-2">
          <div className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-sky-400" style={{ height: `${(value / 90) * 100}%` }} title={`$${value}k`} />
          <span className="text-[10px] text-slate-500">{MONTHS[index]}</span>
        </div>
      ))}
    </div>
  );
}
