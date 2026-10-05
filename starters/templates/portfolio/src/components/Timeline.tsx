const ROLES = [
  { years: "2022 — now", role: "Independent designer", org: "Clients across fintech and health" },
  { years: "2019 — 2022", role: "Lead product designer", org: "Orbit" },
  { years: "2016 — 2019", role: "Product designer", org: "Fieldnotes" },
];

export function Timeline() {
  return (
    <section id="about" className="mx-auto max-w-5xl px-6 pb-20">
      <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-neutral-500">Experience</h2>
      <ol className="divide-y divide-neutral-200 border-y border-neutral-200">
        {ROLES.map((item) => (
          <li key={item.years} className="grid gap-2 py-5 sm:grid-cols-[180px_1fr]">
            <span className="text-sm text-neutral-500">{item.years}</span>
            <div><p className="font-medium">{item.role}</p><p className="text-sm text-neutral-500">{item.org}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
