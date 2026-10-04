import { useState } from "react";
import { ChevronDown } from "lucide-react";

const ITEMS = [
  ["Is there a free plan?", "Yes — Starter is free forever for small teams."],
  ["Can I import from other tools?", "Nimbus imports from most popular docs and task managers."],
  ["Do you offer discounts for nonprofits?", "Yes, 50% off any paid plan. Contact us to apply."],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 pb-24">
      <h2 className="mb-8 text-center text-3xl font-semibold text-white">Questions</h2>
      {ITEMS.map(([question, answer], index) => (
        <div key={question} className="border-b border-white/10">
          <button onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between py-5 text-left font-medium text-white" aria-expanded={open === index}>
            {question}<ChevronDown className={`h-4 w-4 transition ${open === index ? "rotate-180" : ""}`} />
          </button>
          {open === index && <p className="pb-5 text-sm text-slate-400">{answer}</p>}
        </div>
      ))}
    </section>
  );
}
