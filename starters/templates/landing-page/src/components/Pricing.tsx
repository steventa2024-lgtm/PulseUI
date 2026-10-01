import { Check } from "lucide-react";

const TIERS = [
  { name: "Starter", price: 0, features: ["3 projects", "Basic automations", "Community support"] },
  { name: "Pro", price: 12, features: ["Unlimited projects", "Advanced automations", "Priority support"], featured: true },
  { name: "Business", price: 29, features: ["SSO & audit log", "Admin controls", "Dedicated success manager"] },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
      <h2 className="text-center text-3xl font-semibold text-white">Simple pricing</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div key={tier.name} className={`rounded-2xl border p-6 ${tier.featured ? "border-indigo-400/50 bg-indigo-500/10" : "border-white/5 bg-white/[0.03]"}`}>
            <h3 className="font-medium text-white">{tier.name}</h3>
            <p className="mt-4 text-4xl font-semibold text-white">${tier.price}<span className="text-base font-normal text-slate-500">/user/mo</span></p>
            <ul className="mt-6 space-y-2 text-sm">
              {tier.features.map((feature) => <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-300" />{feature}</li>)}
            </ul>
            <button className={`mt-8 w-full rounded-lg py-2.5 text-sm font-medium ${tier.featured ? "bg-indigo-500 text-white" : "border border-white/10"}`}>Choose {tier.name}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
