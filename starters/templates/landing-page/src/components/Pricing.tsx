import { useState } from "react";
import { Check } from "lucide-react";

const TIERS = [
  { name: "Starter", monthly: 0, features: ["3 projects", "Basic automations", "Community support"] },
  { name: "Pro", monthly: 12, features: ["Unlimited projects", "Advanced automations", "Priority support"], featured: true },
  { name: "Business", monthly: 29, features: ["SSO & audit log", "Admin controls", "Dedicated success manager"] },
];

export function Pricing() {
  const [yearly, setYearly] = useState(true);
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
      <h2 className="text-center text-3xl font-semibold text-white">Simple pricing</h2>
      <div className="mt-6 flex justify-center">
        <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1 text-sm" role="radiogroup" aria-label="Billing period">
          {[false, true].map((option) => (
            <button
              key={String(option)}
              role="radio"
              aria-checked={yearly === option}
              onClick={() => setYearly(option)}
              className={`rounded-full px-4 py-1.5 ${yearly === option ? "bg-indigo-500 text-white" : "text-slate-400"}`}
            >
              {option ? "Yearly · save 20%" : "Monthly"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const price = yearly ? Math.round(tier.monthly * 0.8) : tier.monthly;
          return (
            <div key={tier.name} className={`rounded-2xl border p-6 ${tier.featured ? "border-indigo-400/50 bg-indigo-500/10" : "border-white/5 bg-white/[0.03]"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">{tier.name}</h3>
                {tier.featured && <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs text-white">Most popular</span>}
              </div>
              <p className="mt-4 text-4xl font-semibold text-white">
                ${price}
                <span className="text-base font-normal text-slate-500">/user/mo</span>
              </p>
              <p className="mt-1 h-4 text-xs text-slate-500">{yearly && tier.monthly > 0 ? `Billed $${price * 12} yearly` : ""}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-300" />{feature}</li>
                ))}
              </ul>
              <a href="#signup" className={`mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-medium ${tier.featured ? "bg-indigo-500 text-white" : "border border-white/10"}`}>
                Choose {tier.name}
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
