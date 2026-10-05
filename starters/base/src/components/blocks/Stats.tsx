export type StatsProps = {
  items: { value: string; label: string }[];
  /** "band" = gradient band; "plain" = on the page background. */
  variant?: "band" | "plain";
};

/** Row of big numbers. */
export function Stats({ items, variant = "plain" }: StatsProps) {
  const band = variant === "band";
  return (
    <section className={band ? "bg-gradient-primary py-16 text-primary-foreground" : "py-16"}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className={band ? "text-4xl font-extrabold tracking-tight md:text-5xl" : "text-gradient text-4xl font-extrabold tracking-tight md:text-5xl"}>
              {item.value}
            </p>
            <p className={band ? "mt-2 text-sm font-medium opacity-80" : "mt-2 text-sm font-medium text-muted-foreground"}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
